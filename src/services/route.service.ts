import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import Route, { IRoute } from '../models/route.model';
import ApiError from '../utils/ApiError';

/**
 * Create a route
 * @param {Object} routeBody
 * @returns {Promise<IRoute>}
 */
const createRoute = async (routeBody: Partial<IRoute>): Promise<IRoute> => {
  return Route.create(routeBody);
};

/**
 * Query for routes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryRoutes = async (filter: any, options: PaginateOptions) => {
  const routes = await Route.paginate(filter, options);
  return routes;
};

/**
 * Get route by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IRoute | null>}
 */
const getRouteById = async (id: mongoose.Types.ObjectId): Promise<IRoute | null> => {
  return Route.findById(id);
};

/**
 * Update route by id
 * @param {mongoose.Types.ObjectId} routeId
 * @param {Object} updateBody
 * @returns {Promise<IRoute | null>}
 */
const updateRouteById = async (
  routeId: mongoose.Types.ObjectId,
  updateBody: Partial<IRoute>
): Promise<IRoute | null> => {
  const route = await getRouteById(routeId);
  if (!route) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Route not found');
  }
  Object.assign(route, updateBody);
  await route.save();
  return route;
};

/**
 * Delete route by id
 * @param {mongoose.Types.ObjectId} routeId
 * @returns {Promise<IRoute | null>}
 */
const deleteRouteById = async (routeId: mongoose.Types.ObjectId): Promise<IRoute | null> => {
  const route = await getRouteById(routeId);
  if (!route) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Route not found');
  }
  await route.deleteOne();
  return route;
};

/**
 * Search routes by origin and destination
 * @param {string} originCity
 * @param {string} destinationCity
 * @returns {Promise<IRoute[]>}
 */
const searchRoutes = async (originCity: string, destinationCity: string) => {
  return Route.find({
    'origin.city': new RegExp(originCity, 'i'),
    'destination.city': new RegExp(destinationCity, 'i'),
    isActive: true,
  });
};

/**
 * Toggle route active status
 * @param {mongoose.Types.ObjectId} routeId
 * @returns {Promise<IRoute | null>}
 */
const toggleRouteStatus = async (routeId: mongoose.Types.ObjectId): Promise<IRoute | null> => {
  const route = await getRouteById(routeId);
  if (!route) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Route not found');
  }
  route.isActive = !route.isActive;
  await route.save();
  return route;
};

export default {
  createRoute,
  queryRoutes,
  getRouteById,
  updateRouteById,
  deleteRouteById,
  searchRoutes,
  toggleRouteStatus,
};
