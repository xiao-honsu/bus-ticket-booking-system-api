import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import Promotion, { IPromotion } from '../models/promotion.model';
import UserPromotion, { IUserPromotion } from '../models/userpromotion.model';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

/**
 * Create a promotion (Admin only)
 */
const createPromotion = async (promotionBody: Partial<IPromotion>): Promise<IPromotion> => {
  // Validate dates
  if (new Date(promotionBody.startDate!) >= new Date(promotionBody.endDate!)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after start date');
  }

  // Check if code already exists
  const existingPromotion = await Promotion.findOne({ code: promotionBody.code?.toUpperCase() });
  if (existingPromotion) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion code already exists');
  }

  // Validate discount value
  if (promotionBody.discountType === 'percentage' && promotionBody.discountValue! > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Percentage discount cannot exceed 100%');
  }

  const promotion = await Promotion.create({
    ...promotionBody,
    code: promotionBody.code?.toUpperCase(),
  });

  return promotion;
};

/**
 * Query promotions with pagination (Admin)
 */
const queryPromotions = async (filter: any, options: PaginateOptions) => {
  const promotions = await Promotion.paginate(filter, options);
  return promotions;
};

/**
 * Get active promotions for users (Public)
 */
const getActivePromotions = async (page: number = 1, limit: number = 10) => {
  const now = new Date();

  const filter = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  };

  const options: PaginateOptions = {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: { path: 'createdBy', select: 'name email' },
  };

  const promotions = await Promotion.paginate(filter, options);
  return promotions;
};

/**
 * Get promotion by ID
 */
const getPromotionById = async (id: mongoose.Types.ObjectId): Promise<IPromotion | null> => {
  return Promotion.findById(id).populate('createdBy', 'name email');
};

/**
 * Get promotion by code
 */
const getPromotionByCode = async (code: string): Promise<IPromotion | null> => {
  return Promotion.findOne({ code: code.toUpperCase() });
};

/**
 * Update promotion by ID (Admin only)
 */
const updatePromotionById = async (
  promotionId: mongoose.Types.ObjectId,
  updateBody: Partial<IPromotion>
): Promise<IPromotion | null> => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  // Validate dates if being updated
  if (updateBody.startDate || updateBody.endDate) {
    const startDate = updateBody.startDate || promotion.startDate;
    const endDate = updateBody.endDate || promotion.endDate;
    if (new Date(startDate) >= new Date(endDate)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be after start date');
    }
  }

  // Validate discount
  if (updateBody.discountType === 'percentage' && updateBody.discountValue! > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Percentage discount cannot exceed 100%');
  }

  // Check code uniqueness if being changed
  if (updateBody.code && updateBody.code.toUpperCase() !== promotion.code) {
    const existingPromotion = await Promotion.findOne({ code: updateBody.code.toUpperCase() });
    if (existingPromotion) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion code already exists');
    }
    updateBody.code = updateBody.code.toUpperCase();
  }

  Object.assign(promotion, updateBody);
  await promotion.save();
  return promotion;
};

/**
 * Delete promotion by ID (Admin only)
 */
const deletePromotionById = async (promotionId: mongoose.Types.ObjectId): Promise<IPromotion | null> => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  // Check if promotion has been collected by any users
  const userPromotions = await UserPromotion.countDocuments({ promotionId });
  if (userPromotions > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot delete promotion that has been collected by users. Consider deactivating it instead.'
    );
  }

  await promotion.deleteOne();
  return promotion;
};

/**
 * Collect promotion (User)
 */
const collectPromotion = async (userId: mongoose.Types.ObjectId, promotionId: mongoose.Types.ObjectId) => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  // Check if promotion is valid
  const now = new Date();
  if (!promotion.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion is not active');
  }
  if (promotion.startDate > now) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has not started yet');
  }
  if (promotion.endDate < now) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has expired');
  }

  // Check if user already collected this promotion
  const existingCollection = await UserPromotion.countDocuments({
    userId,
    promotionId,
  });

  if (existingCollection >= promotion.perUserLimit) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You have already collected this promotion');
  }

  // Atomic increment collectedCount - prevents race condition
  const updatedPromotion = await Promotion.findOneAndUpdate(
    {
      _id: promotionId,
      collectedCount: { $lt: promotion.usageLimit }, // Only increment if slots available
    },
    {
      $inc: {
        collectedCount: 1,
        usedCount: 1, // Keep for backward compatibility
      },
    },
    { new: true }
  );

  if (!updatedPromotion) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion usage limit reached');
  }

  // Create user promotion
  const userPromotion = await UserPromotion.create({
    userId,
    promotionId,
    collectedAt: new Date(),
    isUsed: false,
    isExpired: false,
  });

  return userPromotion.populate('promotionId');
};

