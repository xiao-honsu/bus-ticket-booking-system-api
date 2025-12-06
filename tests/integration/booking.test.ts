import request from 'supertest';
import app from '../../src/app';
import { faker } from '../helpers/faker.helper';
import mongoose from 'mongoose';
import Trip from '../../src/models/trip.model';
import Route from '../../src/models/route.model';
import Bus, { IBus } from '../../src/models/bus.model';
import Operator from '../../src/models/operator.model';

describe('Booking API - Integration Tests', () => {
  let userToken: string;
  let userId: string;
  let testTrip: any;

  beforeAll(async () => {
    // Create test user
    const userRes = await request(app).post('/api/v1/auth/register').send({
      email: faker.internet.email().toLowerCase(),
      password: 'User123!',
      name: 'Regular User',
    });
    userToken = userRes.body.tokens.access.token;
    userId = userRes.body.user.id;

    // Create test operator
    const operator = await Operator.create({
      companyName: 'Test Bus Company',
      email: faker.internet.email(),
      phoneNumber: '0123456789',
      licenseNumber: 'BUS123456',
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

    // Create test route
    const route = await Route.create({
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

    // Create test bus
    const busData: Partial<IBus> = {
      busNumber: 'BUS001',
      busType: 'sleeper',
      totalSeats: 8,
      operator: operator._id,
      status: 'active',
      licensePlate: 'ABC-123',
      amenities: [],
      images: [],
      seatMap: {
        rows: 2,
        columns: 4,
        seats: [
          { seatNumber: 'A1', row: 0, column: 0, seatType: 'standard' },
          { seatNumber: 'A2', row: 0, column: 1, seatType: 'standard' },
          { seatNumber: 'A3', row: 0, column: 2, seatType: 'standard' },
          { seatNumber: 'A4', row: 0, column: 3, seatType: 'standard' },
          { seatNumber: 'B1', row: 1, column: 0, seatType: 'standard' },
          { seatNumber: 'B2', row: 1, column: 1, seatType: 'standard' },
          { seatNumber: 'B3', row: 1, column: 2, seatType: 'standard' },
          { seatNumber: 'B4', row: 1, column: 3, seatType: 'standard' },
        ],
      },
    };
    const bus = await Bus.create(busData);

    // Create test trip
    testTrip = await Trip.create({
      bus: bus._id,
      route: route._id,
      operator: operator._id,
      departureTime: new Date(Date.now() + 86400000), // Tomorrow
      arrivalTime: new Date(Date.now() + 90000000),
      pricePerSeat: 200000,
      availableSeats: 8,
      bookedSeats: [],
      status: 'scheduled',
      stats: {
        totalBookings: 0,
        totalRevenue: 0,
        occupancyRate: 0,
      },
    });
  });

  describe('POST /v1/bookings/guest', () => {
    it('should create guest booking without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest@example.com',
          guestPhone: '0123456789',
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A1' }],
        })
        .expect(201);

      expect(res.body.guestEmail).toBe('guest@example.com');
      expect(res.body.passengers).toHaveLength(1);
      expect(res.body.passengers[0].seatNumber).toBe('A1');
      expect(res.body.status).toBe('pending');
      expect(res.body.totalPrice).toBe(200000);
    });

    it('should return 400 if guest email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestPhone: '0123456789',
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A2' }],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 if guest phone is missing', async () => {
      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest@example.com',
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A3' }],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 if trying to book unavailable seat', async () => {
      // Book seat first
      await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest1@example.com',
          guestPhone: '0123456789',
          passengers: [{ name: 'User 1', age: 30, gender: 'male', seatNumber: 'A4' }],
        });

      // Try to book same seat
      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest2@example.com',
          guestPhone: '0987654321',
          passengers: [{ name: 'User 2', age: 25, gender: 'female', seatNumber: 'A4' }],
        })
        .expect(400);

      expect(res.body.message).toContain('already booked');
    });

    it('should calculate total price for multiple passengers', async () => {
      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest3@example.com',
          guestPhone: '0123456789',
          passengers: [
            { name: 'John Doe', age: 30, gender: 'male', seatNumber: 'B1' },
            { name: 'Jane Doe', age: 28, gender: 'female', seatNumber: 'B2' },
          ],
        })
        .expect(201);

      expect(res.body.totalPrice).toBe(400000); // 2 * 200000
      expect(res.body.passengers).toHaveLength(2);
    });

    it('should return 404 if trip not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: fakeId.toString(),
          guestEmail: 'guest@example.com',
          guestPhone: '0123456789',
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A1' }],
        })
        .expect(404);

      expect(res.body.message).toContain('Trip not found');
    });
  });

  describe('POST /v1/bookings', () => {
    it('should create booking for authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trip: testTrip._id.toString(),
          passengers: [{ name: 'Test User', age: 30, gender: 'male', seatNumber: 'B3' }],
        })
        .expect(201);

      expect(res.body.passengers).toHaveLength(1);
      expect(res.body.user).toBe(userId);
      expect(res.body.guestEmail).toBeUndefined();
      expect(res.body.guestPhone).toBeUndefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/bookings')
        .send({
          trip: testTrip._id.toString(),
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'B4' }],
        })
        .expect(401);
    });

    it('should return 400 with invalid trip ID', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trip: 'invalid-id',
          passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'C1' }],
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('GET /v1/bookings', () => {
    beforeEach(async () => {
      // Create a booking for the user
      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trip: testTrip._id.toString(),
          passengers: [{ name: 'Test User', age: 30, gender: 'male', seatNumber: 'C1' }],
        });
    });

    it("should get user's own bookings", async () => {
      const res = await request(app).get('/api/v1/bookings').set('Authorization', `Bearer ${userToken}`).expect(200);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].user).toBe(userId);
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/v1/bookings').expect(401);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/v1/bookings?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
      expect(res.body.totalPages).toBeDefined();
      expect(res.body.totalResults).toBeDefined();
    });
  });

  describe('GET /v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trip: testTrip._id.toString(),
          passengers: [{ name: 'Test User', age: 30, gender: 'male', seatNumber: 'C2' }],
        });
      bookingId = res.body.id;
    });

    it('should get booking by ID', async () => {
      const res = await request(app)
        .get(`/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(bookingId);
      expect(res.body.user).toBe(userId);
    });

    it('should return 404 if booking not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app).get(`/v1/bookings/${fakeId}`).set('Authorization', `Bearer ${userToken}`).expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app).get(`/v1/bookings/${bookingId}`).expect(401);
    });
  });

  describe('PATCH /v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trip: testTrip._id.toString(),
          passengers: [{ name: 'Test User', age: 30, gender: 'male', seatNumber: 'C3' }],
        });
      bookingId = res.body.id;
    });

    it('should update booking status', async () => {
      const res = await request(app)
        .patch(`/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'confirmed',
        })
        .expect(200);

      expect(res.body.status).toBe('confirmed');
    });

    it('should return 404 if booking not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/v1/bookings/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'confirmed' })
        .expect(404);
    });
  });

  describe('DELETE /v1/bookings/:id', () => {
    let bookingId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trip: testTrip._id.toString(),
          passengers: [{ name: 'Test User', age: 30, gender: 'male', seatNumber: 'C4' }],
        });
      bookingId = res.body.id;
    });

    it('should cancel booking', async () => {
      await request(app).delete(`/v1/bookings/${bookingId}`).set('Authorization', `Bearer ${userToken}`).expect(204);
    });

    it('should return 404 if booking not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app).delete(`/v1/bookings/${fakeId}`).set('Authorization', `Bearer ${userToken}`).expect(404);
    });
  });
});
