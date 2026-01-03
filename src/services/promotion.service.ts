import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import Promotion, { IPromotion } from '../models/promotion.model';
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

  await promotion.deleteOne();
  return promotion;
};

/**
 * Validate promotion code for booking
 * Returns promotion details and calculated discount
 */
const validatePromotionCode = async (promotionCode: string, orderAmount: number) => {
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

  // 3. Check usage limit
  if (promotion.usedCount >= promotion.usageLimit) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion usage limit reached');
  }

  // 4. Check minimum order value
  if (promotion.minOrderValue && orderAmount < promotion.minOrderValue) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum order value is ${promotion.minOrderValue.toLocaleString()}₫`);
  }

  // 5. Calculate discount
  const discountAmount = calculateDiscount(promotion, orderAmount);

  return {
    promotion,
    discountAmount,
    finalAmount: orderAmount - discountAmount,
  };
};

/**
 * Use promotion in booking (increment usage count)
 */
const usePromotionCode = async (promotionCode: string, bookingId: mongoose.Types.ObjectId) => {
  const promotion = await getPromotionByCode(promotionCode);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  // Atomic increment usedCount to prevent race condition
  const updatedPromotion = await Promotion.findOneAndUpdate(
    {
      code: promotionCode.toUpperCase(),
      usedCount: { $lt: promotion.usageLimit }, // Only increment if slots available
    },
    {
      $inc: { usedCount: 1 },
    },
    { new: true }
  );

  if (!updatedPromotion) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion usage limit reached');
  }

  logger.info(`Promotion ${promotionCode} used in booking ${bookingId}`);
  return updatedPromotion;
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
 * Get promotion statistics (Admin)
 */
const getPromotionStatistics = async (promotionId: mongoose.Types.ObjectId) => {
  const promotion = await getPromotionById(promotionId);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }

  return {
    promotion: {
      _id: promotion._id,
      code: promotion.code,
      title: promotion.title,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      usageLimit: promotion.usageLimit,
      usedCount: promotion.usedCount,
      remainingUsage: promotion.remainingUsage,
      isActive: promotion.isActive,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
    },
    statistics: {
      totalUsed: promotion.usedCount,
      totalRemaining: promotion.remainingUsage,
      usageRate: Math.round((promotion.usedCount / promotion.usageLimit) * 100),
    },
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
  validatePromotionCode,
  usePromotionCode,
  calculateDiscount,
  getPromotionStatistics,
};
