import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import { bookingService } from '../services';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingData = {
    ...req.body,
    user: (req.user as any)._id,
  };
  const sessionId = req.body.sessionId || (req.user as any)?._id?.toString();
  const booking = await bookingService.createBooking(bookingData, sessionId);
  res.status(httpStatus.CREATED).send(booking);
});

const createGuestBooking = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId;
  const booking = await bookingService.createGuestBooking(req.body, sessionId);
  res.status(httpStatus.CREATED).send(booking);
});

const getBookings = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['user', 'trip', 'status', 'paymentStatus']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  // Auto-filter by user for non-admin users (those with only manageOwnBookings permission)
  const currentUser = (req as any).user;
  if (currentUser.role !== 'admin' && !filter.user) {
    filter.user = currentUser._id;
  }

  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;

  const result = await bookingService.queryBookings(filter, options);
  res.send(result);
});

const getBooking = catchAsync(async (req: Request, res: Response) => {
  const booking = await bookingService.getBookingById(new mongoose.Types.ObjectId(req.params.bookingId));
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  res.send(booking);
});

const updateBooking = catchAsync(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBookingById(new mongoose.Types.ObjectId(req.params.bookingId), req.body);
  res.send(booking);
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const booking = await bookingService.cancelBooking(
    new mongoose.Types.ObjectId(req.params.bookingId),
    req.body.reason
  );
  res.send(booking);
});

export default {
  createBooking,
  createGuestBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
};
