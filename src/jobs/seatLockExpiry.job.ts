import cron from 'node-cron';
import SeatLock from '../models/seatlock.model';
import logger from '../config/logger';
import { emitSeatLockExpiring } from '../services/socket.service';

/**
 * Cron job to check and warn about expiring seat locks
 * Runs every 30 seconds to check locks expiring in the next minute
 */
export const startSeatLockExpiryWarning = (): void => {
  // Schedule: Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000); // 60 seconds from now

      // Find locks that will expire in the next minute and haven't sent reminder
      const expiringLocks = await SeatLock.find({
        expiresAt: {
          $gt: now,
          $lte: oneMinuteLater,
        },
        reminderSent: { $ne: true },
      });

      if (expiringLocks.length > 0) {
        logger.info(`[Cron] Found ${expiringLocks.length} lock(s) expiring in the next minute`);

        for (const lock of expiringLocks) {
          const remainingMs = lock.expiresAt.getTime() - now.getTime();
          const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

          // Emit warning to clients
          emitSeatLockExpiring(lock.trip, lock.sessionId, lock.seatNumbers, remainingSeconds);

          // Mark reminder as sent
          lock.reminderSent = true;
          await lock.save();

          logger.info(
            `[Cron] Sent expiry warning for session ${lock.sessionId}, seats: ${lock.seatNumbers.join(',')}, remaining: ${remainingSeconds}s`
          );
        }
      }
    } catch (error) {
      logger.error('[Cron] Error in seat lock expiry warning job:', error);
    }
  });

  logger.info('[Cron] Seat lock expiry warning job scheduled (runs every 30 seconds)');
};
