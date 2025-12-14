# Troubleshooting Guide

**Date:** December 14, 2025  
**Status:** Frontend Implementation Errors

---

## Problem 1: Search Bar & Filters Not Working

### Symptoms

- Search bar in HomePage doesn't return results
- Search bar in SearchPage shows no trips
- All filters (price, time, bus type) have no effect
- Empty results even though trips exist in database

### Root Cause

**FRONTEND PROBLEM - Multiple Issues:**

1. Using wrong city name format (not exact match from database)
2. Not building API query parameters correctly
3. Frontend validation blocking valid searches
4. Using `trip.id` instead of `trip._id` in results

---

### Issue 1.1: City Name Format Mismatch

**Problem:** Frontend searches for "Ha Noi" but database has "Hanoi"

**Backend Database Has:**

```json
{
  "route": {
    "origin": { "city": "Hanoi" }, // ← No space
    "destination": { "city": "Ha Long" }
  }
}
```

**Frontend Searches:**

```
❌ WRONG: origin=Ha+Noi&destination=Nha+Trang
✅ CORRECT: origin=Hanoi&destination=Ha+Long
```

**Solution:**

Use the **EXACT city name** from the autocomplete API response:

```typescript
// ❌ WRONG - Using user-typed text
const handleSearch = () => {
  const origin = originInput.value; // User typed "Ha Noi"
  fetch(`/api/v1/trips/search?origin=${origin}`); // Won't match "Hanoi"
};

// ✅ CORRECT - Using selected city from autocomplete
const [selectedOrigin, setSelectedOrigin] = useState(null);

const handleCitySelect = (city) => {
  setSelectedOrigin(city); // Save the whole object
};

const handleSearch = () => {
  // Use the EXACT city name from API
  const params = new URLSearchParams({
    origin: selectedOrigin.city, // "Hanoi" - exact match
    destination: selectedDest.city, // "Ha Long" - exact match
  });

  fetch(`/api/v1/trips/search?${params}`);
};
```

---

### Issue 1.2: Backend Validation (FIXED)

**Status:** ✅ Backend already fixed - all search fields are now optional

**What Was Changed:**

```typescript
// ✅ Backend now accepts:
- No filters → Returns all trips
- Only origin → Returns trips from that city
- Only destination → Returns trips to that city
- Only date → Returns trips on that date
- Any combination of filters
```

**Frontend Must Remove Strict Validation:**

```typescript
// ❌ REMOVE THIS - Backend no longer requires all fields
const handleSearch = () => {
  if (!origin || !destination || !departureDate) {
    alert('Please fill in all fields');
    return; // DON'T DO THIS!
  }
  // ...
};

// ✅ CORRECT - Allow any combination
const handleSearch = () => {
  const params = new URLSearchParams();

  // Only add fields that are filled
  if (origin) params.append('origin', origin);
  if (destination) params.append('destination', destination);
  if (departureDate) params.append('departureDate', departureDate);

  // Backend will handle empty/partial searches
  fetch(`/api/v1/trips/search?${params}`);
};
```

---

### Issue 1.3: Query Parameters Not Built Correctly

**Problem:** Frontend not using URLSearchParams or encoding values

**Wrong Way:**

```typescript
// ❌ WRONG - String concatenation, no encoding
const url = `/api/v1/trips/search?origin=${origin}&destination=${destination}`;
// Breaks if city has spaces or special characters
```

**Correct Way:**

