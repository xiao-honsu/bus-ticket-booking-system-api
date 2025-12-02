/**
 * Mock data for trip view and search
 * Based on backend trip.model.ts structure
 */

export interface SearchFilters {
  priceRange?: {
    min: number;
    max: number;
  };
  departureTimeRange?: {
    start: string; // e.g., '06:00'
    end: string;   // e.g., '12:00'
  };
  busTypes?: string[];
  amenities?: string[];
  operatorRatingMin?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MockTrip {
  id: string;
  tripId: string;
  departureTime: string;
  arrivalTime: string;
  pricePerSeat: number;
  availableSeats: number;
  bookedSeats: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  driver?: {
    name: string;
    phone: string;
    licenseNumber: string;
  };
  route: {
    id: string;
    routeName: string;
    origin: {
      city: string;
      state: string;
      landmark?: string;
      coordinates?: [number, number];
      minutesFromStart?: number;
      stopType: 'pickup' | 'dropoff' | 'both';
    };
    destination: {
      city: string;
      state: string;
      landmark?: string;
      coordinates?: [number, number];
      minutesFromStart?: number;
      stopType: 'pickup' | 'dropoff' | 'both';
    };
    distance: number;
    estimatedDuration: number;
    stops?: Array<{
      city: string;
      state: string;
      landmark?: string;
      minutesFromStart?: number;
      stopType: 'pickup' | 'dropoff' | 'both';
    }>;
  };
  bus: {
    id: string;
    busNumber: string;
    busType: 'standard' | 'limousine' | 'sleeper';
    totalSeats: number;
    amenities: string[];
    licensePlate: string;
    busModel?: string;
    yearOfManufacture?: number;
    images: string[];
  };
  operator: {
    id: string;
    companyName: string;
    logoUrl?: string;
    phoneNumber: string;
    rating: {
      overall: number;
      cleanliness: number;
      punctuality: number;
      staff: number;
      comfort: number;
      value: number;
      totalReviews: number;
    };
  };
  policies: {
    cancellation: string;
    refund: string;
    rescheduling: string;
    baggage: string;
    petPolicy: string;
  };
  stats: {
    totalBookings: number;
    totalRevenue: number;
    occupancyRate: number;
  };
}

export const mockTripData: MockTrip = {
  id: '67a4e8c9f3e9b1c2d3e4f5g6',
  tripId: 'TRIP001',
  departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  arrivalTime: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
  pricePerSeat: 450000, // 450,000 VND
  availableSeats: 18,
  bookedSeats: ['A1', 'A2', 'A5', 'B3', 'B8', 'C2', 'C4', 'D1', 'D7'],
  status: 'scheduled',
  driver: {
    name: 'Nguyễn Văn An',
    phone: '0912345678',
    licenseNumber: 'DL12345ABC',
  },
  route: {
    id: 'route001',
    routeName: 'Hà Nội - TP Hồ Chí Minh',
    origin: {
      city: 'Hà Nội',
      state: 'Hà Nội',
      landmark: 'Bến xe Mỹ Đình',
      coordinates: [105.78, 21.0285],
      minutesFromStart: 0,
      stopType: 'pickup',
    },
    destination: {
      city: 'TP Hồ Chí Minh',
      state: 'Hồ Chí Minh',
      landmark: 'Bến xe Miền Đông',
      coordinates: [106.75, 10.8231],
      minutesFromStart: 880, // ~14.7 hours
      stopType: 'dropoff',
    },
    distance: 1600,
    estimatedDuration: 880,
    stops: [
      {
        city: 'Thanh Hóa',
        state: 'Thanh Hóa',
        landmark: 'Bến xe Thanh Hóa',
        minutesFromStart: 180,
        stopType: 'both',
      },
      {
        city: 'Vinh',
        state: 'Nghệ An',
        landmark: 'Bến xe Vinh',
        minutesFromStart: 360,
        stopType: 'both',
      },
      {
        city: 'Đông Hà',
        state: 'Quảng Trị',
        landmark: 'Bến xe Đông Hà',
        minutesFromStart: 540,
        stopType: 'both',
      },
    ],
  },
  bus: {
    id: 'bus001',
    busNumber: 'BUS-001-VT',
    busType: 'sleeper',
    totalSeats: 36,
    amenities: ['WiFi', 'Toilet', 'Air Conditioning', 'USB Charging', 'Reclining Seats', 'Blankets & Pillows'],
    licensePlate: 'HA-12345AB',
    busModel: 'Thaco Universe TB82',
    yearOfManufacture: 2023,
    images: [
      'https://images.unsplash.com/photo-1622395814383-a9eb0f3c0f19?w=800',
      'https://images.unsplash.com/photo-1575075525685-49c307d0eb54?w=800',
    ],
  },
  operator: {
    id: 'operator001',
    companyName: 'Vietnam Express Company',
    logoUrl: 'https://via.placeholder.com/150?text=VE',
    phoneNumber: '1900-1234',
    rating: {
      overall: 4.8,
      cleanliness: 4.9,
      punctuality: 4.7,
      staff: 4.8,
      comfort: 4.7,
      value: 4.6,
      totalReviews: 2345,
    },
  },
  policies: {
    cancellation:
      'Free cancellation up to 24 hours before departure. After 24 hours, 50% cancellation fee will be charged.',
    refund: 'Refunds will be processed within 3-5 business days to your original payment method.',
    rescheduling: 'You can reschedule your trip up to 2 times for free. After that, a fee of 50,000 VND will be charged.',
    baggage: 'Free baggage allowance: 1 large bag per person. Additional bags: 100,000 VND each.',
    petPolicy: 'Small pets (under 5kg) are allowed with an additional charge of 200,000 VND.',
  },
  stats: {
    totalBookings: 487,
    totalRevenue: 219150000,
    occupancyRate: 0.5,
  },
};

// Generate extended mock trip list with variations
const generateMockTrips = (): MockTrip[] => {
  const trips: MockTrip[] = [];
  const busTypes: Array<'standard' | 'limousine' | 'sleeper'> = ['standard', 'limousine', 'sleeper'];
  const operators = [
    { name: 'Vietnam Express Company', overallRating: 4.8 },
    { name: 'Thao Viet Travel', overallRating: 4.6 },
    { name: 'Hanoi Express', overallRating: 4.7 },
    { name: 'Saigon Tour', overallRating: 4.9 },
  ];
  const prices = [350000, 420000, 450000, 480000, 520000, 550000];

  // Vietnamese cities for route variations
  const routes = [
    { origin: 'Hà Nội', originState: 'Hà Nội', destination: 'TP Hồ Chí Minh', destState: 'Hồ Chí Minh', distance: 1600, duration: 880 },
    { origin: 'Hà Nội', originState: 'Hà Nội', destination: 'Đà Nẵng', destState: 'Đà Nẵng', distance: 800, duration: 480 },
    { origin: 'Hà Nội', originState: 'Hà Nội', destination: 'Hải Phòng', destState: 'Hải Phòng', distance: 120, duration: 120 },
    { origin: 'TP Hồ Chí Minh', originState: 'Hồ Chí Minh', destination: 'Cần Thơ', destState: 'Cần Thơ', distance: 160, duration: 180 },
    { origin: 'TP Hồ Chí Minh', originState: 'Hồ Chí Minh', destination: 'Nha Trang', destState: 'Khánh Hòa', distance: 400, duration: 300 },
    { origin: 'Đà Nẵng', originState: 'Đà Nẵng', destination: 'Huế', destState: 'Thừa Thiên Huế', distance: 100, duration: 120 },
    { origin: 'Đà Nẵng', originState: 'Đà Nẵng', destination: 'Quảng Ngãi', destState: 'Quảng Ngãi', distance: 130, duration: 180 },
    { origin: 'Hồ Chí Minh', originState: 'Hồ Chí Minh', destination: 'Vũng Tàu', destState: 'Bà Rịa - Vũng Tàu', distance: 125, duration: 180 },
    { origin: 'Hà Nội', originState: 'Hà Nội', destination: 'Hà Long', destState: 'Quảng Ninh', distance: 160, duration: 150 },
    { origin: 'Huế', originState: 'Thừa Thiên Huế', destination: 'Đà Nẵng', destState: 'Đà Nẵng', distance: 100, duration: 120 },
  ];

  for (let i = 0; i < 20; i++) {
    const route = routes[i % routes.length];
    const baseTime = Date.now() + (i % 7) * 24 * 60 * 60 * 1000;
    const departureHour = 6 + (i % 10); // Random hours from 6-15
    const departureTime = new Date(baseTime);
    departureTime.setHours(departureHour, i % 60, 0);

    const durationMinutes = route.duration;
    const arrivalTime = new Date(departureTime);
    arrivalTime.setMinutes(arrivalTime.getMinutes() + durationMinutes);

    const operatorData = operators[i % operators.length];
    // Use deterministic calculation based on index instead of Math.random()
    const availableSeats = ((i * 7) % 25) + 8; // 8-32 seats, deterministic

    trips.push({
      ...mockTripData,
      id: `trip${String(i + 1).padStart(3, '0')}`,
      tripId: `TRIP${String(i + 1).padStart(3, '0')}`,
      departureTime: departureTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      pricePerSeat: prices[i % prices.length],
      availableSeats: availableSeats,
      bookedSeats: Array.from({ length: (i % 3) + 2 }, (_, idx) =>
        String.fromCharCode(65 + Math.floor(idx / 6)) + (idx % 6 + 1)
      ),
      route: {
        ...mockTripData.route,
        routeName: `${route.origin} - ${route.destination}`,
        origin: {
          ...mockTripData.route.origin,
          city: route.origin,
          state: route.originState,
        },
        destination: {
          ...mockTripData.route.destination,
          city: route.destination,
          state: route.destState,
          minutesFromStart: route.duration,
        },
        distance: route.distance,
        estimatedDuration: route.duration,
      },
      bus: {
        ...mockTripData.bus,
        busType: busTypes[i % busTypes.length],
      },
      operator: {
        ...mockTripData.operator,
        companyName: operatorData.name,
        rating: {
          overall: operatorData.overallRating,
          cleanliness: operatorData.overallRating - 0.1,
          punctuality: operatorData.overallRating - 0.2,
          staff: operatorData.overallRating,
          comfort: operatorData.overallRating - 0.1,
          value: operatorData.overallRating - 0.3,
          totalReviews: 1000 + i * 100,
        },
      },
    });
  }
  return trips;
};

export const mockTripList: MockTrip[] = generateMockTrips();

/**
 * Filter trips based on search criteria
 */
export const filterTrips = (trips: MockTrip[], filters: SearchFilters): MockTrip[] => {
  return trips.filter((trip) => {
    // Price filter
    if (filters.priceRange) {
      if (
        trip.pricePerSeat < filters.priceRange.min ||
        trip.pricePerSeat > filters.priceRange.max
      ) {
        return false;
      }
    }

    // Departure time filter
    if (filters.departureTimeRange) {
      const departureHour = new Date(trip.departureTime).getHours();
      const startHour = parseInt(filters.departureTimeRange.start);
      const endHour = parseInt(filters.departureTimeRange.end);

      if (departureHour < startHour || departureHour >= endHour) {
        return false;
      }
    }

    // Bus type filter
    if (filters.busTypes && filters.busTypes.length > 0) {
      if (!filters.busTypes.includes(trip.bus.busType)) {
        return false;
      }
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every((amenity) =>
        trip.bus.amenities.includes(amenity)
      );
      if (!hasAllAmenities) {
        return false;
      }
    }

    // Operator rating filter
    if (filters.operatorRatingMin) {
      if (trip.operator.rating.overall < filters.operatorRatingMin) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Apply pagination to trips
 */
export const paginateTrips = (
  trips: MockTrip[],
  params: PaginationParams
): PaginatedResponse<MockTrip> => {
  const start = (params.page - 1) * params.limit;
  const end = start + params.limit;
  const paginatedTrips = trips.slice(start, end);

  return {
    results: paginatedTrips,
    total: trips.length,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(trips.length / params.limit),
  };
};

/**
 * Search and filter trips with pagination
 */
export const searchTrips = (
  filters: SearchFilters,
  pagination: PaginationParams
): PaginatedResponse<MockTrip> => {
  // Filter first, THEN paginate
  const filtered = filterTrips(mockTripList, filters);
  return paginateTrips(filtered, pagination);
};
