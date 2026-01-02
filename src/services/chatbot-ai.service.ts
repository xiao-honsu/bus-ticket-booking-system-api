import { streamText, generateText, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { tool } from 'ai';
import { z } from 'zod';
import { Response } from 'express';
import Trip from '../models/trip.model';
import Route from '../models/route.model';
import Booking from '../models/booking.model';
import Operator from '../models/operator.model';
import logger from '../config/logger';

// Initialize Google provider with API key from environment
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY || '',
});

// Message type for chat (compatible with AI SDK ModelMessage)
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// System prompt for the bus booking assistant
const SYSTEM_PROMPT = `You are an intelligent bus ticket booking assistant for the Bus Ticket Booking system.

Your responsibilities:
- Help customers find suitable bus trips
- Provide information about ticket prices, schedules, and bus operators
- Support checking booking status
- Answer questions about services

Rules:
1. Always respond in the same language as the user's message (Vietnamese or English)
2. Display information clearly and in an easy-to-read format
3. Use emoji to make messages more engaging 🚌
4. Always use tools to get real data - NEVER make up trip information
5. When displaying trips, show: departure time, price, operator, available seats

**CRITICAL: Two-Step Search Strategy (ALWAYS FOLLOW THIS)**

Step 1: ALWAYS call getAvailableRoutes FIRST to verify the route exists
- Check if the origin→destination route is available in our system
- This prevents false "no trips found" when the route doesn't exist

Step 2: Based on Step 1 results:
- If route EXISTS → call searchTrips with appropriate timeRange
- If route DOES NOT EXIST → immediately show user what routes ARE available
  - Suggest similar routes from the same origin or to the same destination
  - NEVER say "no trips found" without first checking available routes

Step 3: Explain results clearly:
- If trips found: "I found X trips in the next Y months"
- If no trips but route exists: "The route exists but no trips are scheduled. This could mean trips are sold out or not yet scheduled."
- If route doesn't exist: "This route is not available. Here are similar routes you might consider..."

**Time Range Selection for searchTrips:**
- User specifies a date → use that exact date
- User says "any day"/doesn't specify → use timeRange: "default" (90 days)
- User says "all days"/"tất cả"/"everything" → use timeRange: "all" (365 days)
- Planning ahead (6+ months) → use timeRange: "extended" (180 days)

**NEVER DO THIS:**
- Never say "route not found" without calling getAvailableRoutes first
- Never assume data doesn't exist without querying
- Never make up trip information

Available cities: Hanoi (Hà Nội), Ho Chi Minh City (Hồ Chí Minh/Sài Gòn), Da Nang (Đà Nẵng), Hue (Huế), Nha Trang, Da Lat (Đà Lạt), Can Tho (Cần Thơ), Hai Phong (Hải Phòng), Vung Tau (Vũng Tàu), Ninh Binh (Ninh Bình)`;

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Format price for display
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

/**
 * City name mappings for normalization
 * Maps various input formats to canonical ASCII city names (matching database format)
 *
 * IMPORTANT: Database stores city names in ASCII format (e.g., "Da Lat", not "Đà Lạt")
 * All mappings must normalize to the ASCII format used in the database
 */
