# Seat Map Testing Guide

**Date:** December 14, 2025  
**Purpose:** Test data and guide for seat map functionality  
**Status:** Ready for Testing ✅

---

## Quick Start

### 1. Seed Test Data

```bash
# Create seat locks for testing
npm run seed:locks
```

This will create:

- ✅ Seat locks on 3 different trips
- ✅ Different expiration times (2, 3, 5, 7, 8, 10 minutes)
- ✅ Guest users with email metadata
- ✅ Mix of single and multiple seat locks

---

## API Endpoints

### 1. Get Seat Map

**Endpoint:** `GET /api/v1/trips/{tripId}/seat-map`

**Purpose:** Get seat layout with real-time availability status

**Response:**

```json
{
  "tripId": "693ecdceb1ff96e63a5998c2",
  "busType": "sleeper",
  "totalSeats": 36,
  "availableSeats": 28,
  "layout": {
    "rows": 12,
    "columns": 3,
    "decks": ["lower", "upper"]
  },
  "seats": [
    {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "deck": "lower",
      "type": "sleeper",
      "price": 250000,
      "status": "locked",
      "position": {
        "isWindow": true,
        "isAisle": false
      },
      "lockedUntil": "2025-12-14T12:15:00.000Z"
    },
    {
      "seatNumber": "A2",
      "row": 1,
      "column": 2,
      "deck": "lower",
      "type": "sleeper",
      "price": 250000,
      "status": "available",
      "position": {
        "isWindow": false,
        "isAisle": false
      }
    }
  ]
}
```

**Seat Status Values:**

- `available` - Can be selected
- `booked` - Permanently booked (from bookings)
- `locked` - Temporarily locked by another user
- `selected` - Currently selected by this user (frontend only)

**Test:**

```bash
# Get seat map for trip 1
curl http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998c2/seat-map
```

---

### 2. Lock Seats

**Endpoint:** `POST /api/v1/seat-locks/lock`

**Purpose:** Lock selected seats for 10 minutes

**Request Body:**

```json
{
  "tripId": "693ecdceb1ff96e63a5998c2",
  "seatNumbers": ["A1", "A2"],
  "sessionId": "guest-1702561234-abc123",
  "metadata": {
    "guestEmail": "user@example.com",
    "guestPhone": "+84901234567"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Seats locked successfully",
  "data": {
    "id": "675d1234567890abcdef1234",
    "trip": "693ecdceb1ff96e63a5998c2",
    "seatNumbers": ["A1", "A2"],
    "sessionId": "guest-1702561234-abc123",
    "expiresAt": "2025-12-14T12:15:00.000Z",
    "reminderSent": false,
    "createdAt": "2025-12-14T12:05:00.000Z"
  },
  "sessionId": "guest-1702561234-abc123"
}
```

**Test:**

```bash
curl -X POST http://localhost:4000/api/v1/seat-locks/lock \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "693ecdceb1ff96e63a5998c2",
    "seatNumbers": ["A3", "A4"],
    "sessionId": "test-session-123",
    "metadata": {
      "guestEmail": "test@example.com"
    }
  }'
```

---

### 3. Check Seat Availability

**Endpoint:** `POST /api/v1/seat-locks/check-availability`

**Purpose:** Verify if seats are available before locking

**Request Body:**

```json
{
  "tripId": "693ecdceb1ff96e63a5998c2",
  "seatNumbers": ["A1", "A2"]
}
```

**Response (Available):**

```json
{
  "success": true,
  "data": {
    "available": true,
    "unavailableSeats": [],
    "details": {
      "A1": "available",
      "A2": "available"
    }
  }
}
```

**Response (Unavailable):**

```json
{
  "success": true,
  "data": {
    "available": false,
    "unavailableSeats": ["A1"],
    "details": {
      "A1": "locked",
      "A2": "available"
    }
  }
}
```

**Test:**

```bash
curl -X POST http://localhost:4000/api/v1/seat-locks/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "693ecdceb1ff96e63a5998c2",
    "seatNumbers": ["A1", "A2", "B1"]
  }'
```

---

### 4. Release Locks

**Endpoint:** `POST /api/v1/seat-locks/release`

**Purpose:** Manually release seat locks (or wait for auto-expiry)

**Request Body:**

```json
{
  "sessionId": "guest-1702561234-abc123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "2 seat lock(s) released",
  "data": {
    "releasedCount": 2
  }
}
```

**Test:**

```bash
curl -X POST http://localhost:4000/api/v1/seat-locks/release \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123"
  }'
```

---

### 5. Extend Lock Duration

**Endpoint:** `POST /api/v1/seat-locks/extend`

**Purpose:** Add extra time to existing locks

