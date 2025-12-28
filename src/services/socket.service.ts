import { getIO } from '../config/socket';
import logger from '../config/logger';
import {
  SeatLockedEvent,
  SeatReleasedEvent,
  SeatBookedEvent,
  SeatStatusUpdateEvent,
  TripCapacityUpdateEvent,
  getRoomName,
} from '../types/socket.types';
import mongoose from 'mongoose';

/**
 * Socket.IO Service - Helper functions to emit real-time events
 * This service provides a clean interface for other services to emit Socket events
 */

/**
 * Emit seat locked event to all clients watching the trip
 * @param {string} tripId - Trip ID
 * @param {string[]} seatNumbers - Array of locked seat numbers
 * @param {string} sessionId - Session ID that locked the seats
 * @param {Date} expiresAt - Lock expiration time
 * @param {mongoose.Types.ObjectId} userId - Optional user ID
 */
export const emitSeatLocked = (
  tripId: string | mongoose.Types.ObjectId,
  seatNumbers: string[],
  sessionId: string,
  expiresAt: Date,
  userId?: mongoose.Types.ObjectId
): void => {
  try {
    const io = getIO();
    const roomName = getRoomName.trip(tripId.toString());

    const event: SeatLockedEvent = {
      tripId: tripId.toString(),
      seatNumbers,
      sessionId,
      userId: userId?.toString(),
      expiresAt,
      lockedBy: userId ? 'user' : 'guest',
      timestamp: new Date(),
    };

    io.to(roomName).emit('seatLocked', event);

    logger.info(`[Socket.IO] Emitted seatLocked to room ${roomName}:`, {
      seatNumbers,
      sessionId,
    });
  } catch (error: any) {
    logger.error('[Socket.IO] Error emitting seatLocked:', error.message);
  }
};

/**
 * Emit seat released event to all clients watching the trip
 * @param {string} tripId - Trip ID
 * @param {string[]} seatNumbers - Array of released seat numbers
 * @param {string} sessionId - Session ID that held the lock
 * @param {string} reason - Reason for release (manual, expired, booked)
 */
export const emitSeatReleased = (
  tripId: string | mongoose.Types.ObjectId,
  seatNumbers: string[],
  sessionId: string,
  reason: 'manual' | 'expired' | 'booked' = 'manual'
): void => {
  try {
    const io = getIO();
    const roomName = getRoomName.trip(tripId.toString());

    const event: SeatReleasedEvent = {
      tripId: tripId.toString(),
      seatNumbers,
      sessionId,
      reason,
      timestamp: new Date(),
    };

    io.to(roomName).emit('seatReleased', event);

    logger.info(`[Socket.IO] Emitted seatReleased to room ${roomName}:`, {
      seatNumbers,
      reason,
    });
  } catch (error: any) {
    logger.error('[Socket.IO] Error emitting seatReleased:', error.message);
  }
};

/**
 * Emit seat booked event to all clients watching the trip
 * @param {string} tripId - Trip ID
 * @param {string[]} seatNumbers - Array of booked seat numbers
 * @param {string} bookingId - Booking reference ID
 */
export const emitSeatBooked = (
  tripId: string | mongoose.Types.ObjectId,
  seatNumbers: string[],
  bookingId: string
): void => {
  try {
    const io = getIO();
    const roomName = getRoomName.trip(tripId.toString());

    const event: SeatBookedEvent = {
      tripId: tripId.toString(),
      seatNumbers,
      bookingId,
      timestamp: new Date(),
    };

    io.to(roomName).emit('seatBooked', event);

    logger.info(`[Socket.IO] Emitted seatBooked to room ${roomName}:`, {
      seatNumbers,
      bookingId,
    });
  } catch (error: any) {
    logger.error('[Socket.IO] Error emitting seatBooked:', error.message);
  }
};

/**
 * Emit batch seat status update
 * @param {string} tripId - Trip ID
 * @param {Array} seats - Array of seat status objects
 */
export const emitSeatStatusUpdate = (
  tripId: string | mongoose.Types.ObjectId,
  seats: Array<{
    seatNumber: string;
    status: 'available' | 'locked' | 'booked';
    expiresAt?: Date;
    sessionId?: string;
  }>
): void => {
  try {
    const io = getIO();
    const roomName = getRoomName.trip(tripId.toString());

    const event: SeatStatusUpdateEvent = {
      tripId: tripId.toString(),
      seats,
      timestamp: new Date(),
    };

    io.to(roomName).emit('seatStatusUpdate', event);

    logger.info(`[Socket.IO] Emitted seatStatusUpdate to room ${roomName}:`, {
      seatsCount: seats.length,
    });
  } catch (error: any) {
    logger.error('[Socket.IO] Error emitting seatStatusUpdate:', error.message);
  }
};

/**
 * Emit trip capacity update
 * @param {string} tripId - Trip ID
 * @param {number} availableSeats - Number of available seats
 * @param {number} bookedSeats - Number of booked seats
 * @param {number} lockedSeats - Number of locked seats
 * @param {number} totalSeats - Total seats on bus
 */
export const emitTripCapacityUpdate = (
  tripId: string | mongoose.Types.ObjectId,
  availableSeats: number,
  bookedSeats: number,
  lockedSeats: number,
  totalSeats: number
): void => {
  try {
    const io = getIO();
    const roomName = getRoomName.trip(tripId.toString());

    const event: TripCapacityUpdateEvent = {
      tripId: tripId.toString(),
      availableSeats,
      bookedSeats,
      lockedSeats,
      totalSeats,
      timestamp: new Date(),
    };

    io.to(roomName).emit('tripCapacityUpdate', event);

    logger.info(`[Socket.IO] Emitted tripCapacityUpdate to room ${roomName}:`, {
      availableSeats,
      bookedSeats,
      lockedSeats,
    });
  } catch (error: any) {
    logger.error('[Socket.IO] Error emitting tripCapacityUpdate:', error.message);
  }
};

/**
 * Get count of clients currently watching a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<number>} Number of connected clients in the trip room
 */
export const getTripViewersCount = async (tripId: string | mongoose.Types.ObjectId): Promise<number> => {
  try {
    const io = getIO();
    const roomName = getRoomName.trip(tripId.toString());

    const sockets = await io.in(roomName).fetchSockets();
    return sockets.length;
  } catch (error: any) {
    logger.error('[Socket.IO] Error getting trip viewers count:', error.message);
    return 0;
  }
};

/**
 * Broadcast message to all connected clients
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export const broadcastToAll = (event: string, data: any): void => {
  try {
    const io = getIO();
    io.emit(event as any, data);
    logger.info(`[Socket.IO] Broadcasted ${event} to all clients`);
  } catch (error: any) {
    logger.error('[Socket.IO] Error broadcasting to all:', error.message);
  }
};

export default {
  emitSeatLocked,
  emitSeatReleased,
  emitSeatBooked,
  emitSeatStatusUpdate,
  emitTripCapacityUpdate,
  getTripViewersCount,
  broadcastToAll,
};
