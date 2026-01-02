import httpStatus from 'http-status';
import mongoose from 'mongoose';
import SeatLock, { ISeatLock } from '../models/seatlock.model';
import Trip from '../models/trip.model';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import { emitSeatLocked, emitSeatReleased } from './socket.service';

const LOCK_DURATION_MINUTES = 3; // Seat lock duration: 3 minutes

/**
 * Lock seats for a trip
 * @param {mongoose.Types.ObjectId} tripId
 * @param {string[]} seatNumbers
 * @param {string} sessionId - Unique session identifier (user ID or guest session)
 * @param {mongoose.Types.ObjectId} userId - Optional user ID if authenticated
 * @returns {Promise<ISeatLock>}
 */
const lockSeats = async (
  tripId: mongoose.Types.ObjectId,
  seatNumbers: string[],
  sessionId: string,
  userId?: mongoose.Types.ObjectId,
  metadata?: { guestEmail?: string; guestPhone?: string; [key: string]: any }
): Promise<ISeatLock> => {
  // Verify trip exists and populate bus info
  const trip = await Trip.findById(tripId).populate('bus');
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  // Calculate real available capacity
  const bus = trip.bus as any;
  const totalSeats = bus.totalSeats;
  const bookedSeatsCount = trip.bookedSeats.length;

  const allExistingLocks = await SeatLock.find({
    trip: tripId,
    expiresAt: { $gt: new Date() },
  });

  const alreadyLockedCount = new Set(allExistingLocks.flatMap((lock) => lock.seatNumbers)).size;

  const actuallyAvailable = totalSeats - bookedSeatsCount - alreadyLockedCount;

  // Check if enough capacity to lock requested seats
  if (actuallyAvailable < seatNumbers.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough available seats to lock. Available: ${actuallyAvailable}, Requested: ${seatNumbers.length}`
    );
  }

  // Check if any of the requested seats are already locked by others
  const existingLocks = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    expiresAt: { $gt: new Date() },
    sessionId: { $ne: sessionId }, // Exclude own session
  });

  if (existingLocks.length > 0) {
    const lockedSeats = existingLocks.flatMap((lock) => lock.seatNumbers);
    const conflictingSeats = seatNumbers.filter((seat) => lockedSeats.includes(seat));
    logger.warn(`[Lock Conflict] Seats ${conflictingSeats.join(', ')} already locked for trip ${tripId}`);
    throw new ApiError(httpStatus.CONFLICT, `Seats ${conflictingSeats.join(', ')} are already locked by another user`);
  }

  // Check if seats are already booked
  const alreadyBookedSeats = seatNumbers.filter((seat) => trip.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Seats ${alreadyBookedSeats.join(', ')} are already booked`);
  }

  // Set expiration time (10 minutes from now)
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  // Check if this session already has locks for this trip
  const existingSessionLock = await SeatLock.findOne({
    trip: tripId,
    sessionId,
    expiresAt: { $gt: new Date() },
  });

  if (existingSessionLock) {
    // Update existing lock: add new seats and extend expiration
    const combinedSeats = [...new Set([...existingSessionLock.seatNumbers, ...seatNumbers])];

    existingSessionLock.seatNumbers = combinedSeats;
    existingSessionLock.expiresAt = expiresAt;
    if (metadata) {
      existingSessionLock.metadata = { ...existingSessionLock.metadata, ...metadata };
    }

    await existingSessionLock.save();

    logger.info(
      `Updated lock for session ${sessionId}: added seats ${seatNumbers.join(', ')}, total seats: ${combinedSeats.join(', ')}`
    );

    // Emit real-time Socket.IO event for new seats only
    emitSeatLocked(tripId, seatNumbers, sessionId, expiresAt, userId);

    return existingSessionLock;
  }

  // Create new lock if session doesn't have one
  try {
    const lock = await SeatLock.create({
      trip: tripId,
      seatNumbers,
      sessionId,
      user: userId,
      expiresAt,
      metadata,
    });

    logger.info(`Seats ${seatNumbers.join(', ')} locked for trip ${tripId} until ${expiresAt}`);

    // Emit real-time Socket.IO event
    emitSeatLocked(tripId, seatNumbers, sessionId, expiresAt, userId);

    return lock;
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error - seats are already locked
      throw new ApiError(httpStatus.CONFLICT, 'One or more seats are already locked by another user');
    }
    throw error;
  }
};

/**
 * Release seat locks by session ID
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
const releaseLocks = async (sessionId: string): Promise<number> => {
  // Get locks before deleting to emit events
  const locks = await SeatLock.find({ sessionId });

  const result = await SeatLock.deleteMany({ sessionId });
  logger.info(`Released ${result.deletedCount} seat locks for session ${sessionId}`);

  // Emit real-time Socket.IO events for each lock released
  locks.forEach((lock) => {
    emitSeatReleased(lock.trip, lock.seatNumbers, sessionId, 'manual');
  });

  return result.deletedCount || 0;
};

/**
 * Release specific seat locks for a trip
 * @param {mongoose.Types.ObjectId} tripId
 * @param {string[]} seatNumbers
 * @param {string} sessionId
 * @returns {Promise<number>}
 */
