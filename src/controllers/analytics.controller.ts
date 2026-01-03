import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import analyticsService from '../services/analytics.service';

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { period = '7d' } = req.query;
  const analytics = await analyticsService.getAnalytics(period as string);
  res.send(analytics);
});

const getRevenueStats = catchAsync(async (req: Request, res: Response) => {
  const { period = '7d' } = req.query;
  const revenueStats = await analyticsService.getRevenueStats(period as string);
  res.send(revenueStats);
});

const getBookingStats = catchAsync(async (req: Request, res: Response) => {
  const { period = '30d' } = req.query;
  const bookingStats = await analyticsService.getBookingStats(period as string);
  res.send(bookingStats);
});

const getPopularRoutes = catchAsync(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const popularRoutes = await analyticsService.getPopularRoutes(Number(limit));
  res.send(popularRoutes);
});

const getTodayBookings = catchAsync(async (_req: Request, res: Response) => {
  const count = await analyticsService.getTodayBookingsCount();
  res.send({ count });
});

const getBookingsByStatus = catchAsync(async (req: Request, res: Response) => {
  const { period = '7d' } = req.query;
  const data = await analyticsService.getBookingsByStatusOverTime(period as string);
  res.send(data);
});

export default {
  getAnalytics,
  getRevenueStats,
  getBookingStats,
  getPopularRoutes,
  getTodayBookings,
  getBookingsByStatus,
};
