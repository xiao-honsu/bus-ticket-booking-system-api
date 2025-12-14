# Seat Selection - Quick Reference

**Quick guide for frontend developers**

---

## 🎯 Core Endpoints

### 1. Get Seat Map

```http
GET /v1/trips/:tripId/seat-map?sessionId={optional}
```

Returns interactive seat map with real-time status.

### 2. Lock Seats (10 min)

```http
POST /v1/seat-locks/lock
Content-Type: application/json

{
  "tripId": "6759abc...",
  "seatNumbers": ["A3", "B3"]
}
```

**Response:** Returns `sessionId` - Save it!

### 3. Release Seats

```http
POST /v1/seat-locks/release
Content-Type: application/json

{
  "sessionId": "guest-1702536000000-abc"
}
```

### 4. Extend Lock (+10 min)

```http
POST /v1/seat-locks/extend
Content-Type: application/json

{
  "sessionId": "guest-1702536000000-abc",
  "minutes": 10
}
```

---

## 📊 Seat Status

| Status      | Meaning                        | Selectable |
| ----------- | ------------------------------ | ---------- |
| `available` | Free to book                   | ✅ Yes     |
| `locked`    | Temporarily reserved by others | ❌ No      |
| `selected`  | Your current selection         | ✅ Yes     |
| `booked`    | Permanently booked             | ❌ No      |

---

## ⏱️ Timer Flow

```
User selects seats
↓
Lock API returns expiresAt
↓
Start 10:00 countdown
↓
Timer < 2:00 → Show "Extend" button
↓
Timer = 0:00 → Release seats automatically
```

---

## 💾 Session Management

```javascript
// Generate session ID (guest)
const sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Save to localStorage
localStorage.setItem('seatSessionId', sessionId);

// Use in all requests
fetch('/v1/seat-locks/lock', {
  body: JSON.stringify({ tripId, seatNumbers }),
});
```

---

## 🔄 Real-time Updates

```javascript
// Poll every 30 seconds
setInterval(async () => {
  const res = await fetch(`/v1/seat-locks/${tripId}`);
  const { lockedSeats } = await res.json();
  updateUI(lockedSeats);
}, 30000);
```

---

## ⚠️ Error Handling

| Code | Error                | Action                           |
| ---- | -------------------- | -------------------------------- |
| 409  | Seats already locked | Reload map, show error           |
| 400  | Seats already booked | Show error, suggest alternatives |
| 404  | Trip not found       | Redirect to search               |

---

## 🎨 Quick React Example

```jsx
function SeatMap({ tripId }) {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sessionId, setSessionId] = useState(localStorage.getItem('seatSessionId'));

  // Load seat map
  useEffect(() => {
    fetch(`/v1/trips/${tripId}/seat-map${sessionId ? '?sessionId=' + sessionId : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setSeats(data.seats);
        if (data.mySelection) {
          setSelected(data.mySelection.seats);
        }
      });
  }, [tripId]);

  // Handle seat click
  const handleSeatClick = async (seat) => {
    if (!seat.selectable) return;

    const newSelection = selected.includes(seat.seatNumber)
      ? selected.filter((s) => s !== seat.seatNumber)
      : [...selected, seat.seatNumber];

    const res = await fetch('/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, seatNumbers: newSelection }),
    });

    const data = await res.json();
    if (data.success) {
      setSessionId(data.sessionId);
      localStorage.setItem('seatSessionId', data.sessionId);
      setSelected(newSelection);
    }
  };

  return (
    <div className="seat-grid">
      {seats.map((seat) => (
        <div key={seat.seatNumber} className={`seat seat-${seat.status}`} onClick={() => handleSeatClick(seat)}>
          {seat.seatNumber}
        </div>
      ))}
    </div>
  );
}
```

---

## 📏 Validation Rules

- ✅ Min 1 seat, max 10 seats per lock
- ✅ Lock duration: 10 minutes (extendable to 30 min max)
- ✅ Seats must be valid for the bus
- ✅ Seats must not be booked or locked

---

## 🚀 Performance Tips

1. **Cache seat map** for 30 seconds
2. **Debounce** rapid seat selections (300ms)
3. **Poll** locked seats every 30-60 seconds
4. **Optimize re-renders** in React (useMemo)
5. **Show loading states** during API calls

---

## 📱 Mobile Considerations

- Minimum seat size: **44x44px** (touch-friendly)
- Use **modal** for seat details
- **Haptic feedback** on selection
- **Native date picker** for date selection
- **Bottom sheet** for filters on mobile

---

## 🔗 Full Documentation

- **Complete Guide**: [SEAT_SELECTION_API.md](./SEAT_SELECTION_API.md)
- **Implementation Summary**: [SEAT_SELECTION_SUMMARY.md](./agent-generated/SEAT_SELECTION_SUMMARY.md)
- **Swagger UI**: `http://localhost:3000/api-docs`

---

## ✅ Testing Quick Commands

```bash
# 1. Get seat map
curl "http://localhost:3000/v1/trips/{tripId}/seat-map"

# 2. Lock seats
curl -X POST http://localhost:3000/v1/seat-locks/lock \
  -H "Content-Type: application/json" \
  -d '{"tripId":"...","seatNumbers":["A3"]}'

# 3. Check locked seats
curl "http://localhost:3000/v1/seat-locks/{tripId}"

# 4. Release seats
curl -X POST http://localhost:3000/v1/seat-locks/release \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"..."}'
```

---

**Need detailed examples?** Check [SEAT_SELECTION_API.md](./SEAT_SELECTION_API.md)!