/**
 * Get user's collected promotions
 */
const getUserPromotions = async (
  userId: mongoose.Types.ObjectId,
  status: 'available' | 'used' | 'expired' | 'all' = 'all',
  page: number = 1,
  limit: number = 10
) => {
  const now = new Date();

  // Build match filter
  const matchFilter: any = { userId };

  if (status === 'used') {
    matchFilter.isUsed = true;
  } else if (status === 'available' || status === 'expired') {
    matchFilter.isUsed = false;
  }

  // Build aggregation pipeline
  const pipeline: any[] = [
    { $match: matchFilter },
    {
      $lookup: {
        from: 'promotions',
        localField: 'promotionId',
        foreignField: '_id',
        as: 'promotion',
      },
    },
    { $unwind: '$promotion' },
  ];

  // Add status-based filtering after lookup
  if (status === 'available') {
    pipeline.push({
      $match: {
        'promotion.endDate': { $gte: now },
      },
    });
  } else if (status === 'expired') {
    pipeline.push({
      $match: {
        'promotion.endDate': { $lt: now },
      },
    });
  }

  // Add sorting
  pipeline.push({ $sort: { collectedAt: -1 } });

  // Get total count
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await UserPromotion.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Add pagination
  const skip = (page - 1) * limit;
  pipeline.push({ $skip: skip }, { $limit: limit });

  // Execute aggregation
  const results = await UserPromotion.aggregate(pipeline);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    results,
    page,
    limit,
    totalPages,
    totalResults: total,
  };
};

/**
 * Use promotion in booking
 */
const usePromotion = async (
  userId: mongoose.Types.ObjectId,
  userPromotionId: mongoose.Types.ObjectId,
  bookingId: mongoose.Types.ObjectId
): Promise<IUserPromotion> => {
  const userPromotion = await UserPromotion.findOne({
    _id: userPromotionId,
    userId,
  }).populate('promotionId');

  if (!userPromotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found in your collection');
  }

  if (userPromotion.isUsed) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has already been used');
  }

  if (userPromotion.isExpired) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has expired');
  }

  const promotion = userPromotion.promotionId as any;
  if (new Date() > new Date(promotion.endDate)) {
    userPromotion.isExpired = true;
    await userPromotion.save();
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has expired');
  }

  // Mark as used
  userPromotion.isUsed = true;
  userPromotion.usedAt = new Date();
  userPromotion.usedInBooking = bookingId;
  await userPromotion.save();

  // Atomic increment actualUsedCount
  await Promotion.findByIdAndUpdate(promotion._id, { $inc: { actualUsedCount: 1 } });

  return userPromotion;
};

/**
 * Calculate discount amount
 */
const calculateDiscount = (promotion: IPromotion, orderAmount: number): number => {
  // Check minimum order value
  if (promotion.minOrderValue && orderAmount < promotion.minOrderValue) {
    return 0;
  }

  let discount = 0;

  if (promotion.discountType === 'fixed') {
    discount = promotion.discountValue;
  } else if (promotion.discountType === 'percentage') {
    discount = (orderAmount * promotion.discountValue) / 100;
    // Apply max discount if specified
    if (promotion.maxDiscount && discount > promotion.maxDiscount) {
      discount = promotion.maxDiscount;
    }
  }

  // Ensure discount doesn't exceed order amount
  return Math.min(discount, orderAmount);
};

/**
 * Validate promotion for booking (with auto-collect)
 * If user hasn't collected the promotion yet, auto-collect it for them
 */