```typescript
// ✅ CORRECT - Use URLSearchParams
const buildSearchUrl = (filters) => {
  const params = new URLSearchParams();

  // Add only non-empty filters
  if (filters.origin) params.append('origin', filters.origin);
  if (filters.destination) params.append('destination', filters.destination);
  if (filters.departureDate) params.append('departureDate', filters.departureDate);

  // Optional filters
  if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  if (filters.timeFrom) params.append('departureTimeFrom', filters.timeFrom);
  if (filters.timeTo) params.append('departureTimeTo', filters.timeTo);
  if (filters.busType) params.append('busType', filters.busType);

  // Pagination
  params.append('limit', '10');
  params.append('page', '1');

  return `/api/v1/trips/search?${params.toString()}`;
};

// Usage
const url = buildSearchUrl({
  origin: 'Hanoi',
  destination: 'Ha Long',
  departureDate: '2025-12-20',
  busType: 'sleeper',
});

const response = await fetch(`http://localhost:4000${url}`);
```

---

### Issue 1.4: Filter Parameters Wrong Names

**Backend expects these exact parameter names:**

| Frontend Label | Backend Parameter   | Format                   | Example                               |
| -------------- | ------------------- | ------------------------ | ------------------------------------- |
| From           | `origin`            | string (city name)       | `Hanoi`                               |
| To             | `destination`       | string (city name)       | `Ha Long`                             |
| Date           | `departureDate`     | ISO date (YYYY-MM-DD)    | `2025-12-20`                          |
| Min Price      | `minPrice`          | number                   | `200000`                              |
| Max Price      | `maxPrice`          | number                   | `800000`                              |
| Time From      | `departureTimeFrom` | time (HH:mm)             | `06:00`                               |
| Time To        | `departureTimeTo`   | time (HH:mm)             | `18:00`                               |
| Bus Type       | `busType`           | enum                     | `standard`, `limousine`, or `sleeper` |
| Amenities      | `amenities`         | string (comma-separated) | `wifi,ac,charging`                    |

**Wrong Parameter Names:**

```typescript
// ❌ WRONG
params.append('from', origin); // Should be 'origin'
params.append('to', destination); // Should be 'destination'
params.append('date', departureDate); // Should be 'departureDate'
params.append('priceMin', minPrice); // Should be 'minPrice'
params.append('priceMax', maxPrice); // Should be 'maxPrice'
params.append('type', busType); // Should be 'busType'

