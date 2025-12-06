import Joi from 'joi';
import { objectId } from './custom.validation';

const createOperator = {
  body: Joi.object().keys({
    companyName: Joi.string().required().min(3).max(100),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string()
      .required()
      .regex(/^[0-9]{10,11}$/),
    licenseNumber: Joi.string().required(),
    description: Joi.string().max(500),
    logoUrl: Joi.string().uri(),
    status: Joi.string().valid('pending', 'approved', 'active', 'suspended').default('pending'),
  }),
};

const getOperators = {
  query: Joi.object().keys({
    companyName: Joi.string(),
    status: Joi.string().valid('pending', 'approved', 'active', 'suspended'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getOperator = {
  params: Joi.object().keys({
    operatorId: Joi.string().custom(objectId),
  }),
};

const updateOperator = {
  params: Joi.object().keys({
    operatorId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      companyName: Joi.string().min(3).max(100),
      email: Joi.string().email(),
      phoneNumber: Joi.string().regex(/^[0-9]{10,11}$/),
      licenseNumber: Joi.string(),
      description: Joi.string().max(500),
      logoUrl: Joi.string().uri(),
      status: Joi.string().valid('pending', 'approved', 'active', 'suspended'),
    })
    .min(1),
};

const deleteOperator = {
  params: Joi.object().keys({
    operatorId: Joi.string().custom(objectId),
  }),
};

export default {
  createOperator,
  getOperators,
  getOperator,
  updateOperator,
  deleteOperator,
};
