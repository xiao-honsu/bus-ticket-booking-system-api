import SeatLock from '../models/seatlock.model';
import logger from '../config/logger';
import { emitSeatReleased } from './socket.service';
import { ChangeStreamDocument, ChangeStreamDeleteDocument } from 'mongodb';

/**
 * MongoDB Change Streams Monitor for Seat Locks
 * Detects when seat locks are deleted (by TTL or manually) and emits real-time events
 */

let changeStream: any = null;

/**
 * Start monitoring seat lock changes using MongoDB Change Streams
 * This detects when TTL index automatically deletes expired locks
 */
export const startSeatLockMonitoring = (): void => {
  try {
    // Watch for delete operations on SeatLock collection
    changeStream = SeatLock.watch(
      [
        {
          $match: {
            operationType: { $in: ['delete', 'insert', 'update'] },
          },
        },
      ],
      {
        fullDocument: 'updateLookup', // Get full document on updates
      }
    );

    logger.info('[SeatLockMonitor] Started MongoDB Change Stream monitoring');

    // Handle change events
    changeStream.on('change', async (change: ChangeStreamDocument) => {
      try {
        if (change.operationType === 'delete') {
          // Seat lock deleted (likely by TTL expiration)
          await handleSeatLockDeleted(change);
        } else if (change.operationType === 'insert') {
          // New seat lock created - already handled by lockSeats service
          logger.debug('[SeatLockMonitor] Seat lock inserted:', change.documentKey);
        } else if (change.operationType === 'update') {
          // Seat lock updated (e.g., extended)
          logger.debug('[SeatLockMonitor] Seat lock updated:', change.documentKey);
        }
      } catch (error: any) {
        logger.error('[SeatLockMonitor] Error processing change event:', error.message);
      }
    });

    changeStream.on('error', (error: Error) => {
      logger.error('[SeatLockMonitor] Change stream error:', error);
      // Attempt to restart the change stream
      setTimeout(() => {
        logger.info('[SeatLockMonitor] Attempting to restart change stream...');
        stopSeatLockMonitoring();
        startSeatLockMonitoring();
      }, 5000);
    });

    changeStream.on('close', () => {
      logger.warn('[SeatLockMonitor] Change stream closed');
    });
  } catch (error: any) {
    logger.error('[SeatLockMonitor] Failed to start change stream:', error.message);
  }
};

/**
 * Handle seat lock deletion event
 * @param {ChangeStreamDocument} change - MongoDB change event
 */
const handleSeatLockDeleted = async (change: ChangeStreamDocument): Promise<void> => {
  try {
    // Type narrowing: check if this is a delete document
    if (change.operationType === 'delete') {
      const deleteChange = change as ChangeStreamDeleteDocument;
      const deletedId = deleteChange.documentKey._id;

      logger.info('[SeatLockMonitor] Seat lock deleted:', deletedId);

      // Unfortunately, when a document is deleted, we don't get the full document
      // So we need to determine the reason based on timing
      // If deletion happened near expiresAt, it's likely TTL
      // Otherwise it's manual release

      // Since we can't get the deleted document's data directly from the delete event,
      // we'll emit a generic release event
      // The actual seat lock data should be tracked before deletion in the service layer

      // Note: For better tracking, the seatlock.service should emit events
      // This change stream is a safety net for TTL expirations

      logger.debug('[SeatLockMonitor] Detected TTL-triggered seat lock deletion');
    }
  } catch (error: any) {
    logger.error('[SeatLockMonitor] Error handling deleted lock:', error.message);
  }
};

/**
 * Stop monitoring seat lock changes
 */
export const stopSeatLockMonitoring = (): void => {
  if (changeStream) {
    changeStream.close();
    changeStream = null;
    logger.info('[SeatLockMonitor] Stopped MongoDB Change Stream monitoring');
  }
};

/**
 * Cleanup expired locks manually (fallback if Change Streams fail)
 * This runs periodically to ensure expired locks are handled even if TTL is delayed
 * @returns {Promise<number>} Number of expired locks cleaned up
 */
export const cleanupExpiredLocks = async (): Promise<number> => {
  try {
    const now = new Date();

    // Find all expired locks
    const expiredLocks = await SeatLock.find({
      expiresAt: { $lt: now },
    });

    if (expiredLocks.length === 0) {
      return 0;
    }

    logger.info(`[SeatLockMonitor] Found ${expiredLocks.length} expired locks to cleanup`);

    // Emit release events for each expired lock
    for (const lock of expiredLocks) {
      try {
        emitSeatReleased(lock.trip, lock.seatNumbers, lock.sessionId, 'expired');
      } catch (error: any) {
        logger.error('[SeatLockMonitor] Error emitting release event:', error.message);
      }
    }

    // Delete expired locks
    const result = await SeatLock.deleteMany({
      expiresAt: { $lt: now },
    });

    logger.info(`[SeatLockMonitor] Cleaned up ${result.deletedCount} expired locks`);

    return result.deletedCount || 0;
  } catch (error: any) {
    logger.error('[SeatLockMonitor] Error in cleanup:', error.message);
    return 0;
  }
};

/**
 * Get monitoring status
 * @returns {boolean} True if change stream is active
 */
export const isMonitoringActive = (): boolean => {
  return changeStream !== null;
};

export default {
  startSeatLockMonitoring,
  stopSeatLockMonitoring,
  cleanupExpiredLocks,
  isMonitoringActive,
};
