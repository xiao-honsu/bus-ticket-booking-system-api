import mongoose from 'mongoose';
import Booking from './models/booking.model';
import config from './config/config';

const updateBookingTimestamps = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url);
    console.log('✅ Connected to MongoDB');

    console.log('\n📅 Updating booking timestamps to last 30 days...');

    // Get all bookings
    const bookings = await Booking.find({});
    console.log(`Found ${bookings.length} bookings`);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let updated = 0;
    for (const booking of bookings) {
      // Generate random date within last 30 days
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const randomHours = Math.floor(Math.random() * 24);
      const randomMinutes = Math.floor(Math.random() * 60);

      const newCreatedAt = new Date(now);
      newCreatedAt.setDate(now.getDate() - randomDaysAgo);
      newCreatedAt.setHours(randomHours);
      newCreatedAt.setMinutes(randomMinutes);

      // Update booking timestamps
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            createdAt: newCreatedAt,
            updatedAt: newCreatedAt,
          },
        }
      );

      updated++;
      if (updated % 10 === 0) {
        console.log(`   Updated ${updated}/${bookings.length} bookings...`);
      }
    }

    console.log(`\n✅ Successfully updated ${updated} booking timestamps`);

    // Show distribution
    const last7Days = await Booking.countDocuments({
      createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    });
    const last30Days = await Booking.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    console.log(`\n📊 Booking distribution:`);
    console.log(`   Last 7 days: ${last7Days} bookings`);
    console.log(`   Last 30 days: ${last30Days} bookings`);

    await mongoose.disconnect();
    console.log('\n✅ Done! Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating timestamps:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateBookingTimestamps();
