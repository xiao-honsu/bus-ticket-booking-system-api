import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import paymentService from '../services/payment.service';
import ApiError from '../utils/ApiError';

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking ID is required');
  }

  const paymentLink = await paymentService.createPaymentLink(new mongoose.Types.ObjectId(bookingId));

  res.status(httpStatus.CREATED).send(paymentLink);
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.handlePaymentWebhook(req.body);
  res.send(result);
});

const checkStatus = catchAsync(async (req: Request, res: Response) => {
  const { orderCode } = req.params;

  if (!orderCode) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order code is required');
  }

  const status = await paymentService.checkPaymentStatus(orderCode);
  res.send(status);
});

const cancelPayment = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking ID is required');
  }

  const result = await paymentService.cancelPayment(new mongoose.Types.ObjectId(bookingId));

  res.send(result);
});

export default {
  createPayment,
  handleWebhook,
  checkStatus,
  cancelPayment,
};
