import request from 'supertest';
import app from '../../src/app';
import mongoose from 'mongoose';
import Trip from '../../src/models/trip.model';
import Route from '../../src/models/route.model';
import Bus, { IBus } from '../../src/models/bus.model';
import Operator from '../../src/models/operator.model';
import SeatLock from '../../src/models/seatlock.model';
import { faker } from '../helpers/faker.helper';

describe('SeatLock API - Integration Tests', () => {
  let testTrip: any;

  beforeEach(async () => {
    // Create test operator
    const operator = await Operator.create({
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

    // Create test route
    const route = await Route.create({
      routeName: 'Hanoi to Da Nang',
      origin: {
        city: 'Hanoi',
        state: 'Hanoi',
      },
      destination: {
        city: 'Da Nang',
        state: 'Da Nang',
      },
      distance: 800,
      estimatedDuration: 15,
      isActive: true,
      stats: {
        totalTrips: 0,
        totalBookings: 0,
        averagePrice: 0,
      },
    });

    // Create test bus
    const busData: Partial<IBus> = {
      busNumber: 'BUS002',
      busType: 'standard',
      totalSeats: 6,
      operator: operator._id,
      status: 'active',
      licensePlate: 'XYZ-456',
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
    const bus = await Bus.create(busData);

    // Create test trip
    testTrip = await Trip.create({
      bus: bus._id,
      route: route._id,
      operator: operator._id,
      departureTime: new Date(Date.now() + 86400000),
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

  describe('POST /v1/seatlock/lock', () => {
    it('should lock seats successfully', async () => {
      const res = await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1', 'A2'],
          sessionId: 'test-session-123',
        })
        .expect(200);

      expect(res.body.message).toBeDefined();
      expect(res.body.message).toContain('locked');
    });

    it('should return 400 if seat already locked', async () => {
      // Lock first
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1'],
          sessionId: 'session-1',
        });

      // Try to lock same seat with different session
      const res = await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1'],
          sessionId: 'session-2',
        })
        .expect(409);

      expect(res.body.message).toContain('already locked');
    });

    it('should allow same session to lock already locked seats', async () => {
      const sessionId = 'same-session-123';

      // Lock first time
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1'],
          sessionId,
        })
        .expect(200);

      // Lock again with same session (should succeed or not throw error)
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1'],
          sessionId,
        });

      // Should not throw error
    });

    it('should return 400 if tripId is missing', async () => {
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          seatNumbers: ['A1'],
          sessionId: 'test-session',
        })
        .expect(400);
    });

    it('should return 400 if seatNumbers is missing', async () => {
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          sessionId: 'test-session',
        })
        .expect(400);
    });

    it('should return 400 if sessionId is missing', async () => {
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1'],
        })
        .expect(400);
    });

    it('should return 404 if trip not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: fakeId.toString(),
          seatNumbers: ['A1'],
          sessionId: 'test-session',
        })
        .expect(404);

      expect(res.body.message).toContain('Trip not found');
    });

    it('should lock multiple seats at once', async () => {
      const res = await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['B1', 'B2', 'B3'],
          sessionId: 'multi-seat-session',
        })
        .expect(200);

      expect(res.body.message).toBeDefined();

      // Verify locks were created
      const locks = await SeatLock.find({ sessionId: 'multi-seat-session' });
      expect(locks.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/seatlock/locked/:tripId', () => {
    it('should return locked seats for a trip', async () => {
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1', 'A2'],
          sessionId: 'test-session',
        });

      const res = await request(app).get(`/v1/seatlock/locked/${testTrip._id}`).expect(200);

      expect(res.body.lockedSeats).toBeDefined();
      expect(res.body.lockedSeats).toBeInstanceOf(Array);
      expect(res.body.lockedSeats).toEqual(expect.arrayContaining(['A1', 'A2']));
    });

    it('should not include expired locks', async () => {
      // Create expired lock
      await SeatLock.create({
        trip: testTrip._id,
        seatNumbers: ['A1'],
        sessionId: 'expired-session',
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await request(app).get(`/v1/seatlock/locked/${testTrip._id}`).expect(200);

      expect(res.body.lockedSeats).not.toContain('A1');
    });

    it('should return empty array if no locks exist', async () => {
      const res = await request(app).get(`/v1/seatlock/locked/${testTrip._id}`).expect(200);

      expect(res.body.lockedSeats).toEqual([]);
    });

    it('should return 400 with invalid trip ID', async () => {
      await request(app).get('/api/v1/seatlock/locked/invalid-id').expect(400);
    });
  });

  describe('DELETE /v1/seatlock/release/:sessionId', () => {
    it('should release locked seats', async () => {
      const sessionId = 'release-test-session';

      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1', 'A2'],
          sessionId,
        });

      await request(app).delete(`/v1/seatlock/release/${sessionId}`).expect(200);

      const locks = await SeatLock.find({ sessionId });
      expect(locks).toHaveLength(0);
    });

    it('should return 200 even if no locks found', async () => {
      const res = await request(app).delete('/api/v1/seatlock/release/non-existent-session').expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('should only release locks for the specified session', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Create locks for session 1
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A1'],
          sessionId: session1,
        });

      // Create locks for session 2
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A2'],
          sessionId: session2,
        });

      // Release session 1
      await request(app).delete(`/v1/seatlock/release/${session1}`).expect(200);

      // Verify session 1 locks are gone
      const session1Locks = await SeatLock.find({ sessionId: session1 });
      expect(session1Locks).toHaveLength(0);

      // Verify session 2 locks still exist
      const session2Locks = await SeatLock.find({ sessionId: session2 });
      expect(session2Locks.length).toBeGreaterThan(0);
    });
  });

  describe('Seat locking workflow', () => {
    it('should complete full workflow: lock -> book -> auto-release', async () => {
      const sessionId = 'workflow-session';

      // 1. Lock seats
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['A3'],
          sessionId,
        })
        .expect(200);

      // 2. Verify seats are locked
      const lockedRes = await request(app).get(`/v1/seatlock/locked/${testTrip._id}`).expect(200);

      expect(lockedRes.body.lockedSeats).toContain('A3');

      // 3. Create guest booking with sessionId (should release locks)
      await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest@example.com',
          guestPhone: '0123456789',
          passengers: [{ name: 'Test User', age: 30, gender: 'male', seatNumber: 'A3' }],
          sessionId,
        })
        .expect(201);

      // 4. Verify locks are released
      const finalLockedRes = await request(app).get(`/v1/seatlock/locked/${testTrip._id}`).expect(200);

      expect(finalLockedRes.body.lockedSeats).not.toContain('A3');
    });

    it('should prevent booking if seats locked by another session', async () => {
      // Session 1 locks seats
      await request(app)
        .post('/api/v1/seatlock/lock')
        .send({
          tripId: testTrip._id.toString(),
          seatNumbers: ['B3'],
          sessionId: 'session-1',
        });

      // Session 2 tries to book same seats
      const res = await request(app)
        .post('/api/v1/bookings/guest')
        .send({
          trip: testTrip._id.toString(),
          guestEmail: 'guest2@example.com',
          guestPhone: '0987654321',
          passengers: [{ name: 'User 2', age: 25, gender: 'female', seatNumber: 'B3' }],
          sessionId: 'session-2',
        })
        .expect(409);

      expect(res.body.message).toContain('locked by another user');
    });
  });
});
