# Bus Ticket Booking System - Frontend Integration Guide

**Version:** 1.0.0  
**Last Updated:** December 14, 2025  
**Backend Base URL:** `http://localhost:4000/api/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & API Integration](#architecture--api-integration)
3. [Passenger Search & Discovery](#passenger-search--discovery)
4. [Seat Selection](#seat-selection)
5. [Email Notifications](#email-notifications)
6. [Complete Examples](#complete-examples)
7. [Error Handling](#error-handling)

---

## Overview

This document covers three core features implemented for the bus ticket booking system:

### ✅ **Passenger Search & Discovery (v1.0)**

- **City Autocomplete**: Smart search for origin/destination cities
- **Trip Search**: Advanced search with date picker
- **Filters**: Time range, price range, bus type filters

### ✅ **Seat Selection (v1.75)**

- **Interactive Seat Map**: Visual seat layout (supports 1-60 seats per bus)
- **Bus Types**: Standard, Limousine, and Sleeper buses
- **Seat Locking**: 10-minute temporary reservation
- **Real-time Availability**: Live seat status updates

### ✅ **Email Notifications (Automated)**

- **Confirmation**: Instant booking confirmation emails
- **Reminders**: 24h and 2h before departure
- **Cancellation**: Refund details and cancellation confirmation
- **Updates**: Trip changes and notifications

**Status:** Production Ready ✅

---

## Architecture & API Integration

### Frontend vs Backend Routes

**Important:** This API documentation covers the **backend APIs only**. Your frontend (Next.js/React) will have its own routes that call these backend APIs.

#### **Example Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js/React) - http://localhost:3000           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User visits: http://localhost:3000/search                 │
│               ?origin=Ha+Noi&destination=Nha+Trang         │
│                                                             │
│  Frontend Page (/search):                                  │
│  ├─ Receives user's search parameters                      │
│  ├─ Calls backend API (fetch/axios)                        │
│  └─ Renders results                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    HTTP Request
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (Express API) - http://localhost:4000/api/v1       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GET /api/v1/trips/search                                  │
│      ?origin=locationId1                                   │
│      &destination=locationId2                              │
│      &departureDate=2025-12-20                             │
│                                                             │
│  Returns: Trip search results (JSON)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Frontend Route Examples:**

Your frontend can have user-friendly routes like:

- `GET /search` - Search page
- `GET /trips/:id` - Trip details page
- `GET /booking/:id` - Booking confirmation page

**These frontend routes internally call the backend APIs documented below.**

### **Backend API Endpoints:**

All backend APIs follow this pattern:

```
http://localhost:4000/api/v1/{resource}
```

**Available Endpoints:**

- `GET /api/v1/trips/search` - Search trips
- `GET /api/v1/locations/search` - Search locations (autocomplete)
- `GET /api/v1/trips/:tripId/seat-map` - Get seat map
- `POST /api/v1/seat-locks/lock` - Lock seats
- `POST /api/v1/bookings` - Create booking
- `DELETE /api/v1/bookings/:id/cancel` - Cancel booking

### **Integration Pattern:**

```typescript
// Frontend Page: /search
// File: pages/search.tsx or app/search/page.tsx

