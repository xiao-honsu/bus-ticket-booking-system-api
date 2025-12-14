import swaggerJsdoc from 'swagger-jsdoc';
import config from './config';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Bus Ticket Booking API',
    version: '1.0.0',
    description: `
## Bus Ticket Booking System API Documentation

This API provides endpoints for a bus ticket booking platform, enabling users to search for trips, book seats, and manage their reservations.

### Key Features:
- **Trip Search**: Advanced search with multiple filters (price, time, bus type, amenities)
- **Location Autocomplete**: City suggestions for search forms
- **Seat Selection**: Real-time seat availability and locking
- **Booking Management**: Create, view, and cancel bookings
- **User Authentication**: JWT-based authentication with social login support

### Authentication:
Most endpoints require JWT authentication via Bearer token in the Authorization header.
Public endpoints (search, locations) are accessible without authentication.
    `,
    contact: {
      name: 'API Support',
      email: 'support@busticket.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api`,
      description: 'Development server',
    },
    {
      url: 'https://api.busticket.com/api',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Trips',
      description: 'Trip search and details - Core functionality for finding bus trips',
    },
    {
      name: 'Locations',
      description: 'Location autocomplete and popular destinations - For search form UI',
    },
    {
      name: 'Bookings',
      description: 'Booking management - Create, view, and cancel reservations',
    },
    {
      name: 'Auth',
      description: 'Authentication - User login, registration, and token management',
    },
    {
      name: 'Users',
      description: 'User management - Profile and search history',
    },
    {
      name: 'Seat Locks',
      description: 'Seat locking - Reserve seats temporarily during booking flow',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /auth/login or /auth/register',
      },
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Bad Request' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalPages: { type: 'integer', example: 5 },
          totalResults: { type: 'integer', example: 50 },
        },
      },
      // Location schemas
      Location: {
        type: 'object',
        properties: {
          city: { type: 'string', example: 'Hồ Chí Minh' },
          state: { type: 'string', example: 'Hồ Chí Minh' },
          landmark: { type: 'string', example: 'Bến xe Miền Đông' },
        },
      },
      LocationSuggestion: {
        type: 'object',
        properties: {
          city: { type: 'string', example: 'Hồ Chí Minh', description: 'City name' },
          state: { type: 'string', example: 'Hồ Chí Minh', description: 'State/province name' },
          displayName: { type: 'string', example: 'Hồ Chí Minh, Hồ Chí Minh', description: 'Formatted display string' },
          type: {
            type: 'string',
            enum: ['origin', 'destination', 'both'],
            example: 'both',
            description: 'Indicates if this location is used as origin, destination, or both',
          },
        },
      },
      PopularLocation: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Hồ Chí Minh' },
          searchCount: { type: 'integer', example: 1250 },
        },
      },
      PopularRoute: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          routeName: { type: 'string', example: 'Sài Gòn - Đà Lạt' },
          origin: { type: 'string', example: 'Hồ Chí Minh' },
          destination: { type: 'string', example: 'Đà Lạt' },
          totalBookings: { type: 'integer', example: 5000 },
        },
      },
      // Route schema
      Route: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          routeName: { type: 'string', example: 'Sài Gòn - Đà Lạt' },
          origin: { $ref: '#/components/schemas/Location' },
          destination: { $ref: '#/components/schemas/Location' },
          distance: { type: 'number', example: 308 },
          estimatedDuration: { type: 'integer', example: 420, description: 'Duration in minutes' },
        },
      },
      // Bus schema
      Bus: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439012' },
          busNumber: { type: 'string', example: 'BUS-001' },
          busType: {
            type: 'string',
            enum: ['standard', 'limousine', 'sleeper'],
            example: 'limousine',
          },
          amenities: {
            type: 'array',
            items: { type: 'string' },
            example: ['wifi', 'aircon', 'usb', 'blanket'],
          },
          totalSeats: { type: 'integer', example: 40 },
        },
      },
      // Operator schema
      Operator: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439013' },
          companyName: { type: 'string', example: 'Phương Trang' },
          logoUrl: { type: 'string', example: 'https://example.com/logo.png' },
          rating: {
            type: 'object',
            properties: {
              overall: { type: 'number', example: 4.5 },
              totalReviews: { type: 'integer', example: 1234 },
            },
          },
        },
      },
      // Trip schemas
      TripSearchResult: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '507f1f77bcf86cd799439014' },
          departureTime: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-15T08:00:00.000Z',
          },
          arrivalTime: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-15T15:00:00.000Z',
          },
          pricePerSeat: { type: 'number', example: 250000 },
          availableSeats: { type: 'integer', example: 25 },
          availableSeatsCount: { type: 'integer', example: 25 },
          status: {
            type: 'string',
            enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
            example: 'scheduled',
          },
          route: { $ref: '#/components/schemas/Route' },
          bus: { $ref: '#/components/schemas/Bus' },
          operator: { $ref: '#/components/schemas/Operator' },
        },
      },
      TripSearchResponse: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: { $ref: '#/components/schemas/TripSearchResult' },
          },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalPages: { type: 'integer', example: 5 },
          totalResults: { type: 'integer', example: 48 },
        },
      },
      SeatAvailability: {
        type: 'object',
        properties: {
          seatNumber: { type: 'string', example: 'A1' },
          row: { type: 'integer', example: 1 },
          column: { type: 'integer', example: 1 },
          seatType: {
            type: 'string',
            enum: ['standard', 'vip', 'window', 'aisle'],
            example: 'window',
          },
          status: {
            type: 'string',
            enum: ['available', 'booked', 'locked'],
            example: 'available',
          },
          price: { type: 'number', example: 250000 },
          priceModifier: { type: 'number', example: 0 },
        },
      },
      TripDetails: {
        allOf: [
          { $ref: '#/components/schemas/TripSearchResult' },
          {
            type: 'object',
            properties: {
              seatAvailability: {
                type: 'object',
                additionalProperties: { $ref: '#/components/schemas/SeatAvailability' },
                example: {
                  A1: {
                    seatNumber: 'A1',
                    row: 1,
                    column: 1,
                    seatType: 'window',
                    status: 'available',
                    price: 250000,
                  },
                  A2: {
                    seatNumber: 'A2',
                    row: 1,
                    column: 2,
                    seatType: 'aisle',
                    status: 'booked',
                    price: 250000,
                  },
                },
              },
              policies: {
                type: 'object',
                properties: {
                  cancellation: { type: 'string', example: 'Free cancellation up to 24 hours before departure' },
                  modification: { type: 'string', example: 'Free modification up to 12 hours before departure' },
                  refund: { type: 'string', example: 'Full refund for cancellations made 24+ hours before departure' },
                },
              },
            },
          },
        ],
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: ['./src/docs/*.yml', './src/routes/v1/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
