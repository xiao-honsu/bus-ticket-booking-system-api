import Joi from 'joi';
import { objectId } from './custom.validation';

// Reusable schema components for DRY principle
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
};

const sortSchema = {
  sortBy: Joi.string().valid('price', 'departureTime', 'duration', 'availableSeats'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
};

const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const searchTrips = {
  query: Joi.object().keys({
    // Location filters - OPTIONAL (can search with any combination)
    origin: Joi.string().trim().min(2).messages({
      'string.min': 'Origin must be at least 2 characters',
      'string.empty': 'Origin cannot be empty',
    }),
    destination: Joi.string().trim().min(2).messages({
      'string.min': 'Destination must be at least 2 characters',
      'string.empty': 'Destination cannot be empty',
    }),

    // Date filter - OPTIONAL (if provided, must be today or future)
    departureDate: Joi.date().iso().min('now').messages({
      'date.min': 'Departure date cannot be in the past',
      'date.base': 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
    }),

    // Date range filter (optional alternative to single date)
    departureDateFrom: Joi.date().iso().min('now'),
    departureDateTo: Joi.date()
      .iso()
      .when('departureDateFrom', {
        is: Joi.exist(),
        then: Joi.date().min(Joi.ref('departureDateFrom')),
      }),

    // Price range filters
    minPrice: Joi.number().min(0).messages({
      'number.min': 'Minimum price cannot be negative',
    }),
    maxPrice: Joi.number()
      .min(0)
      .when('minPrice', {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref('minPrice')),
      })
      .messages({
        'number.min': 'Maximum price must be greater than minimum price',
      }),

    // Time range filters (HH:mm format)
    departureTimeFrom: Joi.string().pattern(timePattern).messages({
      'string.pattern.base': 'departureTimeFrom must be in HH:mm format (e.g., 09:30)',
    }),
    departureTimeTo: Joi.string()
      .pattern(timePattern)
      .when('departureTimeFrom', {
        is: Joi.exist(),
        then: Joi.string().custom((value, helpers) => {
          const fromTime = (helpers.state.ancestors[0] as any).departureTimeFrom;
          if (fromTime) {
            const fromMinutes = parseInt(fromTime.split(':')[0]) * 60 + parseInt(fromTime.split(':')[1]);
            const toMinutes = parseInt(value.split(':')[0]) * 60 + parseInt(value.split(':')[1]);
            if (toMinutes <= fromMinutes) {
              return helpers.error('any.invalid');
            }
          }
          return value;
        }),
      })
      .messages({
        'string.pattern.base': 'departureTimeTo must be in HH:mm format (e.g., 18:30)',
        'any.invalid': 'departureTimeTo must be after departureTimeFrom',
      }),

    // Bus filters
    busType: Joi.string().valid('standard', 'limousine', 'sleeper').messages({
      'any.only': 'Bus type must be one of: standard (40-45 seats), limousine (20-30 seats), sleeper (30-40 berths)',
    }),
    amenities: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),

    // Operator filter
    operatorId: Joi.string().custom(objectId),

    // Additional filters
    minAvailableSeats: Joi.number().integer().min(1).messages({
      'number.min': 'Minimum available seats must be at least 1',
    }),

    // Sorting & Pagination
    ...sortSchema,
    ...paginationSchema,
  }),
};

const getTrips = {
  query: Joi.object().keys({
    route: Joi.string().custom(objectId),
    bus: Joi.string().custom(objectId),
    status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled'),
    ...sortSchema,
    ...paginationSchema,
    populate: Joi.string(),
  }),
};

const getTrip = {
  params: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
  }),
};

const createTrip = {
  body: Joi.object().keys({
    bus: Joi.string().custom(objectId).required(),
    route: Joi.string().custom(objectId).required(),
    operator: Joi.string().custom(objectId).required(),
    departureTime: Joi.date().iso().required(),
    arrivalTime: Joi.date().iso().required().greater(Joi.ref('departureTime')),
    pricePerSeat: Joi.number().min(0).required(),
    availableSeats: Joi.number().integer().min(0),
    status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled'),
  }),
};

const updateTrip = {
  params: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      departureTime: Joi.date().iso(),
      arrivalTime: Joi.date().iso(),
      pricePerSeat: Joi.number().min(0),
      availableSeats: Joi.number().integer().min(0),
      status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled'),
      cancellationReason: Joi.string().when('status', {
        is: 'cancelled',
        then: Joi.string().required(),
      }),
    })
    .min(1),
};

const deleteTrip = {
  params: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
  }),
};

export default {
  searchTrips,
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
};
