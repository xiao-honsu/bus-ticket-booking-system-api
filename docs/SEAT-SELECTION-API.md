# Seat Selection & Booking API Documentation

**Version:** 1.0  
**Last Updated:** December 17, 2025  
**For:** Frontend Integration

---

## Overview

This API handles seat selection and temporary seat locking for bus trips. It consists of two main endpoints:

1. **GET Seat Map** - Retrieve seat layout and availability
2. **POST Lock Seats** - Temporarily reserve seats during booking process

---

## 🗺️ API 1: Get Seat Map

Retrieve the seat layout and current availability status for a specific trip.

### Endpoint

```
GET /api/v1/trips/:tripId/seat-map
```

### Parameters

| Name   | Type   | Location | Required | Description                  |
| ------ | ------ | -------- | -------- | ---------------------------- |
| tripId | string | path     | Yes      | MongoDB ObjectId of the trip |

### Request Example

```bash
curl -X GET "http://localhost:4000/api/v1/trips/675b1234567890abcdef1234/seat-map"
```

### Success Response (200 OK)

```json
{
  "tripId": "675b1234567890abcdef1234",
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
      "seatNumber": "L1",
      "row": 1,
      "column": 1,
      "deck": "lower",
      "type": "sleeper",
      "price": 250000,
      "status": "available",
      "position": {
        "isWindow": true,
        "isAisle": false
      }
    },
    {
      "seatNumber": "L2",
      "row": 1,
      "column": 2,
      "deck": "lower",
      "type": "sleeper",
      "price": 250000,
      "status": "booked",
      "position": {
        "isWindow": false,
        "isAisle": true
      }
    },
    {
      "seatNumber": "L3",
      "row": 1,
      "column": 3,
      "deck": "lower",
      "type": "sleeper",
      "price": 250000,
      "status": "locked",
      "position": {
        "isWindow": true,
        "isAisle": false
      }
    }
  ]
}
```

### Seat Status Values

| Status      | Description                                    | UI Action               |
| ----------- | ---------------------------------------------- | ----------------------- |
| `available` | Seat can be selected                           | Clickable, green color  |
| `booked`    | Seat is permanently booked                     | Disabled, gray color    |
| `locked`    | Seat is temporarily locked by another user     | Disabled, yellow/orange |
| `selected`  | Seat selected by current user (frontend state) | Highlighted, blue color |

### Error Responses

**Trip Not Found (404)**

```json
{
  "code": 404,
  "message": "Trip not found"
}
```

**Invalid Trip ID (400)**

```json
{
  "code": 400,
  "message": "\"tripId\" must be a valid mongo id"
}
```

---

## 🔒 API 2: Lock Seats

Temporarily lock selected seats to prevent double booking during the payment process.

### Endpoint

```
POST /api/v1/seat-locks/lock
```

### Request Headers

| Header        | Value            | Required | Description                  |
| ------------- | ---------------- | -------- | ---------------------------- |
| Content-Type  | application/json | Yes      | JSON request body            |
| Authorization | Bearer {token}   | No       | Optional for logged-in users |

### Request Body

```json
{
  "tripId": "675b1234567890abcdef1234",
  "seatNumbers": ["L1", "L4", "U2"]
}
```

### Request Body Schema

| Field       | Type     | Required | Description                   |
| ----------- | -------- | -------- | ----------------------------- |
| tripId      | string   | Yes      | MongoDB ObjectId of the trip  |
| seatNumbers | string[] | Yes      | Array of seat numbers to lock |

### Request Example

```bash
curl -X POST "http://localhost:4000/api/v1/seat-locks/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "675b1234567890abcdef1234",
    "seatNumbers": ["L1", "L4", "U2"]
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Seats locked successfully",
  "data": {
    "_id": "675b9876543210fedcba9876",
    "trip": "675b1234567890abcdef1234",
    "seatNumbers": ["L1", "L4", "U2"],
    "sessionId": "guest-1734422400000-abc123xyz",
    "expiresAt": "2025-12-17T10:10:00.000Z",
    "createdAt": "2025-12-17T10:00:00.000Z"
  },
  "sessionId": "guest-1734422400000-abc123xyz"
}
```

**Important:** Save the `sessionId` returned in the response. You'll need it to:

- Release locks
- Extend locks
- Complete the booking

### Error Responses

**Seats Already Locked (400)**

```json
{
  "code": 400,
  "message": "Some seats are already locked or booked",
  "details": {
    "unavailableSeats": ["L4"],
    "availableSeats": ["L1", "U2"]
  }
}
```

**Seats Already Booked (400)**

```json
{
  "code": 400,
  "message": "Seats L1, L4 are already booked"
}
```

**Invalid Trip ID (400)**

```json
{
  "code": 400,
  "message": "\"tripId\" must be a valid mongo id"
}
```

**Trip Not Found (404)**

```json
{
  "code": 404,
  "message": "Trip not found"
}
```

---

## 🔄 Additional Seat Lock APIs

