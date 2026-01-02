import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../config/config';
import Booking from '../models/booking.model';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import emailService from './email.service';
import { PayOS } from '@payos/node';

// Initialize PayOS only if credentials are provided
const payOS = new PayOS({
  clientId: config.payos.clientId,
  apiKey: config.payos.apiKey,
  checksumKey: config.payos.checksumKey,
});

// if (config.payos.clientId && config.payos.apiKey && config.payos.checksumKey) {
//   (async () => {
//     try {
//       // Dynamic import to handle ESM module
//       // eslint-disable-next-line @typescript-eslint/no-require-imports
//       const PayOSModule = require('@payos/node'); // Handle both CommonJS and ES Module exports
//       const PayOSConstructor = PayOSModule.default || PayOSModule;

//       // Verify it's a constructor function
//       if (typeof PayOSConstructor === 'function') {
//         payOS =
//       } else {
//         throw new Error('PayOS constructor not found in module exports');
//       }
//     } catch (error) {
//       // Silently fail if PayOS is not available (e.g., in tests)
//       // Don't show warning in test environment to keep test output clean
//       if (process.env.NODE_ENV !== 'test') {
//         console.warn('PayOS SDK not available:', error instanceof Error ? error.message : error);
//       }
//     }
//   })();
// }

/**
 * Create payment link for a booking
 * @param {mongoose.Types.ObjectId} bookingId
 * @returns {Promise<object>}
 */
const createPaymentLink = async (bookingId: mongoose.Types.ObjectId) => {
  if (!payOS) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Payment service is not configured');
  }

  const booking = await Booking.findById(bookingId).populate('trip');

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.payment.status === 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking already paid');
  }

  const orderCode = Date.now(); // Unique order code

  const paymentData = {
    orderCode,
    amount: booking.totalAmount,
    description: `Ticket #${orderCode}`, // Max 25 chars - PayOS requirement
    returnUrl: `${config.frontendUrl}/payment/success?orderCode=${orderCode}`,
    cancelUrl: `${config.frontendUrl}/payment/cancel?orderCode=${orderCode}&bookingId=${booking._id}`,
  };

  try {
    // Use paymentRequests.create() method from PayOS SDK v2
    const paymentLink = await payOS.paymentRequests.create(paymentData);

    // Update booking with payment info
    booking.payment.method = 'payos';
    booking.payment.transactionId = orderCode.toString();
    await booking.save();

    return {
      checkoutUrl: paymentLink.checkoutUrl,
      orderCode,
      bookingId: booking._id,
    };
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Payment link creation failed: ${error.message}`);
  }
};

/**
 * Verify webhook signature from PayOS
 * @param {object} webhookBody - Raw webhook body from PayOS
 * @returns {object} Verified webhook data
 */
const verifyWebhook = (webhookBody: any): any => {
  if (!payOS) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Payment service is not configured');
  }

  try {
    // Use PayOS SDK v2 webhooks.verify() method to validate signature
    const verifiedData = payOS.webhooks.verify(webhookBody);
    return verifiedData;
  } catch (error: any) {
    console.error('Webhook verification failed:', error.message);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid webhook signature');
  }
};

/**
 * Handle payment webhook from PayOS
 * @param {object} webhookData - Raw webhook body from PayOS
 * @returns {Promise<object>}
 */
const handlePaymentWebhook = async (webhookData: any) => {
  try {
    // CRITICAL: Verify webhook signature first
    const verifiedData = verifyWebhook(webhookData);

    const { orderCode, code } = verifiedData.data || verifiedData;

    // code === "00" means success in PayOS
    if (code === '00' || code === 0) {
      const booking = await Booking.findOne({ 'payment.transactionId': orderCode.toString() });

      if (booking) {
        booking.payment.status = 'completed';
        booking.payment.paidAt = new Date();
        booking.status = 'confirmed';
        booking.confirmedAt = new Date();
        await booking.save();

        // Populate booking for email template (needs trip, route, bus, operator details)
        await booking.populate([
          {
            path: 'trip',
            populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
          },
        ]);

        // Send confirmation email
        let email: string | undefined;

        if (booking.user) {
          const user = await User.findById(booking.user);
          email = user?.email;
        } else {
          email = booking.guestEmail;
        }

        if (email) {
          try {
            await emailService.sendBookingConfirmation(email, booking);
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't throw error, payment is still successful
          }
        }

        return { success: true, message: 'Payment processed successfully', bookingId: booking._id };
      } else {
        return { success: false, message: 'Booking not found for order code' };
      }
    } else {
      // Payment failed or cancelled
      const booking = await Booking.findOne({ 'payment.transactionId': orderCode.toString() });

      if (booking) {
        booking.payment.status = 'failed';
        booking.status = 'cancelled';
        await booking.save();
      }

      return { success: false, message: 'Payment failed or was cancelled' };
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Webhook processing failed: ${error.message}`);
  }
};

/**
 * Check payment status
 * @param {string} orderCode
 * @returns {Promise<object>}
 */
const checkPaymentStatus = async (orderCode: string) => {
  if (!payOS) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Payment service is not configured');
  }

  try {
    // Use paymentRequests.get() method from PayOS SDK v2
    const paymentInfo = await payOS.paymentRequests.get(Number(orderCode));

    // Also get booking information
    const booking = await Booking.findOne({ 'payment.transactionId': orderCode });

    return {
      paymentInfo,
      booking: booking
        ? {
            id: booking._id,
            status: booking.status,
            paymentStatus: booking.payment.status,
            totalAmount: booking.totalAmount,
          }
        : null,
    };
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Payment status check failed: ${error.message}`);
  }
};

/**
 * Cancel payment (for pending payments)
 * @param {mongoose.Types.ObjectId} bookingId
 * @returns {Promise<object>}
 */
const cancelPayment = async (bookingId: mongoose.Types.ObjectId) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  if (booking.payment.status === 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot cancel a paid booking through this endpoint');
  }

  booking.payment.status = 'failed';
  booking.status = 'cancelled';
  await booking.save();

  return { success: true, message: 'Payment cancelled successfully' };
};

export default {
  createPaymentLink,
  handlePaymentWebhook,
  checkPaymentStatus,
  cancelPayment,
};
