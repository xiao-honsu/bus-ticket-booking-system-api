import mongoose from 'mongoose';
import SearchHistory, { ISearchFilters } from '../models/searchhistory.model';

interface LogSearchParams {
  userId?: string;
  sessionId?: string;
  originCity: string;
  destinationCity: string;
  travelDate?: Date;
  passengers?: number;
  filters?: ISearchFilters;
  resultsCount?: number;
}

/**
 * Log a search query
 * @param params - Search parameters to log
 */
const logSearch = async (params: LogSearchParams) => {
  const searchHistory = await SearchHistory.create({
    user: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
    sessionId: params.sessionId,
    originCity: params.originCity,
    destinationCity: params.destinationCity,
    travelDate: params.travelDate,
    passengers: params.passengers || 1,
    filters: params.filters,
    resultsCount: params.resultsCount,
  });
  return searchHistory;
};

/**
 * Log search asynchronously without blocking the response
 * @param params - Search parameters to log
 */
const logSearchAsync = (params: LogSearchParams): void => {
  logSearch(params).catch((err) => {
    console.error('Failed to log search history:', err);
  });
};

/**
 * Get user's recent searches
 * @param userId - User ID
 * @param limit - Maximum number of results (default: 5)
 */
const getUserRecentSearches = async (userId: string, limit: number = 5) => {
  return SearchHistory.find({ user: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('originCity destinationCity travelDate createdAt')
    .lean();
};

/**
 * Get session's recent searches (for guests)
 * @param sessionId - Session ID
 * @param limit - Maximum number of results (default: 5)
 */
const getSessionRecentSearches = async (sessionId: string, limit: number = 5) => {
  return SearchHistory.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('originCity destinationCity travelDate createdAt')
    .lean();
};

/**
 * Get recent searches for either user or session
 * @param userId - Optional user ID
 * @param sessionId - Optional session ID
 * @param limit - Maximum number of results (default: 5)
 */
const getRecentSearches = async (userId?: string, sessionId?: string, limit: number = 5) => {
  if (userId) {
    return getUserRecentSearches(userId, limit);
  }
  if (sessionId) {
    return getSessionRecentSearches(sessionId, limit);
  }
  return [];
};

export default {
  logSearch,
  logSearchAsync,
  getUserRecentSearches,
  getSessionRecentSearches,
  getRecentSearches,
};
