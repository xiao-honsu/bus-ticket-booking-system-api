import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import searchService from '../services/search.service';

/**
 * Universal search endpoint
 * GET /api/search?q=<query>&limit=10
 */
const universalSearch = catchAsync(async (req: Request, res: Response) => {
  const { q, limit } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(httpStatus.BAD_REQUEST).json({
      message: 'Search query is required',
    });
    return;
  }

  const limitNum = limit ? parseInt(limit as string) : 10;
  const result = await searchService.universalSearch(q, limitNum);

  res.status(httpStatus.OK).json(result);
});

/**
 * Get search suggestions (autocomplete)
 * GET /api/search/suggestions?q=<query>&limit=8
 */
const getSuggestions = catchAsync(async (req: Request, res: Response) => {
  const { q, limit } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(httpStatus.BAD_REQUEST).json({
      message: 'Search query is required',
    });
    return;
  }

  const limitNum = limit ? parseInt(limit as string) : 8;
  const suggestions = await searchService.getSearchSuggestions(q, limitNum);

  res.status(httpStatus.OK).json({ suggestions });
});

export default {
  universalSearch,
  getSuggestions,
};
