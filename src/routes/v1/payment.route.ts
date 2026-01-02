import express from 'express';
import validate from '../../middlewares/validate';
import paymentValidation from '../../validations/payment.validation';
import paymentController from '../../controllers/payment.controller';

const router = express.Router();

// Create payment link for a booking (no auth - works for both authenticated and guest users)
// Security: bookingId acts as a secret token, and payment link is tied to the booking
router.post('/create', validate(paymentValidation.createPayment), paymentController.createPayment);

// Webhook endpoint for PayOS (no auth required - PayOS will call this)
router.post('/webhook', paymentController.handleWebhook);

// Check payment status (no auth - orderCode acts as a secret token)
// Only the person who initiated the payment knows the orderCode
router.get('/status/:orderCode', validate(paymentValidation.checkStatus), paymentController.checkStatus);

// Cancel payment (no auth - bookingId acts as a secret token for guest users)
router.post('/cancel/:bookingId', validate(paymentValidation.cancelPayment), paymentController.cancelPayment);

export default router;
