import { Request, Response } from 'express';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import promotionService from '../services/promotion.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

// ========== ADMIN ENDPOINTS ==========

/**
 * Create promotion (Admin only)
 * POST /api/v1/promotions
 */
const createPromotion = catchAsync(async (req: Request, res: Response) => {
  const promotion = await promotionService.createPromotion({
    ...req.body,
    createdBy: (req.user as any)._id,
  });
  res.status(httpStatus.CREATED).send(promotion);
});

/**
 * Get all promotions with filters (Admin)
 * GET /api/v1/promotions/admin
 */
const getPromotions = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['isActive', 'discountType']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  options.limit = options.limit ? parseInt(options.limit) : 10;
  options.page = options.page ? parseInt(options.page) : 1;

  if (options.populate && typeof options.populate === 'string') {
    options.populate = options.populate.split(',').map((path: string) => ({ path: path.trim() }));
  } else if (!options.populate) {
    options.populate = [{ path: 'createdBy', select: 'name email' }];
  }

  const result = await promotionService.queryPromotions(filter, options);
  res.send(result);
});

/**
 * Get promotion by ID
 * GET /api/v1/promotions/:promotionId
 */
const getPromotion = catchAsync(async (req: Request, res: Response) => {
  const promotion = await promotionService.getPromotionById(new mongoose.Types.ObjectId(req.params.promotionId));
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }
  res.send(promotion);
});

/**
 * Update promotion (Admin only)
 * PATCH /api/v1/promotions/:promotionId
 */
const updatePromotion = catchAsync(async (req: Request, res: Response) => {
  const promotion = await promotionService.updatePromotionById(
    new mongoose.Types.ObjectId(req.params.promotionId),
    req.body
  );
  res.send(promotion);
});

/**
 * Delete promotion (Admin only)
 * DELETE /api/v1/promotions/:promotionId
 */
const deletePromotion = catchAsync(async (req: Request, res: Response) => {
  await promotionService.deletePromotionById(new mongoose.Types.ObjectId(req.params.promotionId));
  res.status(httpStatus.NO_CONTENT).send();
});

// ========== USER ENDPOINTS ==========

/**
 * Get active promotions (Public/User)
 * GET /api/v1/promotions/active
 */
const getActivePromotions = catchAsync(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  const result = await promotionService.getActivePromotions(page, limit);
  res.send(result);
});

/**
 * Validate promotion code for booking
 * POST /api/v1/promotions/validate
 * Body: { code, orderAmount }
 */
const validatePromotion = catchAsync(async (req: Request, res: Response) => {
  const { code, orderAmount } = req.body;

  if (!code || !orderAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promotion code and order amount are required');
  }

  const result = await promotionService.validatePromotionCode(code, parseFloat(orderAmount));

  res.send(result);
});

/**
 * Get promotion by code (for checking details)
 * GET /api/v1/promotions/by-code/:code
 */
const getPromotionByCode = catchAsync(async (req: Request, res: Response) => {
  const promotion = await promotionService.getPromotionByCode(req.params.code);
  if (!promotion) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promotion not found');
  }
  res.send(promotion);
});

/**
 * Get promotion statistics (Admin only)
 * GET /api/v1/promotions/:promotionId/statistics
 */
const getPromotionStatistics = catchAsync(async (req: Request, res: Response) => {
  const statistics = await promotionService.getPromotionStatistics(new mongoose.Types.ObjectId(req.params.promotionId));
  res.send(statistics);
});

export default {
  createPromotion,
  getPromotions,
  getPromotion,
  updatePromotion,
  deletePromotion,
  getActivePromotions,
  validatePromotion,
  getPromotionByCode,
  getPromotionStatistics,
};
