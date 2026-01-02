/**
 * Test script to debug chatbot database queries
 * Run with: npx ts-node scripts/test-chatbot-db.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Route from '../src/models/route.model';
import Trip from '../src/models/trip.model';
import Operator from '../src/models/operator.model';
import Bus from '../src/models/bus.model';

async function testDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-ticket-booking';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // ============================================
    // TEST 1: Check all routes
    // ============================================
    console.log('═══════════════════════════════════════════');
    console.log('TEST 1: All Available Routes');
    console.log('═══════════════════════════════════════════');

    const allRoutes = await Route.find({ isActive: true })
      .select('routeName origin.city destination.city distance')
      .sort({ 'stats.totalBookings': -1 });

    console.log(`Found ${allRoutes.length} active routes:\n`);

    if (allRoutes.length === 0) {
      console.log('❌ NO ROUTES IN DATABASE! You need to seed data first.');
      console.log('   Run: npm run seed:data\n');
    } else {
      allRoutes.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.origin.city} → ${r.destination.city} (${r.distance}km)`);
      });
    }

    // Get unique cities
    const originCities = [...new Set(allRoutes.map((r) => r.origin.city))];
    const destCities = [...new Set(allRoutes.map((r) => r.destination.city))];

    console.log('\n📍 Available origin cities:', originCities.join(', ') || 'None');
    console.log('📍 Available destination cities:', destCities.join(', ') || 'None');

    // ============================================
    // TEST 2: Check specific route (HCM → Da Nang)
    // ============================================
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 2: Search HCM → Đà Nẵng Route');
    console.log('═══════════════════════════════════════════');

    const hcmDanangRoutes = await Route.find({
      'origin.city': { $regex: /Hồ Chí Minh|Ho Chi Minh|HCM|Sài Gòn|Saigon/i },
      'destination.city': { $regex: /Đà Nẵng|Da Nang|Danang/i },
      isActive: true,
    });

    console.log(`Found ${hcmDanangRoutes.length} routes for HCM → Đà Nẵng\n`);

    if (hcmDanangRoutes.length > 0) {
      console.log('✅ Route exists! Checking trips...\n');

      // Check trips for this route
      const routeIds = hcmDanangRoutes.map((r) => r._id);
      const now = new Date();
      const future365 = new Date();
      future365.setDate(future365.getDate() + 365);

      const trips = await Trip.find({
        route: { $in: routeIds },
        departureTime: { $gte: now, $lte: future365 },
        status: 'scheduled',
        availableSeats: { $gt: 0 },
      })
        .populate('operator', 'companyName')
        .populate('bus', 'busType')
        .sort({ departureTime: 1 })
        .limit(10);

      console.log(`Found ${trips.length} scheduled trips with available seats:\n`);

      if (trips.length > 0) {
        trips.forEach((t: any, i) => {
          console.log(`  ${i + 1}. ${t.departureTime.toISOString()}`);
          console.log(`     Operator: ${t.operator?.companyName || 'N/A'}`);
          console.log(`     Bus Type: ${t.bus?.busType || 'N/A'}`);
          console.log(`     Price: ${t.pricePerSeat.toLocaleString('vi-VN')} VND`);
          console.log(`     Available: ${t.availableSeats} seats\n`);
        });
      } else {
        console.log('❌ No trips found for this route!');

        // Check if there are ANY trips for this route (including past)
        const allTripsForRoute = await Trip.countDocuments({ route: { $in: routeIds } });
        console.log(`   Total trips (including past/cancelled): ${allTripsForRoute}`);

        // Check trip statuses
        const tripStats = await Trip.aggregate([
          { $match: { route: { $in: routeIds } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        console.log('   Trips by status:', tripStats);
      }
    } else {
      console.log('❌ No route found for HCM → Đà Nẵng');
      console.log('   This route does not exist in the database.\n');
    }

    // ============================================
    // TEST 3: Check Ha Noi → Ninh Binh Route
    // ============================================
    console.log('\n═══════════════════════════════════════════');
    console.log('TEST 3: Search Hà Nội → Ninh Bình Route');
    console.log('═══════════════════════════════════════════');

    const hanoiNinhBinhRoutes = await Route.find({
      'origin.city': { $regex: /Hà Nội|Ha Noi|Hanoi/i },
      'destination.city': { $regex: /Ninh Bình|Ninh Binh/i },
      isActive: true,
    });

    console.log(`Found ${hanoiNinhBinhRoutes.length} routes for Hà Nội → Ninh Bình\n`);

    if (hanoiNinhBinhRoutes.length > 0) {
      const routeIds = hanoiNinhBinhRoutes.map((r) => r._id);
      const now = new Date();
      const future365 = new Date();
      future365.setDate(future365.getDate() + 365);

      const trips = await Trip.find({
        route: { $in: routeIds },
        departureTime: { $gte: now, $lte: future365 },
        status: 'scheduled',
      }).countDocuments();

      console.log(`Found ${trips} scheduled trips\n`);
    } else {
      console.log('❌ No route found for Hà Nội → Ninh Bình\n');
    }

    // ============================================
    // TEST 4: Database Statistics
    // ============================================
    console.log('═══════════════════════════════════════════');
    console.log('TEST 4: Database Statistics');
    console.log('═══════════════════════════════════════════\n');

    const totalRoutes = await Route.countDocuments({ isActive: true });
    const totalOperators = await Operator.countDocuments({ status: 'active' });
    const totalBuses = await Bus.countDocuments({ status: 'active' });
    const totalTrips = await Trip.countDocuments({ status: 'scheduled' });
    const futureTrips = await Trip.countDocuments({
      status: 'scheduled',
      departureTime: { $gte: new Date() },
    });

    console.log(`  📊 Active Routes:     ${totalRoutes}`);
    console.log(`  📊 Active Operators:  ${totalOperators}`);
    console.log(`  📊 Active Buses:      ${totalBuses}`);
    console.log(`  📊 Scheduled Trips:   ${totalTrips}`);
    console.log(`  📊 Future Trips:      ${futureTrips}`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n═══════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════\n');

    if (totalRoutes === 0 || futureTrips === 0) {
      console.log('⚠️  DATABASE IS EMPTY OR HAS NO FUTURE TRIPS!\n');
      console.log('To fix this, run the seed scripts:');
      console.log('  npm run seed:admin    # Create admin user');
      console.log('  npm run seed:data     # Create sample data\n');
      console.log('Or create a custom seed for specific routes.');
    } else {
      console.log('✅ Database has data. If chatbot still says "no trips found":');
      console.log('   1. Check if the specific route exists');
      console.log('   2. Check city name spelling in database vs query');
      console.log('   3. Check trip status and dates');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testDatabase();
