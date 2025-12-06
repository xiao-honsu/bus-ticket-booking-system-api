import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import reviewValidation from '../../validations/review.validation';
import reviewController from '../../controllers/review.controller';

const router = express.Router();

router
  .route('/')
  .post(auth('createReview'), validate(reviewValidation.createReview), reviewController.createReview)
  .get(validate(reviewValidation.getReviews), reviewController.getReviews); // Public

router
  .route('/:reviewId')
  .get(validate(reviewValidation.getReview), reviewController.getReview) // Public
  .patch(auth('manageOwnReviews'), validate(reviewValidation.updateReview), reviewController.updateReview)
  .delete(auth('manageOwnReviews'), validate(reviewValidation.deleteReview), reviewController.deleteReview);

router.route('/:reviewId/vote').post(auth(), validate(reviewValidation.voteReview), reviewController.voteReview);

router.route('/trip/:tripId/stats').get(reviewController.getTripStats); // Public

export default router;
