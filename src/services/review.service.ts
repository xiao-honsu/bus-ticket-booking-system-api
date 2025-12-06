import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Review from '../models/review.model';
import ReviewVote from '../models/reviewvote.model';
import Booking from '../models/booking.model';
import User from '../models/user.model';
import Trip from '../models/trip.model';
import ApiError from '../utils/ApiError';
import { IReview } from '../models/review.model';

/**
 * Create a review
 * @param {mongoose.Types.ObjectId} userId
 * @param {object} reviewBody
 * @returns {Promise<IReview>}
 */
const createReview = async (userId: mongoose.Types.ObjectId, reviewBody: any): Promise<IReview> => {
  // Verify booking exists and belongs to user
  const booking = await Booking.findOne({ _id: reviewBody.booking, user: userId });
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Booking not found or does not belong to you');
  }

  // Check if booking is completed
  if (booking.status !== 'confirmed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Can only review confirmed bookings');
  }

  // Check if user already reviewed this trip
  const existingReview = await Review.findOne({ user: userId, trip: reviewBody.trip });
  if (existingReview) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already reviewed this trip');
  }

  // Get user snapshot
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Get trip snapshot
  const trip = await Trip.findById(reviewBody.trip).populate('route');
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  const review = await Review.create({
    ...reviewBody,
    user: userId,
    verifiedBooking: true,
    status: 'published',
    helpfulCount: 0,
    userSnapshot: {
      fullName: user.name,
      profilePicture: user.profilePictureUrl,
    },
    tripSnapshot: {
      routeName: (trip.route as any).origin + ' - ' + (trip.route as any).destination,
      departureDate: trip.departureTime,
      operatorName: 'Bus Operator', // You may want to populate this from the operator
    },
  });

  const createdReview = Array.isArray(review) ? review[0] : review;

  // Populate user information
  const populatedReview = await Review.findById(createdReview._id).populate('user', 'name email');
  return populatedReview!;
};

/**
 * Query for reviews
 * @param {object} filter - Mongo filter
 * @param {object} options - Query options
 * @returns {Promise<IReview[]>}
 */
const queryReviews = async (filter: any, options: any) => {
  // Build filter
  const queryFilter: any = { status: 'published' };

  if (filter.trip) {
    queryFilter.trip = filter.trip;
  }

  if (filter.user) {
    queryFilter.user = filter.user;
  }

  if (filter.minRating || filter.maxRating) {
    queryFilter['ratings.overall'] = {};
    if (filter.minRating) {
      queryFilter['ratings.overall'].$gte = filter.minRating;
    }
    if (filter.maxRating) {
      queryFilter['ratings.overall'].$lte = filter.maxRating;
    }
  }

  const reviews = await Review.find(queryFilter)
    .populate('user', 'name profilePicture')
    .populate('trip', 'departureTime')
    .sort(options.sortBy || '-createdAt')
    .limit(options.limit)
    .skip((options.page - 1) * options.limit);

  return reviews;
};

/**
 * Get review by id
 * @param {mongoose.Types.ObjectId} reviewId
 * @returns {Promise<IReview>}
 */
const getReviewById = async (reviewId: mongoose.Types.ObjectId): Promise<IReview | null> => {
  return Review.findById(reviewId).populate('user', 'name email profilePicture').populate('trip').populate('booking');
};

/**
 * Update review by id
 * @param {mongoose.Types.ObjectId} reviewId
 * @param {mongoose.Types.ObjectId} userId
 * @param {object} updateBody
 * @returns {Promise<IReview>}
 */
const updateReview = async (
  reviewId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  updateBody: any
): Promise<IReview | null> => {
  const review = await Review.findOne({ _id: reviewId, user: userId });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found or you are not authorized');
  }

  if (review.status === 'deleted') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot update a deleted review');
  }

  Object.assign(review, updateBody);
  await review.save();
  return review;
};

/**
 * Delete review by id
 * @param {mongoose.Types.ObjectId} reviewId
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<IReview>}
 */
const deleteReview = async (
  reviewId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<IReview | null> => {
  const review = await Review.findOne({ _id: reviewId, user: userId });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found or you are not authorized');
  }

  // Soft delete
  review.status = 'deleted';
  await review.save();
  return review;
};

/**
 * Vote on review (mark as helpful or not)
 * @param {mongoose.Types.ObjectId} reviewId
 * @param {mongoose.Types.ObjectId} userId
 * @param {boolean} isHelpful
 * @returns {Promise<IReview>}
 */
const voteReview = async (
  reviewId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  isHelpful: boolean
): Promise<IReview | null> => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found');
  }

  if (review.status !== 'published') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot vote on this review');
  }

  // Check if user already voted
  const existingVote = await ReviewVote.findOne({ review: reviewId, user: userId });

  if (existingVote) {
    // Update existing vote
    if (existingVote.isHelpful === isHelpful) {
      // Remove vote if clicking same button
      await existingVote.deleteOne();
    } else {
      // Change vote
      existingVote.isHelpful = isHelpful;
      await existingVote.save();
    }
  } else {
    // Create new vote
    await ReviewVote.create({
      review: reviewId,
      user: userId,
      isHelpful,
    });
  }

  // Recalculate helpful count (only count helpful votes)
  const helpfulCount = await ReviewVote.countDocuments({ review: reviewId, isHelpful: true });
  review.helpfulCount = helpfulCount;
  await review.save();

  return review;
};

/**
 * Get reviews statistics for a trip
 * @param {mongoose.Types.ObjectId} tripId
 * @returns {Promise<object>}
 */
const getTripReviewStats = async (tripId: mongoose.Types.ObjectId) => {
  const stats = await Review.aggregate([
    { $match: { trip: tripId, status: 'published' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageOverall: { $avg: '$ratings.overall' },
        averageCleanliness: { $avg: '$ratings.cleanliness' },
        averagePunctuality: { $avg: '$ratings.punctuality' },
        averageStaff: { $avg: '$ratings.staff' },
        averageComfort: { $avg: '$ratings.comfort' },
        averageValue: { $avg: '$ratings.value' },
      },
    },
  ]);

  return stats.length > 0 ? stats[0] : null;
};

export default {
  createReview,
  queryReviews,
  getReviewById,
  updateReview,
  deleteReview,
  voteReview,
  getTripReviewStats,
};
