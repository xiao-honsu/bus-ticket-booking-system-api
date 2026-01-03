import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

// Retry configuration for email sending
const EMAIL_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds max
  backoffMultiplier: 2,
};

// Helper function for delay with exponential backoff
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const transport = nodemailer.createTransport({
  ...config.email.smtp,
  // Increased timeouts for production environments (especially cloud platforms like Render)
  connectionTimeout: 30000, // 30 seconds (increased from 10s)
  greetingTimeout: 30000, // 30 seconds (increased from 10s)
  socketTimeout: 60000, // 60 seconds (increased from 30s)
  // Connection pool settings for better reliability
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  logger: config.env === 'development',
  debug: config.env === 'development',
});

/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() =>
      logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env')
    );
}

/**
 * Send an email with retry mechanism
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise}
 */
const sendEmail = async (to: string, subject: string, html: string, retryCount: number = 0): Promise<void> => {
  const msg = {
    from: config.email.from,
    to,
    subject,
    html,
  };

  try {
    await transport.sendMail(msg);
    logger.info(`Email sent successfully to ${to}${retryCount > 0 ? ` (after ${retryCount} retries)` : ''}`);
  } catch (error: any) {
    const isRetryableError =
      error.message?.includes('timeout') ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ECONNREFUSED') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNREFUSED';

    if (isRetryableError && retryCount < EMAIL_RETRY_CONFIG.maxRetries) {
      const delayMs = Math.min(
        EMAIL_RETRY_CONFIG.initialDelayMs * Math.pow(EMAIL_RETRY_CONFIG.backoffMultiplier, retryCount),
        EMAIL_RETRY_CONFIG.maxDelayMs
      );

      logger.warn(
        `Email to ${to} failed (attempt ${retryCount + 1}/${EMAIL_RETRY_CONFIG.maxRetries + 1}), ` +
          `retrying in ${delayMs}ms: ${error.message}`
      );

      await delay(delayMs);
      return sendEmail(to, subject, html, retryCount + 1);
    }

    logger.error(`Failed to send email to ${to} after ${retryCount + 1} attempts:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Load email template
 * @param {string} templateName
 * @param {object} variables
 * @returns {string}
 */
const loadTemplate = (templateName: string, variables: Record<string, any>): string => {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);

  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    logger.warn(`Email template not found: ${templatePath}`);
    return `<p>Template ${templateName} not found</p>`;
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  // Simple variable replacement
  Object.keys(variables).forEach((key) => {
    const value = variables[key] !== null && variables[key] !== undefined ? String(variables[key]) : '';
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return template;
};

/**
 * Send booking confirmation email with comprehensive details
 * @param {string} to - Recipient email
 * @param {IBooking} booking - Populated booking document
 */
const sendBookingConfirmation = async (to: string, booking: any): Promise<void> => {
  const subject = '🎉 Booking Confirmed - Your Bus Ticket is Ready!';

  try {
    // Extract trip details from populated booking
    const trip = booking.trip;
    const route = trip?.route;
    const bus = trip?.bus;
    const operator = trip?.operator || bus?.operator;

    // Format passenger list with seat details
    const passengersList =
      booking.passengers
        ?.map(
          (p: any) => `
        <div class="passenger-card">
          <h4>👤 ${p.name}</h4>
          <p style="margin: 5px 0;"><strong>Seat:</strong> <span class="seat-badge">${p.seatNumber}</span></p>
          <p style="margin: 5px 0;"><strong>Age:</strong> ${p.age || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Gender:</strong> ${p.gender || 'N/A'}</p>
        </div>
      `
        )
        .join('') || '<p>No passenger details available</p>';

    // Format seat numbers for display
    const seats = booking.passengers?.map((p: any) => p.seatNumber).join(', ') || 'N/A';

    // Format dates and times
    const departureTime = trip?.departureTime
      ? new Date(trip.departureTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    const arrivalTime = trip?.arrivalTime
      ? new Date(trip.arrivalTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    // Format amenities
    const amenities = bus?.amenities?.length ? bus.amenities.join(', ') : 'Standard amenities';

    const html = loadTemplate('booking-confirmation', {
      bookingId: booking._id.toString(),
      seats,
      seatCount: booking.passengers?.length || 0,
      totalPrice: booking.totalAmount?.toLocaleString() || '0',
      ticketPrice: booking.totalAmount?.toLocaleString() || '0',
      departureLocation: route?.origin?.city || 'N/A',
      arrivalLocation: route?.destination?.city || 'N/A',
      departureTime,
      arrivalTime,
      operatorName: operator?.name || 'N/A',
      busType: bus?.busType || 'N/A',
      busNumber: bus?.busNumber || 'N/A',
      amenities,
      passengersList,
      boardingPoint: route?.origin?.address || route?.origin?.city || 'N/A',
      viewBookingUrl: `${config.clientUrl}/bookings/${booking._id}`,
      downloadTicketUrl: `${config.clientUrl}/bookings/${booking._id}/download`,
      cancelBookingUrl: `${config.clientUrl}/bookings/${booking._id}/cancel`,
      supportPhone: config.supportPhone || '+1-234-567-8900',
      supportEmail: config.supportEmail || 'support@busticketing.com',
      websiteUrl: config.clientUrl || 'https://busticketing.com',
      termsUrl: `${config.clientUrl}/terms`,
      privacyUrl: `${config.clientUrl}/privacy`,
      supportUrl: `${config.clientUrl}/support`,
      facebookUrl: 'https://facebook.com/busticketing',
      twitterUrl: 'https://twitter.com/busticketing',
      instagramUrl: 'https://instagram.com/busticketing',
    });

    await sendEmail(to, subject, html);
    logger.info(`Enhanced booking confirmation email sent to ${to} for booking ${booking._id}`);
  } catch (error) {
    logger.error(`Failed to send booking confirmation email to ${to}:`, error);
    throw error;
  }
};

/**
 * Send booking cancellation email
 * @param {string} to
 * @param {object} booking
 */
const sendBookingCancellation = async (to: string, booking: any): Promise<void> => {
  const subject = 'Booking Cancellation - Bus Ticket Booking System';

  const html = loadTemplate('booking-cancellation', {
    bookingId: booking._id.toString(),
    refundAmount: booking.totalAmount || 0,
  });

  await sendEmail(to, subject, html);
  logger.info(`Booking cancellation email sent to ${to}`);
};

/**
 * Send trip update email
 * @param {string} to
 * @param {object} trip
 * @param {string} updateMessage
 */
const sendTripUpdate = async (to: string, trip: any, updateMessage: string): Promise<void> => {
  const subject = 'Trip Update - Bus Ticket Booking System';

  const html = loadTemplate('trip-update', {
    tripId: trip._id.toString(),
    updateMessage,
  });

  await sendEmail(to, subject, html);
  logger.info(`Trip update email sent to ${to}`);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 */
const sendResetPasswordEmail = async (to: string, token: string): Promise<void> => {
  const subject = 'Reset Your Password - Bus Ticket Booking System';

  // Use frontend URL for password reset
  const frontendUrl = config.frontendUrl || 'http://localhost:3001';
  // const resetPasswordUrl = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const resetPasswordUrl = new URL(`/auth/reset-password?token=${encodeURIComponent(token)}`, frontendUrl).toString();

  const html = loadTemplate('reset-password', {
    resetPasswordUrl,
  });

  await sendEmail(to, subject, html);
  logger.info(`Password reset email sent to ${to}`);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 */
const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const subject = 'Verify Your Email - Bus Ticket Booking System';

  // Use frontend URL for verification
  const frontendUrl = config.frontendUrl || 'http://localhost:3001';
  const verificationUrl = `${frontendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const html = loadTemplate('verify-email', {
    verificationUrl,
  });

  await sendEmail(to, subject, html);
  logger.info(`Verification email sent to ${to}`);
};

/**
 * Send booking reminder email (24h or 2h before departure)
 * @param {string} to - Recipient email
 * @param {any} booking - Populated booking document
 * @param {number} hoursBeforeDeparture - Hours remaining (24 or 2)
 */
const sendBookingReminder = async (to: string, booking: any, hoursBeforeDeparture: number): Promise<void> => {
  const subject = `⏰ Trip Reminder: Your journey in ${hoursBeforeDeparture} hours!`;

  try {
    const trip = booking.trip;
    const route = trip?.route;
    const bus = trip?.bus;
    const operator = trip?.operator || bus?.operator;

    const seats = booking.passengers?.map((p: any) => p.seatNumber).join(', ') || 'N/A';

    const departureTime = trip?.departureTime
      ? new Date(trip.departureTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    const arrivalTime = trip?.arrivalTime
      ? new Date(trip.arrivalTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    const timeRemaining = hoursBeforeDeparture === 24 ? '24 hours' : '2 hours';

    const html = loadTemplate('booking-reminder', {
      bookingId: booking._id.toString(),
      timeRemaining,
      departureLocation: route?.origin?.city || 'N/A',
      arrivalLocation: route?.destination?.city || 'N/A',
      departureTime,
      arrivalTime,
      seats,
      operatorName: operator?.name || 'N/A',
      busType: bus?.busType || 'N/A',
      boardingPoint: route?.origin?.address || route?.origin?.city || 'N/A',
      viewBookingUrl: `${config.clientUrl}/bookings/${booking._id}`,
      downloadTicketUrl: `${config.clientUrl}/bookings/${booking._id}/download`,
      cancelBookingUrl: `${config.clientUrl}/bookings/${booking._id}/cancel`,
      supportPhone: config.supportPhone || '+1-234-567-8900',
      supportEmail: config.supportEmail || 'support@busticketing.com',
    });

    await sendEmail(to, subject, html);
    logger.info(`Booking reminder (${hoursBeforeDeparture}h) sent to ${to} for booking ${booking._id}`);
  } catch (error) {
    logger.error(`Failed to send booking reminder to ${to}:`, error);
    throw error;
  }
};

/**
 * Send seat lock expiration reminder
 * @param {string} to - Recipient email
 * @param {any} seatLock - Seat lock document with trip details
 * @param {number} minutesLeft - Minutes remaining before expiration
 */
const sendSeatLockReminder = async (to: string, seatLock: any, minutesLeft: number): Promise<void> => {
  const subject = `🚨 Hurry! Your seats expire in ${minutesLeft} minutes`;

  try {
    const trip = seatLock.trip;
    const route = trip?.route;
    const bus = trip?.bus;

    const seatNumbers = seatLock.seatNumbers?.join(', ') || 'N/A';
    const seatNumbersDisplay =
      seatLock.seatNumbers?.map((seat: string) => `<span class="seat-number">${seat}</span>`).join('') || '';

    const departureTime = trip?.departureTime
      ? new Date(trip.departureTime).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    const totalPrice = seatLock.seatNumbers?.length
      ? (seatLock.seatNumbers.length * (trip?.price || 0)).toLocaleString()
      : '0';

    const html = loadTemplate('seat-lock-reminder', {
      minutesLeft: minutesLeft.toString(),
      sessionId: seatLock.sessionId,
      seatNumbers,
      seatNumbersDisplay,
      departureCity: route?.origin?.city || 'N/A',
      arrivalCity: route?.destination?.city || 'N/A',
      departureTime,
      busType: bus?.busType || 'N/A',
      totalPrice,
      completeBookingUrl: `${config.clientUrl}/booking/complete?sessionId=${seatLock.sessionId}`,
      extendLockUrl: `${config.clientUrl}/booking/extend?sessionId=${seatLock.sessionId}`,
      supportPhone: config.supportPhone || '+1-234-567-8900',
      supportEmail: config.supportEmail || 'support@busticketing.com',
    });

    await sendEmail(to, subject, html);
    logger.info(`Seat lock reminder sent to ${to} for session ${seatLock.sessionId}`);
  } catch (error) {
    logger.error(`Failed to send seat lock reminder to ${to}:`, error);
    throw error;
  }
};

/**
 * Send enhanced booking cancellation email with refund details
 * @param {string} to - Recipient email
 * @param {any} booking - Booking document
 * @param {number} refundAmount - Calculated refund amount
 * @param {string} refundReason - Reason for cancellation
 */
const sendEnhancedBookingCancellation = async (
  to: string,
  booking: any,
  refundAmount: number,
  refundReason?: string
): Promise<void> => {
  const subject = '❌ Booking Cancelled - Refund Initiated';

  try {
    const trip = booking.trip;
    const route = trip?.route;

    const seats = booking.passengers?.map((p: any) => p.seatNumber).join(', ') || 'N/A';
    const refundPercentage = booking.totalAmount ? ((refundAmount / booking.totalAmount) * 100).toFixed(0) : '0';

    const html = loadTemplate('booking-cancellation', {
      bookingId: booking._id.toString(),
      refundAmount: refundAmount.toLocaleString(),
      refundPercentage,
      originalAmount: booking.totalAmount?.toLocaleString() || '0',
      cancellationReason: refundReason || 'User requested cancellation',
      seats,
      departureLocation: route?.origin?.city || 'N/A',
      arrivalLocation: route?.destination?.city || 'N/A',
      supportPhone: config.supportPhone || '+1-234-567-8900',
      supportEmail: config.supportEmail || 'support@busticketing.com',
    });

    await sendEmail(to, subject, html);
    logger.info(`Enhanced cancellation email sent to ${to} for booking ${booking._id}`);
  } catch (error) {
    logger.error(`Failed to send enhanced cancellation email to ${to}:`, error);
    throw error;
  }
};

/**
 * Send enhanced trip update email
 * @param {string} to - Recipient email
 * @param {any} booking - Booking document
 * @param {string} updateType - Type of update (delay, cancellation, gate_change, etc.)
 * @param {any} updateDetails - Details about the update
 */
const sendEnhancedTripUpdate = async (
  to: string,
  booking: any,
  updateType: string,
  updateDetails: any
): Promise<void> => {
  const updateTypeLabels: Record<string, string> = {
    delay: '⏰ Trip Delayed',
    cancellation: '❌ Trip Cancelled',
    gate_change: '📍 Boarding Point Changed',
    time_change: '🕐 Departure Time Changed',
    bus_change: '🚌 Bus Changed',
  };

  const subject = updateTypeLabels[updateType] || '⚠️ Important Trip Update';

  try {
    const trip = booking.trip;
    const route = trip?.route;

    const html = loadTemplate('trip-update', {
      tripId: trip?._id.toString() || 'N/A',
      bookingId: booking._id.toString(),
      updateMessage: updateDetails.message || 'There has been an update to your trip',
      updateType: updateTypeLabels[updateType] || 'Trip Update',
      oldValue: updateDetails.oldValue || '',
      newValue: updateDetails.newValue || '',
      departureLocation: route?.origin?.city || 'N/A',
      arrivalLocation: route?.destination?.city || 'N/A',
      refundAvailable: updateType === 'cancellation' ? 'Yes' : 'No',
      viewBookingUrl: `${config.clientUrl}/bookings/${booking._id}`,
      supportPhone: config.supportPhone || '+1-234-567-8900',
      supportEmail: config.supportEmail || 'support@busticketing.com',
    });

    await sendEmail(to, subject, html);
    logger.info(`Trip update (${updateType}) email sent to ${to} for booking ${booking._id}`);
  } catch (error) {
    logger.error(`Failed to send trip update email to ${to}:`, error);
    throw error;
  }
};

export default {
  transport,
  sendEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendEnhancedBookingCancellation,
  sendTripUpdate,
  sendEnhancedTripUpdate,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendBookingReminder,
  sendSeatLockReminder,
};
