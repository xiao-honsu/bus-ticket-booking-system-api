import express from 'express';
import promotionController from '../../controllers/promotion.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

// Public routes
router.get('/active', promotionController.getActivePromotions);
router.get('/by-code/:code', promotionController.getPromotionByCode);

// User routes (authenticated)
router.post('/:promotionId/collect', auth(), promotionController.collectPromotion);
router.get('/my-promotions', auth(), promotionController.getMyPromotions);
router.post('/validate', auth(), promotionController.validatePromotion);

// Admin routes
router.post('/', auth('managePromotions'), promotionController.createPromotion);
router.get('/admin', auth('managePromotions'), promotionController.getPromotions);
router.get('/:promotionId', auth('managePromotions'), promotionController.getPromotion);
router.patch('/:promotionId', auth('managePromotions'), promotionController.updatePromotion);
router.delete('/:promotionId', auth('managePromotions'), promotionController.deletePromotion);

export default router;
