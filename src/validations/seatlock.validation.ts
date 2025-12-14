import Joi from 'joi';
import { objectId } from './custom.validation';

const lockSeats = {
  body: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required().messages({
      'any.required': 'Trip ID is required',
      'string.base': 'Trip ID must be a string',
    }),
    seatNumbers: Joi.array().items(Joi.string().trim()).min(1).max(10).required().messages({
      'array.min': 'At least one seat must be selected',
      'array.max': 'Maximum 10 seats can be selected at once',
      'any.required': 'Seat numbers are required',
    }),
  }),
};

const releaseLocks = {
  body: Joi.object().keys({
    sessionId: Joi.string().optional(),
  }),
};

const getLockedSeats = {
  params: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
  }),
};

const extendLocks = {
  body: Joi.object().keys({
    sessionId: Joi.string().optional(),
    minutes: Joi.number().min(1).max(30).optional().default(10).messages({
      'number.min': 'Extension must be at least 1 minute',
      'number.max': 'Extension cannot exceed 30 minutes',
    }),
  }),
};

const checkAvailability = {
  body: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
    seatNumbers: Joi.array().items(Joi.string()).min(1).required(),
  }),
};

export default {
  lockSeats,
  releaseLocks,
  getLockedSeats,
  extendLocks,
  checkAvailability,
};
