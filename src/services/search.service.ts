import Trip from '../models/trip.model';
import Operator from '../models/operator.model';
import Route from '../models/route.model';

interface UniversalSearchResult {
  trips: any[];
  operators: any[];
  routes: any[];
  suggestions: string[];
  matchType: 'route' | 'operator' | 'tripCode' | 'boardingPoint' | 'mixed' | 'none';
}

interface ParsedQuery {
  origin?: string;
  destination?: string;
  operator?: string;
  tripCode?: string;
  boardingPoint?: string;
  keywords: string[];
}

/**
 * Parse search query to identify intent
 * Examples:
 * - "Hà Nội Sài Gòn" -> route search
 * - "Hà Nội - Sài Gòn" -> route search
 * - "Phương Trang" -> operator search
 * - "HN-HCM-001" -> trip code search
 * - "Bến xe Mỹ Đình" -> boarding point search
 */
const parseSearchQuery = (query: string): ParsedQuery => {
  const normalized = query.trim().toLowerCase();
  const parsed: ParsedQuery = { keywords: [] };

  // Check for trip code pattern (contains dashes and numbers)
  const tripCodePattern = /^[a-z0-9]+-[a-z0-9]+-\d+$/i;
  if (tripCodePattern.test(normalized)) {
    parsed.tripCode = query.trim();
    return parsed;
  }

  // Check for route patterns: "A to B", "A - B", "A B"
  const routePatterns = [/(.+?)\s*(?:to|->|→)\s*(.+)/i, /(.+?)\s*-\s*(.+)/, /^([a-zà-ỹ\s]+)\s+([a-zà-ỹ\s]+)$/i];

  for (const pattern of routePatterns) {
    const match = normalized.match(pattern);
    if (match && match[1] && match[2]) {
      const part1 = match[1].trim();
      const part2 = match[2].trim();

      // Validate both parts are reasonable city names (2-20 chars)
      if (part1.length >= 2 && part2.length >= 2 && part1.length <= 20 && part2.length <= 20) {
        parsed.origin = part1;
        parsed.destination = part2;
        return parsed;
      }
    }
  }

  // Check for boarding point keywords
  const boardingKeywords = ['bến xe', 'ben xe', 'bến', 'ben', 'station'];
  if (boardingKeywords.some((kw) => normalized.includes(kw))) {
    parsed.boardingPoint = query.trim();
    return parsed;
  }

  // Default: treat as operator name or general keywords
  parsed.operator = query.trim();
  parsed.keywords = query.trim().split(/\s+/);

  return parsed;
};

/**
 * Build fuzzy regex for Vietnamese city names
 * Handles variations like: "Ha Noi", "Hà Nội", "hanoi", "HN"
 */
const buildCityRegex = (cityName: string): RegExp => {
  // Normalize and create flexible pattern
  const normalized = cityName
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd');

  // Create pattern that matches with or without diacritics
  const pattern = normalized
    .split('')
    .map((char) => {
      if (char === 'a') return '[aàáạảãâầấậẩẫăằắặẳẵ]';
      if (char === 'e') return '[eèéẹẻẽêềếệểễ]';
      if (char === 'i') return '[iìíịỉĩ]';
      if (char === 'o') return '[oòóọỏõôồốộổỗơờớợởỡ]';
      if (char === 'u') return '[uùúụủũưừứựửữ]';
      if (char === 'y') return '[yỳýỵỷỹ]';
      if (char === 'd') return '[dđ]';
      return char;
    })
    .join('\\s*');

  return new RegExp(pattern, 'i');
};

/**
 * Universal search function
 * Searches across trips, operators, routes, and boarding points
 */
