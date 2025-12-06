import express, { Router } from 'express';
import validate from '../../middlewares/validate';
import seatLockValidation from '../../validations/seatlock.validation';
import seatLockController from '../../controllers/seatlock.controller';

const router: Router = express.Router();

router.route('/lock').post(validate(seatLockValidation.lockSeats), seatLockController.lockSeats);

router.route('/release').post(validate(seatLockValidation.releaseLocks), seatLockController.releaseLocks);

router.route('/extend').post(validate(seatLockValidation.extendLocks), seatLockController.extendLocks);

router.route('/:tripId').get(validate(seatLockValidation.getLockedSeats), seatLockController.getLockedSeats);

export default router;