const CITY_MAPPINGS: { [key: string]: string } = {
  // Ho Chi Minh City variants -> DB uses "Ho Chi Minh"
  'sài gòn': 'Ho Chi Minh',
  saigon: 'Ho Chi Minh',
  'sai gon': 'Ho Chi Minh',
  sg: 'Ho Chi Minh',
  hcm: 'Ho Chi Minh',
  hcmc: 'Ho Chi Minh',
  'ho chi minh': 'Ho Chi Minh',
  'ho chi minh city': 'Ho Chi Minh',
  'hồ chí minh': 'Ho Chi Minh',
  'tp hcm': 'Ho Chi Minh',
  tphcm: 'Ho Chi Minh',
  'tp. hcm': 'Ho Chi Minh',
  'thành phố hồ chí minh': 'Ho Chi Minh',

  // Hanoi variants -> DB uses "Ha Noi" or "Hanoi"
  'hà nội': 'Ha Noi',
  'ha noi': 'Ha Noi',
  hanoi: 'Ha Noi',
  hn: 'Ha Noi',
  'tp hà nội': 'Ha Noi',
  'thủ đô': 'Ha Noi',

  // Da Nang variants -> DB uses "Da Nang"
  'đà nẵng': 'Da Nang',
  'da nang': 'Da Nang',
  danang: 'Da Nang',
  dn: 'Da Nang',
  'tp đà nẵng': 'Da Nang',

  // Da Lat variants -> DB uses "Da Lat"
  'đà lạt': 'Da Lat',
  'da lat': 'Da Lat',
  dalat: 'Da Lat',
  dl: 'Da Lat',

  // Nha Trang variants -> DB uses "Nha Trang"
  'nha trang': 'Nha Trang',
  nhatrang: 'Nha Trang',
  nt: 'Nha Trang',
  'nhà trang': 'Nha Trang',

  // Can Tho variants -> DB uses "Can Tho"
  'cần thơ': 'Can Tho',
  'can tho': 'Can Tho',
  cantho: 'Can Tho',
  ct: 'Can Tho',

  // Vung Tau variants -> DB uses "Vung Tau"
  'vũng tàu': 'Vung Tau',
  'vung tau': 'Vung Tau',
  vungtau: 'Vung Tau',
  vt: 'Vung Tau',

  // Hue variants -> DB uses "Hue"
  huế: 'Hue',
  hue: 'Hue',
  'tp huế': 'Hue',

  // Hai Phong variants -> DB uses "Hai Phong"
  'hải phòng': 'Hai Phong',
  'hai phong': 'Hai Phong',
  haiphong: 'Hai Phong',
  hp: 'Hai Phong',

  // Ninh Binh variants -> DB uses "Ninh Binh"
  'ninh bình': 'Ninh Binh',
  'ninh binh': 'Ninh Binh',
  ninhbinh: 'Ninh Binh',
  nb: 'Ninh Binh',

  // Quy Nhon variants -> DB uses "Quy Nhon"
  'quy nhơn': 'Quy Nhon',
  'quy nhon': 'Quy Nhon',
  quynhon: 'Quy Nhon',

  // Phan Thiet variants -> DB uses "Phan Thiet"
  'phan thiết': 'Phan Thiet',
  'phan thiet': 'Phan Thiet',
  phanthiet: 'Phan Thiet',

  // Buon Ma Thuot variants -> DB uses "Buon Ma Thuot"
  'buôn ma thuột': 'Buon Ma Thuot',
  'buon ma thuot': 'Buon Ma Thuot',
  bmt: 'Buon Ma Thuot',

  // Ha Long variants -> DB uses "Ha Long"
  'hạ long': 'Ha Long',
  'ha long': 'Ha Long',
  halong: 'Ha Long',

  // Hoi An variants -> DB uses "Hoi An"
  'hội an': 'Hoi An',
  'hoi an': 'Hoi An',
  hoian: 'Hoi An',
};

/**
 * Normalize city names with comprehensive mapping
 * Handles Vietnamese diacritics, abbreviations, and common misspellings
 */
