import httpStatus from 'http-status';
import mongoose, { PaginateOptions, PipelineStage } from 'mongoose';
import Trip, { ITrip } from '../models/trip.model';
import Bus from '../models/bus.model';
import SeatLock from '../models/seatlock.model';
import ApiError from '../utils/ApiError';

// Types for search options
interface SearchTripsOptions {
  origin?: string;
  destination?: string;
  departureDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  departureTimeFrom?: string;
  departureTimeTo?: string;
  busType?: string;
  amenities?: string | string[];
  operatorId?: string;
  minAvailableSeats?: number;
  status?: string;
  sortBy?: 'price' | 'departureTime' | 'duration' | 'availableSeats';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface SearchResult {
  results: any[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

// Helper to convert time string (HH:mm) to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

// Helper to build time filter expressions
const buildTimeFilterExpr = (from?: string, to?: string): object[] => {
  const expressions: object[] = [];
  const minutesExpr = { $add: [{ $multiply: [{ $hour: '$departureTime' }, 60] }, { $minute: '$departureTime' }] };

  if (from) {
    expressions.push({ $gte: [minutesExpr, timeToMinutes(from)] });
  }
  if (to) {
    expressions.push({ $lte: [minutesExpr, timeToMinutes(to)] });
  }
  return expressions;
};

/**
 * Create a trip
 * @param {Object} tripBody
 * @returns {Promise<ITrip>}
 */
const createTrip = async (tripBody: Partial<ITrip>): Promise<ITrip> => {
  // Verify bus exists
  const bus = await Bus.findById(tripBody.bus);
  if (!bus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bus not found');
  }

  // Set available seats from bus total seats
  const trip = await Trip.create({
    ...tripBody,
    availableSeats: tripBody.availableSeats || bus.totalSeats,
  });
  return trip;
};

/**
 * Query for trips
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryTrips = async (filter: any, options: PaginateOptions) => {
  console.log('🔎 queryTrips called with filter:', filter);
  console.log('📋 queryTrips options:', options);

  const trips = await Trip.paginate(filter, options);

  console.log('💾 Database result:', {
    totalDocs: trips.totalDocs,
    docs: trips.docs?.length,
    page: trips.page,
    totalPages: trips.totalPages,
  });

  return trips;
};

/**
 * Get trip by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ITrip | null>}
 */
const getTripById = async (id: mongoose.Types.ObjectId): Promise<ITrip | null> => {
  const trip = await Trip.findById(id).populate('bus').populate('route');

  // Auto-update trip status if needed (real-time check)
  if (trip) {
    const now = new Date();

    // Only update if status is 'scheduled' (not already in_progress, completed, or cancelled)
    if (trip.status === 'scheduled') {
      if (trip.arrivalTime && trip.departureTime <= now && trip.arrivalTime > now) {
        // Currently between departure and arrival - set to in_progress
        trip.status = 'in_progress';
        await trip.save();
      } else if (trip.departureTime < now) {
        // Departure time has passed - set to completed
        trip.status = 'completed';
        await trip.save();
      }
    }
    // If already in_progress, check if should be completed
    else if (trip.status === 'in_progress') {
      if (trip.arrivalTime && trip.arrivalTime <= now) {
        trip.status = 'completed';
        await trip.save();
      }
    }
  }

  return trip;
};

/**
 * Update trip by id
 * @param {mongoose.Types.ObjectId} tripId
 * @param {Object} updateBody
 * @returns {Promise<ITrip | null>}
 */
const updateTripById = async (tripId: mongoose.Types.ObjectId, updateBody: Partial<ITrip>): Promise<ITrip | null> => {
  const trip = await getTripById(tripId);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  // Prevent status changes for trips that are in_progress, completed, or cancelled
  if (updateBody.status && ['in_progress', 'completed', 'cancelled'].includes(trip.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot change status of trip that is already ${trip.status}`);
  }

  Object.assign(trip, updateBody);
  await trip.save();
  return trip;
};

/**
 * Delete trip by id
 * @param {mongoose.Types.ObjectId} tripId
 * @returns {Promise<ITrip | null>}
 */
const deleteTripById = async (tripId: mongoose.Types.ObjectId): Promise<ITrip | null> => {
  const trip = await getTripById(tripId);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }
  await trip.deleteOne();
  return trip;
};

/**
 * Search trips by route and date
 * @param {mongoose.Types.ObjectId} routeId
 * @param {Date} departureDate
 * @returns {Promise<ITrip[]>}
 */
const searchTripsByRoute = async (routeId: mongoose.Types.ObjectId, departureDate: Date) => {
  const startOfDay = new Date(departureDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(departureDate);
  endOfDay.setHours(23, 59, 59, 999);

  const trips = await Trip.find({
    route: routeId,
    departureTime: { $gte: startOfDay, $lte: endOfDay },
    status: 'scheduled',
  })
    .populate('bus')
    .populate('route');

  return trips;
};

/**
 * Update seat pricing for a trip
 * @param {mongoose.Types.ObjectId} tripId
 * @param {Record<string, number>} seatPricing
 * @returns {Promise<ITrip | null>}
 */
const updateSeatPricing = async (
  tripId: mongoose.Types.ObjectId,
  seatPricing: Record<string, number>
): Promise<ITrip | null> => {
  const trip = await getTripById(tripId);
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  // Convert to Map for MongoDB
  const pricingMap = new Map<string, number>();
  Object.entries(seatPricing).forEach(([seatNumber, price]) => {
    if (price < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid price for seat ${seatNumber}`);
    }
    pricingMap.set(seatNumber, price);
  });

  trip.seatPricing = pricingMap;
  await trip.save();
  return trip;
};

/**
 * Advanced trip search with filtering, sorting, and pagination
 * @param options - Search options including filters, sorting, and pagination
 */
const searchTrips = async (options: SearchTripsOptions): Promise<SearchResult> => {
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
    sortBy = 'departureTime',
    sortOrder = 'asc',
    page = 1,
    limit = 10,
  } = options;

