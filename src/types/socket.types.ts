import { Socket } from 'socket.io';
import mongoose from 'mongoose';

/**
 * Socket.IO Event Types for Real-time Seat Updates
 */

// Events emitted from server to clients
export interface ServerToClientEvents {
  // Seat locking events
  seatLocked: (data: SeatLockedEvent) => void;
  seatReleased: (data: SeatReleasedEvent) => void;
  seatBooked: (data: SeatBookedEvent) => void;
  seatLockExpiring: (data: SeatLockExpiringEvent) => void;

  // Seat status batch updates
  seatStatusUpdate: (data: SeatStatusUpdateEvent) => void;

  // Trip capacity updates
  tripCapacityUpdate: (data: TripCapacityUpdateEvent) => void;

  // Error events
  error: (data: ErrorEvent) => void;

  // Connection events
  connected: (data: ConnectedEvent) => void;
}

// Events received from clients to server
export interface ClientToServerEvents {
  // Join/leave trip room for updates
  joinTrip: (data: JoinTripData, callback?: (response: JoinTripResponse) => void) => void;
  leaveTrip: (data: LeaveTripData, callback?: (response: BasicResponse) => void) => void;

  // Ping for connection health check
  ping: (callback?: (response: { timestamp: number }) => void) => void;
}

// Inter-server events (for scaling with Redis adapter)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data attached to each connection
export interface SocketData {
  userId?: string;
  sessionId?: string;
  currentTrips: Set<string>; // Trip IDs user is currently watching
  connectedAt: Date;
}

/**
 * Event Payload Interfaces
 */

export interface SeatLockedEvent {
  tripId: string;
  seatNumbers: string[];
  sessionId: string;
  userId?: string;
  expiresAt: Date;
  lockedBy?: 'guest' | 'user';
  timestamp: Date;
}

export interface SeatReleasedEvent {
  tripId: string;
  seatNumbers: string[];
  sessionId: string;
  reason: 'manual' | 'expired' | 'booked';
  timestamp: Date;
}

export interface SeatLockExpiringEvent {
  tripId: string;
  sessionId: string;
  seatNumbers: string[];
  remainingSeconds: number;
  message: string;
  timestamp: Date;
}

export interface SeatBookedEvent {
  tripId: string;
  seatNumbers: string[];
  bookingId: string;
  timestamp: Date;
}

export interface SeatStatusUpdateEvent {
  tripId: string;
  seats: Array<{
    seatNumber: string;
    status: 'available' | 'locked' | 'booked';
    expiresAt?: Date;
    sessionId?: string;
  }>;
  timestamp: Date;
}

export interface TripCapacityUpdateEvent {
  tripId: string;
  availableSeats: number;
  bookedSeats: number;
  lockedSeats: number;
  totalSeats: number;
  timestamp: Date;
}

export interface ErrorEvent {
  message: string;
  code?: string;
  timestamp: Date;
}

export interface ConnectedEvent {
  socketId: string;
  timestamp: Date;
  serverTime: Date;
}

/**
 * Request/Response Interfaces
 */

export interface JoinTripData {
  tripId: string;
  sessionId?: string;
}

export interface JoinTripResponse {
  success: boolean;
  tripId: string;
  message?: string;
  currentStatus?: {
    availableSeats: number;
    lockedSeats: number;
    bookedSeats: number;
  };
}

export interface LeaveTripData {
  tripId: string;
}

export interface BasicResponse {
  success: boolean;
  message?: string;
}

/**
 * MongoDB Change Stream Event Types
 */

export interface SeatLockChangeEvent {
  operationType: 'insert' | 'delete' | 'update' | 'replace';
  documentKey: {
    _id: mongoose.Types.ObjectId;
  };
  fullDocument?: {
    _id: mongoose.Types.ObjectId;
    trip: mongoose.Types.ObjectId;
    seatNumbers: string[];
    sessionId: string;
    user?: mongoose.Types.ObjectId;
    expiresAt: Date;
  };
  updateDescription?: {
    updatedFields: any;
    removedFields: string[];
  };
}

/**
 * Extended Socket Type with our custom data
 */
export type ExtendedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * Room naming conventions
 */
export const getRoomName = {
  trip: (tripId: string) => `trip:${tripId}`,
  user: (userId: string) => `user:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
};