const universalSearch = async (query: string, limit: number = 10): Promise<UniversalSearchResult> => {
  const result: UniversalSearchResult = {
    trips: [],
    operators: [],
    routes: [],
    suggestions: [],
    matchType: 'none',
  };

  if (!query || query.trim().length < 2) {
    return result;
  }

  const parsed = parseSearchQuery(query);
  console.log('🔍 Parsed search query:', parsed);

  try {
    // Route search (origin -> destination)
    if (parsed.origin && parsed.destination) {
      result.matchType = 'route';

      const originRegex = buildCityRegex(parsed.origin);
      const destRegex = buildCityRegex(parsed.destination);

      // Find matching routes
      const routes = await Route.find({
        'origin.city': originRegex,
        'destination.city': destRegex,
        isActive: true,
      }).limit(5);

      result.routes = routes;

      // Find trips with these routes
      if (routes.length > 0) {
        const routeIds = routes.map((r) => r._id);
        const now = new Date();

        const trips = await Trip.find({
          route: { $in: routeIds },
          departureTime: { $gte: now },
          status: { $in: ['scheduled', 'in_progress'] },
          availableSeats: { $gt: 0 },
        })
          .populate('bus')
          .populate('route')
          .populate('operator')
          .sort({ departureTime: 1 })
          .limit(limit);

        result.trips = trips;
      }

      // Add suggestions
      result.suggestions = routes.map((r) => `${r.origin.city} → ${r.destination.city}`);
    }

    // Trip code search
    else if (parsed.tripCode) {
      result.matchType = 'tripCode';

      const trip = await Trip.findOne({
        _id: { $regex: new RegExp(parsed.tripCode, 'i') },
      })
        .populate('bus')
        .populate('route')
        .populate('operator');

      if (trip) {
        result.trips = [trip];
      }
    }

    // Boarding point search
    else if (parsed.boardingPoint) {
      result.matchType = 'boardingPoint';

      const regex = new RegExp(parsed.boardingPoint, 'i');

      // Search in route stops
      const routes = await Route.find({
        $or: [{ 'origin.landmark': regex }, { 'destination.landmark': regex }, { 'stops.landmark': regex }],
        isActive: true,
      }).limit(5);

      result.routes = routes;

      if (routes.length > 0) {
        const routeIds = routes.map((r) => r._id);
        const now = new Date();

        const trips = await Trip.find({
          route: { $in: routeIds },
          departureTime: { $gte: now },
          status: { $in: ['scheduled', 'in_progress'] },
          availableSeats: { $gt: 0 },
        })
          .populate('bus')
          .populate('route')
          .populate('operator')
          .sort({ departureTime: 1 })
          .limit(limit);

        result.trips = trips;
      }

      result.suggestions = routes
        .map((r) => r.origin.landmark || r.destination.landmark || r.routeName)
        .filter(Boolean);
    }

    // Operator search
    else if (parsed.operator) {
      result.matchType = 'operator';

      const regex = new RegExp(parsed.operator, 'i');

      // Search operators
      const operators = await Operator.find({
        companyName: regex,
        status: { $in: ['approved', 'active'] },
      })
        .sort({ 'rating.overall': -1 })
        .limit(10);

      result.operators = operators;

      // Find trips from these operators
      if (operators.length > 0) {
        const operatorIds = operators.map((o) => o._id);
        const now = new Date();

        const trips = await Trip.find({
          operator: { $in: operatorIds },
          departureTime: { $gte: now },
          status: { $in: ['scheduled', 'in_progress'] },
          availableSeats: { $gt: 0 },
        })
          .populate('bus')
          .populate('route')
          .populate('operator')
          .sort({ departureTime: 1 })
          .limit(limit);

        result.trips = trips;
      }

      result.suggestions = operators.map((o) => o.companyName);
    }

    // If nothing found, try mixed search
    if (result.trips.length === 0 && result.operators.length === 0 && result.routes.length === 0) {
      result.matchType = 'mixed';

      const regex = new RegExp(query, 'i');

      // Search all
      const [operators, routes] = await Promise.all([
        Operator.find({ companyName: regex, status: { $in: ['approved', 'active'] } }).limit(5),
        Route.find({
          $or: [{ 'origin.city': regex }, { 'destination.city': regex }, { routeName: regex }],
          isActive: true,
        }).limit(5),
      ]);

      result.operators = operators;
      result.routes = routes;

      // Combine suggestions
      result.suggestions = [
        ...operators.map((o) => o.companyName),
        ...routes.map((r) => `${r.origin.city} → ${r.destination.city}`),
      ];
    }
  } catch (error) {
    console.error('❌ Universal search error:', error);
  }

  return result;
};

/**
 * Get search suggestions (autocomplete)
 */
const getSearchSuggestions = async (query: string, limit: number = 8): Promise<string[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const regex = new RegExp(query, 'i');
  const suggestions: string[] = [];

  try {
    // Get city suggestions from routes
    const routes = await Route.find({
      $or: [{ 'origin.city': regex }, { 'destination.city': regex }],
      isActive: true,
    })
      .limit(5)
      .select('origin.city destination.city routeName');

    // Get operator suggestions
    const operators = await Operator.find({
      companyName: regex,
      status: { $in: ['approved', 'active'] },
    })
      .limit(5)
      .select('companyName');

    // Combine unique suggestions
    const citySet = new Set<string>();
    routes.forEach((r) => {
      citySet.add(r.origin.city);
      citySet.add(r.destination.city);
      suggestions.push(`${r.origin.city} - ${r.destination.city}`);
    });

    operators.forEach((o) => {
      suggestions.push(o.companyName);
    });

    return Array.from(new Set(suggestions)).slice(0, limit);
  } catch (error) {
    console.error('❌ Get suggestions error:', error);
    return [];
  }
};

export default {
  universalSearch,
  getSearchSuggestions,
  parseSearchQuery,
};
