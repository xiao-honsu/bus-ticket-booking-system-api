import express from 'express';
import auth from '../../middlewares/auth';
import tripController from '../../controllers/trip.controller';

const router = express.Router();

router
  .route('/')
  .post(auth('manageTrips'), tripController.createTrip)
  .get(auth('getTrips'), tripController.getTrips);

router.route('/search').get(tripController.searchTrips);

router
  .route('/:tripId')
  .get(auth('getTrips'), tripController.getTrip)
  .patch(auth('manageTrips'), tripController.updateTrip)
  .delete(auth('manageTrips'), tripController.deleteTrip);

router.route('/:tripId/seatpricing').patch(auth('manageTrips'), tripController.updateSeatPricing);

export default router;
