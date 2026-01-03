import express from 'express';
import analyticsController from '../controllers/analytics.controller';
import auth from '../middlewares/auth';

const router = express.Router();

router.use(auth('viewAnalytics'));

router.get('/', analyticsController.getAnalytics);
router.get('/revenue', analyticsController.getRevenueStats);
router.get('/bookings', analyticsController.getBookingStats);
router.get('/popular-routes', analyticsController.getPopularRoutes);
router.get('/today-bookings', analyticsController.getTodayBookings);
router.get('/bookings-by-status', analyticsController.getBookingsByStatus);

export default router;
