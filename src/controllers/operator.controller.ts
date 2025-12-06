import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import operatorService from '../services/operator.service';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';

const createOperator = catchAsync(async (req: Request, res: Response) => {
  const operator = await operatorService.createOperator(req.body);
  res.status(httpStatus.CREATED).send(operator);
});

const getOperators = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['companyName', 'status']);
  const options: any = pick(req.query, ['sortBy', 'limit', 'page']);

  // Set defaults
  options.limit = options.limit ? parseInt(options.limit as string) : 10;
  options.page = options.page ? parseInt(options.page as string) : 1;

  const result = await operatorService.queryOperators(filter, options);
  res.send(result);
});

const getOperator = catchAsync(async (req: Request, res: Response) => {
  const operator = await operatorService.getOperatorById(new mongoose.Types.ObjectId(req.params.operatorId));
  if (!operator) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Operator not found');
  }
  res.send(operator);
});

const updateOperator = catchAsync(async (req: Request, res: Response) => {
  const operator = await operatorService.updateOperatorById(
    new mongoose.Types.ObjectId(req.params.operatorId),
    req.body
  );
  res.send(operator);
});

const deleteOperator = catchAsync(async (req: Request, res: Response) => {
  await operatorService.deleteOperatorById(new mongoose.Types.ObjectId(req.params.operatorId));
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  createOperator,
  getOperators,
  getOperator,
  updateOperator,
  deleteOperator,
};
