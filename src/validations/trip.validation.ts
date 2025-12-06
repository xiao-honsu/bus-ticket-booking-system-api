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
    // Location filters
    origin: Joi.string().trim(),
    destination: Joi.string().trim(),

    // Date filter
    departureDate: Joi.date().iso(),

    // Price range filters
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number()
      .min(0)
      .when('minPrice', {
        is: Joi.exist(),
        then: Joi.number().min(Joi.ref('minPrice')),
      }),

    // Time range filters (HH:mm format)
    departureTimeFrom: Joi.string().pattern(timePattern).messages({
      'string.pattern.base': 'departureTimeFrom must be in HH:mm format',
    }),
    departureTimeTo: Joi.string().pattern(timePattern).messages({
      'string.pattern.base': 'departureTimeTo must be in HH:mm format',
    }),

    // Bus filters
    busType: Joi.string().valid('standard', 'limousine', 'sleeper'),
    amenities: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),

    // Operator filter
    operatorId: Joi.string().custom(objectId),

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
