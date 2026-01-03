import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import tripService from '../services/trip.service';
import searchHistoryService from '../services/searchhistory.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

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

  // Fix populate format - convert comma-separated string to array of populate objects
  if (options.populate && typeof options.populate === 'string') {
    options.populate = options.populate.split(',').map((path: string) => ({ path: path.trim() }));
  } else if (!options.populate) {
    // Default populate - include operator information
    options.populate = [{ path: 'bus' }, { path: 'route' }, { path: 'operator' }];
  }

  const result = await tripService.queryTrips(filter, options);

  console.log('✅ Result:', {
    totalResults: result.totalResults,
    page: result.page,
    totalPages: result.totalPages,
    resultsCount: Array.isArray(result.results) ? result.results.length : 0,
  });

  res.send(result);
});

const searchTrips = catchAsync(async (req: Request, res: Response) => {
  const {
    origin,
    destination,
    departureDate,
    minPrice,
    maxPrice,
    departureTimeFrom,
    departureTimeTo,
    busType,
    amenities,
    operatorId,
    minAvailableSeats,
    status,
    sortBy,
    sortOrder,
    page,
    limit,
  } = req.query;

  const options = {
    origin: origin as string,
    destination: destination as string,
    departureDate: departureDate ? new Date(departureDate as string) : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    departureTimeFrom: departureTimeFrom as string,
    departureTimeTo: departureTimeTo as string,
    busType: busType as string,
    amenities: amenities as string | string[],
    operatorId: operatorId as string,
    minAvailableSeats: minAvailableSeats ? Number(minAvailableSeats) : undefined,
    status: status as string,
    sortBy: sortBy as any,
    sortOrder: sortOrder as 'asc' | 'desc',
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  };

  const results = await tripService.searchTrips(options);

  // Log search asynchronously (don't block response)
  if (origin && destination) {
    searchHistoryService.logSearchAsync({
      userId: (req.user as any)?._id?.toString(),
      sessionId: req.headers['x-session-id'] as string,
      originCity: origin as string,
      destinationCity: destination as string,
      travelDate: departureDate ? new Date(departureDate as string) : undefined,
      filters: {
        busType: busType ? [busType as string] : undefined,
        priceRange:
          minPrice || maxPrice
            ? {
                min: Number(minPrice) || 0,
                max: Number(maxPrice) || 0,
              }
            : undefined,
        departureTimeRange:
          departureTimeFrom || departureTimeTo
            ? {
                start: (departureTimeFrom as string) || '',
                end: (departureTimeTo as string) || '',
              }
            : undefined,
        amenities: amenities ? ((Array.isArray(amenities) ? amenities : [amenities]) as string[]) : undefined,
      },
      resultsCount: results.totalResults,
    });
  }

  res.send(results);
});

const getTrip = catchAsync(async (req: Request, res: Response) => {
  const trip = await tripService.getTripById(new mongoose.Types.ObjectId(req.params.tripId));
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  res.send(trip);
});

const getTripDetails = catchAsync(async (req: Request, res: Response) => {
  const trip = await tripService.getTripDetails(new mongoose.Types.ObjectId(req.params.tripId));
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

const getSeatMap = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.query;
  const seatMap = await tripService.getSeatMap(
    new mongoose.Types.ObjectId(req.params.tripId),
    sessionId as string | undefined
  );
  res.send(seatMap);
});

export default {
  createTrip,
  getTrips,
  searchTrips,
  getTrip,
  getTripDetails,
  updateTrip,
  deleteTrip,
  updateSeatPricing,
  getSeatMap,
};
