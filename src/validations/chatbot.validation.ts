import Joi from 'joi';
import { objectId } from './custom.validation';

const createSession = {
  body: Joi.object().keys({
    // No required fields - sessions can be created by authenticated or guest users
  }),
};

const getSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().custom(objectId).required(),
  }),
};

const sendMessage = {
  params: Joi.object().keys({
    sessionId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    message: Joi.string().required().min(1).max(1000),
  }),
};

const closeSession = {
  params: Joi.object().keys({
    sessionId: Joi.string().custom(objectId).required(),
  }),
};

const getUserSessions = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(50),
    page: Joi.number().integer().min(1),
  }),
};

export default {
  createSession,
  getSession,
  sendMessage,
  closeSession,
  getUserSessions,
};
