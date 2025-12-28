# Frontend Integration Guide - Real-time Seat Reservation API

**Backend API:** `http://localhost:4000`  
**Socket.IO:** `ws://localhost:4000`  
**Version:** 1.0.0  
**Updated:** December 27, 2025

---

## 📚 Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [Socket.IO Integration](#socketio-integration)
3. [Frontend Flow Examples](#frontend-flow-examples)
4. [TypeScript Types](#typescript-types)
5. [Error Handling](#error-handling)

---

## 🔌 REST API Endpoints

### 1. Lock Seats (Giữ chỗ)

**Endpoint:** `POST /api/v1/seat-locks/lock`

**Description:** Khóa ghế trong 10 phút. Ghế sẽ tự động release sau timeout.

**Request:**

```typescript
{
  tripId: string;           // ObjectId của trip
  seatNumbers: string[];    // Mảng số ghế, vd: ["A3", "B4"]
  sessionId?: string;       // Optional: session ID (auto-gen nếu không có)
}
```

**Response (200):**

```typescript
{
  id: string;                // Lock ID
  trip: string;              // Trip ID
  seatNumbers: string[];     // Danh sách ghế đã lock
  sessionId: string;         // Session ID (lưu lại để release sau)
  expiresAt: string;         // ISO date, vd: "2025-12-27T08:10:00.000Z"
  createdAt: string;
  updatedAt: string;
}
```

**Example:**

```javascript
const response = await fetch('http://localhost:4000/api/v1/seat-locks/lock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tripId: '675d8fee9d61ad3be0ed45f5',
    seatNumbers: ['A3', 'B4'],
  }),
});

const lock = await response.json();
// Lưu sessionId vào localStorage
localStorage.setItem('seatSessionId', lock.sessionId);
```

**Errors:**

- `404` - Trip not found
- `400` - Not enough available seats
- `409` - Seats already locked by another user

---

### 2. Release Seats (Hủy giữ chỗ)

**Endpoint:** `POST /api/v1/seat-locks/release`

**Description:** Giải phóng ghế đã lock trước timeout.

**Request:**

```typescript
{
  sessionId: string; // Session ID từ response lock
}
```

**Response (200):**

```typescript
{
  message: string; // "Seat locks released successfully"
  releasedCount: number; // Số lượng locks đã release
}
```

**Example:**

```javascript
const sessionId = localStorage.getItem('seatSessionId');

await fetch('http://localhost:4000/api/v1/seat-locks/release', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId }),
});

localStorage.removeItem('seatSessionId');
```

---

### 3. Extend Lock (Gia hạn)

**Endpoint:** `POST /api/v1/seat-locks/extend`

**Description:** Gia hạn thêm thời gian lock (thêm 10 phút).

**Request:**

```typescript
{
  sessionId: string;
  minutes?: number;  // Default: 10
}
```

**Response (200):**

```typescript
{
  message: string;
  extendedCount: number;
  newExpiresAt: string; // ISO date
}
```

---

### 4. Get Seat Map (Lấy trạng thái ghế)

**Endpoint:** `GET /api/v1/trips/:tripId/seat-map`

**Description:** Lấy sơ đồ ghế với trạng thái real-time.

**Query Params:**

- `sessionId` (optional): Để highlight ghế của user

**Response (200):**

```typescript
{
  tripId: string;
  totalSeats: number;
  availableSeats: number;
  bookedSeats: string[];
  seats: [
    {
      seatNumber: string;        // "A1"
      row: number;               // 0
      column: number;            // 0
      type: string;              // "standard" | "vip"
      price: number;             // 150000
      status: string;            // "available" | "locked" | "booked" | "selected"
      isAccessible: boolean;
      lockedBy?: string;         // sessionId (nếu locked)
      expiresAt?: string;        // ISO date (nếu locked)
    }
  ]
}
```

**Example:**

```javascript
const sessionId = localStorage.getItem('seatSessionId');
const response = await fetch(`http://localhost:4000/api/v1/trips/${tripId}/seat-map?sessionId=${sessionId}`);
const seatMap = await response.json();
```

---

### 5. Create Booking (Đặt vé)

**Endpoint:** `POST /api/v1/bookings`

**Description:** Tạo booking sau khi thanh toán thành công.

**Request:**

```typescript
{
  trip: string;                    // Trip ID
  sessionId?: string;              // Session ID của seat lock
  passengers: [
    {
      name: string;
      age: number;
      gender: "male" | "female" | "other";
      seatNumber: string;
      seatPrice: number;
      documentId?: string;
      phoneNumber?: string;
    }
  ];
  contactEmail: string;
  contactPhone: string;
  payment: {
    method: "payos" | "momo" | "zalopay" | "card";
    transactionId?: string;
  };
}
```

**Response (201):**

```typescript
{
  referenceNumber: string;     // "BKG-1735123456-ABC"
  status: "confirmed";
  totalAmount: number;
  passengers: [...];
  // ... full booking object
}
```

---

## 🔥 Socket.IO Integration

### Setup Connection

```javascript
import { io } from 'socket.io-client';

// Khởi tạo connection
const socket = io('http://localhost:4000', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

### Client → Server Events

#### 1. Join Trip Room

```javascript
socket.emit(
  'joinTrip',
  {
    tripId: '675d8fee9d61ad3be0ed45f5',
    sessionId: 'guest-1735123456-abc', // optional
  },
  (response) => {
    if (response.success) {
      console.log('✅ Joined room:', response.tripId);
    } else {
      console.error('❌ Failed:', response.message);
    }
  }
);
```

**Response:**

```typescript
{
  success: boolean;
  tripId: string;
  message?: string;
  currentStatus?: {
    availableSeats: number;
    lockedSeats: number;
    bookedSeats: number;
  };
}
```

---

#### 2. Leave Trip Room

```javascript
socket.emit(
  'leaveTrip',
  {
    tripId: '675d8fee9d61ad3be0ed45f5',
  },
  (response) => {
    console.log('Left room:', response.success);
  }
);
```

---

#### 3. Ping (Health Check)

```javascript
socket.emit('ping', (response) => {
  console.log('Pong:', response.timestamp);
});
```

---

### Server → Client Events

#### 1. `seatLocked` - Ghế bị khóa

```javascript
socket.on('seatLocked', (data) => {
  console.log('🔒 Seat locked:', data);

  // Update UI: mark seats as locked
  data.seatNumbers.forEach((seatNumber) => {
    updateSeatStatus(seatNumber, 'locked', {
      expiresAt: data.expiresAt,
      isMyLock: data.sessionId === mySessionId,
    });
  });
});
```

**Event Data:**

```typescript
{
  tripId: string;
  seatNumbers: string[];      // ["A3", "B4"]
  sessionId: string;
  userId?: string;
  expiresAt: string;          // ISO date
  lockedBy: "guest" | "user";
  timestamp: string;
}
```

---

#### 2. `seatReleased` - Ghế được giải phóng

```javascript
socket.on('seatReleased', (data) => {
  console.log('🔓 Seat released:', data);

  // Update UI: mark seats as available
  data.seatNumbers.forEach((seatNumber) => {
    if (data.reason === 'booked') {
      updateSeatStatus(seatNumber, 'booked');
    } else {
      updateSeatStatus(seatNumber, 'available');
    }
  });
});
```

**Event Data:**

```typescript
{
  tripId: string;
  seatNumbers: string[];
  sessionId: string;
  reason: "manual" | "expired" | "booked";
  timestamp: string;
}
```

---

#### 3. `seatBooked` - Ghế được đặt thành công

```javascript
socket.on('seatBooked', (data) => {
  console.log('🎫 Seat booked:', data);

  // Update UI: mark seats as permanently booked
  data.seatNumbers.forEach((seatNumber) => {
    updateSeatStatus(seatNumber, 'booked');
  });

  // Update available count
  updateAvailableSeatsCount(-data.seatNumbers.length);
});
```

**Event Data:**

```typescript
{
  tripId: string;
  seatNumbers: string[];
  bookingId: string;          // "BKG-xxx"
  timestamp: string;
}
```

---

#### 4. `connected` - Kết nối thành công

```javascript
socket.on('connected', (data) => {
  console.log('✅ Socket connected:', data.socketId);
  console.log('Server time:', data.serverTime);
});
```

---

## 💻 Frontend Flow Examples

### Complete User Flow: Select → Lock → Book

```javascript
// ============================================
// 1. INITIALIZATION
// ============================================
const socket = io('http://localhost:4000', {
  withCredentials: true,
});

let selectedSeats = [];
let sessionId = localStorage.getItem('seatSessionId');
let lockTimeout = null;

// ============================================
// 2. JOIN TRIP ROOM
// ============================================
function joinTripRoom(tripId) {
  socket.emit('joinTrip', { tripId, sessionId }, (response) => {
    if (response.success) {
      console.log('Joined trip room');
      loadSeatMap(tripId);
    }
  });
}

// ============================================
// 3. LOAD SEAT MAP
// ============================================
async function loadSeatMap(tripId) {
  const response = await fetch(`/api/v1/trips/${tripId}/seat-map?sessionId=${sessionId}`);
  const seatMap = await response.json();

  renderSeatMap(seatMap.seats);
}

// ============================================
// 4. USER SELECT SEATS
// ============================================
function onSeatClick(seatNumber, seatData) {
  if (seatData.status !== 'available' && seatData.status !== 'selected') {
    alert('Ghế này không khả dụng');
    return;
  }

  if (selectedSeats.includes(seatNumber)) {
    // Deselect
    selectedSeats = selectedSeats.filter((s) => s !== seatNumber);
    updateSeatUI(seatNumber, 'available');
  } else {
    // Select
    selectedSeats.push(seatNumber);
    updateSeatUI(seatNumber, 'selected');
  }

  updateSelectedCount(selectedSeats.length);
}

// ============================================
// 5. LOCK SEATS
// ============================================
async function lockSeats() {
  if (selectedSeats.length === 0) return;

  try {
    const response = await fetch('/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatNumbers: selectedSeats,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const lock = await response.json();
    sessionId = lock.sessionId;
    localStorage.setItem('seatSessionId', sessionId);

    // Start countdown timer
    startCountdown(lock.expiresAt);

    // Proceed to payment
    goToPaymentPage();
  } catch (error) {
    alert('Không thể giữ chỗ: ' + error.message);
    // Reload seat map
    loadSeatMap(tripId);
  }
}

// ============================================
// 6. COUNTDOWN TIMER
// ============================================
function startCountdown(expiresAt) {
  clearInterval(lockTimeout);

  lockTimeout = setInterval(() => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const remaining = expires - now;

    if (remaining <= 0) {
      // Lock expired
      clearInterval(lockTimeout);
      alert('Hết thời gian giữ chỗ!');
      releaseLocks();
      return;
    }

    // Update UI
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    updateTimerUI(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    // Show extend button when < 2 minutes
    if (remaining < 120000) {
      showExtendButton();
    }
  }, 1000);
}

// ============================================
// 7. EXTEND LOCK
// ============================================
async function extendLock() {
  try {
    const response = await fetch('/api/v1/seat-locks/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        minutes: 10,
      }),
    });

    const result = await response.json();
    startCountdown(result.newExpiresAt);
    alert('Đã gia hạn thêm 10 phút');
  } catch (error) {
    alert('Không thể gia hạn: ' + error.message);
  }
}

// ============================================
// 8. RELEASE LOCKS (Cancel)
// ============================================
async function releaseLocks() {
  if (!sessionId) return;

  await fetch('/api/v1/seat-locks/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  localStorage.removeItem('seatSessionId');
  clearInterval(lockTimeout);
  selectedSeats = [];
  loadSeatMap(tripId);
}

// ============================================
// 9. CREATE BOOKING
// ============================================
async function createBooking(paymentData) {
  try {
    const response = await fetch('/api/v1/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip: tripId,
        sessionId,
        passengers: selectedSeats.map((seat, idx) => ({
          name: passengerNames[idx],
          age: passengerAges[idx],
          gender: passengerGenders[idx],
          seatNumber: seat,
          seatPrice: seatPrices[seat],
        })),
        contactEmail: userEmail,
        contactPhone: userPhone,
        payment: paymentData,
      }),
    });

    const booking = await response.json();

    // Clear session
    localStorage.removeItem('seatSessionId');
    clearInterval(lockTimeout);

    // Show success
    showBookingSuccess(booking.referenceNumber);
  } catch (error) {
    alert('Đặt vé thất bại: ' + error.message);
  }
}

// ============================================
// 10. LISTEN TO SOCKET EVENTS
// ============================================
socket.on('seatLocked', (data) => {
  if (data.sessionId === sessionId) {
    // My lock - already handled
    return;
  }

  // Someone else locked seats
  data.seatNumbers.forEach((seatNumber) => {
    updateSeatUI(seatNumber, 'locked');
  });
});

socket.on('seatReleased', (data) => {
  if (data.reason === 'booked') {
    // Seat was booked
    data.seatNumbers.forEach((seatNumber) => {
      updateSeatUI(seatNumber, 'booked');
    });
  } else {
    // Seat released - back to available
    data.seatNumbers.forEach((seatNumber) => {
      updateSeatUI(seatNumber, 'available');
    });
  }
});

socket.on('seatBooked', (data) => {
  data.seatNumbers.forEach((seatNumber) => {
    updateSeatUI(seatNumber, 'booked');
  });

  showNotification(`Ghế ${data.seatNumbers.join(', ')} vừa được đặt`);
});

// ============================================
// 11. CLEANUP ON LEAVE
// ============================================
window.addEventListener('beforeunload', () => {
  if (sessionId && selectedSeats.length > 0) {
    // Release locks before leaving
    navigator.sendBeacon('/api/v1/seat-locks/release', JSON.stringify({ sessionId }));
  }

  socket.emit('leaveTrip', { tripId });
  socket.disconnect();
});
```

---

## 📦 TypeScript Types

```typescript
// types/seat.ts
export interface Seat {
  seatNumber: string;
  row: number;
  column: number;
  type: 'standard' | 'vip' | 'sleeper';
  price: number;
  status: 'available' | 'locked' | 'booked' | 'selected';
  isAccessible: boolean;
  lockedBy?: string;
  expiresAt?: string;
}

export interface SeatMap {
  tripId: string;
  totalSeats: number;
  availableSeats: number;
  bookedSeats: string[];
  seats: Seat[];
}

// types/socket.ts
export interface SocketSeatLockedEvent {
  tripId: string;
  seatNumbers: string[];
  sessionId: string;
  userId?: string;
  expiresAt: string;
  lockedBy: 'guest' | 'user';
  timestamp: string;
}

export interface SocketSeatReleasedEvent {
  tripId: string;
  seatNumbers: string[];
  sessionId: string;
  reason: 'manual' | 'expired' | 'booked';
  timestamp: string;
}

export interface SocketSeatBookedEvent {
  tripId: string;
  seatNumbers: string[];
  bookingId: string;
  timestamp: string;
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Status | Error               | Meaning                         |
| ------ | ------------------- | ------------------------------- |
| 400    | Bad Request         | Invalid data, seats unavailable |
| 401    | Unauthorized        | Authentication required         |
| 404    | Not Found           | Trip/Booking not found          |
| 409    | Conflict            | Seats already locked/booked     |
| 503    | Service Unavailable | Payment service down            |

### Error Response Format

```typescript
{
  statusCode: number;
  message: string;
  stack?: string;  // only in development
}
```

### Example Error Handling

```javascript
async function lockSeatsWithErrorHandling() {
  try {
    const response = await fetch('/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, seatNumbers }),
    });

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 409:
          alert('Ghế đã bị người khác giữ. Vui lòng chọn ghế khác.');
          break;
        case 400:
          alert('Không đủ ghế trống: ' + error.message);
          break;
        default:
          alert('Lỗi: ' + error.message);
      }

      // Reload seat map
      loadSeatMap(tripId);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    alert('Lỗi kết nối. Vui lòng thử lại.');
    return null;
  }
}
```

---

## 🎨 UI/UX Recommendations

### Seat Status Colors

```css
.seat.available {
  background: #28a745;
  cursor: pointer;
}
.seat.selected {
  background: #ffc107;
  border: 2px solid #000;
}
.seat.locked {
  background: #6c757d;
  cursor: not-allowed;
}
.seat.booked {
  background: #dc3545;
  cursor: not-allowed;
}
.seat.my-lock {
  background: #ffc107;
  border: 2px solid #007bff;
}
```

### Timer Display

```javascript
// Show countdown prominently
<div class="lock-timer">
  <span class="icon">⏱️</span>
  <span class="time">09:45</span>
  <button v-if="remaining < 120">Gia hạn +10 phút</button>
</div>
```

### Real-time Notifications

```javascript
function showNotification(message, type = 'info') {
  // Toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

socket.on('seatLocked', (data) => {
  if (data.sessionId !== mySessionId) {
    showNotification(`Ghế ${data.seatNumbers.join(', ')} vừa bị giữ bởi người khác`, 'warning');
  }
});
```

---

## 🔒 Security Best Practices

1. **Session ID Management:**
   - Generate client-side: `guest-${Date.now()}-${randomString}`
   - Store in localStorage (not sessionStorage - persist across tabs)
   - Clear after booking complete

2. **Validate on Backend:**
   - Backend ALWAYS validates session owns lock
   - Frontend display is just UI - backend is source of truth

3. **CORS:**
   - Backend already configured: `origin: config.frontendUrl`
   - Frontend must include credentials: `withCredentials: true`

4. **Rate Limiting:**
   - Lock API: Max 5 requests/minute per IP
   - Booking API: Max 3 requests/minute per session

---

## 📞 Support

**Backend Team Contact:**

- Issues: GitHub Issues
- Slack: #backend-support
- Email: backend@example.com

**API Health Check:**

```bash
GET /api/v1/health
→ { status: "ok", timestamp: "..." }
```

---

**Last Updated:** December 27, 2025  
**API Version:** v1.0.0