  const pipeline: PipelineStage[] = [];

  // Stage 1: Initial match for status and date filtering
  const matchStage: any = {};

  // Status filter (default to scheduled if not specified)
  if (status) {
    matchStage.status = status;
  }

  if (departureDate) {
    const startOfDay = new Date(departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(departureDate);
    endOfDay.setHours(23, 59, 59, 999);
    matchStage.departureTime = { $gte: startOfDay, $lte: endOfDay };
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    matchStage.pricePerSeat = {};
    if (minPrice !== undefined) matchStage.pricePerSeat.$gte = minPrice;
    if (maxPrice !== undefined) matchStage.pricePerSeat.$lte = maxPrice;
  }

  // Operator filter
  if (operatorId) {
    matchStage.operator = new mongoose.Types.ObjectId(operatorId);
  }

  pipeline.push({ $match: matchStage });

  // Stage 2: Time range filter (within the day)
  const timeFilters = buildTimeFilterExpr(departureTimeFrom, departureTimeTo);
  if (timeFilters.length > 0) {
    pipeline.push({ $match: { $expr: { $and: timeFilters } } });
  }

  // Stage 3: Lookup route for origin/destination filtering
  pipeline.push({
    $lookup: {
      from: 'routes',
      localField: 'route',
      foreignField: '_id',
      as: 'routeInfo',
    },
  });
  pipeline.push({ $unwind: '$routeInfo' });

  // Filter by origin/destination - Use exact match for better accuracy
  if (origin || destination) {
    const routeMatch: any = {};
    // Exact match with case-insensitive comparison for precise city filtering
    if (origin) {
      routeMatch.$expr = routeMatch.$expr || { $and: [] };
      if (!Array.isArray(routeMatch.$expr.$and)) {
        routeMatch.$expr = { $and: [routeMatch.$expr] };
      }
      routeMatch.$expr.$and.push({
        $eq: [{ $toLower: '$routeInfo.origin.city' }, origin.toLowerCase()],
      });
    }
    if (destination) {
      routeMatch.$expr = routeMatch.$expr || { $and: [] };
      if (!Array.isArray(routeMatch.$expr.$and)) {
        routeMatch.$expr = { $and: [routeMatch.$expr] };
      }
      routeMatch.$expr.$and.push({
        $eq: [{ $toLower: '$routeInfo.destination.city' }, destination.toLowerCase()],
      });
    }
    pipeline.push({ $match: routeMatch });
  }

  // Stage 4: Lookup bus for type/amenities filtering
  pipeline.push({
    $lookup: {
      from: 'buses',
      localField: 'bus',
      foreignField: '_id',
      as: 'busInfo',
    },
  });
  pipeline.push({ $unwind: '$busInfo' });

  // Filter by bus type
  if (busType) {
    pipeline.push({ $match: { 'busInfo.busType': busType } });
  }

  // Filter by amenities
  if (amenities) {
    const amenityList = Array.isArray(amenities) ? amenities : [amenities];
    pipeline.push({ $match: { 'busInfo.amenities': { $all: amenityList } } });
  }

  // Stage 5: Lookup operator
  pipeline.push({
    $lookup: {
      from: 'operators',
      localField: 'operator',
      foreignField: '_id',
      as: 'operatorInfo',
    },
  });
  pipeline.push({ $unwind: '$operatorInfo' });

  // Stage 6: Add computed fields
  pipeline.push({
    $addFields: {
      availableSeatsCount: {
        $subtract: ['$busInfo.totalSeats', { $size: { $ifNull: ['$bookedSeats', []] } }],
      },
      duration: '$routeInfo.estimatedDuration',
    },
  });

  // Stage 6.5: Filter by minimum available seats
  if (minAvailableSeats !== undefined && minAvailableSeats > 0) {
    pipeline.push({
      $match: {
        availableSeatsCount: { $gte: minAvailableSeats },
      },
    });
  }

  // Stage 7: Sort
  const sortMap: Record<string, string> = {
    price: 'pricePerSeat',
    departureTime: 'departureTime',
    duration: 'duration',
    availableSeats: 'availableSeatsCount',
  };
  const sortField = sortMap[sortBy] || 'departureTime';
  pipeline.push({ $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 } });

