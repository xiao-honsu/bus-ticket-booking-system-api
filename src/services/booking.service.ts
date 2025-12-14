import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import Booking, { IBooking } from '../models/booking.model';
import Trip, { ITrip } from '../models/trip.model';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import emailService from './email.service';
import seatLockService from './seatlock.service';
import logger from '../config/logger';

/**
 * Calculate refund amount based on cancellation policy
 * @param {IBooking} booking - Booking to calculate refund for
 * @param {ITrip | null} trip - Associated trip
 * @returns {number} Refund amount
 */
const calculateRefund = (booking: IBooking, trip: ITrip | null): number => {
  if (!trip || !booking.totalAmount) {
    return 0;
  }

  const now = new Date();
  const departureTime = new Date(trip.departureTime);
  const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Refund policy:
  // - More than 24 hours: 90% refund
  // - 12-24 hours: 70% refund
  // - 6-12 hours: 50% refund
  // - 2-6 hours: 25% refund
  // - Less than 2 hours: No refund

  if (hoursUntilDeparture > 24) {
    return booking.totalAmount * 0.9;
  } else if (hoursUntilDeparture > 12) {
    return booking.totalAmount * 0.7;
  } else if (hoursUntilDeparture > 6) {
    return booking.totalAmount * 0.5;
  } else if (hoursUntilDeparture > 2) {
    return booking.totalAmount * 0.25;
  }

  return 0;
};

/**
 * Create a booking
 * @param {Object} bookingBody
 * @param {string} sessionId - Session ID to verify seat locks
 * @returns {Promise<IBooking>}
 */
const createBooking = async (bookingBody: Partial<IBooking>, sessionId?: string): Promise<IBooking> => {
  // Verify trip exists and has available seats
  const trip = await Trip.findById(bookingBody.trip);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  const requestedSeats = bookingBody.passengers?.map((p) => p.seatNumber) || [];

  // Check if seats are locked by other users
  const lockedSeats = await seatLockService.areSeatsLocked(trip._id, requestedSeats);
  if (lockedSeats && sessionId) {
    // Verify that this session owns the locks
    const ownsLock = await seatLockService.doesSessionOwnLock(trip._id, requestedSeats, sessionId);
    if (!ownsLock) {
      throw new ApiError(httpStatus.CONFLICT, 'One or more seats are locked by another user');
    }
  } else if (lockedSeats) {
    throw new ApiError(httpStatus.CONFLICT, 'One or more seats are locked by another user');
  }

  // Check if seats are already booked
  const alreadyBookedSeats = requestedSeats.filter((seat) => trip.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Seats ${alreadyBookedSeats.join(', ')} are already booked`);
  }

  // Check if enough seats available
  if (trip.availableSeats < requestedSeats.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough available seats');
  }

  // Create booking
  const booking = await Booking.create(bookingBody);

  // Update trip's booked seats and available seats
  trip.bookedSeats.push(...requestedSeats);
  trip.availableSeats -= requestedSeats.length;
  await trip.save();

  // Release seat locks after successful booking
  if (sessionId) {
    await seatLockService.releaseSpecificLocks(trip._id, requestedSeats, sessionId);
  }

  // Populate booking for email
  await booking.populate([
    {
      path: 'trip',
      populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
    },
  ]);

  // Send confirmation email
  try {
    if (bookingBody.user) {
      const user = await User.findById(bookingBody.user);
      if (user && user.email) {
        await emailService.sendBookingConfirmation(user.email, booking);
        logger.info(`Booking confirmation email queued for ${user.email}`);
      }
    }
  } catch (error) {
    logger.error('Failed to send booking confirmation email:', error);
    // Don't fail the booking if email fails
  }

  return booking;
};

/**
 * Create a guest booking (without authentication)
 * @param {Object} bookingBody
 * @param {string} sessionId - Session ID to verify seat locks
 * @returns {Promise<IBooking>}
 */
const createGuestBooking = async (bookingBody: Partial<IBooking>, sessionId?: string): Promise<IBooking> => {
  // Validate trip exists
  const trip = await Trip.findById(bookingBody.trip);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  const requestedSeats = bookingBody.passengers?.map((p) => p.seatNumber) || [];

  // Check if seats are locked by other users
  const lockedSeats = await seatLockService.areSeatsLocked(trip._id, requestedSeats);
  if (lockedSeats && sessionId) {
    // Verify that this session owns the locks
    const ownsLock = await seatLockService.doesSessionOwnLock(trip._id, requestedSeats, sessionId);
    if (!ownsLock) {
      throw new ApiError(httpStatus.CONFLICT, 'One or more seats are locked by another user');
    }
  } else if (lockedSeats) {
    throw new ApiError(httpStatus.CONFLICT, 'One or more seats are locked by another user');
  }

  // Check seat availability - check if seats are already booked
  const alreadyBookedSeats = requestedSeats.filter((seat) => trip.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `One or more seats (${alreadyBookedSeats.join(', ')}) are already booked`
    );
  }

  // Check if enough seats available
  if (trip.availableSeats < requestedSeats.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough available seats');
  }

  // Calculate total amount and passengers count
  const totalPassengers = bookingBody.passengers?.length || 0;
  const totalAmount = bookingBody.passengers?.reduce((sum, p) => sum + (p.seatPrice || trip.pricePerSeat), 0) || 0;

  // Generate unique reference number
  const referenceNumber = `BKG-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Prepare contact information
  const contactEmail = bookingBody.guestEmail || bookingBody.contactEmail || '';
  const contactPhone = bookingBody.guestPhone || bookingBody.contactPhone || '';

  // Create booking with pending status
  const booking = await Booking.create({
    ...bookingBody,
    referenceNumber,
    totalPassengers,
    totalAmount,
    contactEmail,
    contactPhone,
    status: 'pending',
    payment: {
      amount: totalAmount,
      currency: 'VND',
      status: 'pending',
    },
  } as Partial<IBooking>);

  // Update trip's booked seats and available seats
  trip.bookedSeats.push(...requestedSeats);
  trip.availableSeats -= requestedSeats.length;
  await trip.save();

  // Release seat locks after successful booking
  if (sessionId) {
    await seatLockService.releaseSpecificLocks(trip._id, requestedSeats, sessionId);
  }

  // Populate booking for email
  await booking.populate([
    {
      path: 'trip',
      populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
    },
  ]);

  // Send confirmation email to guest
  try {
    if (bookingBody.guestEmail) {
      await emailService.sendBookingConfirmation(bookingBody.guestEmail, booking);
      logger.info(`Guest booking confirmation email queued for ${bookingBody.guestEmail}`);
    }
  } catch (error) {
    logger.error('Failed to send guest booking confirmation email:', error);
    // Don't fail the booking if email fails
  }

  return booking;
};

/**
 * Query for bookings
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryBookings = async (filter: any, options: PaginateOptions) => {
  const bookings = await Booking.paginate(filter, {
    ...options,
    populate: [{ path: 'user' }, { path: 'trip', populate: { path: 'busId operatorId', model: 'Bus Operator' } }],
  });
  return bookings;
};

/**
 * Get booking by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IBooking | null>}
 */
const getBookingById = async (id: mongoose.Types.ObjectId): Promise<IBooking | null> => {
  return Booking.findById(id)
    .populate('user')
    .populate({ path: 'trip', populate: { path: 'bus route' } });
};

/**
 * Update booking by id
 * @param {mongoose.Types.ObjectId} bookingId
 * @param {Object} updateBody
 * @returns {Promise<IBooking | null>}
 */
const updateBookingById = async (
  bookingId: mongoose.Types.ObjectId,
  updateBody: Partial<IBooking>
): Promise<IBooking | null> => {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }
  Object.assign(booking, updateBody);
  await booking.save();
  return booking;
};

