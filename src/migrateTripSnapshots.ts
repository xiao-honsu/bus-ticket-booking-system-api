import mongoose from 'mongoose';
import config from './config/config';
import Booking from './models/booking.model';
import './models/trip.model'; // Import to register the model
import './models/route.model'; // Import to register the model
import './models/bus.model'; // Import to register the model
import './models/operator.model'; // Import to register the model
import logger from './config/logger';

/**
 * Migrate existing bookings to add tripSnapshot data
 * This script populates tripSnapshot for all bookings that don't have it
 */
async function migrateTripSnapshots() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB for tripSnapshot migration');

    // Find all bookings without tripSnapshot
    const bookingsWithoutSnapshot = await Booking.find({
      $or: [{ tripSnapshot: { $exists: false } }, { 'tripSnapshot.routeName': { $exists: false } }],
    })
      .populate([
        {
          path: 'trip',
          populate: [{ path: 'route' }, { path: 'bus', populate: { path: 'operator' } }, { path: 'operator' }],
        },
      ])
      .lean();

    logger.info(`Found ${bookingsWithoutSnapshot.length} bookings without tripSnapshot`);

    let updated = 0;
    let failed = 0;

    for (const booking of bookingsWithoutSnapshot) {
      try {
        const trip = booking.trip as any;

        if (!trip) {
          logger.warn(`Booking ${booking.referenceNumber} has no trip reference, skipping`);
          failed++;
          continue;
        }

        // Create trip snapshot
        const route = trip.route as any;
        const bus = trip.bus as any;
        const operator = trip.operator as any;

        const tripSnapshot = {
          routeName: route
            ? `${route.origin?.city || 'Unknown'} - ${route.destination?.city || 'Unknown'}`
            : 'Unknown Route',
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime,
          operatorName: operator?.companyName || bus?.operator?.companyName || 'Unknown Operator',
          busPlateNumber: bus?.plateNumber || 'Unknown',
        };

        // Update the booking
        await Booking.updateOne({ _id: booking._id }, { $set: { tripSnapshot } });

        updated++;
        if (updated % 10 === 0) {
          logger.info(`Updated ${updated} bookings...`);
        }
      } catch (error: any) {
        logger.error(`Failed to update booking ${booking.referenceNumber}:`, error.message);
        failed++;
      }
    }

    logger.info(`Migration completed! Updated: ${updated}, Failed: ${failed}`);
  } catch (error: any) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the migration
migrateTripSnapshots()
  .then(() => {
    logger.info('Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
