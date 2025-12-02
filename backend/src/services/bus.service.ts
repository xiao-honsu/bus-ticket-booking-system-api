import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import Bus, { IBus } from '../models/bus.model';
import ApiError from '../utils/ApiError';

/**
 * Create a bus
 * @param {Object} busBody
 * @returns {Promise<IBus>}
 */
const createBus = async (busBody: Partial<IBus>): Promise<IBus> => {
  return Bus.create(busBody);
};

/**
 * Query for buses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryBuses = async (filter: any, options: PaginateOptions) => {
  const buses = await Bus.paginate(filter, options);
  return buses;
};

/**
 * Get bus by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IBus | null>}
 */
const getBusById = async (id: mongoose.Types.ObjectId): Promise<IBus | null> => {
  return Bus.findById(id).populate('operator');
};

/**
 * Update bus by id
 * @param {mongoose.Types.ObjectId} busId
 * @param {Object} updateBody
 * @returns {Promise<IBus | null>}
 */
const updateBusById = async (busId: mongoose.Types.ObjectId, updateBody: Partial<IBus>): Promise<IBus | null> => {
  const bus = await getBusById(busId);
  if (!bus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bus not found');
  }
  Object.assign(bus, updateBody);
  await bus.save();
  return bus;
};

/**
 * Delete bus by id
 * @param {mongoose.Types.ObjectId} busId
 * @returns {Promise<IBus | null>}
 */
const deleteBusById = async (busId: mongoose.Types.ObjectId): Promise<IBus | null> => {
  const bus = await getBusById(busId);
  if (!bus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bus not found');
  }
  await bus.deleteOne();
  return bus;
};

/**
 * Update bus seat map
 * @param {mongoose.Types.ObjectId} busId
 * @param {Object} seatMapData
 * @returns {Promise<IBus | null>}
 */
const updateSeatMap = async (busId: mongoose.Types.ObjectId, seatMapData: any): Promise<IBus | null> => {
  const bus = await getBusById(busId);
  if (!bus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bus not found');
  }

  // Validate seat map structure
  if (!seatMapData.rows || !seatMapData.columns || !seatMapData.seats) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid seat map structure');
  }

  // Validate seats array
  const seatNumbers = new Set();
  for (const seat of seatMapData.seats) {
    if (!seat.seatNumber || !seat.row || !seat.column || !seat.seatType) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid seat data');
    }
    // Check for duplicate seat numbers
    if (seatNumbers.has(seat.seatNumber)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Duplicate seat number: ${seat.seatNumber}`);
    }
    seatNumbers.add(seat.seatNumber);
  }

  // Update total seats
  bus.totalSeats = seatMapData.seats.length;
  bus.seatMap = seatMapData;
  
  await bus.save();
  return bus;
};

export default {
  createBus,
  queryBuses,
  getBusById,
  updateBusById,
  deleteBusById,
  updateSeatMap,
};
