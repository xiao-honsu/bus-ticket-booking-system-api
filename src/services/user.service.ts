import httpStatus from 'http-status';
import mongoose, { PaginateOptions } from 'mongoose';
import User, { IUser } from '../models/user.model';
import ApiError from '../utils/ApiError';

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<IUser>}
 */
const createUser = async (userBody: Partial<IUser>): Promise<IUser> => {
  if (await User.isEmailTaken(userBody.email!)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter: any, options: PaginateOptions) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IUser | null>}
 */
const getUserById = async (id: mongoose.Types.ObjectId): Promise<IUser | null> => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @param {boolean} includePassword - Whether to include password field
 * @returns {Promise<IUser | null>}
 */
const getUserByEmail = async (email: string, includePassword: boolean = false): Promise<IUser | null> => {
  const query = User.findOne({ email });
  if (includePassword) {
    query.select('+password');
  }
  return query;
};

/**
 * Update user by id
 * @param {mongoose.Types.ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<IUser | null>}
 */
const updateUserById = async (userId: mongoose.Types.ObjectId, updateBody: Partial<IUser>): Promise<IUser | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<IUser | null>}
 */
const deleteUserById = async (userId: mongoose.Types.ObjectId): Promise<IUser | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.deleteOne();
  return user;
};

export default {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
