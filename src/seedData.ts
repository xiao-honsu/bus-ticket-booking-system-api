import mongoose from 'mongoose';
import User, { IUser } from './models/user.model';
import Route, { IRoute } from './models/route.model';
import Bus, { IBus } from './models/bus.model';
import Trip, { ITrip } from './models/trip.model';
import Booking, { IBooking, IPassenger, IPayment, ITripSnapshot } from './models/booking.model';
import Operator, { IOperator } from './models/operator.model';
import config from './config/config';

/**
 * Comprehensive seed script for testing dashboard with real data
 * Run with: npm run seed:data or ts-node src/seedData.ts
 *
 * Features:
 * - Checks if data exists before seeding (idempotent)
 * - Creates admin + test users
 * - Creates operators, buses, routes
 * - Creates past, present, and future trips
 * - Creates bookings with different statuses
 */

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url);
    console.log('✅ Connected to MongoDB');

    // ============= STEP 1: Seed Users =============
    console.log('\n📋 Step 1: Seeding Users...');

    const adminData: Partial<IUser> = {
      name: 'Admin User',
      email: 'admin@busticket.com',
      password: 'Admin@123456',
      role: 'admin',
      isEmailVerified: true,
      phone: '+84123456789',
      status: 'active',
    };

    let adminUser = await User.findOne({ email: adminData.email });
    if (!adminUser) {
      adminUser = await User.create(adminData);
      console.log('   ✅ Admin user created:', adminData.email);
    } else {
      console.log('   ⚠️  Admin already exists:', adminData.email);
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('   ✅ Updated role to admin');
      }
    }

    const testUserData: Partial<IUser> = {
      name: 'Test User',
      email: 'user@busticket.com',
      password: 'User@123456',
      role: 'user',
      isEmailVerified: true,
      phone: '+84987654321',
      status: 'active',
    };

    let testUser = await User.findOne({ email: testUserData.email });
    if (!testUser) {
      testUser = await User.create(testUserData);
      console.log('   ✅ Test user created:', testUserData.email);
    } else {
      console.log('   ⚠️  Test user already exists:', testUserData.email);
    }

    // ============= STEP 2: Seed Operators =============
    console.log('\n📋 Step 2: Seeding Operators...');

    const operatorsData: Partial<IOperator>[] = [
      {
        companyName: 'Phuong Trang (FUTA Bus Lines)',
        email: 'info@futabus.vn',
        phoneNumber: '+84283838383',
        licenseNumber: 'FUTA-2020-001',
        description: 'Leading bus operator in Vietnam with modern fleet and excellent service',
        status: 'active',
      },
      {
        companyName: 'Hoang Long Bus',
        email: 'info@hoanglong.vn',
        phoneNumber: '+84243733555',
        licenseNumber: 'HL-2019-002',
        description: 'Premium bus service connecting major cities in Northern Vietnam',
        status: 'active',
      },
    ];

    const operators = [];
    for (const opData of operatorsData) {
      let operator = await Operator.findOne({ licenseNumber: opData.licenseNumber });
      if (!operator) {
        operator = await Operator.create(opData);
        console.log(`   ✅ Operator created: ${opData.companyName}`);
      } else {
        console.log(`   ⚠️  Operator already exists: ${opData.companyName}`);
      }
      operators.push(operator);
    }

    // ============= STEP 3: Seed Buses =============
    console.log('\n📋 Step 3: Seeding Buses...');

    const busesData: Partial<IBus>[] = [
      {
        busNumber: 'FT-001',
        licensePlate: '51B-12345',
        busType: 'sleeper',
        totalSeats: 40,
        amenities: ['wifi', 'ac', 'charging_port', 'blanket'],
        operator: operators[0]._id,
        status: 'active',
      },
      {
        busNumber: 'FT-002',
        licensePlate: '51B-67890',
        busType: 'standard',
        totalSeats: 45,
        amenities: ['wifi', 'ac', 'charging_port'],
        operator: operators[0]._id,
        status: 'active',
      },
      {
        busNumber: 'HL-001',
        licensePlate: '29B-11111',
        busType: 'sleeper',
        totalSeats: 36,
        amenities: ['wifi', 'ac', 'entertainment', 'blanket'],
        operator: operators[1]._id,
        status: 'active',
      },
    ];

    const buses = [];
    for (const busData of busesData) {
      let bus = await Bus.findOne({ licensePlate: busData.licensePlate });
      if (!bus) {
        bus = await Bus.create(busData);
        console.log(`   ✅ Bus created: ${busData.busNumber}`);
      } else {
        console.log(`   ⚠️  Bus already exists: ${busData.busNumber}`);
      }
      buses.push(bus);
    }

    // ============= STEP 4: Seed Routes =============
    console.log('\n📋 Step 4: Seeding Routes...');

    const routesData: Partial<IRoute>[] = [
      {
        routeName: 'Ho Chi Minh City to Da Lat',
        origin: {
          city: 'Ho Chi Minh City',
          state: 'Ho Chi Minh',
          landmark: 'Ben Xe Mien Dong',
        },
        destination: {
          city: 'Da Lat',
          state: 'Lam Dong',
          landmark: 'Da Lat Bus Station',
        },
        distance: 308,
        estimatedDuration: 420, // 7 hours in minutes
        isActive: true,
      },
      {
        routeName: 'Hanoi to Ha Long',
        origin: {
          city: 'Hanoi',
          state: 'Hanoi',
          landmark: 'My Dinh Bus Station',
        },
        destination: {
          city: 'Ha Long',
          state: 'Quang Ninh',
          landmark: 'Ha Long Bus Station',
        },
        distance: 165,
        estimatedDuration: 240, // 4 hours
        isActive: true,
      },
      {
        routeName: 'Ho Chi Minh City to Vung Tau',
        origin: {
          city: 'Ho Chi Minh City',
          state: 'Ho Chi Minh',
          landmark: 'Ben Xe Mien Dong',
        },
        destination: {
          city: 'Vung Tau',
          state: 'Ba Ria - Vung Tau',
          landmark: 'Vung Tau Bus Station',
        },
        distance: 125,
        estimatedDuration: 150, // 2.5 hours
        isActive: true,
      },
      {
        routeName: 'Hanoi to Ninh Binh',
        origin: {
          city: 'Hanoi',
          state: 'Hanoi',
          landmark: 'Giap Bat Bus Station',
        },
        destination: {
          city: 'Ninh Binh',
          state: 'Ninh Binh',
          landmark: 'Ninh Binh Bus Station',
        },
        distance: 95,
        estimatedDuration: 120, // 2 hours
        isActive: true,
      },
    ];

    const routes = [];
    for (const routeData of routesData) {
      let route = await Route.findOne({
        'origin.city': routeData.origin!.city,
        'destination.city': routeData.destination!.city,
      });
      if (!route) {
        route = await Route.create(routeData);
        console.log(`   ✅ Route created: ${routeData.origin!.city} → ${routeData.destination!.city}`);
      } else {
        console.log(`   ⚠️  Route already exists: ${routeData.origin!.city} → ${routeData.destination!.city}`);
      }
      routes.push(route);
    }

    // ============= STEP 5: Seed Trips =============
    console.log('\n📋 Step 5: Seeding Trips...');

    const now = new Date();
    const trips = [];

    // Helper to create trip
    const createTrip = async (route: any, bus: any, daysOffset: number, hour: number) => {
      const departureTime = new Date(now);
      departureTime.setDate(departureTime.getDate() + daysOffset);
      departureTime.setHours(hour, 0, 0, 0);

      const arrivalTime = new Date(departureTime);
      arrivalTime.setMinutes(arrivalTime.getMinutes() + route.estimatedDuration);

      const tripData: Partial<ITrip> = {
        route: route._id,
        bus: bus._id,
        operator: bus.operator,
        departureTime,
        arrivalTime,
        pricePerSeat: 250000,
        availableSeats: bus.totalSeats,
        bookedSeats: [],
        status: 'scheduled',
      };

      // Check if trip already exists for this route, bus, and time
      let trip = await Trip.findOne({
        route: route._id,
        bus: bus._id,
        departureTime: { $gte: departureTime, $lt: new Date(departureTime.getTime() + 3600000) }, // within 1 hour
      });

      if (!trip) {
        trip = await Trip.create(tripData);
        console.log(
          `   ✅ Trip created: ${route.origin.city} → ${route.destination.city} on ${departureTime.toLocaleDateString()}`
        );
      } else {
        console.log(
          `   ⚠️  Trip already exists: ${route.origin.city} → ${route.destination.city} on ${departureTime.toLocaleDateString()}`
        );
      }

      return trip;
    };

    // Create past trips (for completed bookings)
    trips.push(await createTrip(routes[0], buses[0], -7, 8)); // 7 days ago, 8 AM
    trips.push(await createTrip(routes[1], buses[2], -5, 14)); // 5 days ago, 2 PM
    trips.push(await createTrip(routes[2], buses[1], -3, 10)); // 3 days ago, 10 AM

    // Create today's trips
    trips.push(await createTrip(routes[0], buses[0], 0, 6)); // Today 6 AM
    trips.push(await createTrip(routes[1], buses[2], 0, 16)); // Today 4 PM

    // Create future trips (for upcoming bookings)
    trips.push(await createTrip(routes[0], buses[0], 3, 8)); // 3 days from now
    trips.push(await createTrip(routes[1], buses[2], 5, 10)); // 5 days from now
    trips.push(await createTrip(routes[2], buses[1], 7, 14)); // 7 days from now
    trips.push(await createTrip(routes[3], buses[1], 10, 9)); // 10 days from now

    // ============= STEP 6: Seed Bookings =============
    console.log('\n📋 Step 6: Seeding Bookings...');

    const createBooking = async (
      trip: any,
      user: any,
      seats: string[],
      status: 'pending' | 'confirmed' | 'cancelled' | 'completed',
      paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
    ) => {
      const referenceNumber = `BKG-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      // Check if booking already exists for this trip and user
      let booking = await Booking.findOne({
        trip: trip._id,
        user: user._id,
      });

      if (booking) {
        console.log(`   ⚠️  Booking already exists for user ${user.email} on trip ${trip._id}`);
        return booking;
      }

      // Get full trip details with route
      const fullTrip = await Trip.findById(trip._id).populate('route');
      if (!fullTrip) {
        console.log(`   ❌ Trip not found: ${trip._id}`);
        return null;
      }

      const passengers: IPassenger[] = seats.map((seat, index) => ({
        name: `${user.name} ${index > 0 ? index + 1 : ''}`,
        age: 25 + index,
        gender: (index % 2 === 0 ? 'male' : 'female') as 'male' | 'female' | 'other',
        seatNumber: seat,
        seatPrice: fullTrip.pricePerSeat,
      }));

      const totalAmount = passengers.reduce((sum, p) => sum + p.seatPrice, 0);

      const payment: IPayment = {
        amount: totalAmount,
        currency: 'VND',
        status: paymentStatus,
        method: paymentStatus === 'completed' ? 'payos' : undefined,
        paidAt: paymentStatus === 'completed' ? new Date() : undefined,
      };

      const tripSnapshot: ITripSnapshot = {
        routeName: `${(fullTrip as any).route.origin.city} to ${(fullTrip as any).route.destination.city}`,
        departureTime: fullTrip.departureTime,
        arrivalTime: fullTrip.arrivalTime,
        operatorName: 'Bus Operator',
        busPlateNumber: 'Unknown',
      };

      const bookingData: Partial<IBooking> = {
        user: user._id,
        trip: trip._id,
        passengers,
        totalPassengers: seats.length,
        totalAmount,
        contactEmail: user.email,
        contactPhone: user.phone,
        referenceNumber,
        status,
        payment,
        modifications: [],
        tripSnapshot,
      };

      const createdBooking = await Booking.create(bookingData);
      booking = Array.isArray(createdBooking) ? createdBooking[0] : createdBooking;

      // Update trip's booked seats and available seats
      if (status === 'confirmed' || status === 'completed') {
        await Trip.findByIdAndUpdate(trip._id, {
          $push: { bookedSeats: { $each: seats } },
          $inc: { availableSeats: -seats.length },
        });
      }

      console.log(`   ✅ Booking created: ${referenceNumber} - ${status}`);
      return booking;
    };

    // Create bookings for test user
    // Past completed bookings
    await createBooking(trips[0], testUser, ['A1', 'A2'], 'completed', 'completed');
    await createBooking(trips[1], testUser, ['B3'], 'completed', 'completed');
    await createBooking(trips[2], testUser, ['C1', 'C2'], 'completed', 'completed');

    // Current confirmed bookings (upcoming)
    await createBooking(trips[5], testUser, ['A1', 'A2'], 'confirmed', 'completed');
    await createBooking(trips[6], testUser, ['B1'], 'confirmed', 'completed');

    // Pending booking
    await createBooking(trips[7], testUser, ['A3'], 'pending', 'pending');

    // Cancelled booking
    await createBooking(trips[8], testUser, ['C5'], 'cancelled', 'refunded');

    // Create some bookings for admin (for testing admin view)
    await createBooking(trips[5], adminUser, ['A3', 'A4'], 'confirmed', 'completed');
    await createBooking(trips[3], adminUser, ['B1'], 'completed', 'completed');

    console.log('\n✅ ============= SEED COMPLETE =============');
    console.log('\n📊 Summary:');
    console.log(`   - Users: 2 (admin@busticket.com, user@busticket.com)`);
    console.log(`   - Operators: ${operators.length}`);
    console.log(`   - Buses: ${buses.length}`);
    console.log(`   - Routes: ${routes.length}`);
    console.log(`   - Trips: ${trips.length}`);
    console.log(`   - Bookings: Check database for exact count`);

    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@busticket.com');
    console.log('     Password: Admin@123456');
    console.log('\n   Test User:');
    console.log('     Email: user@busticket.com');
    console.log('     Password: User@123456');

    console.log('\n📝 Next Steps:');
    console.log('   1. Start the backend: npm run dev');
    console.log('   2. Login with test credentials');
    console.log('   3. Navigate to /dashboard to see real data');
    console.log('   4. Test booking flow with available trips');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seed function
seedData();
