import httpStatus from 'http-status';
import mongoose from 'mongoose';
import SeatLock, { ISeatLock } from '../models/seatlock.model';
import Trip from '../models/trip.model';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

const LOCK_DURATION_MINUTES = 10;

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
  userId?: mongoose.Types.ObjectId
): Promise<ISeatLock> => {
  // Verify trip exists
  const trip = await Trip.findById(tripId);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  // Check if seats exist in the trip
  // Note: Actual seat validation should be implemented based on bus layout
  // For now, we assume all seat numbers are valid if the trip exists

  // Check if any seats are already locked or booked
  const existingLocks = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    expiresAt: { $gt: new Date() },
  });

  if (existingLocks.length > 0) {
    const lockedSeats = existingLocks.flatMap((lock) => lock.seatNumbers);
    throw new ApiError(httpStatus.CONFLICT, `Seats ${lockedSeats.join(', ')} are already locked by another user`);
  }

  // Check if seats are already booked
  const alreadyBookedSeats = seatNumbers.filter((seat) => trip.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Seats ${alreadyBookedSeats.join(', ')} are already booked`);
  }

  // Set expiration time (10 minutes from now)
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  // Create lock for each seat (or create one lock with multiple seats)
  try {
    const lock = await SeatLock.create({
      trip: tripId,
      seatNumbers,
      sessionId,
      user: userId,
      expiresAt,
    });

    logger.info(`Seats ${seatNumbers.join(', ')} locked for trip ${tripId} until ${expiresAt}`);
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
  const result = await SeatLock.deleteMany({ sessionId });
  logger.info(`Released ${result.deletedCount} seat locks for session ${sessionId}`);
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
  const result = await SeatLock.deleteMany({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    sessionId,
  });
  logger.info(`Released ${result.deletedCount} seat locks for trip ${tripId}`);
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

export default {
  lockSeats,
  releaseLocks,
  releaseSpecificLocks,
  areSeatsLocked,
  getLockedSeatsForTrip,
  extendLocks,
  doesSessionOwnLock,
  cleanupExpiredLocks,
};
