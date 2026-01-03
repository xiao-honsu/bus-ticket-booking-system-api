import mongoose from 'mongoose';
import Booking from '../src/models/booking.model';
import config from '../src/config/config';

const deleteCompletedBookings = async () => {
  try {
    await mongoose.connect(config.mongoose.url);
    console.log('Connected to MongoDB');

    // Delete all bookings with status 'completed'
    const result = await Booking.deleteMany({ status: 'completed' });
    console.log(`✅ Deleted ${result.deletedCount} completed bookings`);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error deleting completed bookings:', error);
    process.exit(1);
  }
};

deleteCompletedBookings();
