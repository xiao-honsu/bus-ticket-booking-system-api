# Seat Selection API - Frontend Integration Guide

**Complete guide for implementing interactive seat selection with real-time availability**

---

## Table of Contents

1. [Overview](#overview)
2. [Seat Selection Flow](#seat-selection-flow)
3. [API Endpoints](#api-endpoints)
4. [Seat Map Structure](#seat-map-structure)
5. [Real-time Availability](#real-time-availability)
6. [Session Management](#session-management)
7. [Integration Examples](#integration-examples)
8. [Best Practices](#best-practices)

---

## Overview

The seat selection system provides:

- ✅ **Interactive Seat Map** - Visual representation of available, booked, and locked seats
- ✅ **Seat Locking (10 minutes)** - Temporary reservation during booking process
- ✅ **Real-time Availability** - Live updates on seat status
- ✅ **Session Persistence** - Maintain user's seat selection across pages

---

## Seat Selection Flow

```
1. User selects trip → GET /v1/trips/:tripId/seat-map
2. Display interactive seat map with real-time status
3. User clicks seats → POST /v1/seat-locks/lock (locks for 10 min)
4. Show countdown timer (10:00)
5. User proceeds to checkout
6. If timer < 2 min → POST /v1/seat-locks/extend (optional)
7. Complete booking → Seats converted to booked status
8. If user cancels → POST /v1/seat-locks/release
```

---

## API Endpoints

### 1. Get Interactive Seat Map

```http
GET /v1/trips/:tripId/seat-map?sessionId={sessionId}
```

**Description:** Fetch seat map with real-time availability for interactive UI

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tripId` | string (path) | Yes | Trip ID |
| `sessionId` | string (query) | No | User's session ID to highlight their selection |

**Response:**

```json
{
  "tripId": "6759abc123def456789",
  "busType": "sleeper",
  "layout": {
    "rows": 10,
    "columns": 4,
    "name": "Sleeper 40 seats"
  },
  "seats": [
    {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "seatType": "window",
      "position": { "x": 0, "y": 0 },
      "status": "available",
      "price": 250000,
      "selectable": true
    },
    {
      "seatNumber": "A2",
      "row": 1,
      "column": 2,
      "seatType": "aisle",
      "status": "locked",
      "price": 250000,
      "selectable": false
    },
    {
      "seatNumber": "A3",
      "row": 1,
      "column": 3,
      "seatType": "aisle",
      "status": "selected",
      "price": 250000,
      "selectable": true
    },
    {
      "seatNumber": "A4",
      "row": 1,
      "column": 4,
      "seatType": "window",
      "status": "booked",
      "price": 250000,
      "selectable": false
    }
  ],
  "stats": {
    "total": 40,
    "booked": 12,
    "locked": 5,
    "available": 23
  },
  "mySelection": {
    "seats": ["A3", "B3"],
    "expiresAt": "2025-12-14T10:30:00.000Z",
    "remainingSeconds": 580
  }
}
```

**Seat Status:**

- `available` - Can be selected
- `locked` - Temporarily reserved by another user
- `selected` - Currently selected by this user (sessionId match)
- `booked` - Permanently booked

---

### 2. Lock Seats

```http
POST /v1/seat-locks/lock
```

**Description:** Lock selected seats for 10 minutes

**Request Body:**

```json
{
  "tripId": "6759abc123def456789",
  "seatNumbers": ["A3", "B3"]
}
```

**Validation:**

- Minimum 1 seat, maximum 10 seats per request
- Seats must be available (not booked or locked)
- Valid seat numbers for the bus

**Response:**

```json
{
  "success": true,
  "message": "Seats locked successfully",
  "data": {
    "id": "lock123",
    "trip": "6759abc123def456789",
    "seatNumbers": ["A3", "B3"],
    "sessionId": "guest-1702536000000-abc123",
    "expiresAt": "2025-12-14T10:30:00.000Z",
    "createdAt": "2025-12-14T10:20:00.000Z"
  },
  "sessionId": "guest-1702536000000-abc123"
}
```

**Important:** Save the `sessionId` returned in response for subsequent requests!

**Error Responses:**

**409 Conflict** - Seats already locked:

```json
{
  "code": 409,
  "message": "Seats A3, B3 are already locked by another user"
}
```

**400 Bad Request** - Seats already booked:

```json
{
  "code": 400,
  "message": "Seats A3 are already booked"
}
```

---

### 3. Release Seats

```http
POST /v1/seat-locks/release
```

**Description:** Release all locked seats for a session

**Request Body:**

```json
{
  "sessionId": "guest-1702536000000-abc123"
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

**When to call:**

- User clicks "Cancel" or goes back
- User closes seat selection page
- Before locking new seats (optional - can lock different seats without releasing first)

---

### 4. Extend Lock Duration

```http
POST /v1/seat-locks/extend
```

**Description:** Extend lock duration by additional minutes (max 30)

**Request Body:**

```json
{
  "sessionId": "guest-1702536000000-abc123",
  "minutes": 10
}
```

**Response:**

```json
{
  "success": true,
  "message": "2 seat lock(s) extended by 10 minutes",
  "data": {
    "extendedCount": 2,
    "newExpiresAt": "2025-12-14T10:40:00.000Z"
  }
}
```

**Use Case:** Show "Extend Time" button when timer < 2 minutes

---

### 5. Check Seat Availability

```http
POST /v1/seat-locks/check-availability
```

**Description:** Validate seat availability before attempting to lock

**Request Body:**

```json
{
  "tripId": "6759abc123def456789",
  "seatNumbers": ["A3", "B3", "C1"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "available": ["A3", "B3"],
    "booked": ["C1"],
    "locked": [],
    "invalid": []
  }
}
```

**Use Case:** Validate selection before calling lock API (optional pre-check)

---

### 6. Get Locked Seats for Trip

```http
GET /v1/seat-locks/:tripId
```

**Description:** Get all currently locked seats for a trip

**Response:**

```json
{
  "success": true,
  "data": {
    "tripId": "6759abc123def456789",
    "lockedSeats": ["A2", "A3", "B3", "C4"],
    "count": 4
  }
}
```

**Use Case:** Real-time updates to refresh seat availability (polling every 30-60s)

---

### 7. Get Trip Details with Seats

```http
GET /v1/trips/:tripId/details
```

**Description:** Get complete trip information including seat availability

**Response:**

```json
{
  "_id": "6759abc123def456789",
  "departureTime": "2025-12-20T08:00:00.000Z",
  "arrivalTime": "2025-12-20T20:30:00.000Z",
  "pricePerSeat": 250000,
  "route": {
    /* route details */
  },
  "bus": {
    /* bus details with seatMap */
  },
  "operator": {
    /* operator details */
  },
  "seatAvailability": {
    "A1": {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "seatType": "window",
      "status": "available",
      "price": 250000,
      "lockedUntil": null
    },
    "A2": {
      "seatNumber": "A2",
      "status": "locked",
      "price": 250000,
      "lockedUntil": "2025-12-14T10:30:00.000Z"
    }
  },
  "seatStats": {
    "total": 40,
    "booked": 12,
    "locked": 5,
    "available": 23
  },
  "policies": {
    /* cancellation policies */
  }
}
```

---

## Seat Map Structure

### Layout Types

**Standard Bus (40-45 seats)**

```
Layout: 2-2 (2 seats - aisle - 2 seats)
Rows: 10-11
Columns: 4
```

**Limousine (20-28 seats)**

```
Layout: 2-1 or 1-2-1
Rows: 7-10
Columns: 3-4
```

**Sleeper Bus (20-30 beds)**

```
Layout: 2-1 (lower and upper berths)
Rows: 10
Columns: 3
```

### Seat Types

| Type       | Description         | Price Modifier |
| ---------- | ------------------- | -------------- |
| `standard` | Regular seat        | 0              |
| `vip`      | Premium front seats | +20%           |
| `window`   | Window seat         | +10%           |
| `aisle`    | Aisle seat          | 0              |

---

## Real-time Availability

### Polling Strategy

```javascript
// Poll every 30 seconds for seat availability updates
const pollInterval = 30000; // 30 seconds

setInterval(async () => {
  const response = await fetch(`/v1/seat-locks/${tripId}`);
  const data = await response.json();
  updateLockedSeats(data.data.lockedSeats);
}, pollInterval);
```

### WebSocket (Future Enhancement)

For real-time updates without polling:

```javascript
// Connect to WebSocket
const ws = new WebSocket(`ws://api/seat-updates/${tripId}`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // { type: 'seat_locked', seatNumber: 'A3' }
  // { type: 'seat_released', seatNumber: 'A3' }
  updateSeatStatus(update);
};
```

---

## Session Management

### Session ID Generation

**For Guest Users:**

```javascript
// Frontend generates session ID
const sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem('seatSessionId', sessionId);
```

**For Authenticated Users:**

```javascript
// Use user ID as session ID
const sessionId = user.id;
```

### Session Persistence

```javascript
// Save to localStorage
localStorage.setItem('seatSessionId', sessionId);
localStorage.setItem('selectedSeats', JSON.stringify(['A3', 'B3']));
localStorage.setItem('lockExpiresAt', expiresAt);

// Retrieve on page load
const sessionId = localStorage.getItem('seatSessionId');
const selectedSeats = JSON.parse(localStorage.getItem('selectedSeats') || '[]');
```

### Session Cleanup

```javascript
// Clear on booking completion
function clearSeatSession() {
  localStorage.removeItem('seatSessionId');
  localStorage.removeItem('selectedSeats');
  localStorage.removeItem('lockExpiresAt');
}
```

---

## Integration Examples

### Example 1: React Seat Map Component

```jsx
import { useState, useEffect } from 'react';

function SeatMap({ tripId }) {
  const [seatMap, setSeatMap] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [sessionId, setSessionId] = useState(localStorage.getItem('seatSessionId') || null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load seat map
  useEffect(() => {
    loadSeatMap();
  }, [tripId]);

  // Countdown timer
  useEffect(() => {
    if (seatMap?.mySelection) {
      const interval = setInterval(() => {
        const remaining = seatMap.mySelection.remainingSeconds - 1;
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          // Lock expired - reload map
          loadSeatMap();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [seatMap]);

  const loadSeatMap = async () => {
    const url = sessionId ? `/v1/trips/${tripId}/seat-map?sessionId=${sessionId}` : `/v1/trips/${tripId}/seat-map`;

    const response = await fetch(url);
    const data = await response.json();
    setSeatMap(data);

    if (data.mySelection) {
      setSelectedSeats(data.mySelection.seats);
      setTimeRemaining(data.mySelection.remainingSeconds);
    }
  };

  const handleSeatClick = async (seat) => {
    if (!seat.selectable) return;

    const isSelected = selectedSeats.includes(seat.seatNumber);
    let newSelection;

    if (isSelected) {
      // Deselect
      newSelection = selectedSeats.filter((s) => s !== seat.seatNumber);
    } else {
      // Select (max 10 seats)
      if (selectedSeats.length >= 10) {
        alert('Maximum 10 seats allowed');
        return;
      }
      newSelection = [...selectedSeats, seat.seatNumber];
    }

    // Lock seats
    if (newSelection.length > 0) {
      await lockSeats(newSelection);
    } else {
      await releaseSeats();
    }
  };

  const lockSeats = async (seats) => {
    setLoading(true);
    try {
      const response = await fetch('/v1/seat-locks/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          seatNumbers: seats,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        localStorage.setItem('seatSessionId', data.sessionId);
        setSelectedSeats(seats);
        await loadSeatMap(); // Refresh map
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to lock seats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const releaseSeats = async () => {
    if (!sessionId) return;

    await fetch('/v1/seat-locks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    setSelectedSeats([]);
    await loadSeatMap();
  };

  const extendLock = async () => {
    const response = await fetch('/v1/seat-locks/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, minutes: 10 }),
    });

    const data = await response.json();
    if (data.success) {
      await loadSeatMap();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!seatMap) return <div>Loading...</div>;

  return (
    <div className="seat-map">
      {/* Timer */}
      {timeRemaining > 0 && (
        <div className="timer">
          <p>Time remaining: {formatTime(timeRemaining)}</p>
          {timeRemaining < 120 && <button onClick={extendLock}>Extend +10 min</button>}
        </div>
      )}

      {/* Stats */}
      <div className="stats">
        <div>Available: {seatMap.stats.available}</div>
        <div>Selected: {selectedSeats.length}</div>
        <div>Total: {selectedSeats.length * 250000} VND</div>
      </div>

      {/* Seat Grid */}
      <div
        className="seat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${seatMap.layout.columns}, 1fr)`,
          gap: '10px',
        }}
      >
        {seatMap.seats.map((seat) => (
          <div
            key={seat.seatNumber}
            className={`seat seat-${seat.status}`}
            onClick={() => handleSeatClick(seat)}
            style={{
              cursor: seat.selectable ? 'pointer' : 'not-allowed',
              opacity: seat.selectable ? 1 : 0.5,
            }}
          >
            <span className="seat-number">{seat.seatNumber}</span>
            <span className="seat-price">{seat.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="legend">
        <div>
          <span className="box available"></span> Available
        </div>
        <div>
          <span className="box selected"></span> Selected
        </div>
        <div>
          <span className="box locked"></span> Locked
        </div>
        <div>
          <span className="box booked"></span> Booked
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button onClick={releaseSeats} disabled={selectedSeats.length === 0}>
          Clear Selection
        </button>
        <button onClick={() => proceedToCheckout()} disabled={selectedSeats.length === 0 || loading}>
          Continue ({selectedSeats.length} seats)
        </button>
      </div>
    </div>
  );
}
```

### Example 2: Seat Map CSS

```css
.seat-map {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.timer {
  background: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.seat-grid {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.seat {
  aspect-ratio: 1;
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.seat-available {
  background: #fff;
  border-color: #28a745;
}

.seat-available:hover {
  background: #d4edda;
  transform: scale(1.05);
}

.seat-selected {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.seat-locked {
  background: #ffc107;
  border-color: #ffc107;
  color: white;
}

.seat-booked {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.legend {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.legend .box {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin-right: 5px;
}

.legend .available {
  background: #fff;
  border-color: #28a745;
}
.legend .selected {
  background: #28a745;
}
.legend .locked {
  background: #ffc107;
}
.legend .booked {
  background: #6c757d;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.actions button:first-child {
  background: #6c757d;
  color: white;
}

.actions button:last-child {
  background: #007bff;
  color: white;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Best Practices

### 1. **Session Management**

- Always save `sessionId` from lock response
- Store in `localStorage` for persistence
- Use same `sessionId` for all operations
- Clear session after booking completion

### 2. **Error Handling**

```javascript
try {
  const response = await fetch('/v1/seat-locks/lock', {
    method: 'POST',
    body: JSON.stringify({ tripId, seatNumbers }),
  });

  if (response.status === 409) {
    // Seats already locked
    alert('These seats are already taken. Please select different seats.');
    await loadSeatMap(); // Refresh
  } else if (response.status === 400) {
    // Invalid request
    const error = await response.json();
    alert(error.message);
  }
} catch (error) {
  alert('Network error. Please check your connection.');
}
```

### 3. **Timer Management**

- Display countdown timer prominently
- Show warning at 2 minutes remaining
- Offer "Extend Time" button
- Auto-reload map when lock expires
- Prevent actions when timer expires

### 4. **Real-time Updates**

- Poll locked seats every 30-60 seconds
- Update UI immediately on lock/release
- Show loading states during API calls
- Handle concurrent user selections gracefully

### 5. **Mobile Optimization**

- Use touch-friendly seat sizes (min 44x44px)
- Implement pinch-to-zoom for small screens
- Show seat numbers clearly
- Use modal for seat details on mobile

### 6. **Accessibility**

- Use ARIA labels for seat status
- Support keyboard navigation
- Provide screen reader announcements
- High contrast mode for seat colors

### 7. **Performance**

- Cache seat map data
- Debounce rapid seat selections
- Optimize re-renders in React
- Lazy load seat images

---

## Common Scenarios

### Scenario 1: User Selects Seats

```
1. User clicks seat A3 → Call lock API
2. Backend locks A3 for 10 minutes
3. Frontend displays A3 as "selected"
4. Start 10-minute countdown timer
5. User continues to booking
```

### Scenario 2: Lock Conflict

```
1. User A and User B both try to lock seat A3
2. User A's request arrives first → Success
3. User B's request → 409 Conflict error
4. Frontend shows "Seat taken" message to User B
5. Reload seat map to show updated availability
```

### Scenario 3: Timer Expiration

```
1. User selects seats but doesn't proceed
2. Timer reaches 00:00
3. Backend automatically releases locks (TTL)
4. Frontend detects expired timer
5. Show message: "Time expired. Please reselect."
6. Reload seat map
```

### Scenario 4: User Returns to Page

```
1. User navigates away during seat selection
2. sessionId stored in localStorage
3. User returns to seat selection
4. Load seat map with sessionId parameter
5. Backend returns user's previous selection
6. Display remaining time and selected seats
```

---

## Error Codes Reference

| Code | Error        | Cause                                  | Solution                 |
| ---- | ------------ | -------------------------------------- | ------------------------ |
| 400  | Bad Request  | Invalid seat numbers or already booked | Validate before locking  |
| 404  | Not Found    | Trip or seats not found                | Check trip exists        |
| 409  | Conflict     | Seats already locked by another user   | Refresh map and reselect |
| 500  | Server Error | Database or system error               | Retry or contact support |

---

## Testing Checklist

**Seat Selection:**

- [ ] Display seat map with correct layout
- [ ] Show real-time seat status (available/locked/booked)
- [ ] Allow selecting multiple seats (max 10)
- [ ] Prevent selecting booked/locked seats
- [ ] Update UI immediately on selection

**Seat Locking:**

- [ ] Lock seats successfully
- [ ] Receive and store sessionId
- [ ] Display 10-minute countdown timer
- [ ] Show locked seats to other users
- [ ] Allow extending lock before expiry

**Session Management:**

- [ ] Save sessionId to localStorage
- [ ] Restore selection on page reload
- [ ] Clear session after booking
- [ ] Handle multiple tabs correctly

**Error Handling:**

- [ ] Show conflict error (409)
- [ ] Reload map when seats taken
- [ ] Handle network failures
- [ ] Display validation errors

**Real-time Updates:**

- [ ] Poll for locked seats updates
- [ ] Update seat status dynamically
- [ ] Handle expired locks automatically

---

## API Response Times

**Expected Performance:**

- Seat map load: < 200ms
- Lock seats: < 300ms
- Release seats: < 100ms
- Check availability: < 150ms

---

## Support Resources

- **API Documentation**: [FRONTEND_API_GUIDE.md](./FRONTEND_API_GUIDE.md)
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Testing Guide**: See testing section above

---

**Last Updated**: December 14, 2025  
**API Version**: v1  
**Lock Duration**: 10 minutes (600 seconds)
