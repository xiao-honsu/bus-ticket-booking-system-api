import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import reviewService from '../services/review.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.createReview((req.user as any)._id, req.body);
  res.status(httpStatus.CREATED).send(review);
});

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['trip', 'user', 'minRating', 'maxRating', 'status']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page']);

  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;

  const reviews = await reviewService.queryReviews(filter, options);
  res.send(reviews);
});

const getReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.getReviewById(new mongoose.Types.ObjectId(req.params.reviewId));
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }
  res.send(review);
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.updateReview(
    new mongoose.Types.ObjectId(req.params.reviewId),
    (req.user as any)._id,
    req.body
  );
  res.send(review);
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await reviewService.deleteReview(new mongoose.Types.ObjectId(req.params.reviewId), (req.user as any)._id);
  res.status(httpStatus.NO_CONTENT).send();
});

const voteReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.voteReview(
    new mongoose.Types.ObjectId(req.params.reviewId),
    (req.user as any)._id,
    req.body.isHelpful
  );
  res.send(review);
});

const getTripStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await reviewService.getTripReviewStats(new mongoose.Types.ObjectId(req.params.tripId));
  res.send(stats);
});

export default {
  createReview,
  getReviews,
  getReview,
  updateReview,
  deleteReview,
  voteReview,
  getTripStats,
};
