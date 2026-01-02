/**
 * Seed sample trips for testing chatbot
 * Run with: npx ts-node scripts/seed-sample-trips.ts
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

// Sample routes to create
const SAMPLE_ROUTES = [
  {
    routeName: 'Hồ Chí Minh - Đà Nẵng',
    origin: { city: 'Hồ Chí Minh', state: 'Hồ Chí Minh', landmark: 'Bến xe Miền Đông' },
    destination: { city: 'Đà Nẵng', state: 'Đà Nẵng', landmark: 'Bến xe Đà Nẵng' },
    distance: 964,
    estimatedDuration: 720, // 12 hours
  },
  {
    routeName: 'Hà Nội - Ninh Bình',
    origin: { city: 'Hà Nội', state: 'Hà Nội', landmark: 'Bến xe Giáp Bát' },
    destination: { city: 'Ninh Bình', state: 'Ninh Bình', landmark: 'Bến xe Ninh Bình' },
    distance: 93,
    estimatedDuration: 120, // 2 hours
  },
  {
    routeName: 'Hà Nội - Đà Nẵng',
    origin: { city: 'Hà Nội', state: 'Hà Nội', landmark: 'Bến xe Mỹ Đình' },
    destination: { city: 'Đà Nẵng', state: 'Đà Nẵng', landmark: 'Bến xe Đà Nẵng' },
    distance: 764,
    estimatedDuration: 840, // 14 hours
  },
  {
    routeName: 'Hồ Chí Minh - Đà Lạt',
    origin: { city: 'Hồ Chí Minh', state: 'Hồ Chí Minh', landmark: 'Bến xe Miền Đông' },
    destination: { city: 'Đà Lạt', state: 'Lâm Đồng', landmark: 'Bến xe Đà Lạt' },
    distance: 308,
    estimatedDuration: 420, // 7 hours
  },
  {
    routeName: 'Hồ Chí Minh - Nha Trang',
    origin: { city: 'Hồ Chí Minh', state: 'Hồ Chí Minh', landmark: 'Bến xe Miền Đông' },
    destination: { city: 'Nha Trang', state: 'Khánh Hòa', landmark: 'Bến xe Nha Trang' },
    distance: 435,
    estimatedDuration: 480, // 8 hours
  },
];

async function seedSampleTrips() {
  try {
    const mongoUri =
      process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-ticket-booking';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // ============================================
    // Step 1: Create or find Operator
    // ============================================
    console.log('📦 Step 1: Creating/finding operator...');
    let operator = await Operator.findOne({ status: 'active' });

    if (!operator) {
      operator = await Operator.create({
        companyName: 'Phương Trang FUTA Bus',
        email: 'contact@futabus.vn',
        phoneNumber: '1900 6067',
        licenseNumber: 'GPLX-001-VN',
        description: 'Nhà xe uy tín hàng đầu Việt Nam',
        status: 'active',
        rating: {
          overall: 4.5,
          cleanliness: 4.6,
          punctuality: 4.4,
          staff: 4.5,
          comfort: 4.5,
          value: 4.3,
          totalReviews: 1250,
        },
      });
      console.log('   ✅ Created new operator: ' + operator.companyName);
    } else {
      console.log('   ✅ Found existing operator: ' + operator.companyName);
    }

    // ============================================
    // Step 2: Create or find Bus
    // ============================================
    console.log('\n📦 Step 2: Creating/finding bus...');
    let bus: any = await Bus.findOne({ operator: operator._id, status: 'active' });

    if (!bus) {
      // Generate seat map
      const totalSeats = 34;
      const seats: Array<{
        seatNumber: string;
        row: number;
        column: number;
        seatType: 'standard' | 'vip' | 'window' | 'aisle';
      }> = [];
      for (let i = 1; i <= totalSeats; i++) {
        seats.push({
          seatNumber: `A${i.toString().padStart(2, '0')}`,
          row: Math.ceil(i / 4),
          column: ((i - 1) % 4) + 1,
          seatType: i <= 8 ? 'vip' : 'standard',
        });
      }

      bus = await Bus.create({
        operator: operator._id,
        busNumber: 'FT-001',
        licensePlate: '51B-12345',
        busType: 'limousine',
        totalSeats,
        amenities: ['wifi', 'airConditioning', 'usb', 'water', 'blanket', 'restroom'],
        status: 'active',
        seatMap: {
          name: 'Limousine 34 seats',
          rows: 9,
          columns: 4,
          seats,
        },
      } as any);
      console.log('   ✅ Created new bus: ' + bus.busNumber);
    } else {
      console.log('   ✅ Found existing bus: ' + bus.busNumber);
    }

    // ============================================
    // Step 3: Create Routes
    // ============================================
    console.log('\n📦 Step 3: Creating routes...');

    for (const routeData of SAMPLE_ROUTES) {
      let route = await Route.findOne({
        'origin.city': routeData.origin.city,
        'destination.city': routeData.destination.city,
      });

      if (!route) {
        route = await Route.create({
          ...routeData,
          isActive: true,
          stats: {
            totalTrips: 0,
            totalBookings: 0,
            averagePrice: 0,
          },
        });
        console.log(`   ✅ Created route: ${routeData.routeName}`);
      } else {
        console.log(`   ⏭️  Route exists: ${routeData.routeName}`);
      }
    }

    // ============================================
    // Step 4: Create Trips for each route
    // ============================================
    console.log('\n📦 Step 4: Creating trips for next 60 days...');

    const routes = await Route.find({ isActive: true });
    let tripsCreated = 0;

    for (const route of routes) {
      // Check if trips already exist for this route in the future
      const existingTrips = await Trip.countDocuments({
        route: route._id,
        departureTime: { $gte: new Date() },
        status: 'scheduled',
      });

      if (existingTrips > 0) {
        console.log(`   ⏭️  ${route.routeName}: ${existingTrips} trips already exist`);
        continue;
      }

      // Create trips for next 60 days
      const departureTimes = [6, 8, 10, 14, 20, 22]; // Multiple departures per day

      for (let day = 0; day < 60; day++) {
        for (const hour of departureTimes) {
          const departureTime = new Date();
          departureTime.setDate(departureTime.getDate() + day);
          departureTime.setHours(hour, 0, 0, 0);

          // Skip if departure time is in the past
          if (departureTime < new Date()) continue;

          const arrivalTime = new Date(departureTime);
          arrivalTime.setMinutes(arrivalTime.getMinutes() + route.estimatedDuration);

          // Price varies by time (night buses more expensive)
          const basePrice = Math.round((route.distance * 400) / 1000) * 1000; // ~400 VND/km
          const priceMultiplier = hour >= 20 || hour <= 6 ? 1.2 : 1;
          const pricePerSeat = Math.round(basePrice * priceMultiplier);

          await Trip.create({
            route: route._id,
            bus: bus._id,
            operator: operator._id,
            departureTime,
            arrivalTime,
            pricePerSeat,
            availableSeats: bus.totalSeats,
            bookedSeats: [],
            seatStatus: new Map(),
            status: 'scheduled',
            stats: {
              totalBookings: 0,
              totalRevenue: 0,
              occupancyRate: 0,
            },
          });

          tripsCreated++;
        }
      }

      console.log(`   ✅ ${route.routeName}: Created trips for 60 days`);
    }

    console.log(`\n🎉 Total trips created: ${tripsCreated}`);

    // ============================================
    // Summary
    // ============================================
    console.log('\n═══════════════════════════════════════════');
    console.log('SEED COMPLETED - SUMMARY');
    console.log('═══════════════════════════════════════════\n');

    const totalRoutes = await Route.countDocuments({ isActive: true });
    const totalTrips = await Trip.countDocuments({
      status: 'scheduled',
      departureTime: { $gte: new Date() },
    });

    console.log(`  📊 Active Routes:  ${totalRoutes}`);
    console.log(`  📊 Future Trips:   ${totalTrips}`);
    console.log('\n✅ You can now test the chatbot with these routes:');

    const finalRoutes = await Route.find({ isActive: true }).select('origin.city destination.city');
    finalRoutes.forEach((r) => {
      console.log(`   • ${r.origin.city} → ${r.destination.city}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the seed
seedSampleTrips();
