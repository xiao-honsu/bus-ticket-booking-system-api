import mongoose from 'mongoose';
import http from 'http';
import app from './app';
import config from './config/config';
import logger from './config/logger';
import { initializeSocket } from './config/socket';
import { startSeatLockMonitoring } from './services/seatlock-monitor.service';

let server: http.Server;

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');

  // Create HTTP server from Express app
  server = http.createServer(app);

  // Initialize Socket.IO
  initializeSocket(server);
  logger.info('Socket.IO initialized');

  // Start MongoDB Change Streams monitoring for seat locks
  startSeatLockMonitoring();
  logger.info('Seat lock monitoring started');

  // Start listening
  server.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
    logger.info(`REST API: http://localhost:${config.port}/api/v1`);
    logger.info(`Socket.IO: ws://localhost:${config.port}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
