import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import tripService from '../services/trip.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import SearchHistory from '../models/searchhistory.model';

const createTrip = catchAsync(async (req: Request, res: Response) => {

  // Fix date format issue: replace underscore with dot in ISO string
  if (req.body.departureTime && typeof req.body.departureTime === 'string') {
    req.body.departureTime = req.body.departureTime.replace(/_/g, '.');
  }
  if (req.body.arrivalTime && typeof req.body.arrivalTime === 'string') {
    req.body.arrivalTime = req.body.arrivalTime.replace(/_/g, '.');
  }
  
  console.log('✅ Fixed departureTime:', req.body.departureTime);
  console.log('✅ Fixed arrivalTime:', req.body.arrivalTime);
  
  const trip = await tripService.createTrip(req.body);
  res.status(httpStatus.CREATED).send(trip);
});

const getTrips = catchAsync(async (req: Request, res: Response) => {
  console.log('🚀 GET /trips called');
  console.log('📥 Query params:', req.query);
  console.log('👤 User:', req.user ? (req.user as any).email : 'Not authenticated');
  
  const filter = pick(req.query, ['route', 'status', 'bus']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
  
  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;
  options.populate = 'bus route';
  
  console.log('🔍 Filter:', filter);
  console.log('⚙️  Options:', options);
  
  const result = await tripService.queryTrips(filter, options);
  
  console.log('✅ Result:', {
    totalResults: result.totalResults,
    page: result.page,
    totalPages: result.totalPages,
    resultsCount: Array.isArray(result.results) ? result.results.length : 0
  });
  
  res.send(result);
});

const searchTrips = catchAsync(async (req: Request, res: Response) => {
  const { routeId, date, originCity, destinationCity, passengers } = req.query;
  
  if (!routeId || !date) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Route ID and date are required');
  }
  
  const trips = await tripService.searchTrips(
    new mongoose.Types.ObjectId(routeId as string),
    new Date(date as string)
  );
  
  // Log search history for authenticated users
  if (req.user && originCity && destinationCity) {
    try {
      await SearchHistory.create({
        user: (req.user as any)._id,
        originCity: originCity as string,
        destinationCity: destinationCity as string,
        travelDate: new Date(date as string),
        passengers: passengers ? parseInt(passengers as string) : 1,
        resultsCount: trips.length,
      });
    } catch (error) {
      // Don't fail the search if history logging fails
      console.error('Failed to log search history:', error);
    }
  }
  
  res.send(trips);
});

const getTrip = catchAsync(async (req: Request, res: Response) => {
  const trip = await tripService.getTripById(new mongoose.Types.ObjectId(req.params.tripId));
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  res.send(trip);
});

const updateTrip = catchAsync(async (req: Request, res: Response) => {
  const trip = await tripService.updateTripById(new mongoose.Types.ObjectId(req.params.tripId), req.body);
  res.send(trip);
});

const deleteTrip = catchAsync(async (req: Request, res: Response) => {
  await tripService.deleteTripById(new mongoose.Types.ObjectId(req.params.tripId));
  res.status(httpStatus.NO_CONTENT).send();
});

const updateSeatPricing = catchAsync(async (req: Request, res: Response) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.tripId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid trip id');
  }
  const trip = await tripService.updateSeatPricing(
    new mongoose.Types.ObjectId(req.params.tripId),
    req.body.seatPricing
  );
  res.send(trip);
});

export default {
  createTrip,
  getTrips,
  searchTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  updateSeatPricing,
};
