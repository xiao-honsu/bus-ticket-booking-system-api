import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import paymentValidation from '../../validations/payment.validation';
import paymentController from '../../controllers/payment.controller';

const router = express.Router();

// Create payment link for a booking (requires authentication)
router.post('/create', auth(), validate(paymentValidation.createPayment), paymentController.createPayment);

// Webhook endpoint for PayOS (no auth required - PayOS will call this)
router.post('/webhook', paymentController.handleWebhook);

// Check payment status (requires authentication)
router.get('/status/:orderCode', auth(), validate(paymentValidation.checkStatus), paymentController.checkStatus);

// Cancel payment (requires authentication)
router.post('/cancel/:bookingId', auth(), validate(paymentValidation.cancelPayment), paymentController.cancelPayment);

export default router;
