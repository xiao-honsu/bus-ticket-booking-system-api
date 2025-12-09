import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import userService from '../services/user.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import SearchHistory from '../models/searchhistory.model';

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'role', 'isEmailVerified']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page']);

  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;

  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserById(new mongoose.Types.ObjectId(req.params.userId));
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateUserById(new mongoose.Types.ObjectId(req.params.userId), req.body);
  res.send(user);
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await userService.deleteUserById(new mongoose.Types.ObjectId(req.params.userId));
  res.status(httpStatus.NO_CONTENT).send();
});

const getMySearchHistory = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  const history = await SearchHistory.find({ user: (req.user as any)._id })
    .sort('-createdAt')
    .limit(limit);

  res.send(history);
});

const resetUserPassword = catchAsync(async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required');
  }
  const user = await userService.resetUserPassword(new mongoose.Types.ObjectId(req.params.userId), password);
  res.send(user);
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.blockUser(new mongoose.Types.ObjectId(req.params.userId));
  res.send(user);
});

export default {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getMySearchHistory,
  resetUserPassword,
  blockUser,
};
