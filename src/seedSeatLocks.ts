/**
 * Seed script to create test data for seat locks
 * Usage: npm run seed:locks
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Trip from './models/trip.model';
import SeatLock from './models/seatlock.model';
import config from './config/config';

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedSeatLocks = async () => {
  try {
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing seat locks
    console.log('🗑️  Clearing existing seat locks...');
    await SeatLock.deleteMany({});
    console.log('✅ Cleared existing seat locks\n');

    // Get a trip to create locks for
    const trips = await Trip.find({ status: 'scheduled' }).limit(3);

    if (trips.length === 0) {
      console.log('⚠️  No scheduled trips found. Run seed:data first.');
      process.exit(1);
    }

    console.log(`📋 Creating seat locks for ${trips.length} trips...\n`);

    const locks = [];

    // Trip 1: Some seats locked by guest users
    const trip1 = trips[0];
    console.log(`Trip 1: ${trip1._id}`);

    // Guest session 1: Locked 2 seats, expires in 5 minutes
    const guestLock1 = await SeatLock.create({
      trip: trip1._id,
      seatNumbers: ['A1', 'A2'],
      sessionId: `guest-${Date.now()}-abc123`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      metadata: {
        guestEmail: 'guest1@example.com',
        guestPhone: '+84901234567',
      },
    });
    console.log(`  ✅ Created lock: ${guestLock1.seatNumbers.join(', ')} - expires in 5 min`);
    locks.push(guestLock1);

    // Guest session 2: Locked 3 seats, expires in 8 minutes
    const guestLock2 = await SeatLock.create({
      trip: trip1._id,
      seatNumbers: ['B1', 'B2', 'B3'],
      sessionId: `guest-${Date.now()}-xyz789`,
      expiresAt: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes
      metadata: {
        guestEmail: 'guest2@example.com',
      },
    });
    console.log(`  ✅ Created lock: ${guestLock2.seatNumbers.join(', ')} - expires in 8 min`);
    locks.push(guestLock2);

    // Trip 2: Mix of locks at different expiration times
    if (trips[1]) {
      const trip2 = trips[1];
      console.log(`\nTrip 2: ${trip2._id}`);

      // Lock expiring in 2 minutes (urgent)
      const urgentLock = await SeatLock.create({
        trip: trip2._id,
        seatNumbers: ['C1'],
        sessionId: `guest-${Date.now()}-urgent`,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
        metadata: {
          guestEmail: 'urgent@example.com',
        },
      });
      console.log(`  ✅ Created urgent lock: ${urgentLock.seatNumbers.join(', ')} - expires in 2 min`);
      locks.push(urgentLock);

      // Lock expiring in 10 minutes (fresh lock)
      const freshLock = await SeatLock.create({
        trip: trip2._id,
        seatNumbers: ['D1', 'D2', 'D3', 'D4'],
        sessionId: `guest-${Date.now()}-fresh`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        metadata: {
          guestEmail: 'fresh@example.com',
        },
      });
      console.log(`  ✅ Created fresh lock: ${freshLock.seatNumbers.join(', ')} - expires in 10 min`);
      locks.push(freshLock);
    }

    // Trip 3: Single seat locks (edge case testing)
    if (trips[2]) {
      const trip3 = trips[2];
      console.log(`\nTrip 3: ${trip3._id}`);

      // Multiple single-seat locks with different expiration times
      const singleLocks = ['E1', 'E2', 'E3'];
      for (let i = 0; i < singleLocks.length; i++) {
        const singleLock = await SeatLock.create({
          trip: trip3._id,
          seatNumbers: [singleLocks[i]],
          sessionId: `guest-${Date.now()}-single-${i}`,
          expiresAt: new Date(Date.now() + (3 + i * 2) * 60 * 1000), // 3, 5, 7 minutes
          metadata: {
            guestEmail: `single${i}@example.com`,
          },
        });
        console.log(`  ✅ Created single lock: ${singleLock.seatNumbers[0]} - expires in ${3 + i * 2} min`);
        locks.push(singleLock);
      }
    }

    console.log('\n✅ ============= SEAT LOCK SEEDING COMPLETE =============\n');
    console.log(`📊 Summary:`);
    console.log(`   - Total Locks Created: ${locks.length}`);
    console.log(`   - Trips with Locks: ${trips.length}`);
    console.log(`   - Total Seats Locked: ${locks.reduce((sum, lock) => sum + lock.seatNumbers.length, 0)}`);

    console.log(`\n📝 Test Scenarios Created:`);
    console.log(`   1. Multiple seats locked (2-4 seats per lock)`);
    console.log(`   2. Different expiration times (2min, 5min, 8min, 10min)`);
    console.log(`   3. Guest users with email metadata`);
    console.log(`   4. Single seat locks for edge case testing`);

    console.log(`\n🔗 Test URLs:`);
    trips.forEach((trip, idx) => {
      console.log(`   Trip ${idx + 1} Seat Map: http://localhost:4000/api/v1/trips/${trip._id}/seat-map`);
    });

    console.log(`\n💡 Testing Tips:`);
    console.log(`   - Locks will auto-expire based on expiresAt`);
    console.log(`   - Reminder emails sent 8min after creation (2min before expiry)`);
    console.log(`   - Use sessionId to release locks: POST /api/v1/seat-locks/release`);
    console.log(`   - Check availability: POST /api/v1/seat-locks/check-availability`);

    console.log(`\n✅ Disconnecting from MongoDB...`);
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error seeding seat locks:', error);
    process.exit(1);
  }
};

// Run the seeder
seedSeatLocks();
