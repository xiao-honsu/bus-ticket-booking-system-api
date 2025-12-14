# API Testing Guide - Search & Filter Features

Use this guide to test the implemented search, filter, and autocomplete features.

---

## Prerequisites

1. **Server Running**: `npm run dev` (port 3000)
2. **Database Seeded**: Ensure you have route and trip data
3. **Testing Tool**: Use cURL, Postman, or browser

---

## Test Suite

### ✅ Test 1: City Autocomplete (Basic)

**Purpose:** Verify location search returns results

```bash
curl "http://localhost:3000/v1/locations/search?q=Ho"
```

**Expected Response:**

```json
[
  {
    "city": "Ho Chi Minh City",
    "state": "Ho Chi Minh",
    "displayName": "Ho Chi Minh City, Ho Chi Minh",
    "type": "both"
  }
]
```

**Validation:**

- ✅ Returns array of locations
- ✅ Each has `city`, `state`, `displayName`, `type`
- ✅ Results sorted by relevance

---

### ✅ Test 2: City Autocomplete (Type Filter)

**Purpose:** Filter by origin/destination

```bash
# Only origins
curl "http://localhost:3000/v1/locations/search?q=Ha&type=origin"

# Only destinations
curl "http://localhost:3000/v1/locations/search?q=Ha&type=destination"
```

**Validation:**

- ✅ Origin filter returns only origins
- ✅ Destination filter returns only destinations
- ✅ Type field reflects filter

---

### ✅ Test 3: Autocomplete (Empty/Short Query)

**Purpose:** Verify validation and edge cases

```bash
# Empty query (should fail)
curl "http://localhost:3000/v1/locations/search?q="

# Single character (should work but may return few results)
curl "http://localhost:3000/v1/locations/search?q=H"
```

**Expected:**

- ✅ Empty query returns 400 error or empty array
- ✅ Single char works if data matches

---

### ✅ Test 4: Trip Search (Basic)

**Purpose:** Search trips with date

```bash
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20"
```

**Expected Response:**

```json
{
  "results": [
    {
      "_id": "...",
      "departureTime": "2025-12-20T08:00:00.000Z",
      "arrivalTime": "2025-12-20T20:30:00.000Z",
      "pricePerSeat": 250000,
      "availableSeats": 28,
      "status": "scheduled",
      "route": { ... },
      "bus": { ... },
      "operator": { ... }
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "totalResults": 15
}
```

**Validation:**

- ✅ Returns trips array
- ✅ Pagination metadata included
- ✅ Each trip has route, bus, operator populated

---

### ✅ Test 5: Price Range Filter

**Purpose:** Filter by price

```bash
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&minPrice=200000&maxPrice=400000"
```

**Validation:**

- ✅ All results have `pricePerSeat` between 200000 and 400000
- ✅ Results sorted by departure time (default)

---

### ✅ Test 6: Time Range Filter

**Purpose:** Filter by departure time

```bash
# Morning trips (6AM - 12PM)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&departureTimeFrom=06:00&departureTimeTo=12:00"

# Afternoon trips (12PM - 6PM)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&departureTimeFrom=12:00&departureTimeTo=18:00"
```

**Validation:**

- ✅ Departure times fall within specified range
- ✅ Times checked against local departure time

---

### ✅ Test 7: Bus Type Filter

**Purpose:** Filter by bus type

```bash
# Sleeper buses only
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&busType=sleeper"

# Limousine buses only
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&busType=limousine"
```

**Validation:**

- ✅ All results have matching `bus.busType`
- ✅ Only valid bus types accepted (standard, limousine, sleeper)

---

### ✅ Test 8: Amenities Filter

**Purpose:** Filter by amenities

```bash
# Single amenity
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&amenities=wifi"

# Multiple amenities
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&amenities=wifi&amenities=ac"
```

**Validation:**

- ✅ All results have requested amenities in `bus.amenities` array
- ✅ Multiple amenities work as AND condition

---

### ✅ Test 9: Minimum Available Seats

**Purpose:** Filter by seat availability (NEW)

```bash
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&minAvailableSeats=10"
```

**Validation:**

- ✅ All results have `availableSeatsCount >= 10`
- ✅ Useful for group bookings

---

### ✅ Test 10: Combined Filters

**Purpose:** Test multiple filters together

```bash
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&minPrice=200000&maxPrice=400000&departureTimeFrom=06:00&departureTimeTo=12:00&busType=sleeper&amenities=wifi&minAvailableSeats=4"
```

**Validation:**

- ✅ Results match ALL filter criteria
- ✅ Price in range
- ✅ Time in range
- ✅ Correct bus type
- ✅ Has amenities
- ✅ Minimum seats available

---

### ✅ Test 11: Sorting

**Purpose:** Test sort functionality

```bash
# Sort by price (cheapest first)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&sortBy=price&sortOrder=asc"

# Sort by departure time (earliest first)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&sortBy=departureTime&sortOrder=asc"

# Sort by available seats (most available first)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&sortBy=availableSeats&sortOrder=desc"

# Sort by duration (shortest first)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&sortBy=duration&sortOrder=asc"
```

**Validation:**

- ✅ Results sorted correctly
- ✅ Ascending/descending works properly

---

### ✅ Test 12: Pagination

**Purpose:** Test pagination

```bash
# Page 1
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&page=1&limit=5"

# Page 2
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&page=2&limit=5"
```

**Validation:**

