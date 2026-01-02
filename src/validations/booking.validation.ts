import Joi from 'joi';
import { objectId } from './custom.validation';

const createBooking = {
  body: Joi.object().keys({
    trip: Joi.string().required().custom(objectId),
    passengers: Joi.array()
      .items(
        Joi.object().keys({
          name: Joi.string().required(),
          age: Joi.number().required().min(1).max(120),
          gender: Joi.string().required().valid('male', 'female', 'other'),
          seatNumber: Joi.string().required(),
          seatPrice: Joi.number().required().min(0),
        })
      )
      .min(1)
      .required(),
    contactPhone: Joi.string().required(),
    contactEmail: Joi.string().email().required(),
    totalAmount: Joi.number().required().min(0),
  }),
};

const getBookings = {
  query: Joi.object().keys({
    user: Joi.string().custom(objectId),
    trip: Joi.string().custom(objectId),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed'),
    paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'failed'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getBooking = {
  params: Joi.object().keys({
    bookingId: Joi.string().custom(objectId),
  }),
};

const updateBooking = {
  params: Joi.object().keys({
    bookingId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed'),
      paymentStatus: Joi.string().valid('pending', 'paid', 'refunded', 'failed'),
    })
    .min(1),
};

const cancelBooking = {
  params: Joi.object().keys({
    bookingId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    reason: Joi.string().required(),
  }),
};

const createGuestBooking = {
  body: Joi.object().keys({
    trip: Joi.string().required().custom(objectId),
    guestEmail: Joi.string().email().required(),
    guestPhone: Joi.string()
      .required()
      .regex(/^[0-9]{10,11}$/),
    passengers: Joi.array()
      .items(
        Joi.object().keys({
          name: Joi.string().required(),
          age: Joi.number().integer().min(0).max(120),
          gender: Joi.string().valid('male', 'female', 'other'),
          seatNumber: Joi.string().required(),
          seatPrice: Joi.number().required().min(0),
        })
      )
      .min(1)
      .required(),
    contactPhone: Joi.string().required(),
    contactEmail: Joi.string().email().required(),
    totalAmount: Joi.number().required().min(0),
  }),
};

export default {
  createBooking,
  createGuestBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
};
