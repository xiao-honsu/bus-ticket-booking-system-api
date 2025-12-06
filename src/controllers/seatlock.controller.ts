import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import { seatLockService } from '../services';

/**
 * Lock seats for a trip
 */
const lockSeats = catchAsync(async (req: Request, res: Response) => {
  const { tripId, seatNumbers } = req.body;
  const userId = (req.user as any)?._id;

  // Generate session ID: use user ID if authenticated, otherwise generate a unique identifier
  const sessionId = userId ? userId.toString() : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const lock = await seatLockService.lockSeats(new mongoose.Types.ObjectId(tripId), seatNumbers, sessionId, userId);

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

  const count = await seatLockService.extendLocks(effectiveSessionId, minutes);

  res.status(httpStatus.OK).json({
    success: true,
    message: `${count} seat lock(s) extended`,
    data: { extendedCount: count },
  });
});

export default {
  lockSeats,
  releaseLocks,
  getLockedSeats,
  extendLocks,
};
