# Frontend API Integration Guide

## Bus Ticket Booking System - Search & Filter APIs

This guide provides comprehensive documentation for frontend developers to integrate the trip search, filter, and location autocomplete features.

---

## Table of Contents

1. [City Autocomplete API](#1-city-autocomplete-api)
2. [Trip Search API](#2-trip-search-api)
3. [Advanced Filters](#3-advanced-filters)
4. [Popular Locations & Routes](#4-popular-locations--routes)
5. [Error Handling](#5-error-handling)
6. [Integration Examples](#6-integration-examples)

---

## 1. City Autocomplete API

### Endpoint

```
GET /v1/locations/search
```

### Description

Provides real-time city and state suggestions for origin/destination input fields. Supports fuzzy matching and returns results sorted by relevance.

### Query Parameters

| Parameter | Type   | Required | Default | Description                                    |
| --------- | ------ | -------- | ------- | ---------------------------------------------- |
| `q`       | string | Yes      | -       | Search query (min 2 characters)                |
| `type`    | string | No       | `all`   | Filter type: `origin`, `destination`, or `all` |
| `limit`   | number | No       | 10      | Max results (1-20)                             |

### Request Example

```bash
GET /v1/locations/search?q=Ho&type=all&limit=10
```

### Response Example

```json
{
  "success": true,
  "data": [
    {
      "city": "Ho Chi Minh City",
      "state": "Ho Chi Minh",
      "displayName": "Ho Chi Minh City, Ho Chi Minh",
      "type": "both"
    },
    {
      "city": "Hoi An",
      "state": "Quang Nam",
      "displayName": "Hoi An, Quang Nam",
      "type": "destination"
    },
    {
      "city": "Hoa Binh",
      "state": "Hoa Binh",
      "displayName": "Hoa Binh, Hoa Binh",
      "type": "origin"
    }
  ]
}
```

### Response Fields

| Field         | Type   | Description                                       |
| ------------- | ------ | ------------------------------------------------- |
| `city`        | string | City name                                         |
| `state`       | string | State/province name                               |
| `displayName` | string | Formatted display string (City, State)            |
| `type`        | string | Location type: `origin`, `destination`, or `both` |

### UI Integration Tips

```javascript
// Debounce autocomplete requests (300ms recommended)
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

// Example: React autocomplete
const searchLocations = debounce(async (query) => {
  if (query.length < 2) return;

  const response = await fetch(`/v1/locations/search?q=${encodeURIComponent(query)}&limit=10`);
  const data = await response.json();
  setOptions(data);
}, 300);
```

---

## 2. Trip Search API

### Endpoint

```
GET /v1/trips/search
```

### Description

Search for available trips based on origin, destination, and date. Returns paginated results with full trip details including bus, route, and operator information.

### Core Query Parameters

| Parameter       | Type   | Required | Description                           | Example            |
| --------------- | ------ | -------- | ------------------------------------- | ------------------ |
| `origin`        | string | No       | Origin city (min 2 chars)             | `Ho Chi Minh City` |
| `destination`   | string | No       | Destination city (min 2 chars)        | `Da Nang`          |
| `departureDate` | string | No       | Departure date (ISO 8601: YYYY-MM-DD) | `2025-12-20`       |

### Request Example (Basic Search)

```bash
GET /v1/trips/search?origin=Ho%20Chi%20Minh%20City&destination=Da%20Nang&departureDate=2025-12-20
```

### Response Example

```json
{
  "results": [
    {
      "_id": "6759abc123def456789",
      "departureTime": "2025-12-20T08:00:00.000Z",
      "arrivalTime": "2025-12-20T20:30:00.000Z",
      "pricePerSeat": 250000,
      "availableSeats": 28,
      "availableSeatsCount": 28,
      "status": "scheduled",
      "route": {
        "id": "6759abc987654321",
        "routeName": "HCM - Da Nang Express",
        "origin": {
          "city": "Ho Chi Minh City",
          "state": "Ho Chi Minh",
          "landmark": "Eastern Bus Station"
        },
        "destination": {
          "city": "Da Nang",
          "state": "Da Nang",
          "landmark": "Central Bus Terminal"
        },
        "distance": 935,
        "estimatedDuration": 750
      },
      "bus": {
        "id": "6759xyz123456789",
        "busNumber": "HCM-DN-001",
        "busType": "sleeper",
        "amenities": ["wifi", "ac", "charging", "water", "blanket"],
        "totalSeats": 40
      },
      "operator": {
        "id": "6759op123456789",
        "companyName": "Phuong Trang Express",
        "logoUrl": "https://example.com/logos/pt.png",
        "rating": {
          "overall": 4.5,
          "totalReviews": 1250
        }
      }
    }
    // ... more trips
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 48
}
```

### Response Fields

| Field                     | Type     | Description                                  |
| ------------------------- | -------- | -------------------------------------------- |
| `_id`                     | string   | Trip ID                                      |
| `departureTime`           | string   | ISO 8601 departure timestamp                 |
| `arrivalTime`             | string   | ISO 8601 arrival timestamp                   |
| `pricePerSeat`            | number   | Base price per seat (VND)                    |
| `availableSeats`          | number   | Number of available seats                    |
| `availableSeatsCount`     | number   | Computed available seats (total - booked)    |
| `status`                  | string   | Trip status: `scheduled`, `in_progress`, etc |
| `route.distance`          | number   | Distance in kilometers                       |
| `route.estimatedDuration` | number   | Duration in minutes                          |
| `bus.amenities`           | string[] | List of available amenities                  |
| `operator.rating.overall` | number   | Average rating (0-5)                         |

---

## 3. Advanced Filters

### Filter by Price Range

```bash
GET /v1/trips/search?origin=Hanoi&destination=Hai%20Phong&minPrice=150000&maxPrice=300000
```

| Parameter  | Type   | Description                    |
| ---------- | ------ | ------------------------------ |
| `minPrice` | number | Minimum price (VND, >= 0)      |
| `maxPrice` | number | Maximum price (must be >= min) |

### Filter by Departure Time

Search trips departing within a specific time window (e.g., morning, afternoon).

```bash
GET /v1/trips/search?departureDate=2025-12-20&departureTimeFrom=06:00&departureTimeTo=12:00
```

| Parameter           | Type   | Format  | Description                     |
| ------------------- | ------ | ------- | ------------------------------- |
| `departureTimeFrom` | string | `HH:mm` | Start of time window            |
| `departureTimeTo`   | string | `HH:mm` | End of time window (after from) |

**Valid Time Ranges:**

- Morning: `06:00` - `12:00`
- Afternoon: `12:00` - `18:00`
- Evening: `18:00` - `23:59`

### Filter by Bus Type

```bash
GET /v1/trips/search?busType=sleeper
```

| Parameter | Type   | Values                             |
| --------- | ------ | ---------------------------------- |
| `busType` | string | `standard`, `limousine`, `sleeper` |

**Bus Type Descriptions:**

- **standard**: Regular seating bus (40-45 seats)
- **limousine**: Premium comfort with reclining seats (20-28 seats)
- **sleeper**: Bed-style sleeper bus (20-30 berths)

### Filter by Amenities

Filter trips with specific amenities (can pass multiple).

```bash
# Single amenity
GET /v1/trips/search?amenities=wifi

# Multiple amenities (comma-separated or multiple params)
GET /v1/trips/search?amenities=wifi&amenities=ac&amenities=water
```

| Parameter   | Type         | Description                          |
| ----------- | ------------ | ------------------------------------ |
| `amenities` | string/array | Filter by amenities (ALL must match) |

**Common Amenities:**

- `wifi` - WiFi
- `ac` - Air Conditioning
- `charging` - USB Charging Ports
- `water` - Complimentary Water
- `blanket` - Blankets Provided
- `entertainment` - Entertainment System
- `toilet` - Onboard Toilet

### Filter by Operator

```bash
GET /v1/trips/search?operatorId=6759op123456789
```

### Filter by Minimum Available Seats

Useful for group bookings.

```bash
GET /v1/trips/search?minAvailableSeats=10
```

| Parameter           | Type   | Description                    |
| ------------------- | ------ | ------------------------------ |
| `minAvailableSeats` | number | Minimum available seats (>= 1) |

### Combined Filters Example

```bash
GET /v1/trips/search?
  origin=Ho%20Chi%20Minh%20City&
  destination=Da%20Nang&
  departureDate=2025-12-20&
  departureTimeFrom=06:00&
  departureTimeTo=12:00&
  minPrice=200000&
  maxPrice=350000&
  busType=sleeper&
  amenities=wifi&
  amenities=ac&
  minAvailableSeats=4&
  sortBy=price&
  sortOrder=asc&
  page=1&
  limit=10
```

---

## 4. Sorting & Pagination

### Sorting

| Parameter   | Type   | Values                                                 | Default         |
| ----------- | ------ | ------------------------------------------------------ | --------------- |
| `sortBy`    | string | `price`, `departureTime`, `duration`, `availableSeats` | `departureTime` |
| `sortOrder` | string | `asc`, `desc`                                          | `asc`           |

**Sorting Examples:**

```bash
# Cheapest first
GET /v1/trips/search?sortBy=price&sortOrder=asc

# Earliest departure
GET /v1/trips/search?sortBy=departureTime&sortOrder=asc

# Most available seats
GET /v1/trips/search?sortBy=availableSeats&sortOrder=desc

# Shortest duration
GET /v1/trips/search?sortBy=duration&sortOrder=asc
```

### Pagination

| Parameter | Type   | Default | Max | Description        |
| --------- | ------ | ------- | --- | ------------------ |
| `page`    | number | 1       | -   | Page number (>= 1) |
| `limit`   | number | 10      | 50  | Results per page   |

**Pagination Response:**

```json
{
  "results": [...],
  "page": 2,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 48
}
```

**Frontend Pagination Example:**

```javascript
const loadPage = async (pageNum) => {
  const response = await fetch(`/v1/trips/search?${queryParams}&page=${pageNum}&limit=10`);
  const data = await response.json();

  // Show pagination UI
  setPagination({
    current: data.page,
    total: data.totalPages,
    hasNext: data.page < data.totalPages,
    hasPrev: data.page > 1,
  });
};
```

---

## 5. Popular Locations & Routes

### Get Popular Locations

```
GET /v1/locations/popular?limit=10
```

Returns frequently searched cities based on historical search data.

**Response:**

```json
[
  {
    "name": "Ho Chi Minh City",
    "searchCount": 15420
  },
  {
    "name": "Hanoi",
    "searchCount": 12350
  }
  // ...
]
```

### Get Popular Routes

```
GET /v1/locations/popular-routes?limit=10
```

Returns most booked routes.

**Response:**

```json
[
  {
    "id": "6759route123",
    "routeName": "HCM - Da Nang Express",
    "origin": "Ho Chi Minh City",
    "destination": "Da Nang",
    "totalBookings": 3450
  }
  // ...
]
```

**Use Case:** Display popular destinations on homepage.

---

## 6. Error Handling

### Common HTTP Status Codes

| Code | Meaning               | Description                                |
| ---- | --------------------- | ------------------------------------------ |
| 200  | OK                    | Request successful                         |
| 400  | Bad Request           | Invalid parameters (see validation errors) |
| 401  | Unauthorized          | Authentication required                    |
| 404  | Not Found             | Resource not found                         |
| 429  | Too Many Requests     | Rate limit exceeded                        |
| 500  | Internal Server Error | Server error                               |

### Error Response Format

```json
{
  "code": 400,
  "message": "Validation Error",
  "errors": [
    {
      "field": "departureDate",
      "message": "Departure date cannot be in the past"
    },
    {
      "field": "minPrice",
      "message": "Minimum price cannot be negative"
    }
  ]
}
```

### Validation Errors

**Common Validation Messages:**

| Field               | Error                                                   |
| ------------------- | ------------------------------------------------------- |
| `origin`            | Origin must be at least 2 characters                    |
| `destination`       | Destination must be at least 2 characters               |
| `departureDate`     | Departure date cannot be in the past                    |
| `departureDate`     | Invalid date format. Use ISO 8601 format (YYYY-MM-DD)   |
| `minPrice`          | Minimum price cannot be negative                        |
| `maxPrice`          | Maximum price must be greater than minimum price        |
| `departureTimeFrom` | departureTimeFrom must be in HH:mm format (e.g., 09:30) |
| `departureTimeTo`   | departureTimeTo must be after departureTimeFrom         |
| `busType`           | Bus type must be one of: standard, limousine, sleeper   |
| `minAvailableSeats` | Minimum available seats must be at least 1              |

---

## 7. Integration Examples

### Example 1: Simple Search Form

```javascript
// React Example
import { useState } from 'react';

function SearchForm() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams({
        origin,
        destination,
        departureDate: date,
        sortBy: 'departureTime',
        sortOrder: 'asc',
      });

      const response = await fetch(`/v1/trips/search?${params}`);
      const data = await response.json();

      setResults(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch}>
      <input type="text" placeholder="From" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
      <input
        type="text"
        placeholder="To"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={new Date().toISOString().split('T')[0]}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Searching...' : 'Search Trips'}
      </button>
    </form>
  );
}
```

### Example 2: Autocomplete with Debouncing

```javascript
// React Autocomplete Component
import { useState, useEffect } from 'react';

function LocationAutocomplete({ value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/v1/locations/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Autocomplete failed:', error);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (location) => {
    setQuery(location.displayName);
    onChange(location.city);
    setShowDropdown(false);
  };

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((loc, idx) => (
            <li key={idx} onClick={() => handleSelect(loc)}>
              <strong>{loc.city}</strong>, {loc.state}
              <span className="type-badge">{loc.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Example 3: Filter Panel

```javascript
// React Filter Component
function FilterPanel({ filters, setFilters, onApply }) {
  const busTypes = ['standard', 'limousine', 'sleeper'];
  const amenities = ['wifi', 'ac', 'charging', 'water', 'blanket'];

  const timeRanges = [
    { label: 'Morning (6AM - 12PM)', from: '06:00', to: '12:00' },
    { label: 'Afternoon (12PM - 6PM)', from: '12:00', to: '18:00' },
    { label: 'Evening (6PM - 12AM)', from: '18:00', to: '23:59' },
  ];

  return (
    <div className="filter-panel">
      {/* Price Range */}
      <div className="filter-group">
        <h3>Price Range</h3>
        <input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice || ''}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice || ''}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
      </div>

      {/* Time Range */}
      <div className="filter-group">
        <h3>Departure Time</h3>
        {timeRanges.map((range) => (
          <label key={range.label}>
            <input
              type="radio"
              name="timeRange"
              onChange={() =>
                setFilters({
                  ...filters,
                  departureTimeFrom: range.from,
                  departureTimeTo: range.to,
                })
              }
            />
            {range.label}
          </label>
        ))}
      </div>

      {/* Bus Type */}
      <div className="filter-group">
        <h3>Bus Type</h3>
        {busTypes.map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="busType"
              value={type}
              checked={filters.busType === type}
              onChange={(e) => setFilters({ ...filters, busType: e.target.value })}
            />
            {type}
          </label>
        ))}
      </div>

      {/* Amenities */}
      <div className="filter-group">
        <h3>Amenities</h3>
        {amenities.map((amenity) => (
          <label key={amenity}>
            <input
              type="checkbox"
              checked={filters.amenities?.includes(amenity)}
              onChange={(e) => {
                const current = filters.amenities || [];
                const updated = e.target.checked ? [...current, amenity] : current.filter((a) => a !== amenity);
                setFilters({ ...filters, amenities: updated });
              }}
            />
            {amenity}
          </label>
        ))}
      </div>

      <button onClick={onApply}>Apply Filters</button>
    </div>
  );
}
```

### Example 4: Complete Search with Filters

```javascript
function TripSearchPage() {
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    departureDate: '',
  });

  const [filters, setFilters] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const performSearch = async (page = 1) => {
    setLoading(true);

    const params = new URLSearchParams({
      ...searchParams,
      ...filters,
      page,
      limit: 10,
      sortBy: filters.sortBy || 'departureTime',
      sortOrder: filters.sortOrder || 'asc',
    });

    // Remove empty values
    for (let [key, value] of params.entries()) {
      if (!value || value === 'undefined') {
        params.delete(key);
      }
    }

    try {
      const response = await fetch(`/v1/trips/search?${params}`);

      if (!response.ok) {
        const error = await response.json();
        alert(error.message);
        return;
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page">
      <SearchForm params={searchParams} setParams={setSearchParams} onSubmit={() => performSearch(1)} />

      <div className="results-container">
        <FilterPanel filters={filters} setFilters={setFilters} onApply={() => performSearch(1)} />

        <div className="results">
          {loading && <div>Loading...</div>}

          {results && (
            <>
              <div className="results-header">
                <h2>Found {results.totalResults} trips</h2>
                <SortDropdown value={filters.sortBy} onChange={(sortBy) => setFilters({ ...filters, sortBy })} />
              </div>

              <TripList trips={results.results} />

              <Pagination current={results.page} total={results.totalPages} onChange={performSearch} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. **Performance Optimization**

- Debounce autocomplete requests (300ms)
- Cache popular locations/routes
- Use pagination to limit results
- Implement infinite scroll for mobile

### 2. **User Experience**

- Show loading states during searches
- Display filter count badges
- Allow clearing individual filters
- Show "no results" state with suggestions
- Highlight matching text in autocomplete

### 3. **Error Handling**

- Display validation errors inline
- Provide helpful error messages
- Implement retry logic for network failures
- Show fallback UI on errors

### 4. **Accessibility**

- Use semantic HTML
- Add ARIA labels for screen readers
- Ensure keyboard navigation works
- Provide focus indicators

### 5. **Mobile Considerations**

- Use native date pickers
- Implement touch-friendly filter toggles
- Consider bottom sheets for filters
- Optimize for slower networks

---

## API Rate Limits

- **Anonymous users**: 100 requests per 15 minutes
- **Authenticated users**: 500 requests per 15 minutes

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703001234
```

---

## Support & Resources

- **Swagger Documentation**: `/api-docs`
- **API Base URL (Development)**: `http://localhost:3000/v1`
- **API Base URL (Production)**: `https://api.yourdomain.com/v1`

For questions or issues, contact the backend team.

---

**Last Updated**: December 14, 2025
**API Version**: v1
