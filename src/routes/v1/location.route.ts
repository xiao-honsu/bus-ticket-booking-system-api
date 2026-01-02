import express from 'express';
import validate from '../../middlewares/validate';
import locationController from '../../controllers/location.controller';
import locationValidation from '../../validations/location.validation';

const router = express.Router();

/**
 * @route GET /v1/locations
 * @desc Get all unique locations for combobox dropdown
 * @access Public
 */
router.get('/', locationController.getAllLocations);

/**
 * @route GET /v1/locations/search
 * @desc Search locations for autocomplete
 * @access Public
 */
router.get('/search', validate(locationValidation.searchLocations), locationController.searchLocations);

/**
 * @route GET /v1/locations/popular
 * @desc Get popular locations based on search history
 * @access Public
 */
router.get('/popular', validate(locationValidation.getPopularLocations), locationController.getPopularLocations);

/**
 * @route GET /v1/locations/popular-routes
 * @desc Get popular routes based on bookings
 * @access Public
 */
router.get('/popular-routes', validate(locationValidation.getPopularLocations), locationController.getPopularRoutes);

export default router;
