import bookingService from '../../../src/services/booking.service';
import Booking from '../../../src/models/booking.model';
import Trip from '../../../src/models/trip.model';
import Route from '../../../src/models/route.model';
import Bus, { IBus } from '../../../src/models/bus.model';
import Operator from '../../../src/models/operator.model';
import { faker } from '../../helpers/faker.helper';
import mongoose from 'mongoose';

describe('Booking Service - Unit Tests', () => {
  let mockTrip: any;
  let mockRoute: any;
  let mockBus: any;
  let mockOperator: any;

  beforeEach(async () => {
    // Create mock operator
    mockOperator = await Operator.create({
      companyName: 'Test Operator',
      email: faker.internet.email(),
      phoneNumber: '0123456789',
      licenseNumber: 'LIC123456',
      status: 'active',
      rating: {
        overall: 0,
        cleanliness: 0,
        punctuality: 0,
        staff: 0,
        comfort: 0,
        value: 0,
        totalReviews: 0,
      },
      stats: {
        totalBuses: 0,
        totalTrips: 0,
        totalRevenue: 0,
      },
    });

    // Create mock route
    mockRoute = await Route.create({
      routeName: 'Hanoi to Ho Chi Minh',
      origin: {
        city: 'Hanoi',
        state: 'Hanoi',
      },
      destination: {
        city: 'Ho Chi Minh',
        state: 'Ho Chi Minh',
      },
      distance: 1700,
      estimatedDuration: 30,
      isActive: true,
      stats: {
        totalTrips: 0,
        totalBookings: 0,
        averagePrice: 0,
      },
    });

    // Create mock bus
    const busData: Partial<IBus> = {
      busNumber: 'BUS001',
      busType: 'sleeper',
      totalSeats: 6,
      operator: mockOperator._id,
      status: 'active',
      licensePlate: 'ABC-123',
      amenities: [],
      images: [],
      seatMap: {
        rows: 2,
        columns: 3,
        seats: [
          { seatNumber: 'A1', row: 0, column: 0, seatType: 'standard' },
          { seatNumber: 'A2', row: 0, column: 1, seatType: 'standard' },
          { seatNumber: 'A3', row: 0, column: 2, seatType: 'standard' },
          { seatNumber: 'B1', row: 1, column: 0, seatType: 'standard' },
          { seatNumber: 'B2', row: 1, column: 1, seatType: 'standard' },
          { seatNumber: 'B3', row: 1, column: 2, seatType: 'standard' },
        ],
      },
    };
    mockBus = await Bus.create(busData);

    // Create a mock trip for testing
    mockTrip = await Trip.create({
      bus: mockBus._id,
      route: mockRoute._id,
      operator: mockOperator._id,
      departureTime: new Date(Date.now() + 86400000), // Tomorrow
      arrivalTime: new Date(Date.now() + 90000000),
      pricePerSeat: 150000,
      availableSeats: 6,
      bookedSeats: [],
      status: 'scheduled',
      stats: {
        totalBookings: 0,
        totalRevenue: 0,
        occupancyRate: 0,
      },
    });
  });

  describe('createGuestBooking', () => {
    it('should create a guest booking without user', async () => {
      const bookingData = {
        trip: mockTrip._id,
        guestEmail: 'guest@example.com',
        guestPhone: '0123456789',
        passengers: [{ name: 'Jane Doe', age: 25, gender: 'female' as const, seatNumber: 'A1', seatPrice: 150000 }],
      };

      const booking = await bookingService.createGuestBooking(bookingData);

      expect(booking).toBeDefined();
      expect(booking.guestEmail).toBe('guest@example.com');
      expect(booking.guestPhone).toBe('0123456789');
      expect(booking.user).toBeUndefined();
      expect(booking.status).toBe('pending');
    });

    it('should calculate total price correctly', async () => {
      const bookingData = {
        trip: mockTrip._id,
        guestEmail: 'guest@example.com',
        guestPhone: '0123456789',
        passengers: [
          { name: 'John Doe', age: 30, gender: 'male' as const, seatNumber: 'A1', seatPrice: 150000 },
          { name: 'Jane Doe', age: 25, gender: 'female' as const, seatNumber: 'A2', seatPrice: 150000 },
        ],
      };

      const booking = await bookingService.createGuestBooking(bookingData);

      expect(booking.totalAmount).toBe(mockTrip.pricePerSeat * 2);
    });

    it('should update trip available seats after booking', async () => {
      const bookingData = {
        trip: mockTrip._id,
        guestEmail: 'cancel@example.com',
        guestPhone: '0123456789',
        passengers: [{ name: 'John Doe', age: 30, gender: 'male' as const, seatNumber: 'A1', seatPrice: 150000 }],
      };

      await bookingService.createGuestBooking(bookingData);

      const updatedTrip = await Trip.findById(mockTrip._id);
      expect(updatedTrip!.availableSeats).toBe(5); // 6 - 1
      expect(updatedTrip!.bookedSeats).toContain('A1');
    });

    it('should throw error if seats already booked', async () => {
      // Book first
      await bookingService.createGuestBooking({
        trip: mockTrip._id,
        guestEmail: 'guest1@example.com',
        guestPhone: '0123456789',
        passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A1', seatPrice: 150000 }],
      });

      // Try to book same seat
      await expect(
        bookingService.createGuestBooking({
          trip: mockTrip._id,
          guestEmail: 'guest2@example.com',
          guestPhone: '0987654321',
          passengers: [{ name: 'Jane Doe', age: 25, gender: 'female', seatNumber: 'A1', seatPrice: 150000 }],
        })
      ).rejects.toThrow('already booked');
    });

    it('should throw error if trip not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        bookingService.createGuestBooking({
          trip: fakeId,
          guestEmail: 'guest@example.com',
          guestPhone: '0123456789',
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A1', seatPrice: 150000 }],
        })
      ).rejects.toThrow('Trip not found');
    });

    it('should throw error if not enough seats available', async () => {
      // Book all but one seat
      await bookingService.createGuestBooking({
        trip: mockTrip._id,
        guestEmail: 'guest1@example.com',
        guestPhone: '0123456789',
        passengers: [
          { name: 'User 1', age: 30, gender: 'male', seatNumber: 'A1', seatPrice: 150000 },
          { name: 'User 2', age: 30, gender: 'male', seatNumber: 'A2', seatPrice: 150000 },
          { name: 'User 3', age: 30, gender: 'male', seatNumber: 'A3', seatPrice: 150000 },
          { name: 'User 4', age: 30, gender: 'male', seatNumber: 'B1', seatPrice: 150000 },
          { name: 'User 5', age: 30, gender: 'male', seatNumber: 'B2', seatPrice: 150000 },
        ],
      });

      // Try to book 2 more seats when only 1 available
      await expect(
        bookingService.createGuestBooking({
          trip: mockTrip._id,
          guestEmail: 'guest2@example.com',
          guestPhone: '0987654321',
          passengers: [
            { name: 'User A', age: 25, gender: 'female', seatNumber: 'B3', seatPrice: 150000 },
            { name: 'User B', age: 25, gender: 'female', seatNumber: 'C1', seatPrice: 150000 },
          ],
        })
      ).rejects.toThrow('Not enough available seats');
    });
  });

  describe('queryBookings', () => {
    it('should return paginated bookings', async () => {
      // Create some bookings
      await Booking.create({
        referenceNumber: 'BKG-TEST-001',
        trip: mockTrip._id,
        guestEmail: 'guest1@example.com',
        guestPhone: '0123456789',
        contactEmail: 'guest1@example.com',
        contactPhone: '0123456789',
        passengers: [{ name: 'User 1', age: 30, gender: 'male', seatNumber: 'A1', seatPrice: 150000 }],
        status: 'pending',
        totalAmount: 150000,
        totalPassengers: 1,
        payment: {
          amount: 150000,
          currency: 'VND',
          status: 'pending',
        },
      });

      await Booking.create({
        referenceNumber: 'BKG-TEST-002',
        trip: mockTrip._id,
        guestEmail: 'guest2@example.com',
        guestPhone: '0987654321',
        contactEmail: 'guest2@example.com',
        contactPhone: '0987654321',
        passengers: [{ name: 'User 2', age: 25, gender: 'female', seatNumber: 'A2', seatPrice: 150000 }],
        status: 'confirmed',
        totalAmount: 150000,
        totalPassengers: 1,
        payment: {
          amount: 150000,
          currency: 'VND',
          status: 'completed',
        },
      });

      const result = await bookingService.queryBookings({}, { page: 1, limit: 10 });

      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(2);
    });

    it('should filter bookings by status', async () => {
      await Booking.create({
        referenceNumber: 'BKG-TEST-003',
        trip: mockTrip._id,
        guestEmail: 'guest1@example.com',
        guestPhone: '0123456789',
        contactEmail: 'guest1@example.com',
        contactPhone: '0123456789',
        passengers: [{ name: 'User 1', age: 30, gender: 'male', seatNumber: 'A1', seatPrice: 150000 }],
        status: 'pending',
        totalAmount: 150000,
        totalPassengers: 1,
        payment: {
          amount: 150000,
          currency: 'VND',
          status: 'pending',
        },
      });

      await Booking.create({
        referenceNumber: 'BKG-TEST-004',
        trip: mockTrip._id,
        guestEmail: 'guest2@example.com',
        guestPhone: '0987654321',
        contactEmail: 'guest2@example.com',
        contactPhone: '0987654321',
        passengers: [{ name: 'User 2', age: 25, gender: 'female', seatNumber: 'A2', seatPrice: 150000 }],
        status: 'confirmed',
        totalAmount: 150000,
        totalPassengers: 1,
        payment: {
          amount: 150000,
          currency: 'VND',
          status: 'completed',
        },
      });

      const result = await bookingService.queryBookings({ status: 'pending' }, { page: 1, limit: 10 });

      expect(result.results).toHaveLength(1);
      expect(Array.isArray(result.results) && result.results[0].status).toBe('pending');
    });
  });
});
