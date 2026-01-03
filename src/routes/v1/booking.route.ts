import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import bookingValidation from '../../validations/booking.validation';
import bookingController from '../../controllers/booking.controller';

const router = express.Router();

// Guest booking route (no authentication required)
router.route('/guest').post(validate(bookingValidation.createGuestBooking), bookingController.createGuestBooking);

router
  .route('/')
  .post(auth('bookTicket'), validate(bookingValidation.createBooking), bookingController.createBooking)
  .get(auth('manageBookings'), validate(bookingValidation.getBookings), bookingController.getBookings);

router
  .route('/:bookingId')
  .get(auth('manageOwnBookings'), validate(bookingValidation.getBooking), bookingController.getBooking)
  .patch(auth('manageBookings'), validate(bookingValidation.updateBooking), bookingController.updateBooking);

router
  .route('/:bookingId/cancel')
  .post(auth('manageBookings'), validate(bookingValidation.cancelBooking), bookingController.cancelBooking);

export default router;