  // Stage 8: Facet for pagination and count
  pipeline.push({
    $facet: {
      results: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            departureTime: 1,
            arrivalTime: 1,
            pricePerSeat: 1,
            availableSeats: 1,
            status: 1,
            availableSeatsCount: 1,
            route: {
              id: '$routeInfo._id',
              routeName: '$routeInfo.routeName',
              origin: '$routeInfo.origin',
              destination: '$routeInfo.destination',
              distance: '$routeInfo.distance',
              estimatedDuration: '$routeInfo.estimatedDuration',
            },
            bus: {
              id: '$busInfo._id',
              busNumber: '$busInfo.busNumber',
              busType: '$busInfo.busType',
              amenities: '$busInfo.amenities',
              totalSeats: '$busInfo.totalSeats',
            },
            operator: {
              id: '$operatorInfo._id',
              companyName: '$operatorInfo.companyName',
              logoUrl: '$operatorInfo.logoUrl',
              rating: '$operatorInfo.rating',
            },
          },
        },
      ],
      totalCount: [{ $count: 'count' }],
    },
  });

  const [result] = await Trip.aggregate(pipeline);

  const totalResults = result.totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalResults / limit);

  return {
    results: result.results,
    page,
    limit,
    totalPages,
    totalResults,
  };
};

/**
 * Get trip by ID with full details including seat availability
 */
const getTripDetails = async (tripId: mongoose.Types.ObjectId) => {
  const trip = await Trip.findById(tripId)
    .populate({
      path: 'route',
      select: 'routeName origin destination stops distance estimatedDuration',
    })
    .populate({
      path: 'bus',
      select: 'busNumber busType totalSeats amenities seatMap images',
    })
    .populate({
      path: 'operator',
      select: 'companyName logoUrl rating description',
    })
    .lean();

  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  // Get locked seats with details
  const lockedSeats = await SeatLock.find({
    trip: tripId,
    expiresAt: { $gt: new Date() },
  })
    .select('seatNumbers sessionId expiresAt')
    .lean();

  const lockedSeatNumbers = lockedSeats.flatMap((lock) => lock.seatNumbers);

  // Build seat availability map
  const seatAvailability: Record<string, any> = {};
  const bus = trip.bus as any;

  if (bus?.seatMap?.seats) {
    bus.seatMap.seats.forEach((seat: any) => {
      const isBooked = trip.bookedSeats?.includes(seat.seatNumber);
      const isLocked = lockedSeatNumbers.includes(seat.seatNumber);
      const lockInfo = isLocked ? lockedSeats.find((l) => l.seatNumbers.includes(seat.seatNumber)) : null;

      seatAvailability[seat.seatNumber] = {
        ...seat,
        status: isBooked ? 'booked' : isLocked ? 'locked' : 'available',
        price: trip.pricePerSeat + (seat.priceModifier || 0),
        lockedUntil: lockInfo ? lockInfo.expiresAt : null,
      };
    });
  }

  // Calculate stats
  const bookedCount = trip.bookedSeats?.length || 0;
  const totalSeats = bus?.totalSeats || 0;
  const lockedCount = new Set(lockedSeatNumbers).size; // Unique locked seats
  const availableSeats = totalSeats - bookedCount - lockedCount;

  return {
    ...trip,
    id: trip._id,
    availableSeats,
    seatAvailability,
    seatStats: {
      total: totalSeats,
      booked: bookedCount,
      locked: lockedCount,
      available: availableSeats,
    },
    policies: {
      cancellation: 'Free cancellation up to 24 hours before departure',
      modification: 'Free modification up to 12 hours before departure',
      refund: 'Full refund for cancellations made 24+ hours before departure',
    },
  };
};

