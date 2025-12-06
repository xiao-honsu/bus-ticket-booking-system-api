import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import locationService from '../services/location.service';

const searchLocations = catchAsync(async (req: Request, res: Response) => {
  const { q, type, limit } = req.query;
  const locations = await locationService.searchLocations(q as string, type as string, Number(limit) || 10);
  res.send(locations);
});

const getPopularLocations = catchAsync(async (req: Request, res: Response) => {
  const { limit } = req.query;
  const locations = await locationService.getPopularLocations(Number(limit) || 10);
  res.send(locations);
});

const getPopularRoutes = catchAsync(async (req: Request, res: Response) => {
  const { limit } = req.query;
  const routes = await locationService.getPopularRoutes(Number(limit) || 10);
  res.send(routes);
});

export default {
  searchLocations,
  getPopularLocations,
  getPopularRoutes,
};