- ✅ Correct number of results per page
- ✅ `totalResults` consistent across pages
- ✅ `totalPages` calculated correctly
- ✅ Page 2 shows different results

---

### ✅ Test 13: Popular Locations

**Purpose:** Get popular destinations

```bash
curl "http://localhost:3000/v1/locations/popular?limit=10"
```

**Expected Response:**

```json
[
  {
    "name": "Ho Chi Minh City",
    "searchCount": 1520
  },
  {
    "name": "Hanoi",
    "searchCount": 1230
  }
]
```

**Validation:**

- ✅ Returns locations sorted by search count
- ✅ Limit parameter works

---

### ✅ Test 14: Popular Routes

**Purpose:** Get most booked routes

```bash
curl "http://localhost:3000/v1/locations/popular-routes?limit=10"
```

**Expected Response:**

```json
[
  {
    "id": "...",
    "routeName": "HCM - Da Nang",
    "origin": "Ho Chi Minh City",
    "destination": "Da Nang",
    "totalBookings": 3450
  }
]
```

**Validation:**

- ✅ Returns routes sorted by booking count
- ✅ Includes origin and destination

---

### ✅ Test 15: Validation Errors

**Purpose:** Test validation

```bash
# Past date (should fail)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2020-01-01"

# Invalid date format
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=invalid"

# Invalid time format
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&departureTimeFrom=25:00"

# Invalid bus type
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&busType=invalid"

# Max price less than min price
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&minPrice=500000&maxPrice=200000"
```

**Expected:**

- ✅ Returns 400 Bad Request
- ✅ Clear validation error message
- ✅ Field name indicated

---

### ✅ Test 16: Edge Cases

**Purpose:** Test edge cases

```bash
# No results
curl "http://localhost:3000/v1/trips/search?origin=NonExistentCity&destination=AnotherNonExistent&departureDate=2025-12-20"

# Very restrictive filters (may return no results)
curl "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20&minPrice=1000000&maxPrice=1000001"
```

**Expected:**

- ✅ Returns empty results array
- ✅ `totalResults: 0`
- ✅ No errors thrown

---

## Postman Collection

Import the included `postman_collection.json` for easy testing.

**Collection includes:**

- All autocomplete variations
- All search and filter combinations
- Validation error tests
- Edge case tests

---

## Browser Testing

### Test Autocomplete in Browser Console

```javascript
// Open browser dev tools on http://localhost:3000
fetch('/v1/locations/search?q=Ho')
  .then((r) => r.json())
  .then(console.log);
```

### Test Search

```javascript
fetch('/v1/trips/search?origin=Ho Chi Minh&destination=Da Nang&departureDate=2025-12-20')
  .then((r) => r.json())
  .then(console.log);
```

---

## Test Checklist

Copy this to track your testing progress:

**Autocomplete:**

- [ ] Basic search returns results
- [ ] Type filter (origin/destination) works
- [ ] Results include city, state, displayName
- [ ] Empty query handled properly
- [ ] Results sorted by relevance

**Trip Search:**

- [ ] Basic search with date works
- [ ] Price filter works
- [ ] Time range filter works
- [ ] Bus type filter works
- [ ] Amenities filter works
- [ ] Min available seats filter works
- [ ] Multiple filters work together
- [ ] Sorting works (all options)
- [ ] Pagination works
- [ ] Results include all nested data

**Popular Data:**

- [ ] Popular locations returns data
- [ ] Popular routes returns data
- [ ] Limit parameter works

**Validation:**

- [ ] Past dates rejected
- [ ] Invalid date format rejected
- [ ] Invalid time format rejected
- [ ] Invalid bus type rejected
- [ ] Price range validation works
- [ ] Error messages are clear

**Edge Cases:**

- [ ] No results handled gracefully
- [ ] Very restrictive filters work
- [ ] Large page numbers handled

---

## Performance Testing

### Response Time Benchmarks

Expected response times:

- **Autocomplete**: < 100ms
- **Trip Search (no filters)**: < 300ms
- **Trip Search (with filters)**: < 500ms
- **Popular locations/routes**: < 200ms

### Load Testing (Optional)

```bash
# Install Apache Bench
# Test autocomplete endpoint
ab -n 1000 -c 10 "http://localhost:3000/v1/locations/search?q=Ho"

# Test search endpoint
ab -n 1000 -c 10 "http://localhost:3000/v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Nang&departureDate=2025-12-20"
```

---

## Troubleshooting

### No Results Returned

**Possible Causes:**

1. Database not seeded
2. Date in the past
3. No matching data for filters
4. Route name mismatch

**Solutions:**

- Run seed script: `npm run seed`
- Check database has trips with `status: 'scheduled'`
- Verify route origin/destination cities match your query
- Use broader date range

### Validation Errors

**Common Issues:**

1. Date format incorrect (use YYYY-MM-DD)
2. Time format incorrect (use HH:mm, 24-hour)
3. Invalid enum values (check documentation)

### Performance Issues

**If responses are slow:**

1. Check database indexes
2. Reduce page limit
3. Use more specific filters
4. Check server logs for errors

---

## Success Criteria

All tests should pass with:
✅ Correct data returned  
✅ Proper validation  
✅ Fast response times  
✅ Clear error messages  
✅ Accurate pagination  
✅ Working filters in combination

---

## Next Steps After Testing

1. Fix any failing tests
2. Add more seed data if needed
3. Optimize slow queries
4. Document any bugs found
5. Integrate with frontend

---

**Testing completed?** Share results with the team and proceed with frontend integration!