const validatePromotionForBooking = async (
  userId: mongoose.Types.ObjectId,
  promotionCode: string,
  orderAmount: number
) => {
  // 1. Find promotion by code
  const promotion = await getPromotionByCode(promotionCode);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid promotion code');
  }

  // 2. Check if promotion is valid (active and within date range)
  const now = new Date();
  if (!promotion.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion is not active');
  }
  if (promotion.startDate > now) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has not started yet');
  }
  if (promotion.endDate < now) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion has expired');
  }

  // 3. Check if user already has this promotion
  let userPromotion = await UserPromotion.findOne({
    userId,
    promotionId: promotion._id,
  });

  // 4. AUTO-COLLECT if user doesn't have it yet
  if (!userPromotion) {
    // Check if promotion still has available slots
    if (promotion.collectedCount >= promotion.usageLimit) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion usage limit reached');
    }

    // Atomic increment to prevent race condition
    const updatedPromotion = await Promotion.findOneAndUpdate(
      {
        _id: promotion._id,
        collectedCount: { $lt: promotion.usageLimit },
      },
      {
        $inc: {
          collectedCount: 1,
          usedCount: 1, // Backward compatibility
        },
      },
      { new: true }
    );

    if (!updatedPromotion) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion usage limit reached');
    }

    // Create user promotion record
    userPromotion = await UserPromotion.create({
      userId,
      promotionId: promotion._id,
      collectedAt: now,
      isUsed: false,
      isExpired: false,
    });

    logger.info(`Auto-collected promotion ${promotionCode} for user ${userId}`);
  }

  // 5. Check if already used
  if (userPromotion.isUsed) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This promotion has already been used');
  }

  // 6. Check if expired
  if (userPromotion.isExpired || promotion.endDate < now) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This promotion has expired');
  }

  // 7. Check minimum order value
  if (promotion.minOrderValue && orderAmount < promotion.minOrderValue) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order value is ${promotion.minOrderValue.toLocaleString()}₫`);
  }

  // 8. Calculate discount
  const discountAmount = calculateDiscount(promotion, orderAmount);

  return {
    promotion,
    userPromotion,
    discountAmount,
    finalAmount: orderAmount - discountAmount,
  };
};

/**
 * Validate promotion by userPromotionId for booking
 */
const validatePromotionById = async (
  userId: mongoose.Types.ObjectId,
  userPromotionId: mongoose.Types.ObjectId,
  orderAmount: number
) => {
  // Get user promotion
  const userPromotion = await UserPromotion.findOne({
    _id: userPromotionId,
    userId,
    isUsed: false,
    isExpired: false,
  }).populate('promotionId');

  if (!userPromotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found in your collection or already used');
  }

  const promotion = userPromotion.promotionId as any;

  // Check if promotion is valid
  const now = new Date();
  if (!promotion.isActive || promotion.startDate > now || promotion.endDate < now) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion is not valid');
  }

  // Check minimum order value
  if (promotion.minOrderValue && orderAmount < promotion.minOrderValue) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order value is ${promotion.minOrderValue.toLocaleString()}₫`);
  }

  const discountAmount = calculateDiscount(promotion, orderAmount);

  return {
    promotion,
    userPromotion,
    discountAmount,
    finalAmount: orderAmount - discountAmount,
  };
};

/**
 * Get promotion statistics (Admin)
 */
const getPromotionStatistics = async (promotionId: mongoose.Types.ObjectId) => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  // Count total collected
  const totalCollected = await UserPromotion.countDocuments({ promotionId });

  // Count actually used
  const totalUsed = await UserPromotion.countDocuments({
    promotionId,
    isUsed: true,
  });

  // Count expired but not used
  const totalExpired = await UserPromotion.countDocuments({
    promotionId,
    isUsed: false,
    isExpired: true,
  });

  // Count still available to use
  const totalAvailable = await UserPromotion.countDocuments({
    promotionId,
    isUsed: false,
    isExpired: false,
  });

  // Get top users who collected
  const topCollectors = await UserPromotion.aggregate([
    { $match: { promotionId: promotion._id } },
    {
      $group: {
        _id: '$userId',
        collectCount: { $sum: 1 },
        usedCount: { $sum: { $cond: ['$isUsed', 1, 0] } },
      },
    },
    { $sort: { collectCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        userName: '$user.name',
        userEmail: '$user.email',
        collectCount: 1,
        usedCount: 1,
      },
    },
  ]);

  return {
    promotion: {
      _id: promotion._id,
      code: promotion.code,
      title: promotion.title,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      usageLimit: promotion.usageLimit,
      collectedCount: promotion.collectedCount,
      actualUsedCount: promotion.actualUsedCount,
      remainingUsage: promotion.remainingUsage,
      isActive: promotion.isActive,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
    },
    statistics: {
      totalCollected,
      totalUsed,
      totalExpired,
      totalAvailable,
      usageRate: totalCollected > 0 ? Math.round((totalUsed / totalCollected) * 100) : 0,
      collectionRate: Math.round((promotion.collectedCount / promotion.usageLimit) * 100),
    },
    topCollectors,
  };
};

export default {
  createPromotion,
  queryPromotions,
  getActivePromotions,
  getPromotionById,
  getPromotionByCode,
  updatePromotionById,
  deletePromotionById,
  collectPromotion,
  getUserPromotions,
  usePromotion,
  calculateDiscount,
  validatePromotionForBooking,
  validatePromotionById,
  getPromotionStatistics,
};
