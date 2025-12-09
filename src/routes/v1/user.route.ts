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

router.route('/:userId/reset-password').patch(auth('manageUsers'), userController.resetUserPassword);

router.route('/:userId/block').patch(auth('manageUsers'), userController.blockUser);

export default router;
