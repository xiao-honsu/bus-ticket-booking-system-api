import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import operatorValidation from '../../validations/operator.validation';
import operatorController from '../../controllers/operator.controller';

const router = express.Router();

router
  .route('/')
  .post(auth('manageOperators'), validate(operatorValidation.createOperator), operatorController.createOperator)
  .get(validate(operatorValidation.getOperators), operatorController.getOperators); // Public

router
  .route('/:operatorId')
  .get(validate(operatorValidation.getOperator), operatorController.getOperator) // Public
  .patch(auth('manageOperators'), validate(operatorValidation.updateOperator), operatorController.updateOperator)
  .delete(auth('manageOperators'), validate(operatorValidation.deleteOperator), operatorController.deleteOperator);

export default router;
