# API Documentation for Seat Selection Feature

## 📋 Tổng quan

API này hỗ trợ tính năng chọn ghế cho hệ thống đặt vé xe bus với đơn vị tiền tệ **VND (₫)**.

Frontend có thể:

1. Lấy seat map với status real-time (available/booked/locked/selected)
2. Lock ghế khi user chọn (với sessionId để tracking)
3. Get seat map với sessionId để hiển thị ghế đã chọn
4. Calculate tổng giá trị booking
5. Proceed to checkout với ghế đã lock

---

## 🎯 API Endpoints

### 1. GET Seat Map

**Endpoint**: `GET /api/v1/trips/:tripId/seat-map`

**Description**: Lấy seat map với layout và status real-time của từng ghế

**Query Parameters**:

- `sessionId` (optional): Session ID để identify ghế của user hiện tại

**Response Success (200)**:

```json
{
  "tripId": "693ecdceb1ff96e63a5998bb",
  "busType": "standard",
  "layout": {
    "rows": 12,
    "columns": 4,
    "name": "Standard 45-seat 2-2 Layout"
  },
  "seats": [
    {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "seatType": "window",
      "position": {
        "x": 1,
        "y": 1
      },
      "status": "available",
      "price": 250000,
      "selectable": true
    },
    {
      "seatNumber": "C1",
      "row": 1,
      "column": 3,
      "seatType": "aisle",
      "position": {
        "x": 3,
        "y": 1
      },
      "status": "booked",
      "price": 250000,
      "selectable": false
    }
  ]
}
```

**Seat Status**:

- `available`: Ghế trống, có thể chọn
- `booked`: Đã được book (permanent), không thể chọn
- `locked`: Đang bị lock bởi user khác, không thể chọn
- `selected`: Đang được lock bởi user hiện tại (sessionId matching)

**Price Format**: VND (số nguyên, không có decimal)

- 250000 = 250,000 VNĐ
- 350000 = 350,000 VNĐ

---

### 2. POST Lock Seats

**Endpoint**: `POST /api/v1/seat-locks/lock`

**Description**: Lock ghế khi user click chọn (tự động generate sessionId nếu không có)

**Request Body**:

```json
{
  "tripId": "693ecdceb1ff96e63a5998bb",
  "seatNumbers": ["A2", "A3", "A4", "B6", "B7"]
}
```

**Response Success (201)**:

```json
{
  "success": true,
  "message": "Seats locked successfully",
  "data": {
    "_id": "...",
    "trip": "693ecdceb1ff96e63a5998bb",
    "seatNumbers": ["A2", "A3", "A4", "B6", "B7"],
    "sessionId": "guest-1734468391234-abc123def",
    "expiresAt": "2025-12-17T15:26:31.234Z",
    "createdAt": "2025-12-17T15:16:31.234Z"
  },
  "sessionId": "guest-1734468391234-abc123def"
}
```

**Important**:

- Trả về `sessionId` trong response
- Frontend **MUST** lưu sessionId này (localStorage/sessionStorage)
- Sử dụng sessionId này cho các requests tiếp theo
- Lock timeout: 10 phút (auto-expire)

**Error Responses**:

**400 - Seat Already Locked**:

```json
{
  "code": 400,
  "message": "Seats already locked or booked: A2, B6"
}
```

**400 - Not Enough Capacity**:

```json
{
  "code": 400,
  "message": "Not enough available seats to lock. Available: 3, Requested: 5"
}
```

**404 - Trip Not Found**:

```json
{
  "code": 404,
  "message": "Trip not found"
}
```

---

### 3. POST Release Locks (Optional)

**Endpoint**: `POST /api/v1/seat-locks/release`

**Description**: Release tất cả ghế đã lock của session

**Request Body**:

```json
{
  "sessionId": "guest-1734468391234-abc123def"
}
```

**Response Success (200)**:

```json
{
  "success": true,
  "message": "3 seat lock(s) released",
  "data": {
    "releasedCount": 3
  }
}
```

**Note**: Auto-release sau 10 phút nếu không release manually

---

## 🎨 Frontend Implementation Guide

### Step 1: Load Seat Map

```typescript
// Load seat map khi vào trang
const loadSeatMap = async (tripId: string) => {
  // Get sessionId from storage (nếu có)
  const sessionId = localStorage.getItem('seatlock_session');

  const url = sessionId
    ? `/api/v1/trips/${tripId}/seat-map?sessionId=${sessionId}`
    : `/api/v1/trips/${tripId}/seat-map`;

  const response = await fetch(url);
  const data = await response.json();

  return data;
};
```