// ✅ CORRECT
params.append('origin', origin);
params.append('destination', destination);
params.append('departureDate', departureDate);
params.append('minPrice', minPrice);
params.append('maxPrice', maxPrice);
params.append('busType', busType);
```

---

### Issue 1.5: Not Handling Empty Results

**Problem:** When search returns no results, frontend shows blank page

**Solution:**

```typescript
const SearchPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    try {
      const response = await fetch(url);
      const data = await response.json();

      setTrips(data.results || []);

      // Show message if no results
      if (data.results.length === 0) {
        toast.info('No trips found. Try different search criteria.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search trips');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search form */}

      {loading && <div>Loading...</div>}

      {!loading && searched && trips.length === 0 && (
        <div className="no-results">
          <p>No trips found</p>
          <p>Try:</p>
          <ul>
            <li>Different dates</li>
            <li>Different cities</li>
            <li>Removing some filters</li>
          </ul>
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="results">
          {trips.map(trip => (
            <TripCard key={trip._id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### Complete Working Example

```typescript
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

const SearchPage = () => {
  // Form state
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedDest, setSelectedDest] = useState(null);
  const [departureDate, setDepartureDate] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [busType, setBusType] = useState('');

  // Results state
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    try {
      // Build query params
      const params = new URLSearchParams();

      // ✅ Use exact city names from autocomplete
      if (selectedOrigin) params.append('origin', selectedOrigin.city);
      if (selectedDest) params.append('destination', selectedDest.city);
      if (departureDate) params.append('departureDate', departureDate);

      // Optional filters
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (timeFrom) params.append('departureTimeFrom', timeFrom);
      if (timeTo) params.append('departureTimeTo', timeTo);
      if (busType) params.append('busType', busType);

      // Pagination
      params.append('limit', '10');

      console.log('Search URL:', `/api/v1/trips/search?${params.toString()}`);

      const response = await fetch(
        `http://localhost:4000/api/v1/trips/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Search results:', data);

      setTrips(data.results || []);

      if (data.results.length === 0) {
        toast.info('No trips found. Try different search criteria.');
      } else {
        toast.success(`Found ${data.results.length} trips`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page">
      <h1>Search Trips</h1>

      {/* Autocomplete for origin */}
      <CityAutocomplete
        label="From"
        value={selectedOrigin?.city || ''}
        onSelect={(city) => {
          setSelectedOrigin(city);  // Save whole object
          console.log('Selected origin:', city);
        }}
      />

      {/* Autocomplete for destination */}
      <CityAutocomplete
        label="To"
        value={selectedDest?.city || ''}
        onSelect={(city) => {
          setSelectedDest(city);  // Save whole object
          console.log('Selected destination:', city);
        }}
      />

      {/* Date picker */}
      <input
        type="date"
        value={departureDate}
        min={new Date().toISOString().split('T')[0]}
        onChange={(e) => setDepartureDate(e.target.value)}
      />

      {/* Filters */}
      <div className="filters">
        <h3>Filters (Optional)</h3>

        {/* Price range */}
        <div>
          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>

        {/* Time range */}
        <div>
          <input
            type="time"
            value={timeFrom}
            onChange={(e) => setTimeFrom(e.target.value)}
          />
          <span>to</span>
          <input
            type="time"
            value={timeTo}
            onChange={(e) => setTimeTo(e.target.value)}
          />
        </div>

        {/* Bus type */}
        <select
          value={busType}
          onChange={(e) => setBusType(e.target.value)}
        >
          <option value="">All Bus Types</option>
          <option value="standard">Standard (40-45 seats)</option>
          <option value="limousine">Limousine (20-30 seats)</option>
          <option value="sleeper">Sleeper (30-40 berths)</option>
        </select>
      </div>

      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search Trips'}
      </button>

      {/* Results */}
      {loading && <div className="loading">Loading...</div>}

      {!loading && searched && trips.length === 0 && (
        <div className="no-results">
          <p>No trips found</p>
          <p>Try different search criteria</p>
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="results">
          {trips.map((trip) => (
            <div
              key={trip._id}  // ✅ Use _id
              className="trip-card"
              onClick={() => router.push(`/trip-detail/${trip._id}`)}
            >
              <h3>
                {trip.route.origin.city} → {trip.route.destination.city}
              </h3>
              <p>Departure: {new Date(trip.departureTime).toLocaleString()}</p>
              <p>Price: {trip.pricePerSeat.toLocaleString()} VND</p>
              <p>Available: {trip.availableSeats} seats</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
```

---

### Debugging Checklist

**Step 1: Check Network Tab**

1. Open DevTools → Network tab
2. Click Search button
3. Look for `GET /api/v1/trips/search?...`
4. Check the query parameters:
   ```
   ✅ Should see: origin=Hanoi&destination=Ha+Long&departureDate=2025-12-20
   ❌ Not: from=Ha+Noi&to=Nha+Trang&date=2025-12-20
   ```

**Step 2: Check Response**

1. Click on the request in Network tab
2. Check Response tab:

   ```json
   // ✅ Success
   { "results": [...], "totalResults": 5 }

   // ❌ Empty (wrong city names)
   { "results": [], "totalResults": 0 }

   // ❌ Error (wrong parameter names)
   { "code": 400, "message": "Validation error" }
   ```

**Step 3: Add Console Logs**

```typescript
const handleSearch = async () => {
  console.log('=== SEARCH DEBUG ===');
  console.log('Selected Origin:', selectedOrigin);
  console.log('Selected Dest:', selectedDest);
  console.log('Date:', departureDate);

  const params = new URLSearchParams();
  if (selectedOrigin) params.append('origin', selectedOrigin.city);
  if (selectedDest) params.append('destination', selectedDest.city);
  if (departureDate) params.append('departureDate', departureDate);

  const url = `/api/v1/trips/search?${params.toString()}`;
  console.log('API URL:', url);

  const response = await fetch(`http://localhost:4000${url}`);
  console.log('Response Status:', response.status);

  const data = await response.json();
  console.log('Response Data:', data);
  console.log('Results Count:', data.results?.length);
};
```

**Step 4: Test Backend Directly**

```bash
# Test if backend works
curl "http://localhost:4000/api/v1/trips/search?origin=Hanoi&limit=5"

# Should return trips from Hanoi
```

---

### Summary: Search Bar Fixes

**Frontend Must Fix:**

1. ✅ Use `trip._id` (not `trip.id`) for all trip references
2. ✅ Use exact city names from autocomplete API (not user-typed text)
3. ✅ Remove validation requiring all fields to be filled
4. ✅ Use correct parameter names (`origin`, `destination`, `departureDate`)
5. ✅ Use URLSearchParams to build query strings
6. ✅ Handle empty results gracefully
7. ✅ Add proper error handling and user feedback
8. ✅ Log requests/responses for debugging

**Backend Status:**

✅ Already fixed - all search fields are optional  
✅ Accepts any combination of filters  
✅ Returns proper error messages

---

## Problem 2: Trip Cards Show "undefined" IDs

### Error Logs

```
GET /booking/undefined 200 in 40ms
GET /api/v1/trips/undefined 400 - message: "tripId must be a valid mongo id"
```

### Root Cause

**FRONTEND PROBLEM:** Trip cards are using `trip.id` but MongoDB returns `trip._id`.

### Backend Returns

```json
{
  "results": [
    {
      "_id": "693ecdceb1ff96e63a5998ce",  // ← MongoDB uses _id (with underscore)
      "route": { ... },
      "bus": { ... }
    }
  ]
}
```

### Frontend Code Error

```typescript
// ❌ WRONG - Using trip.id (doesn't exist)
<TripCard
  onClick={() => navigate(`/trip-detail/${trip.id}`)}  // trip.id = undefined
/>

// ❌ WRONG - In API call
fetch(`/api/v1/trips/${trip.id}`)  // Sends: /api/v1/trips/undefined
```

### Solution

```typescript
// ✅ CORRECT - Use trip._id (with underscore)
<TripCard
  onClick={() => navigate(`/trip-detail/${trip._id}`)}
/>

// ✅ CORRECT - In API call
fetch(`/api/v1/trips/${trip._id}`)
```

### Complete Fix for Trip Cards

```typescript
// Search Results Component
const SearchResults = ({ trips }) => {
  const router = useRouter();

  return (
    <div className="trip-list">
      {trips.map((trip) => (
        <div
          key={trip._id}  // ✅ Use _id for key
          className="trip-card"
          onClick={() => {
            // ✅ Use _id for navigation
            router.push(`/trip-detail/${trip._id}`);
          }}
        >
          <h3>{trip.route.origin.city} → {trip.route.destination.city}</h3>
          <p>Price: {trip.pricePerSeat} VND</p>
          <p>Available: {trip.availableSeats} seats</p>
          <button>View Details</button>
        </div>
      ))}
    </div>
  );
};
```

### Debugging Checklist

**Step 1:** Add console log in your trip card component:

```typescript
const TripCard = ({ trip }) => {
  console.log('Trip ID:', trip._id); // Should show MongoDB ID
  console.log('Trip.id:', trip.id); // Should show undefined

  // If trip._id is undefined, the problem is in how you're fetching data
  // If trip._id exists but you're using trip.id, that's the bug
};
```

**Step 2:** Check Network tab in DevTools:

- Look at search API response
- Verify trips have `_id` field
- Make sure you're reading `_id`, not `id`

**Step 3:** Search your frontend code for these patterns:

```bash
# Find incorrect usages:
grep -r "trip.id" src/
grep -r "trips.id" src/

# Should be using:
grep -r "trip._id" src/
```

---

## Problem 2: Trip Detail Page 404 Error

### Error

When user clicks on a trip and navigates to:

```
http://localhost:3000/trip-detail/693ecdceb1ff96e63a5998ce
```

The page shows nothing or returns 404 error.

---

## Root Cause

The frontend is calling the **wrong URL**. It's trying to call:

```
❌ WRONG: GET http://localhost:4000/trip-detail/693ecdceb1ff96e63a5998ce
```

This endpoint **does not exist** on the backend. The backend doesn't have a `/trip-detail` route.

---

## The Correct Architecture

### Frontend Route (Next.js Page)

```
URL: http://localhost:3000/trip-detail/693ecdceb1ff96e63a5998ce
Purpose: Display trip details to user
Type: Frontend page route
```

### Backend API (Express Endpoint)

```
URL: http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998ce
Purpose: Fetch trip data from database
Type: Backend API endpoint
```

### How They Connect

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks trip card                                    │
│    Browser navigates to:                                    │
│    http://localhost:3000/trip-detail/693ecdceb1ff96e63a5998ce│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend page component loads                            │
│    - Extracts trip ID from URL: "693ecdceb1ff96e63a5998ce"  │
│    - Makes HTTP request to backend API                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend calls backend API:                              │
│    GET http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998ce│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend returns trip data (JSON)                         │
│    Status: 200 OK                                           │
│    Body: { "_id": "...", "route": {...}, "bus": {...} }    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend renders the data                                │
│    Displays: route, price, seats, departure time, etc.      │
└─────────────────────────────────────────────────────────────┘
```

---

## Solution: Fix Frontend Code

### ✅ Correct Implementation

**File:** `pages/trip-detail/[id].tsx` or `app/trip-detail/[id]/page.tsx`

```typescript
'use client'; // If using Next.js 13+ App Router

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // or 'next/router' for Pages Router

interface Trip {
  _id: string;
  route: {
    origin: { city: string; state: string; landmark: string };
    destination: { city: string; state: string; landmark: string };
    distance: number;
    estimatedDuration: number;
  };
  bus: {
    busNumber: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
  operator: {
    companyName: string;
  };
  departureTime: string;
  arrivalTime: string;
  pricePerSeat: number;
  availableSeats: number;
  status: string;
}

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        console.log('Fetching trip:', tripId);

        // ✅ CORRECT: Call backend API with /api/v1/trips/{id}
        const response = await fetch(
          `http://localhost:4000/api/v1/trips/${tripId}`
        );

        console.log('Response status:', response.status);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Trip not found');
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Trip data:', data);

        setTrip(data);
      } catch (err) {
        console.error('Failed to fetch trip:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trip details');
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      fetchTripDetails();
    }
  }, [tripId]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner">Loading trip details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="not-found">
        <h2>Trip Not Found</h2>
        <p>The trip you're looking for doesn't exist.</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="trip-detail-page">
      <div className="trip-header">
        <h1>
          {trip.route.origin.city} → {trip.route.destination.city}
        </h1>
        <span className={`status ${trip.status}`}>{trip.status}</span>
      </div>

      <div className="trip-content">
        {/* Route Information */}
        <section className="route-info">
          <h2>Route Information</h2>
          <div className="route-details">
            <div className="location">
              <h3>Departure</h3>
              <p className="city">{trip.route.origin.city}, {trip.route.origin.state}</p>
              <p className="landmark">{trip.route.origin.landmark}</p>
              <p className="time">{new Date(trip.departureTime).toLocaleString()}</p>
            </div>

            <div className="journey-info">
              <p>Distance: {trip.route.distance} km</p>
              <p>Duration: {Math.floor(trip.route.estimatedDuration / 60)}h {trip.route.estimatedDuration % 60}m</p>
            </div>

            <div className="location">
              <h3>Arrival</h3>
              <p className="city">{trip.route.destination.city}, {trip.route.destination.state}</p>
              <p className="landmark">{trip.route.destination.landmark}</p>
              <p className="time">{new Date(trip.arrivalTime).toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Bus Information */}
        <section className="bus-info">
          <h2>Bus Information</h2>
          <div className="bus-details">
            <p><strong>Bus Number:</strong> {trip.bus.busNumber}</p>
            <p><strong>Type:</strong> {trip.bus.busType}</p>
            <p><strong>Total Seats:</strong> {trip.bus.totalSeats}</p>
            <p><strong>Available:</strong> {trip.availableSeats} seats</p>
            <div className="amenities">
              <strong>Amenities:</strong>
              <ul>
                {trip.bus.amenities.map(amenity => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Operator */}
        <section className="operator-info">
          <h2>Operator</h2>
          <p>{trip.operator.companyName}</p>
        </section>

        {/* Pricing */}
        <section className="pricing">
          <h2>Price</h2>
          <p className="price">{trip.pricePerSeat.toLocaleString()} VND per seat</p>
        </section>

        {/* Actions */}
        <div className="actions">
          <button
            className="btn-primary"
            onClick={() => {
              // Navigate to seat selection
              window.location.href = `/seat-selection/${trip._id}`;
            }}
            disabled={trip.availableSeats === 0}
          >
            {trip.availableSeats > 0 ? 'Select Seats' : 'Sold Out'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => window.history.back()}
          >
            Back to Search
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Debugging Checklist

### ✅ Step 1: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Click on a trip to view details
4. Look for the API request

**What you should see:**

```
✅ Request URL: http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998ce
✅ Request Method: GET
✅ Status Code: 200 OK
✅ Response: JSON object with trip data
```

**What indicates the problem:**

```
❌ Request URL: http://localhost:4000/trip-detail/693ecdceb1ff96e63a5998ce
❌ Status Code: 404 Not Found
❌ Response: Cannot GET /trip-detail/...
```

### ✅ Step 2: Check Console Logs

Add console logs to your frontend code:

```typescript
useEffect(() => {
  const fetchTripDetails = async () => {
    console.log('=== FETCHING TRIP ===');
    console.log('Trip ID:', tripId);
    console.log('API URL:', `http://localhost:4000/api/v1/trips/${tripId}`);

    const response = await fetch(`http://localhost:4000/api/v1/trips/${tripId}`);

    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);

    const data = await response.json();
    console.log('Trip Data:', data);
  };

  fetchTripDetails();
}, [tripId]);
```

### ✅ Step 3: Test Backend API Directly

Open a new terminal and test the backend API:

```bash
# Test with a valid trip ID
curl http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998ce
```

**Expected result:**

```json
{
  "_id": "693ecdceb1ff96e63a5998ce",
  "route": {
    "origin": { "city": "Hanoi", ... },
    "destination": { "city": "Ha Long", ... }
  },
  "bus": { ... },
  "pricePerSeat": 250000,
  ...
}
```

**If you get 404:**

- The trip ID doesn't exist in database
- Use a valid trip ID from search results

---

## Common Mistakes

### ❌ Mistake 1: Calling Frontend Route Instead of API

```typescript
// WRONG - This is calling the frontend route
const response = await fetch(`http://localhost:4000/trip-detail/${tripId}`);

// CORRECT - This calls the backend API
const response = await fetch(`http://localhost:4000/api/v1/trips/${tripId}`);
```

### ❌ Mistake 2: Missing /api/v1 Prefix

```typescript
// WRONG - Missing /api/v1
const response = await fetch(`http://localhost:4000/trips/${tripId}`);

// CORRECT
const response = await fetch(`http://localhost:4000/api/v1/trips/${tripId}`);
```

### ❌ Mistake 3: Using Wrong Trip ID

```typescript
// Make sure you're using the _id field from search results
const trips = searchResults.results;

trips.map(trip => (
  <div onClick={() => navigate(`/trip-detail/${trip._id}`)}>
    {/* Use trip._id, not trip.id */}
  </div>
));
```

### ❌ Mistake 4: Not Handling Errors

```typescript
// WRONG - No error handling
const data = await fetch(url).then((r) => r.json());

// CORRECT - Proper error handling
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}
const data = await response.json();
```

---

## Backend API Reference

### Get Single Trip

**Endpoint:** `GET /api/v1/trips/{tripId}`

**Parameters:**

- `tripId` (path parameter) - MongoDB ObjectId (24 hex characters)

**Response (Success):**

```json
{
  "_id": "693ecdceb1ff96e63a5998ce",
  "stats": {
    "totalBookings": 0,
    "totalRevenue": 0,
    "occupancyRate": 0
  },
  "bus": {
    "seatMap": { "seats": [...] },
    "busNumber": "HL-001",
    "busType": "sleeper",
    "totalSeats": 36,
    "amenities": ["wifi", "ac", "entertainment", "blanket"]
  },
  "route": {
    "routeName": "Hanoi to Ha Long",
    "origin": {
      "city": "Hanoi",
      "state": "Hanoi",
      "landmark": "My Dinh Bus Station"
    },
    "destination": {
      "city": "Ha Long",
      "state": "Quang Ninh",
      "landmark": "Ha Long Bus Station"
    },
    "distance": 165,
    "estimatedDuration": 240
  },
  "operator": "69270b4056db7d2ba457f1a9",
  "departureTime": "2025-12-14T09:00:00.000Z",
  "arrivalTime": "2025-12-14T13:00:00.000Z",
  "pricePerSeat": 250000,
  "seatPricing": {},
  "availableSeats": 36,
  "bookedSeats": [],
  "seatStatus": {},
  "status": "scheduled"
}
```

**Response (Not Found):**

```json
{
  "code": 404,
  "message": "Trip not found"
}
```

---

## Testing Checklist

After fixing your frontend code:

- [ ] Open DevTools Network tab
- [ ] Click on a trip from search results
- [ ] Verify you see `GET /api/v1/trips/{id}` request (not `/trip-detail/{id}`)
- [ ] Verify response status is 200 OK
- [ ] Verify trip details are displayed correctly
- [ ] Test with multiple different trips
- [ ] Test with invalid trip ID (should show error message)
- [ ] Check console for any errors

---

## Summary

**Problem:** Frontend calling wrong URL  
**Root Cause:** Confusion between frontend routes and backend APIs  
**Solution:** Frontend pages should call backend APIs at `/api/v1/trips/{id}`

**Remember:**

- `/trip-detail/{id}` = Frontend page route (user navigation)
- `/api/v1/trips/{id}` = Backend API endpoint (data fetching)
- Frontend pages make HTTP requests to backend APIs to get data

---

**Need More Help?**

Check these files for complete examples:

- [docs/FRONTEND-INTEGRATION-GUIDE.md](FRONTEND-INTEGRATION-GUIDE.md) - Complete API documentation
- [docs/FRONTEND-SEARCH-IMPLEMENTATION-GUIDE.md](FRONTEND-SEARCH-IMPLEMENTATION-GUIDE.md) - Search implementation guide