**Request Body:**

```json
{
  "sessionId": "guest-1702561234-abc123",
  "minutes": 5
}
```

**Response:**

```json
{
  "success": true,
  "message": "2 seat lock(s) extended by 5 minutes",
  "data": {
    "extendedCount": 2,
    "newExpiresAt": "2025-12-14T12:20:00.000Z"
  }
}
```

**Test:**

```bash
curl -X POST http://localhost:4000/api/v1/seat-locks/extend \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "minutes": 5
  }'
```

---

## Frontend Integration

### Required Redux Store Setup

Your frontend needs these Redux slices:

```typescript
// bookingSlice.ts
interface BookingState {
  selectedSeats: string[];
  sessionId: string | null;
  lockExpiresAt: Date | null;
}

const bookingSlice = createSlice({
  name: 'booking',
  initialState: {
    selectedSeats: [],
    sessionId: null,
    lockExpiresAt: null,
  },
  reducers: {
    toggleSeat: (state, action) => {
      const seat = action.payload;
      if (state.selectedSeats.includes(seat)) {
        state.selectedSeats = state.selectedSeats.filter((s) => s !== seat);
      } else {
        state.selectedSeats.push(seat);
      }
    },
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
    },
    setLockExpiresAt: (state, action) => {
      state.lockExpiresAt = action.payload;
    },
    clearSelection: (state) => {
      state.selectedSeats = [];
      state.lockExpiresAt = null;
    },
  },
});
```

### Required API Endpoints (RTK Query)

```typescript
// api.ts
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:4000/api/v1' }),
  endpoints: (builder) => ({
    getTripSeatMap: builder.query({
      query: (tripId) => `/trips/${tripId}/seat-map`,
    }),
    lockSeats: builder.mutation({
      query: (data) => ({
        url: '/seat-locks/lock',
        method: 'POST',
        body: data,
      }),
    }),
    checkSeatAvailability: builder.mutation({
      query: (data) => ({
        url: '/seat-locks/check-availability',
        method: 'POST',
        body: data,
      }),
    }),
    releaseLocks: builder.mutation({
      query: (data) => ({
        url: '/seat-locks/release',
        method: 'POST',
        body: data,
      }),
    }),
    extendLocks: builder.mutation({
      query: (data) => ({
        url: '/seat-locks/extend',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetTripSeatMapQuery,
  useLockSeatsMutation,
  useCheckSeatAvailabilityMutation,
  useReleaseLocksMutation,
  useExtendLocksMutation,
} = api;
```

---

## Testing Scenarios

### Scenario 1: Basic Seat Selection

1. **Open seat map page** with a valid trip ID
2. **Click on an available seat** (green/white)
   - Frontend calls `checkSeatAvailability`
   - If available, frontend calls `lockSeats`
   - Seat status changes to "selected" (blue)
3. **Click same seat again** to deselect
   - Seat returns to "available"
   - Lock remains (will expire after 10 min)

### Scenario 2: Lock Expiration

1. **Select seats** and lock them
2. **Wait 10 minutes** (or adjust expiresAt in database)
3. **Refresh seat map**
   - Previously locked seats should be available again
   - MongoDB TTL index auto-deletes expired locks

### Scenario 3: Concurrent Users

1. **User A** locks seats A1, A2
2. **User B** tries to lock seat A1
   - Should fail with "Seat already locked" error
   - Frontend shows seat as "locked" (yellow)
3. **User B** locks available seat A3
   - Success, different sessionId

### Scenario 4: Lock Extension

1. **User locks seats**
2. **After 7 minutes**, click "Extend" button
   - Frontend calls `extendLocks` with sessionId
   - Expiration time extends by 5 more minutes
3. **User has total 15 minutes** from original lock

### Scenario 5: Real-time Updates

1. **User A** opens seat map
2. **User B** locks seat A1 (in another browser/session)
3. **User A's seat map** should update after 10 seconds (polling interval)
   - Seat A1 shows as "locked"
   - User A cannot select it

---

## Database Schema

### SeatLock Collection

```typescript
{
  _id: ObjectId,
  trip: ObjectId,              // Reference to Trip
  seatNumbers: string[],       // e.g., ["A1", "A2", "B3"]
  user: ObjectId?,             // Optional - for logged-in users
  sessionId: string,           // Required - for guest users
  expiresAt: Date,             // Required - 10 minutes from creation
  reminderSent: boolean,       // For email reminder tracking
  metadata: {
    guestEmail: string?,       // Optional - for reminder email
    guestPhone: string?,       // Optional
  },
  createdAt: Date,             // Auto-generated
  updatedAt: Date,             // Auto-generated
}
```