### Release Seat Locks

Release previously locked seats (e.g., when user navigates away or cancels).

**Endpoint:** `POST /api/v1/seat-locks/release`

**Request:**

```json
{
  "sessionId": "guest-1734422400000-abc123xyz"
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

---

### Extend Seat Locks

Extend the lock duration (default: +10 minutes).

**Endpoint:** `POST /api/v1/seat-locks/extend`

**Request:**

```json
{
  "sessionId": "guest-1734422400000-abc123xyz"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Seat locks extended successfully",
  "data": {
    "expiresAt": "2025-12-17T10:20:00.000Z"
  }
}
```

---

### Check Seat Availability

Check if specific seats are still available.

**Endpoint:** `POST /api/v1/seat-locks/check-availability`

**Request:**

```json
{
  "tripId": "675b1234567890abcdef1234",
  "seatNumbers": ["L1", "L4", "U2"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "available": ["L1", "U2"],
    "unavailable": ["L4"],
    "allAvailable": false
  }
}
```

---

### Get Locked Seats for Trip

Get all currently locked seats for a specific trip.

**Endpoint:** `GET /api/v1/seat-locks/:tripId`

**Response:**

```json
{
  "success": true,
  "data": {
    "tripId": "675b1234567890abcdef1234",
    "locks": [
      {
        "_id": "675b9876543210fedcba9876",
        "seatNumbers": ["L4", "L5"],
        "expiresAt": "2025-12-17T10:10:00.000Z"
      }
    ],
    "lockedSeats": ["L4", "L5"]
  }
}
```

---

## 📱 Frontend Integration Guide

### Step 1: Display Seat Map

```typescript
// Fetch seat map when trip detail page loads
const [seatMap, setSeatMap] = useState(null);
const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

