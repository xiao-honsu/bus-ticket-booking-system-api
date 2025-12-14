import cron from 'node-cron';
import Booking from '../models/booking.model';
import SeatLock from '../models/seatlock.model';
import User from '../models/user.model';
import emailService from './email.service';
import logger from '../config/logger';

/**
 * Send booking reminders (24 hours and 2 hours before departure)
 */
const sendBookingReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find bookings departing in ~24 hours (within 30 minute window)
    const bookings24h = await Booking.find({
      status: 'confirmed',
      reminderSent24h: { $ne: true },
    })
      .populate([
        {
          path: 'trip',
          match: {
            departureTime: {
              $gte: new Date(twentyFourHoursLater.getTime() - 15 * 60 * 1000),
              $lte: new Date(twentyFourHoursLater.getTime() + 15 * 60 * 1000),
            },
          },
          populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
        },
        { path: 'user' },
      ])
      .exec();

    // Send 24-hour reminders
    for (const booking of bookings24h) {
      if (!booking.trip) continue;

      try {
        let email: string | undefined;
        if (booking.user) {
          const user = booking.user as any;
          email = user.email;
        } else if (booking.guestEmail) {
          email = booking.guestEmail;
        }

        if (email) {
          await emailService.sendBookingReminder(email, booking, 24);
          booking.reminderSent24h = true;
          await booking.save();
          logger.info(`24h reminder sent for booking ${booking._id}`);
        }
      } catch (error) {
        logger.error(`Failed to send 24h reminder for booking ${booking._id}:`, error);
      }
    }

    // Find bookings departing in ~2 hours (within 15 minute window)
    const bookings2h = await Booking.find({
      status: 'confirmed',
      reminderSent2h: { $ne: true },
    })
      .populate([
        {
          path: 'trip',
          match: {
            departureTime: {
              $gte: new Date(twoHoursLater.getTime() - 7.5 * 60 * 1000),
              $lte: new Date(twoHoursLater.getTime() + 7.5 * 60 * 1000),
            },
          },
          populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
        },
        { path: 'user' },
      ])
      .exec();

    // Send 2-hour reminders
    for (const booking of bookings2h) {
      if (!booking.trip) continue;

      try {
        let email: string | undefined;
        if (booking.user) {
          const user = booking.user as any;
          email = user.email;
        } else if (booking.guestEmail) {
          email = booking.guestEmail;
        }

        if (email) {
          await emailService.sendBookingReminder(email, booking, 2);
          booking.reminderSent2h = true;
          await booking.save();
          logger.info(`2h reminder sent for booking ${booking._id}`);
        }
      } catch (error) {
        logger.error(`Failed to send 2h reminder for booking ${booking._id}:`, error);
      }
    }

    logger.info(
      `Booking reminders check completed. Sent ${bookings24h.length} 24h reminders and ${bookings2h.length} 2h reminders`
    );
  } catch (error) {
    logger.error('Error in sendBookingReminders:', error);
  }
};

/**
 * Send seat lock expiration reminders (2 minutes before expiration)
 */
const sendSeatLockReminders = async (): Promise<void> => {
  try {
    const now = new Date();
    const twoMinutesLater = new Date(now.getTime() + 2 * 60 * 1000);

    // Find seat locks expiring in ~2 minutes
    const expiringLocks = await SeatLock.find({
      expiresAt: {
        $gte: new Date(twoMinutesLater.getTime() - 30 * 1000), // 1:30 to 2:30 min window
        $lte: new Date(twoMinutesLater.getTime() + 30 * 1000),
      },
      reminderSent: { $ne: true },
    })
      .populate({
        path: 'trip',
        populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }],
      })
      .exec();

    for (const lock of expiringLocks) {
      if (!lock.trip) continue;

      try {
        const minutesLeft = Math.ceil((lock.expiresAt.getTime() - now.getTime()) / (1000 * 60));

        // Try to get email from user or use guest email stored in session metadata
        let email: string | undefined;
        if (lock.userId) {
          const user = await User.findById(lock.userId);
          email = user?.email;
        } else if (lock.metadata?.guestEmail) {
          email = lock.metadata.guestEmail;
        }

        if (email) {
          await emailService.sendSeatLockReminder(email, lock, minutesLeft);
          lock.reminderSent = true;
          await lock.save();
          logger.info(`Seat lock reminder sent for session ${lock.sessionId}`);
        }
      } catch (error) {
        logger.error(`Failed to send seat lock reminder for session ${lock.sessionId}:`, error);
      }
    }

    logger.info(`Seat lock reminders check completed. Sent ${expiringLocks.length} reminders`);
  } catch (error) {
    logger.error('Error in sendSeatLockReminders:', error);
  }
};

/**
 * Initialize notification scheduler with cron jobs
 */
const initializeScheduler = (): void => {
  // Run booking reminders every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    logger.info('Running booking reminders scheduler...');
    sendBookingReminders();
  });

  // Run seat lock reminders every 30 seconds
  cron.schedule('*/30 * * * * *', () => {
    sendSeatLockReminders();
  });

  logger.info('Notification scheduler initialized');
  logger.info('- Booking reminders: Every 15 minutes');
  logger.info('- Seat lock reminders: Every 30 seconds');
};

/**
 * Manually trigger booking reminders (for testing or manual execution)
 */
const triggerBookingReminders = async (): Promise<{ sent24h: number; sent2h: number }> => {
  const bookingsBefore = await Booking.countDocuments({ status: 'confirmed', reminderSent24h: { $ne: true } });
  await sendBookingReminders();
  const bookingsAfter = await Booking.countDocuments({ status: 'confirmed', reminderSent24h: { $ne: true } });

  return {
    sent24h: bookingsBefore - bookingsAfter,
    sent2h: 0, // Simplified for testing
  };
};

/**
 * Manually trigger seat lock reminders (for testing or manual execution)
 */
const triggerSeatLockReminders = async (): Promise<{ sent: number }> => {
  const locksBefore = await SeatLock.countDocuments({ reminderSent: { $ne: true } });
  await sendSeatLockReminders();
  const locksAfter = await SeatLock.countDocuments({ reminderSent: { $ne: true } });

  return {
    sent: locksBefore - locksAfter,
  };
};

export default {
  initializeScheduler,
  sendBookingReminders,
  sendSeatLockReminders,
  triggerBookingReminders,
  triggerSeatLockReminders,
};