const normalizeCity = (city: string): string => {
  const normalized = city.toLowerCase().trim();

  // Direct lookup in mappings
  if (CITY_MAPPINGS[normalized]) {
    return CITY_MAPPINGS[normalized];
  }

  // Partial match for longer strings containing city names
  for (const [key, value] of Object.entries(CITY_MAPPINGS)) {
    if (normalized.includes(key) && key.length > 2) {
      return value;
    }
  }

  // Fallback: capitalize first letter of each word
  return city
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Tool input schemas using Zod
const searchTripsSchema = z.object({
  origin: z.string().describe('Departure city (e.g., Hà Nội, Hồ Chí Minh, Hanoi, Ho Chi Minh)'),
  destination: z.string().describe('Destination city (e.g., Đà Lạt, Nha Trang, Da Lat)'),
  date: z
    .string()
    .optional()
    .describe(
      'Travel date in YYYY-MM-DD format. If user specifies a date, use this. Leave empty for range-based search.'
    ),
  timeRange: z
    .enum(['default', 'extended', 'all'])
    .optional()
    .default('default')
    .describe(
      'Search time range: "default" = 90 days (standard), "extended" = 180 days (6 months), "all" = 365 days (when user says "all days" or wants to see everything). Use "all" when user explicitly asks for all available trips.'
    ),
});

const checkBookingSchema = z.object({
  referenceNumber: z.string().describe('Booking reference code, usually alphanumeric string'),
});

const getPopularRoutesSchema = z.object({
  limit: z.number().optional().default(5).describe('Number of routes to retrieve'),
});

const getOperatorsSchema = z.object({
  name: z.string().optional().describe('Bus operator name to search for (optional)'),
});

const getTripDetailsSchema = z.object({
  tripId: z.string().describe('Trip ID'),
});

const getAvailableRoutesSchema = z.object({
  originCity: z.string().optional().describe('Filter by departure city (optional)'),
  destinationCity: z.string().optional().describe('Filter by destination city (optional)'),
});

/**
 * Define tools for the chatbot
 */
const chatbotTools = {
  // Tool 1: Search for trips
  searchTrips: tool({
    description:
      'Search for bus trips by departure city, destination city, and optional date/time range. Use "timeRange: all" when user says "all days", "all trips", or wants to see everything available. Use "default" (90 days) for normal searches. Use "extended" (180 days) for planning ahead.',
    inputSchema: searchTripsSchema,
    execute: async (input: z.infer<typeof searchTripsSchema>) => {
      const { origin, destination, date, timeRange = 'default' } = input;
      try {
        logger.info(
          `[Chatbot Tool] Searching trips: ${origin} -> ${destination}, date: ${date || 'range-based'}, timeRange: ${timeRange}`
        );

        const normalizedOrigin = normalizeCity(origin);
        const normalizedDestination = normalizeCity(destination);

        // Find routes matching origin and destination
        const routes = await Route.find({
          'origin.city': new RegExp(normalizedOrigin, 'i'),
          'destination.city': new RegExp(normalizedDestination, 'i'),
          isActive: true,
        });

        if (routes.length === 0) {
          logger.info(`[Chatbot Tool] No routes found: ${normalizedOrigin} -> ${normalizedDestination}`);

          // Get list of available cities for suggestions
          const availableRoutes = await Route.find({ isActive: true })
            .select('origin.city destination.city routeName')
            .limit(50);
          const originCities = [...new Set(availableRoutes.map((r) => r.origin.city))];
          const destCities = [...new Set(availableRoutes.map((r) => r.destination.city))];

          // Find similar routes (same origin OR same destination)
          const similarFromOrigin = availableRoutes
            .filter((r) => r.origin.city.toLowerCase().includes(normalizedOrigin.toLowerCase().substring(0, 3)))
            .map((r) => `${r.origin.city} → ${r.destination.city}`)
            .slice(0, 5);

          const similarToDestination = availableRoutes
            .filter((r) =>
              r.destination.city.toLowerCase().includes(normalizedDestination.toLowerCase().substring(0, 3))
            )
            .map((r) => `${r.origin.city} → ${r.destination.city}`)
            .slice(0, 5);

          return {
            success: false,
            message: `Route from "${normalizedOrigin}" to "${normalizedDestination}" does not exist in our system`,
            routeExists: false,
            searchedFor: {
              origin: normalizedOrigin,
              destination: normalizedDestination,
              originalInput: { origin, destination },
            },
            availableOrigins: originCities,
            availableDestinations: destCities,
            similarRoutes: {
              fromSameOrigin: similarFromOrigin.length > 0 ? similarFromOrigin : 'None found',
              toSameDestination: similarToDestination.length > 0 ? similarToDestination : 'None found',
            },
            suggestions: [
              'Please verify the city names',
              `Available departure cities: ${originCities.slice(0, 5).join(', ')}`,
              `Available destination cities: ${destCities.slice(0, 5).join(', ')}`,
              'Use getAvailableRoutes tool to see all available routes',
            ],
          };
        }

        // Build date range based on user input
        let startOfSearch: Date;
        let endOfSearch: Date;
        let searchRangeDescription: string;

        if (date) {
          // Specific date provided - search only that day
          const searchDate = new Date(date);
          startOfSearch = new Date(searchDate);
          startOfSearch.setHours(0, 0, 0, 0);
          endOfSearch = new Date(searchDate);
          endOfSearch.setHours(23, 59, 59, 999);
          searchRangeDescription = searchDate.toLocaleDateString('en-US');
        } else {
          // No specific date - use time range
          startOfSearch = new Date();
          endOfSearch = new Date();

          switch (timeRange) {
            case 'extended':
              // Extended search: 180 days (6 months)
              endOfSearch.setDate(endOfSearch.getDate() + 180);
              searchRangeDescription = 'Next 6 months (180 days)';
              break;
            case 'all':
              // All trips: 365 days (1 year)
              endOfSearch.setDate(endOfSearch.getDate() + 365);
              searchRangeDescription = 'Next 12 months (all available trips)';
              break;
            case 'default':
            default:
              // Default search: 90 days (3 months)
              endOfSearch.setDate(endOfSearch.getDate() + 90);
              searchRangeDescription = 'Next 3 months (90 days)';
              break;
          }
        }

        // Find trips for these routes
        const trips = await Trip.find({
          route: { $in: routes.map((r) => r._id) },
          departureTime: { $gte: startOfSearch, $lte: endOfSearch },
          status: 'scheduled',
          availableSeats: { $gt: 0 },
        })
          .populate('bus', 'busType amenities totalSeats')
          .populate('route', 'origin destination distance estimatedDuration')
          .populate('operator', 'companyName rating')
          .limit(timeRange === 'all' ? 50 : 20) // More results for "all" searches
          .sort({ departureTime: 1 });

        if (trips.length === 0) {
          // Log detailed debug info
          logger.info(
            `[Chatbot Tool] No trips found. Debug info: routes=${routes.length}, searchRange=${searchRangeDescription}, ` +
              `startDate=${startOfSearch.toISOString()}, endDate=${endOfSearch.toISOString()}`
          );

          // Check WHY no trips exist - provide detailed diagnosis
          const allTripsForRoute = await Trip.countDocuments({
            route: { $in: routes.map((r) => r._id) },
          });

          const futureTripsAnyStatus = await Trip.countDocuments({
            route: { $in: routes.map((r) => r._id) },
            departureTime: { $gte: new Date() },
          });

          const scheduledTrips = await Trip.countDocuments({
            route: { $in: routes.map((r) => r._id) },
            departureTime: { $gte: new Date() },
            status: 'scheduled',
          });

          // Determine the specific reason
          let detailedReason: string;
          let detailedSuggestions: string[];

          if (allTripsForRoute === 0) {
            detailedReason = 'No trips have ever been scheduled for this route';
            detailedSuggestions = [
              'This route exists in our system but operators have not scheduled any trips yet',
              'Contact bus operators directly to inquire about this route',
              'Check alternative routes with getAvailableRoutes',
            ];
          } else if (futureTripsAnyStatus === 0) {
            detailedReason = `All ${allTripsForRoute} trips on this route are in the past`;
            detailedSuggestions = [
              'All trips on this route have already departed',
              'New trips may be added soon - check back later',
              'Contact operators for upcoming schedules',
            ];
          } else if (scheduledTrips === 0) {
            detailedReason = `Found ${futureTripsAnyStatus} future trips but none are in "scheduled" status`;
            detailedSuggestions = ['Trips may be cancelled or completed', 'Contact operators for available trips'];
          } else {
            detailedReason = `Found ${scheduledTrips} scheduled trips but none match your search criteria (date range or available seats)`;
            detailedSuggestions = [
              timeRange !== 'all'
                ? 'Try searching with timeRange: "all" to see all trips'
                : 'All scheduled trips may be fully booked',
              'Try a different date',
              'Contact operators for assistance',
            ];
          }

          return {
            success: false,
            message: `No trips available from ${normalizedOrigin} to ${normalizedDestination}`,
            searchRange: searchRangeDescription,
            routeExists: true,
            routeCount: routes.length,
            diagnosis: {
              reason: detailedReason,
              totalTripsOnRoute: allTripsForRoute,
              futureTrips: futureTripsAnyStatus,
              scheduledTrips: scheduledTrips,
            },
            suggestions: detailedSuggestions,
          };
        }

        // Format results
        const formattedTrips = trips.map((trip) => {
          const route = trip.route as any;
          const bus = trip.bus as any;
          const operator = trip.operator as any;

          return {
            tripId: trip._id.toString(),
            operator: operator?.companyName || 'N/A',
            rating: operator?.rating?.overall || 0,
            busType: bus?.busType || 'standard',
            amenities: bus?.amenities || [],
            departureTime: formatDate(trip.departureTime),
            arrivalTime: formatDate(trip.arrivalTime),
            origin: route?.origin?.city || normalizedOrigin,
            destination: route?.destination?.city || normalizedDestination,
            price: formatPrice(trip.pricePerSeat),
            priceValue: trip.pricePerSeat,
            availableSeats: trip.availableSeats,
            totalSeats: bus?.totalSeats || 0,
          };
        });

        return {
          success: true,
          count: formattedTrips.length,
          trips: formattedTrips,
          searchInfo: {
            origin: normalizedOrigin,
            destination: normalizedDestination,
            searchRange: searchRangeDescription,
            timeRangeUsed: timeRange,
            note:
              timeRange === 'all'
                ? 'Showing all available trips in the next 12 months'
                : timeRange === 'extended'
                  ? 'Showing trips in the next 6 months'
                  : 'Showing trips in the next 3 months. Use "all" time range to see more.',
          },
        };
      } catch (error) {
        logger.error('[Chatbot Tool] searchTrips error:', error);
        return {
          success: false,
          message: 'An error occurred while searching for trips. Please try again.',
        };
      }
    },
  }),

  // Tool 2: Check booking by reference
  checkBooking: tool({
    description: 'Check booking information by reference code. Use when user wants to look up their booked ticket.',
    inputSchema: checkBookingSchema,
    execute: async (input: z.infer<typeof checkBookingSchema>) => {
      const { referenceNumber } = input;
      try {
        logger.info(`[Chatbot Tool] Checking booking: ${referenceNumber}`);

        const booking = await Booking.findOne({
          referenceNumber: referenceNumber.toUpperCase(),
        })
          .populate({
            path: 'trip',
            populate: [
              { path: 'route', select: 'origin destination' },
              { path: 'operator', select: 'companyName' },
            ],
          })
          .select('-payment.gatewayResponse');

        if (!booking) {
          return {
            success: false,
            message: `No booking found with reference: ${referenceNumber}`,
            suggestions: [
              'Check the reference code (usually in confirmation email)',
              'Reference code is typically alphanumeric',
            ],
          };
        }

        const trip = booking.trip as any;
        const route = trip?.route;

        return {
          success: true,
          booking: {
            referenceNumber: booking.referenceNumber,
            status: booking.status,
            passengers: booking.passengers.map((p) => ({
              name: p.name,
              seatNumber: p.seatNumber,
            })),
            totalAmount: formatPrice(booking.totalAmount),
            contactEmail: booking.contactEmail,
            contactPhone: booking.contactPhone,
            trip: {
              from: route?.origin?.city || 'N/A',
              to: route?.destination?.city || 'N/A',
              departureTime: trip?.departureTime ? formatDate(trip.departureTime) : 'N/A',
              operator: trip?.operator?.companyName || 'N/A',
            },
            paymentStatus: booking.payment?.status || 'pending',
          },
        };
      } catch (error) {
        logger.error('[Chatbot Tool] checkBooking error:', error);
        return {
          success: false,
          message: 'An error occurred while checking booking. Please try again.',
        };
      }
    },
  }),

  // Tool 3: Get popular routes
  getPopularRoutes: tool({
    description: 'Get list of popular bus routes. Use when user asks about routes or needs suggestions.',
    inputSchema: getPopularRoutesSchema,
    execute: async (input: z.infer<typeof getPopularRoutesSchema>) => {
      const { limit } = input;
      try {
        const routes = await Route.find({ isActive: true })
          .sort({ 'stats.totalBookings': -1 })
          .limit(limit || 5);

        const formattedRoutes = routes.map((route) => ({
          routeId: route._id.toString(),
          name: route.routeName,
          from: route.origin.city,
          to: route.destination.city,
          distance: `${route.distance} km`,
          duration: `${Math.floor(route.estimatedDuration / 60)}h ${route.estimatedDuration % 60}m`,
        }));

        return {
          success: true,
          routes: formattedRoutes,
        };
      } catch (error) {
        logger.error('[Chatbot Tool] getPopularRoutes error:', error);
        return {
          success: false,
          message: 'Unable to load popular routes.',
        };
      }
    },
  }),

  // Tool 4: Get operators info
  getOperators: tool({
    description:
      'Get information about bus operators/companies. Use when user asks about operators, ratings, or wants to compare.',
    inputSchema: getOperatorsSchema,
    execute: async (input: z.infer<typeof getOperatorsSchema>) => {
      const { name } = input;
      try {
        const query: any = { status: 'active' };
        if (name) {
          query.companyName = new RegExp(name, 'i');
        }

        const operators = await Operator.find(query).sort({ 'rating.overall': -1 }).limit(10);

        const formattedOperators = operators.map((op) => ({
          name: op.companyName,
          rating: op.rating.overall.toFixed(1),
          totalReviews: op.rating.totalReviews,
          phone: op.phoneNumber,
          description: op.description || 'No description available',
        }));

        return {
          success: true,
          operators: formattedOperators,
        };
      } catch (error) {
        logger.error('[Chatbot Tool] getOperators error:', error);
        return {
          success: false,
          message: 'Unable to load operator information.',
        };
      }
    },
  }),

  // Tool 5: Get trip details
  getTripDetails: tool({
    description: 'Get detailed information about a specific trip. Use when user wants to know more about a trip.',
    inputSchema: getTripDetailsSchema,
    execute: async (input: z.infer<typeof getTripDetailsSchema>) => {
      const { tripId } = input;
      try {
        const trip = await Trip.findById(tripId)
          .populate('bus', 'busType amenities totalSeats busNumber licensePlate')
          .populate('route', 'origin destination distance estimatedDuration stops')
          .populate('operator', 'companyName rating phoneNumber');

        if (!trip) {
          return {
            success: false,
            message: 'Trip not found',
          };
        }

        const bus = trip.bus as any;
        const route = trip.route as any;
        const operator = trip.operator as any;

        return {
          success: true,
          trip: {
            id: trip._id.toString(),
            operator: {
              name: operator?.companyName,
              rating: operator?.rating?.overall,
              phone: operator?.phoneNumber,
            },
            bus: {
              type: bus?.busType,
              plateNumber: bus?.licensePlate,
              amenities: bus?.amenities || [],
              totalSeats: bus?.totalSeats,
            },
            route: {
              from: route?.origin?.city,
              to: route?.destination?.city,
              distance: `${route?.distance} km`,
              duration: `${Math.floor(route?.estimatedDuration / 60)}h ${route?.estimatedDuration % 60}m`,
              stops: route?.stops?.map((s: any) => s.city) || [],
            },
            schedule: {
              departure: formatDate(trip.departureTime),
              arrival: formatDate(trip.arrivalTime),
            },
            pricing: {
              basePrice: formatPrice(trip.pricePerSeat),
              availableSeats: trip.availableSeats,
            },
            status: trip.status,
          },
        };
      } catch (error) {
        logger.error('[Chatbot Tool] getTripDetails error:', error);
        return {
          success: false,
          message: 'Unable to load trip information.',
        };
      }
    },
  }),

  // Tool 6: Get available routes - Enhanced with trip counts
  getAvailableRoutes: tool({
    description:
      'Get list of all available routes in the system with trip availability info. ALWAYS call this FIRST before searchTrips to verify the route exists. Can filter by origin or destination city.',
    inputSchema: getAvailableRoutesSchema,
    execute: async (input: z.infer<typeof getAvailableRoutesSchema>) => {
      const { originCity, destinationCity } = input;
      try {
        logger.info(
          `[Chatbot Tool] Getting available routes: origin=${originCity || 'any'}, dest=${destinationCity || 'any'}`
        );

        const query: any = { isActive: true };

        if (originCity) {
          const normalizedOrigin = normalizeCity(originCity);
          query['origin.city'] = new RegExp(normalizedOrigin, 'i');
        }

        if (destinationCity) {
          const normalizedDest = normalizeCity(destinationCity);
          query['destination.city'] = new RegExp(normalizedDest, 'i');
        }

        const routes = await Route.find(query)
          .select('routeName origin.city destination.city distance estimatedDuration')
          .sort({ 'stats.totalBookings': -1 })
          .limit(20);

        if (routes.length === 0) {
          // Get all unique cities to suggest
          const allRoutes = await Route.find({ isActive: true }).select('origin.city destination.city routeName');
          const allOrigins = [...new Set(allRoutes.map((r) => r.origin.city))];
          const allDestinations = [...new Set(allRoutes.map((r) => r.destination.city))];

          // Get all available route names for suggestions
          const allRouteNames = allRoutes.map((r) => `${r.origin.city} → ${r.destination.city}`);

          return {
            success: false,
            message:
              originCity || destinationCity
                ? `No routes found from "${originCity || 'any'}" to "${destinationCity || 'any'}"`
                : 'No active routes in the system',
            searchedFor: {
              origin: originCity ? normalizeCity(originCity) : 'any',
              destination: destinationCity ? normalizeCity(destinationCity) : 'any',
            },
            totalRoutesInSystem: allRoutes.length,
            availableDepartureCities: allOrigins,
            availableDestinationCities: allDestinations,
            sampleRoutes: allRouteNames.slice(0, 10),
            suggestions: [
              `Available origins: ${allOrigins.slice(0, 5).join(', ')}`,
              `Available destinations: ${allDestinations.slice(0, 5).join(', ')}`,
            ],
          };
        }

        // Get trip counts for each route
        const now = new Date();
        const future90Days = new Date();
        future90Days.setDate(future90Days.getDate() + 90);

        const formattedRoutes = await Promise.all(
          routes.map(async (route) => {
            const tripCount = await Trip.countDocuments({
              route: route._id,
              departureTime: { $gte: now, $lte: future90Days },
              status: 'scheduled',
              availableSeats: { $gt: 0 },
            });

            return {
              routeId: route._id.toString(),
              name: route.routeName,
              from: route.origin.city,
              to: route.destination.city,
              distance: `${route.distance} km`,
              duration: `${Math.floor(route.estimatedDuration / 60)}h ${route.estimatedDuration % 60}m`,
              availableTripsNext90Days: tripCount,
              hasAvailableTrips: tripCount > 0,
            };
          })
        );

        // Extract unique cities
        const departureCities = [...new Set(routes.map((r) => r.origin.city))];
        const arrivalCities = [...new Set(routes.map((r) => r.destination.city))];

        // Count routes with available trips
        const routesWithTrips = formattedRoutes.filter((r) => r.hasAvailableTrips).length;

        return {
          success: true,
          count: formattedRoutes.length,
          routesWithAvailableTrips: routesWithTrips,
          routes: formattedRoutes,
          departureCities,
          arrivalCities,
          note:
            routesWithTrips === 0
              ? 'Routes exist but no trips are currently scheduled. This may be a development environment without seeded data.'
              : `${routesWithTrips} of ${formattedRoutes.length} routes have available trips in the next 90 days`,
        };
      } catch (error) {
        logger.error('[Chatbot Tool] getAvailableRoutes error:', error);
        return {
          success: false,
          message: 'Unable to load available routes.',
        };
      }
    },
  }),
};

/**
 * Process chat messages and stream response
 */
export const streamChatResponse = async (messages: ChatMessage[], res: Response): Promise<void> => {
  try {
    logger.info(`[Chatbot] Processing ${messages.length} messages`);

    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured in environment variables');
    }

    const result = streamText({
      model: google('gemini-2.0-flash-exp'),
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tools: chatbotTools,
      stopWhen: stepCountIs(5), // Allow multiple tool calls in sequence
      temperature: 0.7,
    });

    // Use pipeTextStreamToResponse for streaming
    result.pipeTextStreamToResponse(res);
  } catch (error) {
    logger.error('[Chatbot] streamChatResponse error:', error);
    throw error;
  }
};

/**
 * Generate a non-streaming response (for testing/fallback)
 */
export const generateChatResponse = async (messages: ChatMessage[]): Promise<string> => {
  // Check if API key is available
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured in environment variables');
  }

  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    tools: chatbotTools,
    stopWhen: stepCountIs(5),
    temperature: 0.7,
  });

  return result.text;
};

export default {
  streamChatResponse,
  generateChatResponse,
};
