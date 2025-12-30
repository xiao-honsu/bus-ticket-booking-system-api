import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import Booking, { IBooking } from '../models/booking.model';
import Trip, { ITrip } from '../models/trip.model';
import User from '../models/user.model';
import SeatLock from '../models/seatlock.model';
import ApiError from '../utils/ApiError';
import emailService from './email.service';
import seatLockService from './seatlock.service';
import promotionService from './promotion.service';
import { emitSeatBooked } from './socket.service';
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

  // Check if enough seats available (including locked seats)
  const activeLocks = await SeatLock.find({
    trip: trip._id,
    expiresAt: { $gt: new Date() },
  });

  const lockedSeatsCount = new Set(activeLocks.flatMap((lock) => lock.seatNumbers)).size;

  const bus = trip.bus as any;
  const totalSeats = bus.totalSeats;
  const bookedSeatsCount = trip.bookedSeats.length;
  const actuallyAvailable = totalSeats - bookedSeatsCount - lockedSeatsCount;

  if (actuallyAvailable < requestedSeats.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough available seats. Available: ${actuallyAvailable}, Requested: ${requestedSeats.length}`
    );
  }

  // Calculate seat prices and add to passengers
  const passengersWithPrice = bookingBody.passengers?.map((p) => {
    // Use seat-specific pricing if available, otherwise use base price
    const seatPrice = trip.seatPricing?.get(p.seatNumber) || trip.pricePerSeat;
    return {
      ...p,
      seatPrice,
    };
  });

  // Generate unique reference number
  const referenceNumber = `BKG-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Calculate totals
  const totalPassengers = passengersWithPrice?.length || 0;
  const calculatedTotalAmount = passengersWithPrice?.reduce((sum, p) => sum + p.seatPrice, 0) || 0;

  // Handle promotion discount if provided
  let discountAmount = 0;
  let finalAmount = bookingBody.totalAmount || calculatedTotalAmount;
  let promotionData: any = {};

  if (bookingBody.userPromotion && bookingBody.user) {
    try {
      // Validate and apply promotion using userPromotionId
      const userPromotionId = new mongoose.Types.ObjectId(bookingBody.userPromotion as any);
      const userId = new mongoose.Types.ObjectId(bookingBody.user as any);

      const {
        promotion,
        discountAmount: discount,
        finalAmount: final,
      } = await promotionService.validatePromotionById(userId, userPromotionId, calculatedTotalAmount);

      discountAmount = discount;
      finalAmount = final;
      promotionData = {
        appliedPromotion: promotion._id,
        userPromotion: userPromotionId,
        discountAmount,
        originalAmount: calculatedTotalAmount,
      };
    } catch (error: any) {
      logger.warn(`Promotion validation failed: ${error.message}`);
      // Continue without promotion if validation fails
    }
  }

  // Prepare complete booking data with all required fields
  const completeBookingData: Partial<IBooking> = {
    ...bookingBody,
    referenceNumber,
    passengers: passengersWithPrice,
    totalPassengers,
    totalAmount: finalAmount, // Final amount after discount
    ...promotionData,
    payment: {
      amount: finalAmount,
      currency: 'VND',
      status: 'pending' as const,
      method: 'payos' as const, // Default to payos for now
    },
    status: 'pending' as const,
  };

  // Create booking
  const bookingDoc = await Booking.create(completeBookingData);
  const booking = Array.isArray(bookingDoc) ? bookingDoc[0] : bookingDoc;

  // Mark promotion as used if applied
  if (promotionData.userPromotion && bookingBody.user) {
    try {
      await promotionService.usePromotion(
        new mongoose.Types.ObjectId(bookingBody.user as any),
        promotionData.userPromotion,
        booking._id
      );
      logger.info(`Promotion ${promotionData.userPromotion} marked as used for booking ${booking._id}`);
    } catch (error: any) {
      logger.error(`Failed to mark promotion as used: ${error.message}`);
      // Don't fail the booking if promotion marking fails
    }
  }

  // Update trip's booked seats and available seats
  trip.bookedSeats.push(...requestedSeats);
  trip.availableSeats -= requestedSeats.length;
  await trip.save();

  // Release seat locks after successful booking
  if (sessionId) {
    await seatLockService.releaseSpecificLocks(trip._id, requestedSeats, sessionId);
  }
  // Emit real-time Socket.IO event for booked seats
  emitSeatBooked(trip._id, requestedSeats, booking.referenceNumber);
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

  // Check if enough seats available (including locked seats)
  const activeLocks = await SeatLock.find({
    trip: trip._id,
    expiresAt: { $gt: new Date() },
  });

  const lockedSeatsCount = new Set(activeLocks.flatMap((lock) => lock.seatNumbers)).size;

  const bus = trip.bus as any;
  const totalSeats = bus.totalSeats;
  const bookedSeatsCount = trip.bookedSeats.length;
  const actuallyAvailable = totalSeats - bookedSeatsCount - lockedSeatsCount;

  if (actuallyAvailable < requestedSeats.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough available seats. Available: ${actuallyAvailable}, Requested: ${requestedSeats.length}`
    );
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

  // Emit real-time Socket.IO event for booked seats
  emitSeatBooked(trip._id, requestedSeats, booking.referenceNumber);

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
    populate: [{ path: 'user' }, { path: 'trip', populate: { path: 'bus operator route' } }],
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
