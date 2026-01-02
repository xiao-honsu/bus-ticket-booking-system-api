import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import config from './config';
import logger from './logger';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  ExtendedSocket,
  getRoomName,
} from '../types/socket.types';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * Initialize Socket.IO server
 * @param {HTTPServer} httpServer - HTTP server instance from Express
 * @returns {SocketIOServer} Socket.IO server instance
 */
export const initializeSocket = (
  httpServer: HTTPServer
): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> => {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Connection options
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    // Transports priority: WebSocket first, fallback to polling
    transports: ['websocket', 'polling'],
    // Allow upgrades from polling to websocket
    allowUpgrades: true,
    // Cookie settings
    cookie: {
      name: 'io',
      httpOnly: true,
      sameSite: 'lax',
    },
  });

  // Middleware to initialize socket data
  io.use((socket: ExtendedSocket, next) => {
    socket.data.currentTrips = new Set();
    socket.data.connectedAt = new Date();
    next();
  });

  // Connection handler
  io.on('connection', (socket: ExtendedSocket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date(),
      serverTime: new Date(),
    });

    /**
     * Join Trip Room - Client subscribes to trip updates
     */
    socket.on('joinTrip', async (data, callback) => {
      try {
        const { tripId, sessionId } = data;

        if (!tripId) {
          const response = {
            success: false,
            tripId: '',
            message: 'Trip ID is required',
          };
          if (callback) callback(response);
          return;
        }

        const roomName = getRoomName.trip(tripId);

        // Join the room
        await socket.join(roomName);

        // Track in socket data
        socket.data.currentTrips.add(tripId);
        if (sessionId) {
          socket.data.sessionId = sessionId;
        }

        // Get room size for debugging
        const room = io.sockets.adapter.rooms.get(roomName);
        const clientCount = room ? room.size : 0;

        logger.info(`Socket ${socket.id} joined trip room: ${roomName} (now ${clientCount} clients in room)`);

        // Send success response
        if (callback) {
          callback({
            success: true,
            tripId,
            message: `Joined trip ${tripId} successfully`,
          });
        }
      } catch (error: any) {
        logger.error(`Error joining trip room: ${error.message}`);
        if (callback) {
          callback({
            success: false,
            tripId: data.tripId,
            message: error.message || 'Failed to join trip room',
          });
        }
      }
    });

    /**
     * Leave Trip Room - Client unsubscribes from trip updates
     */
    socket.on('leaveTrip', async (data, callback) => {
      try {
        const { tripId } = data;

        if (!tripId) {
          if (callback) callback({ success: false, message: 'Trip ID is required' });
          return;
        }

        const roomName = getRoomName.trip(tripId);

        // Leave the room
        await socket.leave(roomName);

        // Remove from tracking
        socket.data.currentTrips.delete(tripId);

        logger.info(`Socket ${socket.id} left trip room: ${roomName}`);

        if (callback) {
          callback({
            success: true,
            message: `Left trip ${tripId} successfully`,
          });
        }
      } catch (error: any) {
        logger.error(`Error leaving trip room: ${error.message}`);
        if (callback) {
          callback({
            success: false,
            message: error.message || 'Failed to leave trip room',
          });
        }
      }
    });

    /**
     * Ping handler for connection health check
     */
    socket.on('ping', (callback) => {
      if (callback) {
        callback({ timestamp: Date.now() });
      }
    });

    /**
     * Disconnection handler
     */
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, Reason: ${reason}`);

      // Clean up: leave all rooms asynchronously
      const leavePromises = Array.from(socket.data.currentTrips).map((tripId) => {
        const roomName = getRoomName.trip(tripId);
        return socket.leave(roomName);
      });

      try {
        await Promise.all(leavePromises);
        logger.info(`Socket ${socket.id} left ${leavePromises.length} rooms on disconnect`);
      } catch (error: any) {
        logger.error(`Error leaving rooms on disconnect: ${error.message}`);
      }
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      logger.error(`Socket error: ${socket.id}`, error);
    });
  });

  logger.info('Socket.IO server initialized successfully');

  return io;
};

/**
 * Get Socket.IO instance
 * @returns {SocketIOServer} Socket.IO server instance
 */
export const getIO = (): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Check if Socket.IO is initialized
 * @returns {boolean} True if initialized
 */
export const isSocketInitialized = (): boolean => {
  return !!io;
};

export default {
  initializeSocket,
  getIO,
  isSocketInitialized,
};
