import express from 'express';
import searchController from '../controllers/search.controller';

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Universal search across trips, operators, routes
 * @access  Public
 * @query   q (required) - search query
 * @query   limit (optional) - max results (default: 10)
 */
router.get('/', searchController.universalSearch);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get autocomplete suggestions
 * @access  Public
 * @query   q (required) - search query
 * @query   limit (optional) - max suggestions (default: 8)
 */
router.get('/suggestions', searchController.getSuggestions);

export default router;
