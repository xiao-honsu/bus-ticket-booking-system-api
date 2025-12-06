import express from 'express';
import auth from '../../middlewares/auth';
import routeController from '../../controllers/route.controller';

const router = express.Router();

router.route('/').post(auth('manageRoutes'), routeController.createRoute).get(routeController.getRoutes);

router.route('/search').get(routeController.searchRoutes);

router
  .route('/:routeId')
  .get(routeController.getRoute)
  .patch(auth('manageRoutes'), routeController.updateRoute)
  .delete(auth('manageRoutes'), routeController.deleteRoute);

router.route('/:routeId/toggle-status').patch(auth('manageRoutes'), routeController.toggleStatus);

export default router;