### Indexes

1. **Compound Unique Index** (Prevents double-locking):

   ```
   { trip: 1, seatNumbers: 1 }
   Partial filter: { expiresAt: { $gt: now } }
   ```

2. **TTL Index** (Auto-cleanup):

   ```
   { expiresAt: 1 } with expireAfterSeconds: 0
   ```

3. **Trip Index** (Fast lookups):
   ```
   { trip: 1 }
   ```

---

## Common Issues & Solutions

### Issue 1: Seats not showing as locked

**Problem:** Frontend shows seats as available, but backend says locked

**Solution:**

```typescript
// Make sure polling is enabled
useGetTripSeatMapQuery(tripId, {
  pollingInterval: 10000, // 10 seconds
});
```

### Issue 2: Lock fails with "already locked"

**Problem:** User tries to lock seat that's locked by another user

**Solution:**

```typescript
// Always check availability first
const availabilityCheck = await checkAvailability({
  tripId,
  seatNumbers: ['A1'],
}).unwrap();

if (!availabilityCheck.available) {
  toast.error('Seat is no longer available');
  refetch(); // Refresh seat map
}
```

### Issue 3: SessionId undefined

**Problem:** Frontend gets error "Session ID is required"

**Solution:**

```typescript
// Generate session ID on mount
useEffect(() => {
  const storedSessionId = localStorage.getItem('bookingSessionId');
  if (!storedSessionId) {
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('bookingSessionId', newSessionId);
    dispatch(setSessionId(newSessionId));
  } else {
    dispatch(setSessionId(storedSessionId));
  }
}, []);
```

### Issue 4: Locks don't expire

**Problem:** Locked seats stay locked forever

**Solution:**

- Check MongoDB TTL index exists:
  ```bash
  db.seatlocks.getIndexes()
  # Should see: { expiresAt: 1 } with expireAfterSeconds: 0
  ```
- MongoDB TTL monitor runs every 60 seconds
- Manually check: `db.seatlocks.find({ expiresAt: { $lt: new Date() } })`

---

## Testing Checklist

- [ ] Seat map loads with correct layout
- [ ] Available seats are clickable
- [ ] Booked seats are disabled (gray)
- [ ] Locked seats show lock icon (yellow)
- [ ] Selected seats highlight (blue)
- [ ] Lock API creates record in database
- [ ] Locks expire after 10 minutes
- [ ] TTL index removes expired locks
- [ ] Concurrent users can't lock same seat
- [ ] Check availability before locking
- [ ] Release locks on page exit
- [ ] Extend locks functionality works
- [ ] Real-time updates via polling
- [ ] Session ID persists in localStorage
- [ ] Price calculation for selected seats

---

## API Testing with Postman/cURL

### 1. Get Available Trips

```bash
curl "http://localhost:4000/api/v1/trips/search?origin=Hanoi&limit=5"
```

Copy a `_id` from response to use as `tripId`.

### 2. Get Seat Map

```bash
TRIP_ID="693ecdceb1ff96e63a5998c2"
curl "http://localhost:4000/api/v1/trips/$TRIP_ID/seat-map"
```

### 3. Lock Seats

```bash
SESSION_ID="test-$(date +%s)"

curl -X POST "http://localhost:4000/api/v1/seat-locks/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "'$TRIP_ID'",
    "seatNumbers": ["A5", "A6"],
    "sessionId": "'$SESSION_ID'",
    "metadata": {
      "guestEmail": "test@example.com"
    }
  }'
```

### 4. Check Availability

```bash
curl -X POST "http://localhost:4000/api/v1/seat-locks/check-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "'$TRIP_ID'",
    "seatNumbers": ["A5", "A6", "A7"]
  }'
```

### 5. Release Locks

```bash
curl -X POST "http://localhost:4000/api/v1/seat-locks/release" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'"
  }'
```

---

## Summary

**Setup:**

1. ✅ Run `npm run seed:locks` to create test data
2. ✅ Backend APIs are ready
3. ✅ Frontend needs to use `trip._id` (not `trip.id`)

**Key Features:**

- ⏱️ 10-minute lock duration
- 🔄 Auto-expiry via MongoDB TTL
- 🔒 Prevents double-locking
- 📧 Email reminders at 8 minutes
- 🔄 Real-time updates via polling
- 👥 Multi-user support with session IDs

**Frontend Must:**

- Use `_id` field (not `id`) from trip objects
- Generate and store sessionId in localStorage
- Poll seat map every 10 seconds for updates
- Check availability before locking
- Handle lock failures gracefully
- Show lock countdown timer

---

**Ready to test!** Run `npm run seed:locks` and start testing the seat map.
