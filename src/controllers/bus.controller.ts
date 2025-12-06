import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';
import pick from '../utils/pick';
import busService from '../services/bus.service';

/**
 * Create a bus
 */
const createBus = catchAsync(async (req: Request, res: Response) => {
  const bus = await busService.createBus(req.body);
  res.status(httpStatus.CREATED).send(bus);
});

/**
 * Get all buses
 */
const getBuses = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['busType', 'operator', 'status']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;
  options.populate = options.populate || 'operator';

  const result = await busService.queryBuses(filter, options);
  res.send(result);
});

/**
 * Get bus by id
 */
const getBus = catchAsync(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.busId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid bus id');
  }
  const bus = await busService.getBusById(new mongoose.Types.ObjectId(req.params.busId));
  if (!bus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bus not found');
  }
  res.send(bus);
});

/**
 * Update bus by id
 */
const updateBus = catchAsync(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.busId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid bus id');
  }
  const bus = await busService.updateBusById(new mongoose.Types.ObjectId(req.params.busId), req.body);
  res.send(bus);
});

/**
 * Delete bus by id
 */
const deleteBus = catchAsync(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.busId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid bus id');
  }
  await busService.deleteBusById(new mongoose.Types.ObjectId(req.params.busId));
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Update bus seat map
 */
const updateSeatMap = catchAsync(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.busId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid bus id');
  }
  const bus = await busService.updateSeatMap(new mongoose.Types.ObjectId(req.params.busId), req.body);
  res.send(bus);
});

export default {
  createBus,
  getBuses,
  getBus,
  updateBus,
  deleteBus,
  updateSeatMap,
};
