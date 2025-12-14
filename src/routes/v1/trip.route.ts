import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import tripController from '../../controllers/trip.controller';
import tripValidation from '../../validations/trip.validation';

const router = express.Router();

router
  .route('/')
  .post(auth('manageTrips'), validate(tripValidation.createTrip), tripController.createTrip)
  .get(auth('getTrips'), validate(tripValidation.getTrips), tripController.getTrips);

router.route('/search').get(validate(tripValidation.searchTrips), tripController.searchTrips);

router
  .route('/:tripId')
  .get(validate(tripValidation.getTrip), tripController.getTrip)
  .patch(auth('manageTrips'), validate(tripValidation.updateTrip), tripController.updateTrip)
  .delete(auth('manageTrips'), validate(tripValidation.deleteTrip), tripController.deleteTrip);

router.route('/:tripId/details').get(validate(tripValidation.getTrip), tripController.getTripDetails);

router.route('/:tripId/seat-map').get(validate(tripValidation.getTrip), tripController.getSeatMap);

router.route('/:tripId/seatpricing').patch(auth('manageTrips'), tripController.updateSeatPricing);

export default router;
