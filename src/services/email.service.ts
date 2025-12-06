import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

const transport = nodemailer.createTransport(config.email.smtp);

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
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @returns {Promise}
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const msg = {
    from: config.email.from,
    to,
    subject,
    html,
  };
  await transport.sendMail(msg);
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
 * Send booking confirmation email
 * @param {string} to
 * @param {object} booking
 */
const sendBookingConfirmation = async (to: string, booking: any): Promise<void> => {
  const subject = 'Booking Confirmation - Bus Ticket Booking System';

  // Extract seat numbers from passengers
  const seats = booking.passengers?.map((p: any) => p.seatNumber).join(', ') || 'N/A';

  const html = loadTemplate('booking-confirmation', {
    bookingId: booking._id.toString(),
    seats,
    totalPrice: booking.totalAmount || 0,
    tripDate: booking.trip?.departureTime || 'N/A',
  });

  await sendEmail(to, subject, html);
  logger.info(`Booking confirmation email sent to ${to}`);
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
  const subject = 'Reset password';
  const resetPasswordUrl = `http://localhost:3000/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 */
const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const subject = 'Email Verification';
  const verificationEmailUrl = `http://localhost:3000/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

export default {
  transport,
  sendEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendTripUpdate,
  sendResetPasswordEmail,
  sendVerificationEmail,
};
