import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Operator from '../models/operator.model';
import ApiError from '../utils/ApiError';
import { IOperator } from '../models/operator.model';

/**
 * Create an operator
 * @param {object} operatorBody
 * @returns {Promise<IOperator>}
 */
const createOperator = async (operatorBody: Partial<IOperator>): Promise<IOperator> => {
  // Check if operator with same email already exists
  if (await Operator.findOne({ email: operatorBody.email })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Operator email already exists');
  }

  // Check if license number already exists
  if (await Operator.findOne({ licenseNumber: operatorBody.licenseNumber })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'License number already registered');
  }

  return Operator.create(operatorBody);
};

/**
 * Query for operators
 * @param {object} filter - Mongo filter
 * @param {object} options - Query options
 * @returns {Promise<IOperator[]>}
 */
const queryOperators = async (filter: any, options: any) => {
  const operators = await Operator.find(filter)
    .sort(options.sortBy)
    .limit(options.limit)
    .skip((options.page - 1) * options.limit);

  return operators;
};

/**
 * Get operator by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IOperator>}
 */
const getOperatorById = async (id: mongoose.Types.ObjectId): Promise<IOperator | null> => {
  return Operator.findById(id);
};

/**
 * Update operator by id
 * @param {mongoose.Types.ObjectId} operatorId
 * @param {object} updateBody
 * @returns {Promise<IOperator>}
 */
const updateOperatorById = async (
  operatorId: mongoose.Types.ObjectId,
  updateBody: Partial<IOperator>
): Promise<IOperator | null> => {
  const operator = await getOperatorById(operatorId);
  if (!operator) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Operator not found');
  }

  // Check if email is being updated and is already taken
  if (updateBody.email && (await Operator.findOne({ email: updateBody.email, _id: { $ne: operatorId } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Check if license number is being updated and is already taken
  if (
    updateBody.licenseNumber &&
    (await Operator.findOne({ licenseNumber: updateBody.licenseNumber, _id: { $ne: operatorId } }))
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'License number already taken');
  }

  Object.assign(operator, updateBody);
  await operator.save();
  return operator;
};

/**
 * Delete operator by id
 * @param {mongoose.Types.ObjectId} operatorId
 * @returns {Promise<IOperator>}
 */
const deleteOperatorById = async (operatorId: mongoose.Types.ObjectId): Promise<IOperator | null> => {
  const operator = await getOperatorById(operatorId);
  if (!operator) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Operator not found');
  }

  // Check if operator has active buses
  const Bus = mongoose.model('Bus');
  const activeBuses = await Bus.countDocuments({ operator: operatorId });
  if (activeBuses > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete operator with active buses');
  }

  await operator.deleteOne();
  return operator;
};

export default {
  createOperator,
  queryOperators,
  getOperatorById,
  updateOperatorById,
  deleteOperatorById,
};
