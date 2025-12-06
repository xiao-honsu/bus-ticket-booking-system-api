import Joi from 'joi';
import { objectId } from './custom.validation';

const createReview = {
  body: Joi.object().keys({
    booking: Joi.string().required().custom(objectId),
    trip: Joi.string().required().custom(objectId),
    ratings: Joi.object()
      .keys({
        overall: Joi.number().integer().min(1).max(5).required(),
        cleanliness: Joi.number().integer().min(1).max(5),
        punctuality: Joi.number().integer().min(1).max(5),
        staff: Joi.number().integer().min(1).max(5),
        comfort: Joi.number().integer().min(1).max(5),
        value: Joi.number().integer().min(1).max(5),
      })
      .required(),
    reviewText: Joi.string().max(1000),
    photos: Joi.array().items(Joi.string().uri()).max(5),
  }),
};

const getReviews = {
  query: Joi.object().keys({
    trip: Joi.string().custom(objectId),
    user: Joi.string().custom(objectId),
    minRating: Joi.number().integer().min(1).max(5),
    maxRating: Joi.number().integer().min(1).max(5),
    status: Joi.string().valid('published', 'hidden', 'deleted'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId),
  }),
};

const updateReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      ratings: Joi.object().keys({
        overall: Joi.number().integer().min(1).max(5),
        cleanliness: Joi.number().integer().min(1).max(5),
        punctuality: Joi.number().integer().min(1).max(5),
        staff: Joi.number().integer().min(1).max(5),
        comfort: Joi.number().integer().min(1).max(5),
        value: Joi.number().integer().min(1).max(5),
      }),
      reviewText: Joi.string().max(1000),
      photos: Joi.array().items(Joi.string().uri()).max(5),
    })
    .min(1),
};

const deleteReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId),
  }),
};

const voteReview = {
  params: Joi.object().keys({
    reviewId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    isHelpful: Joi.boolean().required(),
  }),
};

export default {
  createReview,
  getReviews,
  getReview,
  updateReview,
  deleteReview,
  voteReview,
};
