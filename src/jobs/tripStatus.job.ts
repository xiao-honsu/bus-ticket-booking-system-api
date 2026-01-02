import cron from 'node-cron';
import Trip from '../models/trip.model';
import logger from '../config/logger';

/**
 * Cron job to automatically update trip status
 * Runs every 30 minutes to check and update trips:
 * - 'scheduled' to 'in_progress' if current time is between departure and arrival
 * - 'in_progress' to 'completed' if arrival time has passed
 * - 'scheduled' to 'completed' if departure time has passed and no arrival time set
 */
export const startTripStatusUpdater = (): void => {
  // Schedule: Run every 30 minutes (at :00 and :30 of each hour)
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        const now = new Date();

        logger.info(`[Cron] Starting trip status update check at ${now.toISOString()}`);

        // 1. Update trips from 'scheduled' to 'in_progress' if currently between departure and arrival
        const inProgressResult = await Trip.updateMany(
          {
            status: 'scheduled',
            departureTime: { $lte: now },
            arrivalTime: { $gt: now },
          },
          {
            $set: { status: 'in_progress' },
          }
        );

        if (inProgressResult.modifiedCount > 0) {
          logger.info(`[Cron] Auto-updated ${inProgressResult.modifiedCount} trip(s) to 'in_progress' status`);
        }

        // 2. Update trips from 'in_progress' to 'completed' if arrival time has passed
        const completedFromInProgressResult = await Trip.updateMany(
          {
            status: 'in_progress',
            arrivalTime: { $lte: now },
          },
          {
            $set: { status: 'completed' },
          }
        );

        if (completedFromInProgressResult.modifiedCount > 0) {
          logger.info(
            `[Cron] Auto-updated ${completedFromInProgressResult.modifiedCount} trip(s) from 'in_progress' to 'completed' status`
          );
        }

        // 3. Update trips from 'scheduled' to 'completed' if departure time has passed (fallback for trips without arrivalTime)
        const completedFromScheduledResult = await Trip.updateMany(
          {
            status: 'scheduled',
            departureTime: { $lt: now },
            $or: [{ arrivalTime: { $exists: false } }, { arrivalTime: null }, { arrivalTime: { $lte: now } }],
          },
          {
            $set: { status: 'completed' },
          }
        );

        if (completedFromScheduledResult.modifiedCount > 0) {
          logger.info(
            `[Cron] Auto-updated ${completedFromScheduledResult.modifiedCount} trip(s) from 'scheduled' to 'completed' status`
          );
        }

        const totalUpdated =
          inProgressResult.modifiedCount +
          completedFromInProgressResult.modifiedCount +
          completedFromScheduledResult.modifiedCount;

        if (totalUpdated === 0) {
          logger.debug('[Cron] No trips needed status update');
        } else {
          logger.info(`[Cron] Total trips updated: ${totalUpdated}`);
        }
      } catch (error) {
        logger.error('[Cron] Error in trip status updater:', error);
      }
    },
    {
      timezone: 'Asia/Ho_Chi_Minh', // Vietnam timezone
    }
  );

  logger.info('[Cron] Trip status updater scheduled (runs every 30 minutes)');
};

/**
 * Manual function to update trip statuses (can be called from API)
 * @returns {Promise<number>} Number of trips updated
 */
export const manualUpdateTripStatuses = async (): Promise<number> => {
  try {
    const now = new Date();

    // Update to in_progress
    const inProgressResult = await Trip.updateMany(
      {
        status: 'scheduled',
        departureTime: { $lte: now },
        arrivalTime: { $gt: now },
      },
      {
        $set: { status: 'in_progress' },
      }
    );

    // Update to completed from in_progress
    const completedFromInProgressResult = await Trip.updateMany(
      {
        status: 'in_progress',
        arrivalTime: { $lte: now },
      },
      {
        $set: { status: 'completed' },
      }
    );

    // Update to completed from scheduled (fallback)
    const completedFromScheduledResult = await Trip.updateMany(
      {
        status: 'scheduled',
        departureTime: { $lt: now },
        $or: [{ arrivalTime: { $exists: false } }, { arrivalTime: null }, { arrivalTime: { $lte: now } }],
      },
      {
        $set: { status: 'completed' },
      }
    );

    const totalUpdated =
      inProgressResult.modifiedCount +
      completedFromInProgressResult.modifiedCount +
      completedFromScheduledResult.modifiedCount;

    logger.info(
      `[Manual] Updated ${totalUpdated} trip(s) (${inProgressResult.modifiedCount} in_progress, ${completedFromInProgressResult.modifiedCount + completedFromScheduledResult.modifiedCount} completed)`
    );
    return totalUpdated;
  } catch (error) {
    logger.error('[Manual] Error updating trip statuses:', error);
    throw error;
  }
};