const releaseSpecificLocks = async (
  tripId: mongoose.Types.ObjectId,
  seatNumbers: string[],
  sessionId: string
): Promise<number> => {
  // Get locks before deleting to emit events
  const locks = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    sessionId,
  });

  const result = await SeatLock.deleteMany({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    sessionId,
  });
  logger.info(`Released ${result.deletedCount} seat locks for trip ${tripId}`);

  // Emit real-time Socket.IO events
  locks.forEach((lock) => {
    emitSeatReleased(tripId, lock.seatNumbers, sessionId, 'manual');
  });

  return result.deletedCount || 0;
};

/**
 * Check if seats are locked
 * @param {mongoose.Types.ObjectId} tripId
 * @param {string[]} seatNumbers
 * @returns {Promise<boolean>}
 */
const areSeatsLocked = async (tripId: mongoose.Types.ObjectId, seatNumbers: string[]): Promise<boolean> => {
  const locks = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    expiresAt: { $gt: new Date() },
  });

  return locks.length > 0;
};

/**
 * Get all locked seats for a trip
 * @param {mongoose.Types.ObjectId} tripId
 * @returns {Promise<string[]>}
 */
const getLockedSeatsForTrip = async (tripId: mongoose.Types.ObjectId): Promise<string[]> => {
  const locks = await SeatLock.find({
    trip: tripId,
    expiresAt: { $gt: new Date() },
  });

  const lockedSeats = locks.flatMap((lock) => lock.seatNumbers);
  return [...new Set(lockedSeats)]; // Remove duplicates
};

/**
 * Extend lock expiration time
 * @param {string} sessionId
 * @param {number} additionalMinutes
 * @returns {Promise<number>}
 */
const extendLocks = async (sessionId: string, additionalMinutes: number = LOCK_DURATION_MINUTES): Promise<number> => {
  const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

  const result = await SeatLock.updateMany(
    {
      sessionId,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { expiresAt: newExpiresAt },
    }
  );

  logger.info(`Extended ${result.modifiedCount} seat locks for session ${sessionId} until ${newExpiresAt}`);
  return result.modifiedCount || 0;
};

/**
 * Check if session owns the lock for specific seats
 * @param {mongoose.Types.ObjectId} tripId
 * @param {string[]} seatNumbers
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
const doesSessionOwnLock = async (
  tripId: mongoose.Types.ObjectId,
  seatNumbers: string[],
  sessionId: string
): Promise<boolean> => {
  const locks = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    sessionId,
    expiresAt: { $gt: new Date() },
  });

  // Check if all requested seats are locked by this session
  const lockedBySession = locks.flatMap((lock) => lock.seatNumbers);
  return seatNumbers.every((seat) => lockedBySession.includes(seat));
};

/**
 * Clean up expired locks (manual cleanup, TTL index handles automatic cleanup)
 * @returns {Promise<number>}
 */
const cleanupExpiredLocks = async (): Promise<number> => {
  const result = await SeatLock.deleteMany({
    expiresAt: { $lte: new Date() },
  });

  logger.info(`Cleaned up ${result.deletedCount} expired seat locks`);
  return result.deletedCount || 0;
};

/**
 * Check seat availability (for validation before locking)
 * @param {mongoose.Types.ObjectId} tripId
 * @param {string[]} seatNumbers
 * @returns {Promise<object>}
 */
const checkSeatAvailability = async (
  tripId: mongoose.Types.ObjectId,
  seatNumbers: string[]
): Promise<{
  available: string[];
  booked: string[];
  locked: string[];
  invalid: string[];
}> => {
  // Verify trip exists
  const trip = await Trip.findById(tripId).populate('bus');
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  const bus = trip.bus as any;
  const validSeats = bus?.seatMap?.seats?.map((s: any) => s.seatNumber) || [];

  // Check which seats are invalid
  const invalid = seatNumbers.filter((seat) => !validSeats.includes(seat));

  // Check which seats are booked
  const booked = seatNumbers.filter((seat) => trip.bookedSeats.includes(seat));

  // Check which seats are locked
  const lockedSeatsData = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    expiresAt: { $gt: new Date() },
  });
  const locked = lockedSeatsData.flatMap((lock) => lock.seatNumbers).filter((seat) => seatNumbers.includes(seat));

  // Available seats are those not booked, not locked, and valid
  const available = seatNumbers.filter(
    (seat) => !booked.includes(seat) && !locked.includes(seat) && !invalid.includes(seat)
  );

  return {
    available,
    booked,
    locked,
    invalid,
  };
};

/**
 * Get session lock information including expiration time
 * @param {mongoose.Types.ObjectId} tripId
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
const getSessionLockInfo = async (
  tripId: mongoose.Types.ObjectId,
  sessionId: string
): Promise<{
  hasLock: boolean;
  expiresAt: Date | null;
  remainingSeconds: number;
  lockedSeats: string[];
}> => {
  const lock = await SeatLock.findOne({
    trip: tripId,
    sessionId,
    expiresAt: { $gt: new Date() },
  });

  if (!lock) {
    return {
      hasLock: false,
      expiresAt: null,
      remainingSeconds: 0,
      lockedSeats: [],
    };
  }

  const now = new Date();
  const remainingMs = lock.expiresAt.getTime() - now.getTime();
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  return {
    hasLock: true,
    expiresAt: lock.expiresAt,
    remainingSeconds,
    lockedSeats: lock.seatNumbers,
  };
};

export default {
  lockSeats,
  releaseLocks,
  releaseSpecificLocks,
  areSeatsLocked,
  getLockedSeatsForTrip,
  extendLocks,
  doesSessionOwnLock,
  cleanupExpiredLocks,
  checkSeatAvailability,
  getSessionLockInfo,
};
