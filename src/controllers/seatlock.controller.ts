import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import { seatLockService } from '../services';
import logger from '../config/logger';

/**
 * Lock seats for a trip
 */
const lockSeats = catchAsync(async (req: Request, res: Response) => {
  const { tripId, seatNumbers, sessionId: clientSessionId, metadata } = req.body;
  const userId = (req.user as any)?._id;

  // Use client sessionId if provided, otherwise generate new one
  const sessionId =
    clientSessionId || (userId ? userId.toString() : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Log request for debugging
  logger.info(`[Lock Request] Trip: ${tripId}, Seats: ${seatNumbers.join(',')}, Session: ${sessionId}`);

  const lock = await seatLockService.lockSeats(
    new mongoose.Types.ObjectId(tripId),
    seatNumbers,
    sessionId,
    userId,
    metadata
  );

  logger.info(`[Lock Success] Seats ${seatNumbers.join(',')} locked, expires at ${lock.expiresAt}`);

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Seats locked successfully',
    data: lock,
    sessionId, // Return session ID to client for future requests
  });
});

/**
 * Release seat locks
 */
const releaseLocks = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const userId = (req.user as any)?._id;

  // Use provided sessionId or generate from user
  const effectiveSessionId = sessionId || (userId ? userId.toString() : undefined);

  if (!effectiveSessionId) {
    res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Session ID is required',
    });
    return;
  }

  const count = await seatLockService.releaseLocks(effectiveSessionId);

  res.status(httpStatus.OK).json({
    success: true,
    message: `${count} seat lock(s) released`,
    data: { releasedCount: count },
  });
});

/**
 * Get locked seats for a trip
 */
const getLockedSeats = catchAsync(async (req: Request, res: Response) => {
  const { tripId } = req.params;

  const lockedSeats = await seatLockService.getLockedSeatsForTrip(new mongoose.Types.ObjectId(tripId));

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      tripId,
      lockedSeats,
      count: lockedSeats.length,
    },
  });
});

/**
 * Extend lock duration
 */
const extendLocks = catchAsync(async (req: Request, res: Response) => {
  const { sessionId, minutes } = req.body;
  const userId = (req.user as any)?._id;

  // Use provided sessionId or generate from user
  const effectiveSessionId = sessionId || (userId ? userId.toString() : undefined);

  if (!effectiveSessionId) {
    res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'Session ID is required',
    });
    return;
  }

  const count = await seatLockService.extendLocks(effectiveSessionId, minutes || 10);

  res.status(httpStatus.OK).json({
    success: true,
    message: `${count} seat lock(s) extended by ${minutes || 10} minutes`,
    data: {
      extendedCount: count,
      newExpiresAt: new Date(Date.now() + (minutes || 10) * 60 * 1000),
    },
  });
});

/**
 * Check if seats are available
 */
const checkAvailability = catchAsync(async (req: Request, res: Response) => {
  const { tripId, seatNumbers } = req.body;

  const trip = await seatLockService.checkSeatAvailability(new mongoose.Types.ObjectId(tripId), seatNumbers);

  res.status(httpStatus.OK).json({
    success: true,
    data: trip,
  });
});

export default {
  lockSeats,
  releaseLocks,
  getLockedSeats,
  extendLocks,
  checkAvailability,
};
