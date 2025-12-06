import Joi from 'joi';
import { objectId } from './custom.validation';

const lockSeats = {
  body: Joi.object().keys({
    tripId: Joi.string().custom(objectId).required(),
    seatNumbers: Joi.array().items(Joi.string()).min(1).required(),
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
    minutes: Joi.number().min(1).max(30).optional(),
  }),
};

export default {
  lockSeats,
  releaseLocks,
  getLockedSeats,
  extendLocks,
};
