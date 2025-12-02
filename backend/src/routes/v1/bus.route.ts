import express from 'express';
import auth from '../../middlewares/auth';
import busController from '../../controllers/bus.controller';

const router = express.Router();

router.route('/').post(auth('manageBuses'), busController.createBus).get(auth('getBuses'), busController.getBuses);

router
  .route('/:busId')
  .get(auth('getBuses'), busController.getBus)
  .patch(auth('manageBuses'), busController.updateBus)
  .delete(auth('manageBuses'), busController.deleteBus);

router.route('/:busId/seatmap').patch(auth('manageBuses'), busController.updateSeatMap);

export default router;
