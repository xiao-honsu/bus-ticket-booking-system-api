import express from 'express';
import auth from '../../middlewares/auth';
import userController from '../../controllers/user.controller';

const router = express.Router();

router.route('/').get(auth('getUsers'), userController.getUsers);

router.route('/search-history').get(auth(), userController.getMySearchHistory);

router
  .route('/:userId')
  .get(auth('getUsers'), userController.getUser)
  .patch(auth('manageUsers'), userController.updateUser)
  .delete(auth('manageUsers'), userController.deleteUser);

export default router;