### Step 2: Render Seat Map

```tsx
interface Seat {
  seatNumber: string;
  row: number;
  column: number;
  seatType: string;
  position: { x: number; y: number };
  status: 'available' | 'booked' | 'locked' | 'selected';
  price: number;
  selectable: boolean;
}

const SeatMap = ({ seats }: { seats: Seat[] }) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Group seats theo status để render
  const renderSeat = (seat: Seat) => {
    const isSelected = seat.status === 'selected';
    const isAvailable = seat.status === 'available';
    const isBooked = seat.status === 'booked';
    const isLocked = seat.status === 'locked';

    return (
      <div
        key={seat.seatNumber}
        className={`
          seat
          ${isAvailable ? 'available' : ''}
          ${isBooked ? 'booked' : ''}
          ${isLocked ? 'locked' : ''}
          ${isSelected ? 'selected' : ''}
        `}
        onClick={() => isAvailable && handleSeatClick(seat)}
        style={{
          gridRow: seat.row,
          gridColumn: seat.column,
        }}
      >
        {seat.seatNumber}
      </div>
    );
  };

  return <div className="seat-map-grid">{seats.map(renderSeat)}</div>;
};
```

### Step 3: Handle Seat Selection

```typescript
const handleSeatClick = async (seat: Seat) => {
  try {
    // Lấy tất cả ghế đang selected
    const currentSelected = seats.filter((s) => s.status === 'selected').map((s) => s.seatNumber);

    let newSelection: string[];

    // Toggle seat
    if (currentSelected.includes(seat.seatNumber)) {
      // Deselect: remove from array
      newSelection = currentSelected.filter((s) => s !== seat.seatNumber);
    } else {
      // Select: add to array
      newSelection = [...currentSelected, seat.seatNumber];
    }

    // Call API to lock seats
    const response = await fetch('/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: currentTripId,
        seatNumbers: newSelection,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // Save sessionId to localStorage
      localStorage.setItem('seatlock_session', result.sessionId);

      // Reload seat map để update UI
      await reloadSeatMap();
    } else {
      // Show error
      alert(result.message);
    }
  } catch (error) {
    console.error('Error locking seat:', error);
  }
};
```

### Step 4: Calculate Total Price

```typescript
const calculateTotal = (seats: Seat[]) => {
  const selectedSeats = seats.filter((s) => s.status === 'selected');

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const seatCount = selectedSeats.length;
  const seatNumbers = selectedSeats.map((s) => s.seatNumber);

  return {
    seatCount,
    seatNumbers,
    totalPrice,
    formattedPrice: formatVND(totalPrice), // "250,000 VNĐ"
  };
};

// Format VND
const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};
```

### Step 5: Proceed to Checkout

```typescript
const proceedToCheckout = () => {
  const sessionId = localStorage.getItem('seatlock_session');
  const selectedSeats = seats.filter((s) => s.status === 'selected');

  if (!sessionId || selectedSeats.length === 0) {
    alert('Please select at least one seat');
    return;
  }

  // Navigate to checkout page with data
  router.push({
    pathname: '/checkout',
    query: {
      tripId: currentTripId,
      sessionId,
      seats: selectedSeats.map((s) => s.seatNumber).join(','),
    },
  });
};
```

---

## 🎯 UI Component Structure (Theo ảnh)

```tsx
<div className="seat-selection-container">
  {/* Left Side - Seat Map */}
  <div className="seat-map-section">
    <h3>Click on available seats to reserve your seat.</h3>

    {/* Seat Grid */}
    <div className="seat-grid">
      {/* Row 1 */}
      <div className="seat-row">
        <Seat number="B1" status="available" />
        <Seat number="B3" status="available" />
        <Seat number="B5" status="booked" />
        {/* ... more seats */}
      </div>

      {/* Row 2 */}
      <div className="seat-row">
        <Seat number="B2" status="booked" />
        <Seat number="B4" status="booked" />
        <Seat number="B6" status="selected" />
        {/* ... more seats */}
      </div>
    </div>

    {/* Legend */}
    <div className="legend">
      <div>
        <span className="available-icon"></span> Available
      </div>
      <div>
        <span className="booked-icon"></span> Booked
      </div>
      <div>
        <span className="selected-icon"></span> Selected
      </div>
      <div>
        <span className="price-icon"></span> NPR. 1600
      </div>
    </div>
  </div>

  {/* Right Side - Booking Summary */}
  <div className="booking-summary">
    <h3>Your Destination</h3>
    <div className="route-info">
      <div>
        From: {origin} ({departureTime})
      </div>
      <div>
        To: {destination} ({arrivalTime})
      </div>
    </div>

    <h3>Selected Seats</h3>
    <div className="selected-seats-list">
      {selectedSeats.map((seat) => (
        <span key={seat} className="seat-badge">
          {seat}
        </span>
      ))}
    </div>

    <h3>Fare Details</h3>
    <div className="fare-details">
      <div>Basic Fare: {formatVND(basePrice)}</div>
      <div className="total-price">
        Total Price: {formatVND(totalPrice)}
        <small>(Including all taxes)</small>
      </div>
    </div>

    <button className="checkout-btn" onClick={proceedToCheckout}>
      PROCESSED TO CHECKOUT
    </button>
  </div>
</div>
```

