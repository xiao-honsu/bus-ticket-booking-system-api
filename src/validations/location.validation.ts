import Joi from 'joi';

const searchLocations = {
  query: Joi.object().keys({
    q: Joi.string().required().min(1).max(100),
    type: Joi.string().valid('origin', 'destination', 'all').default('all'),
    limit: Joi.number().integer().min(1).max(20).default(10),
  }),
};

const getPopularLocations = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(20).default(10),
  }),
};

export default {
  searchLocations,
  getPopularLocations,
};
