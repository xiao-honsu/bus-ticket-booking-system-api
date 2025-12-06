import seatLockService from '../../../src/services/seatlock.service';
import SeatLock from '../../../src/models/seatlock.model';
import Trip from '../../../src/models/trip.model';
import Route from '../../../src/models/route.model';
import Bus, { IBus } from '../../../src/models/bus.model';
import Operator from '../../../src/models/operator.model';
import { faker } from '../../helpers/faker.helper';
import mongoose from 'mongoose';

describe('SeatLock Service - Unit Tests', () => {
  let tripId: mongoose.Types.ObjectId;
  let sessionId: string;
  let mockTrip: any;
  let mockOperator: any;
  let mockRoute: any;
  let mockBus: any;

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

    // Create mock trip
    mockTrip = await Trip.create({
      bus: mockBus._id,
      route: mockRoute._id,
      operator: mockOperator._id,
      departureTime: new Date(Date.now() + 86400000),
      arrivalTime: new Date(Date.now() + 90000000),
      pricePerSeat: 150000,
      availableSeats: 5,
      bookedSeats: [],
      status: 'scheduled',
      stats: {
        totalBookings: 0,
        totalRevenue: 0,
        occupancyRate: 0,
      },
    });

    tripId = mockTrip._id;
    sessionId = 'test-session-123';
  });

  describe('lockSeats', () => {
    it('should lock seats successfully', async () => {
      const seats = ['A1', 'A2'];

      const lock = await seatLockService.lockSeats(tripId, seats, sessionId);

      expect(lock).toBeDefined();
      expect(lock.seatNumbers).toEqual(expect.arrayContaining(seats));
      expect(lock.sessionId).toBe(sessionId);
      expect(lock.trip.toString()).toBe(tripId.toString());
    });

    it('should throw error if trip not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(seatLockService.lockSeats(fakeId, ['A1'], sessionId)).rejects.toThrow('Trip not found');
    });

    it('should throw error if seat already locked by another session', async () => {
      await seatLockService.lockSeats(tripId, ['A1'], 'session-1');

      await expect(seatLockService.lockSeats(tripId, ['A1'], 'session-2')).rejects.toThrow('already locked');
    });

    it('should throw error if seat already booked', async () => {
      // Mark seat as booked
      mockTrip.bookedSeats = ['A1'];
      await mockTrip.save();

      await expect(seatLockService.lockSeats(tripId, ['A1'], sessionId)).rejects.toThrow('already booked');
    });

    it('should set expiration time to 10 minutes', async () => {
      const lock = await seatLockService.lockSeats(tripId, ['A1'], sessionId);

      const now = new Date();
      const expiresAt = new Date(lock.expiresAt);
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeGreaterThan(9);
      expect(diffMinutes).toBeLessThanOrEqual(10);
    });

    it('should allow locking multiple seats at once', async () => {
      const seats = ['A1', 'A2', 'A3'];

      const lock = await seatLockService.lockSeats(tripId, seats, sessionId);

      expect(lock.seatNumbers).toHaveLength(3);
      expect(lock.seatNumbers).toEqual(expect.arrayContaining(seats));
    });
  });

  describe('releaseLocks', () => {
    it('should release all locks for a session', async () => {
      await seatLockService.lockSeats(tripId, ['A1', 'A2'], sessionId);

      const deletedCount = await seatLockService.releaseLocks(sessionId);

      expect(deletedCount).toBe(1);

      const locks = await SeatLock.find({ sessionId });
      expect(locks).toHaveLength(0);
    });

    it('should return 0 if no locks found for session', async () => {
      const deletedCount = await seatLockService.releaseLocks('non-existent-session');

      expect(deletedCount).toBe(0);
    });
  });

  describe('releaseSpecificLocks', () => {
    it('should release specific seats for a session', async () => {
      await seatLockService.lockSeats(tripId, ['A1', 'A2', 'A3'], sessionId);

      const deletedCount = await seatLockService.releaseSpecificLocks(tripId, ['A1', 'A2'], sessionId);

      expect(deletedCount).toBeGreaterThan(0);
    });
  });

  describe('getLockedSeatsForTrip', () => {
    it('should return locked seats for a trip', async () => {
      await seatLockService.lockSeats(tripId, ['A1', 'A2'], 'session-1');
      await seatLockService.lockSeats(tripId, ['B1'], 'session-2');

      const lockedSeats = await seatLockService.getLockedSeatsForTrip(tripId);

      expect(lockedSeats).toEqual(expect.arrayContaining(['A1', 'A2', 'B1']));
      expect(lockedSeats.length).toBe(3);
    });

    it('should not return expired locks', async () => {
      // Create an expired lock manually
      await SeatLock.create({
        trip: tripId,
        seatNumbers: ['A1'],
        sessionId,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      const lockedSeats = await seatLockService.getLockedSeatsForTrip(tripId);

      expect(lockedSeats).toHaveLength(0);
    });

    it('should return empty array if no locks exist', async () => {
      const lockedSeats = await seatLockService.getLockedSeatsForTrip(tripId);

      expect(lockedSeats).toEqual([]);
    });
  });

  describe('areSeatsLocked', () => {
    it('should return true if seats are locked', async () => {
      await seatLockService.lockSeats(tripId, ['A1'], sessionId);

      const areLocked = await seatLockService.areSeatsLocked(tripId, ['A1']);

      expect(areLocked).toBe(true);
    });

    it('should return false if seats are not locked', async () => {
      const areLocked = await seatLockService.areSeatsLocked(tripId, ['A1']);

      expect(areLocked).toBe(false);
    });

    it('should return true if any of the seats are locked', async () => {
      await seatLockService.lockSeats(tripId, ['A1'], sessionId);

      const areLocked = await seatLockService.areSeatsLocked(tripId, ['A1', 'A2']);

      expect(areLocked).toBe(true);
    });
  });

  describe('doesSessionOwnLock', () => {
    it('should return true if session owns all locks', async () => {
      await seatLockService.lockSeats(tripId, ['A1', 'A2'], sessionId);

      const ownsLock = await seatLockService.doesSessionOwnLock(tripId, ['A1', 'A2'], sessionId);

      expect(ownsLock).toBe(true);
    });

    it('should return false if session does not own locks', async () => {
      await seatLockService.lockSeats(tripId, ['A1'], 'other-session');

      const ownsLock = await seatLockService.doesSessionOwnLock(tripId, ['A1'], sessionId);

      expect(ownsLock).toBe(false);
    });

    it('should return false if seats are not locked', async () => {
      const ownsLock = await seatLockService.doesSessionOwnLock(tripId, ['A1'], sessionId);

      expect(ownsLock).toBe(false);
    });
  });
});