---

## 💰 Price Format - VND

**Backend trả về**:

```json
{
  "price": 250000
}
```

**Frontend display**:

```typescript
// Option 1: Using Intl.NumberFormat (recommended)
const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

formatVND(250000); // "₫250,000" hoặc "250.000 ₫"

// Option 2: Custom format
const formatVND = (amount: number) => {
  return `${amount.toLocaleString('vi-VN')} VNĐ`;
};

formatVND(250000); // "250,000 VNĐ"
formatVND(1500000); // "1,500,000 VNĐ"
```

**Example prices**:

- Standard seat: 250,000 VNĐ
- Limousine VIP: 350,000 VNĐ
- Sleeper berth: 400,000 VNĐ

---

## ⚠️ Important Notes

### 1. SessionId Management

- Backend tự động generate `sessionId` nếu không authenticate
- Frontend **MUST** lưu sessionId từ response
- Sử dụng sessionId cho mọi requests tiếp theo
- Clear sessionId khi user complete booking hoặc cancel

### 2. Lock Timeout

- Seats tự động release sau **10 phút**
- Frontend nên có countdown timer
- Alert user trước khi hết hạn
- Option: implement extend lock feature

### 3. Concurrent Users

- API prevent double-locking
- Nếu seat đã locked, trả về error
- Frontend nên reload seat map định kỳ (polling) hoặc dùng WebSocket

### 4. Price Display

- API trả về price dạng **integer** (VND)
- Frontend format với thousand separator
- Example: 250000 → "250,000 VNĐ"

---

## 🧪 Testing với cURL

### Test 1: Get seat map

```bash
curl "http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998bb/seat-map"
```

### Test 2: Lock seats

```bash
curl -X POST "http://localhost:4000/api/v1/seat-locks/lock" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "693ecdceb1ff96e63a5998bb",
    "seatNumbers": ["A2", "A3", "A4"]
  }'
```

### Test 3: Get seat map with sessionId

```bash
curl "http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998bb/seat-map?sessionId=guest-1734468391234-abc123def"
```

### Test 4: Release locks

```bash
curl -X POST "http://localhost:4000/api/v1/seat-locks/release" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "guest-1734468391234-abc123def"
  }'
```

---

## ✅ API Status Check

| Feature                    | Status     | Notes                             |
| -------------------------- | ---------- | --------------------------------- |
| GET seat map               | ✅ Working | Returns VND prices                |
| POST lock seats            | ✅ Working | Auto-generates sessionId          |
| Seat status tracking       | ✅ Working | available/booked/locked/selected  |
| Price in VND               | ✅ Working | Integer format (250000)           |
| Lock timeout (10min)       | ✅ Working | TTL index auto-cleanup            |
| SessionId tracking         | ✅ Working | Returned in response              |
| Concurrent lock prevention | ✅ Working | Unique index prevents double-lock |

---

## 📝 Summary

✅ **API đã hoạt động đúng như mong đợi**:

- Trả về seat map với full layout information
- Price format: VND (integer)
- Status tracking: available/booked/locked/selected
- SessionId management: auto-generate và return trong response
- Lock mechanism: 10 phút timeout với auto-cleanup

✅ **Frontend có thể implement UI như ảnh**:

- Hiển thị seat grid với 3 màu (white/red/yellow)
- Track selected seats và calculate total
- Display route info và fare details
- Proceed to checkout với seats locked

⚠️ **Recommendations**:

1. Frontend nên implement countdown timer (10 phút)
2. Polling seat map mỗi 30-60 giây để update status
3. Show loading state khi lock/unlock seats
4. Handle errors gracefully (seat already locked, etc.)
5. Clear sessionId sau khi complete booking

---

**Date**: 2025-01-01  
**API Base URL**: `http://localhost:4000/api/v1`  
**Currency**: VND (₫)