/**
 * Cancel booking
 * @param {mongoose.Types.ObjectId} bookingId
 * @param {string} reason
 * @returns {Promise<IBooking | null>}
 */
const cancelBooking = async (bookingId: mongoose.Types.ObjectId, reason: string): Promise<IBooking | null> => {
  const booking = await getBookingById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking is already cancelled');
  }

  // Update trip's available seats
  const trip = await Trip.findById(booking.trip);
  if (trip) {
    const seatNumbers = booking.passengers.map((p) => p.seatNumber);
    trip.bookedSeats = trip.bookedSeats.filter((seat) => !seatNumbers.includes(seat));
    trip.availableSeats += seatNumbers.length;
    await trip.save();
  }

  // Calculate refund based on cancellation time
  const refundAmount = calculateRefund(booking, trip);

  booking.status = 'cancelled';
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();

  // Update payment status with refund
  if (booking.payment) {
    booking.payment.refund = {
      amount: refundAmount,
      refundAmount: refundAmount,
      refundPercentage: booking.totalAmount ? Number(((refundAmount / booking.totalAmount) * 100).toFixed(0)) : 0,
      status: 'pending',
      requestedAt: new Date(),
    };
  }

  await booking.save();

  // Populate booking for email
  await booking.populate([
    {
      path: 'trip',
      populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
    },
  ]);

  // Send cancellation email
  try {
    let email: string | undefined;

    if (booking.user) {
      const user = await User.findById(booking.user);
      email = user?.email;
    } else if (booking.guestEmail) {
      email = booking.guestEmail;
    }

    if (email) {
      await emailService.sendEnhancedBookingCancellation(email, booking, refundAmount, reason);
      logger.info(`Cancellation email with refund details sent to ${email}`);
    }
  } catch (error) {
    logger.error('Failed to send booking cancellation email:', error);
    // Don't fail the cancellation if email fails
  }

  return booking;
};

export default {
  createBooking,
  createGuestBooking,
  queryBookings,
  getBookingById,
  updateBookingById,
  cancelBooking,
};
