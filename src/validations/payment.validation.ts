import Joi from 'joi';
import { objectId } from './custom.validation';

const createPayment = {
  body: Joi.object().keys({
    bookingId: Joi.string().required().custom(objectId),
  }),
};

const checkStatus = {
  params: Joi.object().keys({
    orderCode: Joi.string().required(),
  }),
};

const cancelPayment = {
  params: Joi.object().keys({
    bookingId: Joi.string().required().custom(objectId),
  }),
};

export default {
  createPayment,
  checkStatus,
  cancelPayment,
};