useEffect(() => {
  const fetchSeatMap = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/v1/trips/${tripId}/seat-map`
      );
      const data = await response.json();
      setSeatMap(data);
    } catch (error) {
      console.error('Failed to fetch seat map:', error);
    }
  };

  fetchSeatMap();
}, [tripId]);

// Render seats
const renderSeatMap = () => {
  if (!seatMap) return <div>Loading...</div>;

  return (
    <div className="seat-map">
      {seatMap.seats.map((seat) => (
        <button
          key={seat.seatNumber}
          className={`seat ${seat.status} ${
            selectedSeats.includes(seat.seatNumber) ? 'selected' : ''
          }`}
          disabled={seat.status === 'booked' || seat.status === 'locked'}
          onClick={() => handleSeatClick(seat.seatNumber)}
        >
          {seat.seatNumber}
        </button>
      ))}
    </div>
  );
};

// Handle seat selection
const handleSeatClick = (seatNumber: string) => {
  setSelectedSeats((prev) => {
    if (prev.includes(seatNumber)) {
      return prev.filter((s) => s !== seatNumber);
    } else {
      return [...prev, seatNumber];
    }
  });
};
```

### Step 2: Lock Selected Seats

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);

const lockSeats = async () => {
  if (selectedSeats.length === 0) {
    alert('Please select at least one seat');
    return;
  }

  try {
    const response = await fetch('http://localhost:4000/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: tripId,
        seatNumbers: selectedSeats,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();

    // Save session ID for later use
    setSessionId(data.sessionId);
    localStorage.setItem('seatLockSessionId', data.sessionId);

    // Navigate to payment page
    router.push(`/payment?tripId=${tripId}&sessionId=${data.sessionId}`);
  } catch (error) {
    console.error('Failed to lock seats:', error);
    alert(error.message || 'Some seats are no longer available');

    // Refresh seat map to show updated availability
    fetchSeatMap();
  }
};
```

### Step 3: Handle Lock Expiration

```typescript
// Set up countdown timer
const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds

useEffect(() => {
  if (!sessionId) return;

  const timer = setInterval(() => {
    setTimeRemaining((prev) => {
      if (prev <= 1) {
        // Lock expired
        clearInterval(timer);
        alert('Seat lock expired. Please select seats again.');
        router.push(`/trip-detail/${tripId}`);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [sessionId]);

// Display countdown
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// In your UI
<div className="lock-timer">
  Time remaining: {formatTime(timeRemaining)}
</div>
```

### Step 4: Extend Lock (Optional)

```typescript
const extendLock = async () => {
  try {
    const response = await fetch(
      'http://localhost:4000/api/v1/seat-locks/extend',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      // Reset timer to 10 minutes
      setTimeRemaining(600);
      toast.success('Seat lock extended by 10 minutes');
    }
  } catch (error) {
    console.error('Failed to extend lock:', error);
  }
};

// Show extend button when time is running low
{timeRemaining < 120 && (
  <button onClick={extendLock}>
    Extend Time
  </button>
)}
```

### Step 5: Release Locks on Cancel

```typescript
const releaseLocks = async () => {
  if (!sessionId) return;

  try {
    await fetch('http://localhost:4000/api/v1/seat-locks/release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
      }),
    });

    localStorage.removeItem('seatLockSessionId');
    setSessionId(null);
  } catch (error) {
    console.error('Failed to release locks:', error);
  }
};

// Call on cancel button or when navigating away
useEffect(() => {
  return () => {
    // Cleanup: release locks when component unmounts
    if (sessionId) {
      releaseLocks();
    }
  };
}, [sessionId]);
```

---

## 🔄 Complete Booking Flow

```
1. User views trip details
   ↓
2. User clicks "Select Seats"
   → GET /trips/:tripId/seat-map
   ↓
3. User selects seats (frontend state)
   ↓
4. User clicks "Proceed to Payment"
   → POST /seat-locks/lock
   → Receive sessionId
   ↓
5. User fills payment information
   (10-minute countdown timer)
   ↓
6a. User completes payment
    → POST /bookings (with sessionId)
    → Booking created, locks auto-released

6b. User cancels or time expires
    → POST /seat-locks/release
    → Seats become available again
```

---

## 📊 Seat Map Layout Examples

### Standard Bus (40-45 seats)

```
Layout: 2-2 configuration
     [Window] [Aisle] [Aisle] [Window]
Row 1:  A1      A2      A3      A4
Row 2:  B1      B2      B3      B4
...
```

### Limousine Bus (20-30 seats)

```
Layout: 1-2-1 configuration
     [Window] [Aisle] [Aisle] [Window]
Row 1:  L1              L2      L3
Row 2:  L4      L5      L6
...
```

### Sleeper Bus (30-40 berths)

```
Layout: Lower and Upper decks
Lower Deck:
     [Window] [Middle] [Window]
Row 1:  L1      L2      L3
Row 2:  L4      L5      L6
...

Upper Deck:
     [Window] [Middle] [Window]
Row 1:  U1      U2      U3
Row 2:  U4      U5      U6
...
```

---

## 🎨 CSS Styling Suggestions

```css
.seat-map {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 20px;
}

.seat {
  width: 50px;
  height: 50px;
  border: 2px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.seat.available {
  background-color: #e8f5e9;
  border-color: #4caf50;
}

.seat.available:hover {
  background-color: #c8e6c9;
  transform: scale(1.05);
}

.seat.selected {
  background-color: #2196f3;
  border-color: #1976d2;
  color: white;
  font-weight: bold;
}

.seat.booked {
  background-color: #f5f5f5;
  border-color: #9e9e9e;
  color: #757575;
  cursor: not-allowed;
}

.seat.locked {
  background-color: #fff3e0;
  border-color: #ff9800;
  color: #e65100;
  cursor: not-allowed;
}

.lock-timer {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #ff5722;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  font-size: 16px;
}
```

---

## ⚠️ Important Notes

### Lock Duration

- Default lock duration: **10 minutes**
- Locks automatically expire after duration
- MongoDB TTL index handles cleanup
- Frontend should show countdown timer

### Session Management

- `sessionId` is required for all lock operations
- Save `sessionId` in localStorage or state
- Pass `sessionId` when creating booking
- Release locks if user cancels

### Concurrent Users

- Backend prevents double booking
- If seat is locked by another user, API returns error
- Frontend should refresh seat map on lock failure
- Show updated availability to user

### Authentication

- Lock API works for both authenticated and guest users
- Authenticated users: `sessionId` = user ID
- Guest users: `sessionId` = auto-generated unique ID

### Error Handling

- Always handle lock expiration gracefully
- Refresh seat map when lock fails
- Show clear error messages to users
- Provide option to select different seats

---

## 🧪 Testing

### Test Scenarios

1. **Basic Selection**
   - Load seat map
   - Select available seats
   - Lock seats successfully

2. **Concurrent Booking**
   - Two users select same seats
   - First user locks successfully
   - Second user gets error

3. **Lock Expiration**
   - Lock seats
   - Wait 10 minutes
   - Seats become available again

4. **Cancel Booking**
   - Lock seats
   - User cancels
   - Locks released immediately

### Test API with Curl

```bash
# 1. Get seat map
curl -X GET "http://localhost:4000/api/v1/trips/675b1234567890abcdef1234/seat-map"

# 2. Lock seats
curl -X POST "http://localhost:4000/api/v1/seat-locks/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "675b1234567890abcdef1234",
    "seatNumbers": ["L1", "L2"]
  }'

# 3. Check availability
curl -X POST "http://localhost:4000/api/v1/seat-locks/check-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "675b1234567890abcdef1234",
    "seatNumbers": ["L1", "L2"]
  }'

# 4. Release locks
curl -X POST "http://localhost:4000/api/v1/seat-locks/release" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "guest-1734422400000-abc123xyz"
  }'
```

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the error response for details
2. Verify your request format matches examples
3. Ensure trip ID is valid MongoDB ObjectId
4. Check seat numbers match the trip's seat map

---

**Last Updated:** December 17, 2025  
**API Version:** 1.0
