import Route from '../models/route.model';
import SearchHistory from '../models/searchhistory.model';

/**
 * Search locations (cities) for autocomplete
 * @param query - Search query string
 * @param type - Filter by location type: 'origin', 'destination', or 'all'
 * @param limit - Maximum number of results
 */
const searchLocations = async (query: string, type: string = 'all', limit: number = 10) => {
  const regex = new RegExp(query, 'i');
  const filter = { isActive: true };

  const [origins, destinations]: [string[], string[]] = await Promise.all([
    type !== 'destination' ? Route.distinct('origin.city', { ...filter, 'origin.city': regex }) : Promise.resolve([]),
    type !== 'origin'
      ? Route.distinct('destination.city', { ...filter, 'destination.city': regex })
      : Promise.resolve([]),
  ]);

  // Combine and deduplicate
  const allLocations = [...new Set([...origins, ...destinations])];

  // Sort by relevance (starts with query first, then alphabetically)
  const sorted = allLocations.sort((a, b) => {
    const queryLower = query.toLowerCase();
    const aStartsWith = a.toLowerCase().startsWith(queryLower);
    const bStartsWith = b.toLowerCase().startsWith(queryLower);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return a.localeCompare(b);
  });

  return sorted.slice(0, limit).map((location) => ({
    name: location,
    type:
      origins.includes(location) && destinations.includes(location)
        ? 'both'
        : origins.includes(location)
          ? 'origin'
          : 'destination',
  }));
};

/**
 * Get popular locations based on search history
 * @param limit - Maximum number of results
 */
const getPopularLocations = async (limit: number = 10) => {
  const popularSearches = await SearchHistory.aggregate([
    {
      $group: {
        _id: { origin: '$originCity', destination: '$destinationCity' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit * 2 },
  ]);

  const locationCounts = new Map<string, number>();

  popularSearches.forEach((search) => {
    if (search._id.origin) {
      locationCounts.set(search._id.origin, (locationCounts.get(search._id.origin) || 0) + search.count);
    }
    if (search._id.destination) {
      locationCounts.set(search._id.destination, (locationCounts.get(search._id.destination) || 0) + search.count);
    }
  });

  return Array.from(locationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, searchCount]) => ({ name, searchCount }));
};

/**
 * Get popular routes based on booking statistics
 * @param limit - Maximum number of results
 */
const getPopularRoutes = async (limit: number = 10) => {
  const popularRoutes = await Route.find({ isActive: true })
    .sort({ 'stats.totalBookings': -1 })
    .limit(limit)
    .select('routeName origin.city destination.city stats.totalBookings')
    .lean();

  return popularRoutes.map((route) => ({
    id: route._id,
    routeName: route.routeName,
    origin: route.origin.city,
    destination: route.destination.city,
    totalBookings: route.stats?.totalBookings || 0,
  }));
};

export default {
  searchLocations,
  getPopularLocations,
  getPopularRoutes,
};