/**
 * Get interactive seat map with real-time availability
 * Optimized for seat selection UI
 */
const getSeatMap = async (tripId: mongoose.Types.ObjectId, sessionId?: string) => {
  const trip = await Trip.findById(tripId)
    .populate({
      path: 'bus',
      select: 'busNumber busType totalSeats seatMap',
    })
    .select('bookedSeats pricePerSeat seatPricing')
    .lean();

  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  const bus = trip.bus as any;
  if (!bus?.seatMap?.seats) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Seat map not available for this trip');
  }

  // Get all active locks
  const lockedSeats = await SeatLock.find({
    trip: tripId,
    expiresAt: { $gt: new Date() },
  })
    .select('seatNumbers sessionId expiresAt')
    .lean();

  // Group locked seats by session
  const locksBySession = new Map<string, { seats: string[]; expiresAt: Date }>();
  lockedSeats.forEach((lock) => {
    if (!locksBySession.has(lock.sessionId)) {
      locksBySession.set(lock.sessionId, { seats: [], expiresAt: lock.expiresAt });
    }
    locksBySession.get(lock.sessionId)!.seats.push(...lock.seatNumbers);
  });

  const allLockedSeats = lockedSeats.flatMap((lock) => lock.seatNumbers);

  // Build seat map with status
  const seats = bus.seatMap.seats.map((seat: any) => {
    const isBooked = trip.bookedSeats?.includes(seat.seatNumber);
    const isLockedByOthers =
      allLockedSeats.includes(seat.seatNumber) &&
      (!sessionId || !locksBySession.get(sessionId)?.seats.includes(seat.seatNumber));
    const isLockedByMe = sessionId ? locksBySession.get(sessionId)?.seats.includes(seat.seatNumber) : false;

    // Get price from seatPricing map if exists, otherwise use base price
    const basePrice = trip.pricePerSeat;
    // Handle both Map object and plain object (after JSON serialization)
    let seatPrice = basePrice;
    if (trip.seatPricing) {
      if (trip.seatPricing instanceof Map) {
        seatPrice = trip.seatPricing.get(seat.seatNumber) || basePrice;
      } else if (typeof trip.seatPricing === 'object') {
        // Plain object or mongoose Map representation
        seatPrice = (trip.seatPricing as any)[seat.seatNumber] || basePrice;
      }
    }

    let status: 'available' | 'booked' | 'locked' | 'selected';
    if (isBooked) {
      status = 'booked';
    } else if (isLockedByMe) {
      status = 'selected';
    } else if (isLockedByOthers) {
      status = 'locked';
    } else {
      status = 'available';
    }

    return {
      seatNumber: seat.seatNumber,
      row: seat.row,
      column: seat.column,
      seatType: seat.seatType,
      position: seat.position,
      status,
      price: seatPrice,
      selectable: status === 'available' || status === 'selected',
    };
  });

  // Get my lock expiration if exists
  const myLockInfo = sessionId ? locksBySession.get(sessionId) : null;

  return {
    tripId: trip._id,
    busType: bus.busType,
    layout: {
      rows: bus.seatMap.rows,
      columns: bus.seatMap.columns,
      name: bus.seatMap.name,
    },
    seats,
    stats: {
      total: bus.totalSeats,
      booked: trip.bookedSeats?.length || 0,
      locked: new Set(allLockedSeats).size,
      available: bus.totalSeats - (trip.bookedSeats?.length || 0) - new Set(allLockedSeats).size,
    },
    mySelection: myLockInfo
      ? {
          seats: myLockInfo.seats,
          expiresAt: myLockInfo.expiresAt,
          remainingSeconds: Math.max(0, Math.floor((myLockInfo.expiresAt.getTime() - Date.now()) / 1000)),
        }
      : null,
  };
};

export default {
  createTrip,
  queryTrips,
  getTripById,
  updateTripById,
  deleteTripById,
  searchTrips,
  searchTripsByRoute,
  updateSeatPricing,
  getTripDetails,
  getSeatMap,
};