export default function SearchPage() {
  const searchParams = useSearchParams();
  const origin = searchParams.get('origin'); // "Ha Noi" from URL
  const destination = searchParams.get('destination'); // "Nha Trang" from URL

  // Call backend API
  const fetchTrips = async () => {
    // Step 1: Convert city names to location IDs (if needed)
    const originLocation = await fetch(
      `http://localhost:4000/api/v1/locations/search?q=${origin}`
    ).then(r => r.json());

    const destLocation = await fetch(
      `http://localhost:4000/api/v1/locations/search?q=${destination}`
    ).then(r => r.json());

    // Step 2: Search trips using location IDs
    const trips = await fetch(
      `http://localhost:4000/api/v1/trips/search?` +
      `origin=${originLocation.results[0].id}&` +
      `destination=${destLocation.results[0].id}&` +
      `departureDate=2025-12-20`
    ).then(r => r.json());

    return trips;
  };

  return <SearchResults trips={trips} />;
}
```

### **Key Points:**

✅ **Frontend routes** (`/search`) are for user navigation  
✅ **Backend APIs** (`/api/v1/trips/search`) provide data  
✅ Frontend makes HTTP requests to backend to fetch data  
✅ All backend API paths start with `/api/v1/`  
✅ Frontend can use any routing structure (Next.js, React Router, etc.)

---

## Passenger Search & Discovery

### 1. City Autocomplete

Search for cities to populate origin and destination fields.

**Endpoint:**

```http
GET /v1/locations/search?q={query}
```

**Parameters:**

- `q` (required): Search query (minimum 2 characters)

**Example Request:**

```javascript
// Search for "Ho Chi"
const searchCities = async (query) => {
  const response = await fetch(`/api/v1/locations/search?q=${encodeURIComponent(query)}`);
  return await response.json();
};
```

**Response:**

```json
{
  "results": [
    {
      "id": "64a7f8e1234567890abcdef0",
      "city": "Ho Chi Minh City",
      "state": "Ho Chi Minh",
      "country": "Vietnam",
      "code": "HCM"
    },
    {
      "id": "64a7f8e1234567890abcdef1",
      "city": "Da Nang",
      "state": "Da Nang",
      "country": "Vietnam",
      "code": "DAN"
    }
  ],
  "total": 2
}
```

**Frontend Implementation:**

```typescript
// React Autocomplete Component
const CityAutocomplete: React.FC<{
  label: string;
  onSelect: (locationId: string) => void;
}> = ({ label, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        const response = await fetch(
          `/api/v1/locations/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        setResults(data.results);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="autocomplete">
      <label>{label}</label>
      <input
        type="text"
        placeholder="Type city name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <div className="loading">Searching...</div>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((location) => (
            <li
              key={location.id}
              onClick={() => {
                onSelect(location.id);
                setQuery(`${location.city}, ${location.state}`);
                setResults([]);
              }}
            >
              {location.city}, {location.state}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

### 2. Trip Search with Filters

Search for available trips with comprehensive filtering options.

**Endpoint:**

```http
GET /v1/trips/search
```

**Query Parameters:**

| Parameter           | Type   | Required | Description                    | Example            |
| ------------------- | ------ | -------- | ------------------------------ | ------------------ |
| `origin`            | string | ✅ Yes   | Origin location ID             | `64a7f8e...`       |
| `destination`       | string | ✅ Yes   | Destination location ID        | `64a7f9e...`       |
| `departureDate`     | string | ✅ Yes   | Date in YYYY-MM-DD format      | `2025-12-20`       |
| `minPrice`          | number | No       | Minimum price filter (VND)     | `200000`           |
| `maxPrice`          | number | No       | Maximum price filter (VND)     | `800000`           |
| `departureTimeFrom` | string | No       | Start time filter (HH:MM)      | `06:00`            |
| `departureTimeTo`   | string | No       | End time filter (HH:MM)        | `18:00`            |
| `busType`           | string | No       | standard, limousine, sleeper   | `sleeper`          |
| `amenities`         | string | No       | Comma-separated list           | `wifi,ac,charging` |
| `minAvailableSeats` | number | No       | Minimum available seats        | `2`                |
| `sortBy`            | string | No       | departureTime, price, duration | `price`            |
| `sortOrder`         | string | No       | asc or desc                    | `asc`              |
| `page`              | number | No       | Page number                    | `1`                |
| `limit`             | number | No       | Results per page               | `10`               |

**Example Request:**

```javascript
const searchTrips = async (params) => {
  const queryParams = new URLSearchParams({
    origin: params.originId,
    destination: params.destinationId,
    departureDate: params.date,
    // Optional filters
    ...(params.minPrice && { minPrice: params.minPrice }),
    ...(params.maxPrice && { maxPrice: params.maxPrice }),
    ...(params.timeFrom && { departureTimeFrom: params.timeFrom }),
    ...(params.timeTo && { departureTimeTo: params.timeTo }),
    ...(params.busType && { busType: params.busType }),
    sortBy: 'price',
    sortOrder: 'asc',
  });

  const response = await fetch(`/api/v1/trips/search?${queryParams}`);
  return await response.json();
};

// Usage
const results = await searchTrips({
  originId: '64a7f8e...',
  destinationId: '64a7f9e...',
  date: '2025-12-20',
  minPrice: '200000',
  maxPrice: '800000',
  timeFrom: '06:00',
  timeTo: '18:00',
  busType: 'sleeper',
});
```

**Response:**

```json
{
  "results": [
    {
      "id": "64a7f8e1234567890abcdef0",
      "route": {
        "id": "64a7f7e1234567890abcdef0",
        "origin": {
          "city": "Ho Chi Minh City",
          "state": "Ho Chi Minh",
          "address": "Ben Xe Mien Dong",
          "coordinates": {
            "lat": 10.8142,
            "lng": 106.6438
          }
        },
        "destination": {
          "city": "Da Nang",
          "state": "Da Nang",
          "address": "Ben Xe Trung Tam",
          "coordinates": {
            "lat": 16.0544,
            "lng": 108.2022
          }
        },
        "distance": 964,
        "estimatedDuration": 720
      },
      "operator": {
        "id": "64a7f6e1234567890abcdef0",
        "name": "Phuong Trang",
        "rating": 4.5,
        "totalReviews": 1250
      },
      "bus": {
        "id": "64a7f5e1234567890abcdef0",
        "busNumber": "51B-12345",
        "busType": "sleeper",
        "totalSeats": 40,
        "amenities": ["wifi", "ac", "charging_port", "entertainment"]
      },
      "departureTime": "2025-12-20T08:00:00.000Z",
      "arrivalTime": "2025-12-20T20:00:00.000Z",
      "pricePerSeat": 450000,
      "availableSeats": 28,
      "bookedSeats": ["A1", "A2", "B1"],
      "status": "scheduled"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "totalResults": 45
}
```

**Frontend Search Form with Validation:**

```typescript
interface SearchFormData {
  origin: string;
  destination: string;
  departureDate: string;
  filters?: {
    priceRange?: [number, number];
    timeRange?: [string, string];
    busType?: 'standard' | 'limousine' | 'sleeper';
    amenities?: string[];
  };
}

interface FormErrors {
  origin?: string;
  destination?: string;
  departureDate?: string;
  general?: string;
}

const SearchForm: React.FC = () => {
  const [formData, setFormData] = useState<SearchFormData>({
    origin: '',
    destination: '',
    departureDate: '',
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    origin?: string;
    destination?: string;
    departureDate?: string;
    general?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate required fields
    if (!formData.origin) {
      newErrors.origin = 'Please select a departure city';
    }

    if (!formData.destination) {
      newErrors.destination = 'Please select a destination city';
    }

    if (!formData.departureDate) {
      newErrors.departureDate = 'Please select a departure date';
    }

    // Check if all required fields are empty
    if (!formData.origin && !formData.destination && !formData.departureDate) {
      newErrors.general = 'Please fill in all required fields to search for trips';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const params = new URLSearchParams({
      origin: formData.origin,
      destination: formData.destination,
      departureDate: formData.departureDate,
    });

    // Apply filters
    if (formData.filters?.priceRange) {
      params.append('minPrice', formData.filters.priceRange[0].toString());
      params.append('maxPrice', formData.filters.priceRange[1].toString());
    }

    if (formData.filters?.timeRange) {
      params.append('departureTimeFrom', formData.filters.timeRange[0]);
      params.append('departureTimeTo', formData.filters.timeRange[1]);
    }

    if (formData.filters?.busType) {
      params.append('busType', formData.filters.busType);
    }

    if (formData.filters?.amenities?.length) {
      params.append('amenities', formData.filters.amenities.join(','));
    }

    try {
      const response = await fetch(`/api/v1/trips/search?${params}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
      setErrors({ general: 'Failed to search trips. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-form">
      {/* Error Message */}
      {errors.general && (
        <div className="alert alert-error" role="alert">
          {errors.general}
        </div>
      )}

      {/* Origin City */}
      <div className="form-group">
        <CityAutocomplete
          label="From *"
          onSelect={(locationId) => {
            setFormData({ ...formData, origin: locationId });
            setErrors({ ...errors, origin: undefined, general: undefined });
          }}
        />
        {errors.origin && (
          <span className="error-message">{errors.origin}</span>
        )}
      </div>

      {/* Destination City */}
      <div className="form-group">
        <CityAutocomplete
          label="To *"
          onSelect={(locationId) => {
            setFormData({ ...formData, destination: locationId });
            setErrors({ ...errors, destination: undefined, general: undefined });
          }}
        />
        {errors.destination && (
          <span className="error-message">{errors.destination}</span>
        )}
      </div>

      {/* Date Picker */}
      <div className="form-group">
        <div className="date-picker">
          <label>Departure Date *</label>
          <input
            type="date"
            value={formData.departureDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setFormData({ ...formData, departureDate: e.target.value });
              setErrors({ ...errors, departureDate: undefined, general: undefined });
            }}
          />
        </div>
        {errors.departureDate && (
          <span className="error-message">{errors.departureDate}</span>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <h3>Filters</h3>

        {/* Price Range */}
        <div className="filter-group">
          <label>Price Range (VND)</label>
          <input
            type="range"
            min="100000"
            max="1000000"
            step="50000"
            onChange={(e) => {
              const max = parseInt(e.target.value);
              setFormData({
                ...formData,
                filters: {
                  ...formData.filters,
                  priceRange: [100000, max]
                }
              });
            }}
          />
        </div>

        {/* Time Range */}
        <div className="filter-group">
          <label>Departure Time</label>
          <input
            type="time"
            placeholder="From"
            onChange={(e) => {
              const timeRange = formData.filters?.timeRange || ['', ''];
              setFormData({
                ...formData,
                filters: {
                  ...formData.filters,
                  timeRange: [e.target.value, timeRange[1]]
                }
              });
            }}
          />
          <input
            type="time"
            placeholder="To"
            onChange={(e) => {
              const timeRange = formData.filters?.timeRange || ['', ''];
              setFormData({
                ...formData,
                filters: {
                  ...formData.filters,
                  timeRange: [timeRange[0], e.target.value]
                }
              });
            }}
          />
        </div>

        {/* Bus Type */}
        <div className="filter-group">
          <label>Bus Type</label>
          <select
            onChange={(e) =>
              setFormData({
                ...formData,
                filters: {
                  ...formData.filters,
                  busType: e.target.value as any
                }
              })
            }
          >
            <option value="">All Types</option>
            <option value="standard">Standard (40-45 seats)</option>
            <option value="limousine">Limousine (20-30 seats)</option>
            <option value="sleeper">Sleeper (30-40 berths)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Searching...' : 'Search Buses'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="results">
          {results.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && formData.origin && formData.destination && (
        <div className="no-results">
          <p>No trips found for your search. Try different dates or routes.</p>
        </div>
      )}
    </div>
  );
};

/**
 * CSS Styles for Search Form Validation
 */
const styles = `
  .search-form {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .alert {
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .alert-error {
    background-color: #fee;
    color: #c33;
    border: 1px solid #fcc;
  }

  .error-message {
    display: block;
    color: #c33;
    font-size: 12px;
    margin-top: 4px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #0056b3;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .no-results {
    text-align: center;
    padding: 40px;
    color: #666;
  }
`;
```

---

## Seat Selection

### 1. Get Interactive Seat Map

Retrieve the seat layout with real-time availability for a specific trip.

**Endpoint:**

```http
GET /v1/trips/{tripId}/seat-map
```

**Response:**

```json
{
  "tripId": "64a7f8e1234567890abcdef0",
  "busType": "sleeper",
  "totalSeats": 40,
  "availableSeats": 28,
  "layout": {
    "rows": 10,
    "columns": 4,
    "decks": ["lower", "upper"]
  },
  "seats": [
    {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "deck": "lower",
      "type": "sleeper",
      "price": 450000,
      "status": "available",
      "position": {
        "isWindow": true,
        "isAisle": false
      }
    },
    {
      "seatNumber": "A2",
      "row": 1,
      "column": 2,
      "deck": "lower",
      "type": "sleeper",
      "price": 450000,
      "status": "booked",
      "position": {
        "isWindow": false,
        "isAisle": false
      }
    },
    {
      "seatNumber": "A3",
      "row": 1,
      "column": 3,
      "deck": "lower",
      "type": "sleeper",
      "price": 450000,
      "status": "locked",
      "position": {
        "isWindow": false,
        "isAisle": true
      },
      "lockedUntil": "2025-12-14T12:15:00.000Z"
    },
    {
      "seatNumber": "A4",
      "row": 1,
      "column": 4,
      "deck": "lower",
      "type": "sleeper",
      "price": 450000,
      "status": "selected",
      "position": {
        "isWindow": true,
        "isAisle": false
      }
    }
  ],
  "legend": {
    "available": "Seat can be selected",
    "booked": "Already booked by another user",
    "locked": "Temporarily locked by another user (will expire)",
    "selected": "Currently selected by you in this session"
  }
}
```

**Seat Status Types:**

- `available` - Seat can be selected
- `booked` - Permanently booked (cannot select)
- `locked` - Temporarily locked by another user (expires in 10 min)
- `selected` - Selected by current user

**Frontend Seat Map Component:**

```typescript
interface Seat {
  seatNumber: string;
  status: 'available' | 'booked' | 'locked' | 'selected';
  price: number;
  position: {
    isWindow: boolean;
    isAisle: boolean;
  };
  lockedUntil?: string;
}

const SeatMap: React.FC<{ tripId: string }> = ({ tripId }) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Fetch seat map
  useEffect(() => {
    fetchSeatMap();

    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchSeatMap, 30000);
    return () => clearInterval(interval);
  }, [tripId]);

  const fetchSeatMap = async () => {
    const response = await fetch(`/api/v1/trips/${tripId}/seat-map`);
    const data = await response.json();
    setSeats(data.seats);
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'available') {
      // Select seat
      setSelectedSeats([...selectedSeats, seat.seatNumber]);
      setTotalPrice(totalPrice + seat.price);

      // Update visual status
      setSeats(seats.map(s =>
        s.seatNumber === seat.seatNumber
          ? { ...s, status: 'selected' }
          : s
      ));
    } else if (seat.status === 'selected') {
      // Deselect seat
      setSelectedSeats(selectedSeats.filter(s => s !== seat.seatNumber));
      setTotalPrice(totalPrice - seat.price);

      // Update visual status
      setSeats(seats.map(s =>
        s.seatNumber === seat.seatNumber
          ? { ...s, status: 'available' }
          : s
      ));
    }
    // Cannot click booked or locked seats
  };

  return (
    <div className="seat-map">
      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <span className="seat available"></span>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <span className="seat booked"></span>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <span className="seat locked"></span>
          <span>Locked</span>
        </div>
        <div className="legend-item">
          <span className="seat selected"></span>
          <span>Selected</span>
        </div>
      </div>

      {/* Seat Grid */}
      <div className="seats-grid">
        {seats.map((seat) => (
          <div
            key={seat.seatNumber}
            className={`seat ${seat.status} ${seat.position.isWindow ? 'window' : ''}`}
            onClick={() => handleSeatClick(seat)}
            title={
              seat.status === 'locked'
                ? `Locked until ${new Date(seat.lockedUntil!).toLocaleTimeString()}`
                : `${seat.seatNumber} - ${seat.price.toLocaleString()} VND`
            }
          >
            <span className="seat-number">{seat.seatNumber}</span>
            {seat.status === 'locked' && <span className="lock-icon">🔒</span>}
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      <div className="selection-summary">
        <h3>Your Selection</h3>
        <p>
          <strong>Seats:</strong> {selectedSeats.join(', ') || 'None'}
        </p>
        <p>
          <strong>Total:</strong> {totalPrice.toLocaleString()} VND
        </p>

        <button
          disabled={selectedSeats.length === 0}
          onClick={() => {
            // Proceed to lock seats
            lockSeats(tripId, selectedSeats);
          }}
        >
          Continue to Booking
        </button>
      </div>
    </div>
  );
};
```

---

### 2. Lock Seats (10 Minutes)

Lock selected seats for 10 minutes to reserve them temporarily.

**Endpoint:**

```http
POST /v1/seat-locks/lock
Content-Type: application/json
```

**Request Body:**

```json
{
  "tripId": "64a7f8e1234567890abcdef0",
  "seatNumbers": ["A1", "A4", "B3"],
  "sessionId": "unique-session-id-abc123",
  "metadata": {
    "guestEmail": "guest@example.com",
    "guestPhone": "+84901234567"
  }
}
```

**Parameters:**

- `tripId` (required): Trip ID
- `seatNumbers` (required): Array of seat numbers to lock
- `sessionId` (required): Unique session identifier (generate once per user session)
- `metadata` (optional): For guest users
  - `guestEmail`: Email for seat lock reminder (sent at 8 minutes)
  - `guestPhone`: Phone number (optional)

**Response:**

```json
{
  "lock": {
    "id": "64a7f9e1234567890abcdef0",
    "tripId": "64a7f8e1234567890abcdef0",
    "seatNumbers": ["A1", "A4", "B3"],
    "sessionId": "unique-session-id-abc123",
    "expiresAt": "2025-12-14T12:15:00.000Z",
    "remainingTime": 600
  },
  "message": "Seats locked successfully for 10 minutes"
}
```

**Important Notes:**

- Locks automatically expire after 10 minutes
- If `metadata.guestEmail` is provided, reminder email sent at 8 minutes (2 min before expiration)
- Use the same `sessionId` throughout the booking flow

**Frontend Implementation:**

```typescript
// Generate session ID once per user session
const sessionId = crypto.randomUUID();
localStorage.setItem('bookingSessionId', sessionId);

const lockSeats = async (tripId: string, seatNumbers: string[], guestEmail?: string) => {
  const currentSessionId = localStorage.getItem('bookingSessionId');

  const response = await fetch('/api/v1/seat-locks/lock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include auth token if user is logged in
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    body: JSON.stringify({
      tripId,
      seatNumbers,
      sessionId: currentSessionId,
      // Optional: Guest email for reminder
      ...(guestEmail && {
        metadata: {
          guestEmail: guestEmail,
        },
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();

  // Start countdown timer
  startLockTimer(data.lock.expiresAt);

  return data;
};
```

**Lock Timer Component:**

```typescript
const LockTimer: React.FC<{ expiresAt: string; onExpired: () => void }> = ({
  expiresAt,
  onExpired
}) => {
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

      setTimeLeft(remaining);

      // Warning at 2 minutes
      if (remaining === 120) {
        alert('⚠️ Only 2 minutes left to complete your booking!');
      }

      // Expired
      if (remaining === 0) {
        clearInterval(interval);
        alert('Seat lock expired! Please select seats again.');
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft < 120; // Less than 2 minutes

  return (
    <div className={`lock-timer ${isWarning ? 'warning' : ''}`}>
      <span className="icon">⏱️</span>
      <span className="time">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <span className="label">
        {isWarning ? 'Hurry! Time running out!' : 'Time remaining'}
      </span>
    </div>
  );
};
```

---

### 3. Check Seat Availability

Verify if seats are available before attempting to lock.

**Endpoint:**

```http
POST /v1/seat-locks/check-availability
Content-Type: application/json
```

**Request Body:**

```json
{
  "tripId": "64a7f8e1234567890abcdef0",
  "seatNumbers": ["A1", "A4"]
}
```

**Response (Available):**

```json
{
  "available": true,
  "unavailableSeats": [],
  "details": {
    "A1": "available",
    "A4": "available"
  }
}
```

**Response (Unavailable):**

```json
{
  "available": false,
  "unavailableSeats": ["A4"],
  "details": {
    "A1": "available",
    "A4": "locked"
  }
}
```

---

### 4. Extend Lock Time

Extend seat lock by additional 5 minutes (can be called multiple times).

**Endpoint:**

```http
POST /v1/seat-locks/extend
Content-Type: application/json
```

**Request Body:**

```json
{
  "sessionId": "unique-session-id-abc123"
}
```

**Response:**

```json
{
  "message": "Lock extended successfully",
  "lock": {
    "expiresAt": "2025-12-14T12:20:00.000Z",
    "remainingTime": 900
  }
}
```

---

### 5. Release Locks

Manually release seat locks (optional - they auto-expire after 10 minutes).

**Endpoint:**

```http
POST /v1/seat-locks/release
Content-Type: application/json
```

**Request Body:**

```json
{
  "sessionId": "unique-session-id-abc123"
}
```

**Response:**

```json
{
  "message": "Locks released successfully",
  "seatsReleased": 3
}
```

---

## Email Notifications

All email notifications are sent **automatically** by the backend. No API calls required.

### Overview

The system sends 5 types of automated emails:

1. ✉️ **Booking Confirmation** - Instant
2. ✉️ **Seat Lock Reminder** - 8 minutes after lock (2 min before expiration)
3. ✉️ **24-Hour Reminder** - 24 hours before departure
4. ✉️ **2-Hour Reminder** - 2 hours before departure
5. ✉️ **Cancellation Confirmation** - Instant with refund details

---

### 1. Booking Confirmation Email

**Trigger:** Automatically sent when booking is created  
**Recipients:** Booking owner (`contactEmail` or `guestEmail`)  
**Timing:** Immediate (within seconds)

**Email Contains:**

- ✅ Booking reference number (e.g., BKG-1702561234-ABC123)
- ✅ Complete passenger list with seat numbers
- ✅ Trip details (route, departure/arrival times)
- ✅ Bus and operator information
- ✅ Payment summary
- ✅ QR code for check-in
- ✅ Boarding instructions
- ✅ Cancellation policy
- ✅ Support contact information

**Example:**

```
Subject: Booking Confirmed - BKG-1702561234-ABC123

Dear John Doe,

Your booking has been confirmed! ✅

BOOKING REFERENCE: BKG-1702561234-ABC123

JOURNEY DETAILS
From: Ho Chi Minh City → Da Nang
Date: December 20, 2025
Departure: 8:00 AM | Arrival: 8:00 PM

PASSENGERS & SEATS
- John Doe (Seat A1)
- Jane Doe (Seat A4)

PAYMENT
Total Amount: 900,000 VND
Status: Paid (MoMo)

[QR Code for Check-in]

Arrive 15-20 minutes before departure.
```

**Backend Code Reference:**

```typescript
// Automatically called in booking.service.ts after booking creation
await emailService.sendBookingConfirmation(savedBooking._id);
```

---

### 2. Seat Lock Reminder Email

**Trigger:** Automatically sent by scheduler  
**Recipients:** Users who provided `metadata.guestEmail` when locking seats  
**Timing:** 8 minutes after lock (2 minutes before expiration)

**Email Contains:**

- ⏰ Urgent countdown timer
- 🪑 Reserved seat numbers and trip details
- 💰 Total price
- 🔗 Complete Booking button (deep link)
- 🔄 Extend Lock button (+5 minutes)
- ⚠️ Warning about automatic release

**How to Enable:**

```javascript
// Include guest email when locking seats
await lockSeats(tripId, seats, {
  metadata: {
    guestEmail: 'user@example.com',
  },
});
```

**Example:**

```
Subject: ⏰ Complete Your Booking - 2 Minutes Left!

Your seats are reserved but time is running out!

RESERVED SEATS: A1, A4, B3
ROUTE: Ho Chi Minh → Da Nang
PRICE: 1,350,000 VND

Time Remaining: 2:00

[Complete Booking Now] [Extend Lock +5 min]

If you don't complete your booking, these seats will be released automatically.
```

**Scheduler:** Runs every 30 seconds checking for locks expiring in 2 minutes

---

### 3. 24-Hour Reminder Email

**Trigger:** Automatically sent by scheduler  
**Recipients:** All confirmed bookings departing in 24 hours  
**Timing:** 24 hours (±15 min) before departure

**Email Contains:**

- ⏰ Countdown to departure (24 hours)
- 🎫 Booking reference and details
- 🚌 Bus and operator info
- 📍 Boarding point with map link
- ✅ Pre-departure checklist
- 🔗 Quick actions (view booking, download ticket, cancel)

**Example:**

```
Subject: Reminder: Your Trip Departs in 24 Hours

Hi John,

Your bus journey is tomorrow! 🚌

BOOKING: BKG-1702561234-ABC123
DEPARTURE: Tomorrow at 8:00 AM

PRE-DEPARTURE CHECKLIST:
☐ Pack your bags
☐ Charge your devices
☐ Keep your booking reference handy
☐ Arrive 15-20 minutes early

BOARDING POINT:
Ben Xe Mien Dong, Ho Chi Minh City
[View on Map]

[View Full Booking] [Download Ticket]
```

**Scheduler:** Runs every 15 minutes checking for bookings 24 hours away

---

### 4. 2-Hour Reminder Email

**Trigger:** Automatically sent by scheduler  
**Recipients:** All confirmed bookings departing in 2 hours  
**Timing:** 2 hours (±7.5 min) before departure

**Email Contains:**

- ⚠️ Urgent reminder with countdown (2 hours)
- 🚨 "Prepare to leave now" alert
- 🎫 Booking reference
- 📍 Boarding location
- 🔗 Quick actions

**Example:**

```
Subject: 🚨 Final Reminder: Departure in 2 Hours!

Your bus departs very soon!

DEPARTURE: Today at 8:00 AM (in 2 hours)
BOOKING: BKG-1702561234-ABC123

⚠️ IMPORTANT:
Please arrive at the boarding point NOW.
Recommended arrival: 15-20 minutes before departure.

BOARDING POINT:
Ben Xe Mien Dong, Ho Chi Minh City

Have a safe journey! 🚌
```

**Scheduler:** Runs every 15 minutes checking for bookings 2 hours away

---

### 5. Cancellation Email

**Trigger:** Automatically sent when booking is cancelled  
**Recipients:** Booking owner  
**Timing:** Immediate (within seconds)

**Email Contains:**

- ❌ Cancellation confirmation
- 💰 Refund amount and percentage
- ⏱️ Processing timeline (3-5 business days)
- 📋 Original booking details
- 📝 Cancellation reason
- 📞 Support contact for queries

**Refund Policy (Automatic Calculation):**

| Time Before Departure | Refund % | Example (450,000 VND) |
| --------------------- | -------- | --------------------- |
| > 24 hours            | 90%      | 405,000 VND           |
| 12-24 hours           | 70%      | 315,000 VND           |
| 6-12 hours            | 50%      | 225,000 VND           |
| 2-6 hours             | 25%      | 112,500 VND           |
| < 2 hours             | 0%       | 0 VND                 |

**Example:**

```
Subject: Booking Cancelled - BKG-1702561234-ABC123

Your booking has been cancelled.

BOOKING REFERENCE: BKG-1702561234-ABC123
CANCELLED ON: December 14, 2025 at 12:30 PM

REFUND DETAILS
Original Amount: 900,000 VND
Refund Amount: 810,000 VND (90%)
Reason: Change of plans

Processing Time: 3-5 business days
Payment Method: MoMo (same as original)

ORIGINAL BOOKING
Route: Ho Chi Minh → Da Nang
Date: December 20, 2025
Passengers: John Doe, Jane Doe

Need help? Contact support@busticketing.com
```

**Backend Code Reference:**

```typescript
// Automatically called in booking.service.ts after cancellation
const refund = calculateRefund(booking.totalAmount, hoursUntilDeparture);
await emailService.sendEnhancedBookingCancellation(bookingId, refund.amount, reason);
```

---

### Email Notification Summary Table

| Email Type         | Trigger              | Timing               | Requires Action                          |
| ------------------ | -------------------- | -------------------- | ---------------------------------------- |
| Confirmation       | Booking created      | Instant              | No - Automatic                           |
| Seat Lock Reminder | Lock with guestEmail | 8 min after lock     | Optional - Include email in lock request |
| 24h Reminder       | Scheduled            | 24h before departure | No - Automatic                           |
| 2h Reminder        | Scheduled            | 2h before departure  | No - Automatic                           |
| Cancellation       | Booking cancelled    | Instant              | No - Automatic                           |

---

## Complete Examples

### Example 1: Complete Search & Seat Selection Flow

```typescript
// 1. Search for trips
const searchTrips = async () => {
  const params = new URLSearchParams({
    origin: '64a7f8e1234567890abcdef0',
    destination: '64a7f9e1234567890abcdef0',
    departureDate: '2025-12-20',
    minPrice: '200000',
    maxPrice: '800000',
    busType: 'sleeper',
  });

  const response = await fetch(`/api/v1/trips/search?${params}`);
  const data = await response.json();
  return data.results;
};

// 2. Get seat map for selected trip
const getSeatMap = async (tripId: string) => {
  const response = await fetch(`/api/v1/trips/${tripId}/seat-map`);
  return await response.json();
};

// 3. Lock selected seats
const sessionId = crypto.randomUUID();

const lockSeats = async (tripId: string, seatNumbers: string[], guestEmail?: string) => {
  const response = await fetch('/api/v1/seat-locks/lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tripId,
      seatNumbers,
      sessionId,
      ...(guestEmail && {
        metadata: { guestEmail },
      }),
    }),
  });

  const data = await response.json();

  // Start 10-minute countdown
  startTimer(data.lock.expiresAt);

  return data;
};

// 4. Proceed to booking...
// (Booking APIs not covered in this document - see separate documentation)
```

---

### Example 2: Search Form with All Filters

```tsx
const AdvancedSearchForm: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: '',
    priceMin: 100000,
    priceMax: 1000000,
    timeFrom: '',
    timeTo: '',
    busType: '',
    amenities: [] as string[],
  });

  const handleSearch = async () => {
    const params = new URLSearchParams({
      origin: searchParams.origin,
      destination: searchParams.destination,
      departureDate: searchParams.date,
      minPrice: searchParams.priceMin.toString(),
      maxPrice: searchParams.priceMax.toString(),
      ...(searchParams.timeFrom && {
        departureTimeFrom: searchParams.timeFrom,
      }),
      ...(searchParams.timeTo && {
        departureTimeTo: searchParams.timeTo,
      }),
      ...(searchParams.busType && {
        busType: searchParams.busType,
      }),
      ...(searchParams.amenities.length && {
        amenities: searchParams.amenities.join(','),
      }),
    });

    const response = await fetch(`/api/v1/trips/search?${params}`);
    const results = await response.json();

    // Display results...
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearch();
      }}
    >
      {/* Origin/Destination with Autocomplete */}
      <CityAutocomplete label="From" onSelect={(id) => setSearchParams({ ...searchParams, origin: id })} />
      <CityAutocomplete label="To" onSelect={(id) => setSearchParams({ ...searchParams, destination: id })} />

      {/* Date Picker */}
      <input
        type="date"
        min={new Date().toISOString().split('T')[0]}
        value={searchParams.date}
        onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
      />

      {/* Price Range Slider */}
      <div className="price-range">
        <label>
          Price: {searchParams.priceMin.toLocaleString()} -{searchParams.priceMax.toLocaleString()} VND
        </label>
        <input
          type="range"
          min="100000"
          max="1000000"
          step="50000"
          value={searchParams.priceMax}
          onChange={(e) =>
            setSearchParams({
              ...searchParams,
              priceMax: parseInt(e.target.value),
            })
          }
        />
      </div>

      {/* Time Range */}
      <div className="time-range">
        <input
          type="time"
          placeholder="From"
          value={searchParams.timeFrom}
          onChange={(e) => setSearchParams({ ...searchParams, timeFrom: e.target.value })}
        />
        <input
          type="time"
          placeholder="To"
          value={searchParams.timeTo}
          onChange={(e) => setSearchParams({ ...searchParams, timeTo: e.target.value })}
        />
      </div>

      {/* Bus Type Filter */}
      <select
        value={searchParams.busType}
        onChange={(e) => setSearchParams({ ...searchParams, busType: e.target.value })}
      >
        <option value="">All Bus Types</option>
        <option value="standard">Standard (40-45 seats)</option>
        <option value="limousine">Limousine (20-30 seats)</option>
        <option value="sleeper">Sleeper (30-40 berths)</option>
      </select>

      {/* Amenities Filter */}
      <div className="amenities">
        {['wifi', 'ac', 'charging', 'entertainment'].map((amenity) => (
          <label key={amenity}>
            <input
              type="checkbox"
              checked={searchParams.amenities.includes(amenity)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSearchParams({
                    ...searchParams,
                    amenities: [...searchParams.amenities, amenity],
                  });
                } else {
                  setSearchParams({
                    ...searchParams,
                    amenities: searchParams.amenities.filter((a) => a !== amenity),
                  });
                }
              }}
            />
            {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
          </label>
        ))}
      </div>

      <button type="submit">Search Buses</button>
    </form>
  );
};
```

---

### Example 3: Real-Time Seat Map with Timer

```tsx
const CompleteSeatSelection: React.FC<{ tripId: string }> = ({ tripId }) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lockData, setLockData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Fetch seat map with real-time updates
  useEffect(() => {
    fetchSeatMap();
    const interval = setInterval(fetchSeatMap, 30000);
    return () => clearInterval(interval);
  }, [tripId]);

  const fetchSeatMap = async () => {
    const response = await fetch(`/api/v1/trips/${tripId}/seat-map`);
    const data = await response.json();
    setSeats(data.seats);
  };

  // Lock countdown timer
  useEffect(() => {
    if (!lockData) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(lockData.lock.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));

      setTimeLeft(remaining);

      if (remaining === 120) {
        alert('⚠️ Only 2 minutes left!');
      }

      if (remaining === 0) {
        clearInterval(interval);
        alert('Lock expired! Seats released.');
        setLockData(null);
        setSelectedSeats([]);
        fetchSeatMap(); // Refresh
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockData]);

  const handleSeatClick = (seat: Seat) => {
    if (lockData) return; // Already locked

    if (seat.status === 'available') {
      setSelectedSeats([...selectedSeats, seat.seatNumber]);
    } else if (seat.status === 'selected') {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat.seatNumber));
    }
  };

  const handleLockSeats = async () => {
    const guestEmail = prompt('Enter your email for reminder (optional):');
    const sessionId = crypto.randomUUID();

    const response = await fetch('/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatNumbers: selectedSeats,
        sessionId,
        ...(guestEmail && {
          metadata: { guestEmail },
        }),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setLockData(data);
      alert('Seats locked! Complete booking within 10 minutes.');
    } else {
      const error = await response.json();
      alert(`Failed to lock seats: ${error.message}`);
      fetchSeatMap(); // Refresh to see current status
    }
  };

  return (
    <div className="seat-selection">
      {/* Timer (if locked) */}
      {lockData && (
        <div className={`timer ${timeLeft < 120 ? 'warning' : ''}`}>
          ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* Seat Grid */}
      <div className="seat-grid">
        {seats.map((seat) => (
          <div key={seat.seatNumber} className={`seat ${seat.status}`} onClick={() => handleSeatClick(seat)}>
            {seat.seatNumber}
          </div>
        ))}
      </div>

      {/* Actions */}
      {!lockData && selectedSeats.length > 0 && (
        <button onClick={handleLockSeats}>Lock {selectedSeats.length} Seat(s)</button>
      )}

      {lockData && (
        <button
          onClick={() => {
            /* Proceed to booking */
          }}
        >
          Continue to Payment
        </button>
      )}
    </div>
  );
};
```

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error:**

```json
{
  "code": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "departureDate",
      "message": "Departure date must be today or in the future"
    }
  ]
}
```

**404 Not Found:**

```json
{
  "code": 404,
  "message": "Trip not found"
}
```

**409 Conflict - Seats Unavailable:**

```json
{
  "code": 409,
  "message": "Seats A1, A2 are already locked by another user"
}
```

**500 Internal Server Error:**

```json
{
  "code": 500,
  "message": "Internal server error"
}
```

### Frontend Error Handler

```typescript
const handleApiError = (error: any) => {
  if (!error.response) {
    showToast('Network error. Please check your connection.', 'error');
    return;
  }

  const { code, message, errors } = error.response.data;

  switch (code) {
    case 400:
      // Validation errors
      if (errors) {
        errors.forEach((err: any) => {
          showFieldError(err.field, err.message);
        });
      } else {
        showToast(message, 'error');
      }
      break;

    case 404:
      showToast('Resource not found', 'error');
      break;

    case 409:
      // Seats locked/booked by another user
      showToast(message, 'warning');
      refreshSeatMap(); // Refresh to show current status
      break;

    case 500:
      showToast('Something went wrong. Please try again.', 'error');
      break;

    default:
      showToast(message || 'An error occurred', 'error');
  }
};

// Usage
try {
  await lockSeats(tripId, selectedSeats);
} catch (error) {
  handleApiError(error);
}
```

---

## Additional Resources

**API Documentation:**

- Complete Email API: `docs/EMAIL-NOTIFICATION-API.md`
- Implementation Details: `docs/agent-generated/EMAIL-NOTIFICATION-IMPLEMENTATION.md`
