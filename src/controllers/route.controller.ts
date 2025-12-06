import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import routeService from '../services/route.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

const createRoute = catchAsync(async (req: Request, res: Response) => {
  const route = await routeService.createRoute(req.body);
  res.status(httpStatus.CREATED).send(route);
});

const getRoutes = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['isActive']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page']);

  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;

  const result = await routeService.queryRoutes(filter, options);
  res.send(result);
});

const searchRoutes = catchAsync(async (req: Request, res: Response) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Origin and destination are required');
  }

  const routes = await routeService.searchRoutes(origin as string, destination as string);
  res.send(routes);
});

const getRoute = catchAsync(async (req: Request, res: Response) => {
  const route = await routeService.getRouteById(new mongoose.Types.ObjectId(req.params.routeId));
  if (!route) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Route not found');
  }
  res.send(route);
});

const updateRoute = catchAsync(async (req: Request, res: Response) => {
  const route = await routeService.updateRouteById(new mongoose.Types.ObjectId(req.params.routeId), req.body);
  res.send(route);
});

const deleteRoute = catchAsync(async (req: Request, res: Response) => {
  await routeService.deleteRouteById(new mongoose.Types.ObjectId(req.params.routeId));
  res.status(httpStatus.NO_CONTENT).send();
});

const toggleStatus = catchAsync(async (req: Request, res: Response) => {
  const route = await routeService.toggleRouteStatus(new mongoose.Types.ObjectId(req.params.routeId));
  res.send(route);
});

export default {
  createRoute,
  getRoutes,
  searchRoutes,
  getRoute,
  updateRoute,
  deleteRoute,
  toggleStatus,
};
