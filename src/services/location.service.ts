import Route from '../models/route.model';
import SearchHistory from '../models/searchhistory.model';

/**
 * Get all unique locations (cities) from active routes
 * Used for combobox dropdowns - returns all unique city/state combinations
 */
const getAllLocations = async () => {
  const routes = await Route.find({ isActive: true })
    .select('origin.city origin.state destination.city destination.state')
    .lean();

  const locationMap = new Map<string, { city: string; state: string }>();

  routes.forEach((route) => {
    // Add origin
    const originKey = `${route.origin.city}|${route.origin.state}`;
    if (!locationMap.has(originKey)) {
      locationMap.set(originKey, {
        city: route.origin.city,
        state: route.origin.state,
      });
    }

    // Add destination
    const destKey = `${route.destination.city}|${route.destination.state}`;
    if (!locationMap.has(destKey)) {
      locationMap.set(destKey, {
        city: route.destination.city,
        state: route.destination.state,
      });
    }
  });

  // Convert to array and sort alphabetically by city
  return Array.from(locationMap.values())
    .sort((a, b) => a.city.localeCompare(b.city))
    .map((loc) => ({
      value: loc.city,
      label: `${loc.city}, ${loc.state}`,
      city: loc.city,
      state: loc.state,
    }));
};

/**
 * Search locations (cities) for autocomplete
 * @param query - Search query string
 * @param type - Filter by location type: 'origin', 'destination', or 'all'
 * @param limit - Maximum number of results
 */
const searchLocations = async (query: string, type: string = 'all', limit: number = 10) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const regex = new RegExp(query, 'i');
  const filter = { isActive: true };

  // Search in both city and state fields for better matching
  const searchFilter = {
    ...filter,
    $or: [
      { 'origin.city': regex },
      { 'origin.state': regex },
      { 'destination.city': regex },
      { 'destination.state': regex },
    ],
  };

  // Get unique combinations of city and state
  const routes = await Route.find(searchFilter)
    .select('origin.city origin.state destination.city destination.state')
    .lean();

  const locationMap = new Map<string, { city: string; state: string; type: Set<string> }>();

  routes.forEach((route) => {
    // Process origin
    if (type !== 'destination') {
      const originKey = `${route.origin.city}|${route.origin.state}`;
      if (route.origin.city.match(regex) || route.origin.state.match(regex)) {
        if (!locationMap.has(originKey)) {
          locationMap.set(originKey, {
            city: route.origin.city,
            state: route.origin.state,
            type: new Set(['origin']),
          });
        } else {
          locationMap.get(originKey)!.type.add('origin');
        }
      }
    }

    // Process destination
    if (type !== 'origin') {
      const destKey = `${route.destination.city}|${route.destination.state}`;
      if (route.destination.city.match(regex) || route.destination.state.match(regex)) {
        if (!locationMap.has(destKey)) {
          locationMap.set(destKey, {
            city: route.destination.city,
            state: route.destination.state,
            type: new Set(['destination']),
          });
        } else {
          locationMap.get(destKey)!.type.add('destination');
        }
      }
    }
  });

  // Convert to array and sort by relevance
  const locations = Array.from(locationMap.values());
  const queryLower = query.toLowerCase();

  const sorted = locations.sort((a, b) => {
    const aCity = a.city.toLowerCase();
    const bCity = b.city.toLowerCase();
    const aState = a.state.toLowerCase();
    const bState = b.state.toLowerCase();

    // Exact city match first
    if (aCity === queryLower && bCity !== queryLower) return -1;
    if (bCity === queryLower && aCity !== queryLower) return 1;

    // City starts with query
    const aCityStarts = aCity.startsWith(queryLower);
    const bCityStarts = bCity.startsWith(queryLower);
    if (aCityStarts && !bCityStarts) return -1;
    if (bCityStarts && !aCityStarts) return 1;

    // State starts with query
    const aStateStarts = aState.startsWith(queryLower);
    const bStateStarts = bState.startsWith(queryLower);
    if (aStateStarts && !bStateStarts) return -1;
    if (bStateStarts && !aStateStarts) return 1;

    // Alphabetically by city
    return aCity.localeCompare(bCity);
  });

  return sorted.slice(0, limit).map((loc) => ({
    city: loc.city,
    state: loc.state,
    displayName: `${loc.city}, ${loc.state}`,
    type: loc.type.size === 2 ? 'both' : Array.from(loc.type)[0],
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
  getAllLocations,
  searchLocations,
  getPopularLocations,
  getPopularRoutes,
};
