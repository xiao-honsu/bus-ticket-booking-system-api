# WebSocket.IO - Tài Liệu Kỹ Thuật Chi Tiết

## 📋 Tổng Quan

WebSocket.IO được sử dụng để cập nhật real-time trạng thái ghế ngồi (seat availability) cho tất cả người dùng đang xem cùng một chuyến xe.

### 🎯 Mục Đích

- **Đồng bộ real-time** trạng thái ghế giữa nhiều người dùng
- **Ngăn chặn xung đột** khi nhiều người chọn cùng 1 ghế
- **Cập nhật tức thời** khi ghế bị khóa, được giải phóng, hoặc đã đặt
- **Monitor thời gian** khóa ghế (10 phút)

---

## 🏗️ Kiến Trúc

### Files Liên Quan

```
src/
├── config/
│   └── socket.ts                    # Socket.IO server initialization
├── types/
│   └── socket.types.ts              # TypeScript type definitions
├── services/
│   ├── socket.service.ts            # Helper functions để emit events
│   ├── seatlock.service.ts          # Lock seats → emit events
│   ├── seatlock-monitor.service.ts  # MongoDB Change Streams monitor
│   └── booking.service.ts           # Create booking → emit events
└── index.ts                         # Server initialization
```

---

## 🔧 Configuration (socket.ts)

### Khởi Tạo Socket.IO Server

```typescript
import { initializeSocket } from './config/socket';

// Trong index.ts:
const server = http.createServer(app);
const io = initializeSocket(server);
```

### CORS Settings

```typescript
{
  cors: {
    origin: config.frontendUrl,        // Từ .env: FRONTEND_URL
    credentials: true,
    methods: ['GET', 'POST'],
  }
}
```

### Connection Options

| Option          | Value                      | Mô Tả                                   |
| --------------- | -------------------------- | --------------------------------------- |
| `pingTimeout`   | 60000ms (60s)              | Timeout nếu client không phản hồi ping  |
| `pingInterval`  | 25000ms (25s)              | Tần suất server ping client             |
| `transports`    | `['websocket', 'polling']` | Ưu tiên WebSocket, fallback polling     |
| `allowUpgrades` | `true`                     | Cho phép upgrade từ polling → WebSocket |

---

## 📡 Events Architecture

### 1️⃣ Server → Client Events (`ServerToClientEvents`)

#### **`connected`** - Xác nhận kết nối thành công

**Payload:**

```typescript
{
  socketId: string; // Socket ID duy nhất
  timestamp: Date; // Thời gian kết nối
  serverTime: Date; // Server time để đồng bộ
}
```

**Trigger:** Ngay khi client kết nối thành công

---

#### **`seatLocked`** - Ghế bị khóa bởi user khác

**Payload:**

```typescript
{
  tripId: string;           // ID chuyến xe
  seatNumbers: string[];    // Danh sách ghế bị khóa (vd: ['A1', 'A2'])
  sessionId: string;        // Session ID người khóa
  userId?: string;          // User ID (nếu authenticated)
  expiresAt: Date;          // Thời gian hết hạn lock (10 phút)
  lockedBy: 'guest' | 'user';  // Loại người dùng
  timestamp: Date;          // Thời gian event
}
```

**Trigger:**

- Khi user gọi API `POST /v1/seatlock/lock`
- Qua `seatLockService.lockSeats()` → `emitSeatLocked()`

**Frontend Action:**

```typescript
socket.on('seatLocked', (data) => {
  // Disable seats trong UI nếu không phải sessionId của mình
  if (data.sessionId !== currentSessionId) {
    disableSeatsInUI(data.seatNumbers);
    showLockedStatus(data.seatNumbers, data.expiresAt);
  }
});
```

---

#### **`seatReleased`** - Ghế được giải phóng

**Payload:**

```typescript
{
  tripId: string;
  seatNumbers: string[];
  sessionId: string;
  reason: 'manual' | 'expired' | 'booked';  // Lý do giải phóng
  timestamp: Date;
}
```

**Trigger:**

- **Manual**: User gọi `POST /v1/seatlock/release`
- **Expired**: MongoDB Change Stream phát hiện lock hết hạn
- **Booked**: Sau khi booking thành công

**Frontend Action:**

```typescript
socket.on('seatReleased', (data) => {
  // Enable lại seats trong UI
  enableSeatsInUI(data.seatNumbers);
  removeLockedStatus(data.seatNumbers);
});
```

---

#### **`seatBooked`** - Ghế đã được đặt thành công

**Payload:**

```typescript
{
  tripId: string;
  seatNumbers: string[];
  bookingId: string;     // Booking reference ID
  timestamp: Date;
}
```

**Trigger:** Sau khi `bookingService.createBooking()` thành công

**Frontend Action:**

```typescript
socket.on('seatBooked', (data) => {
  // Đánh dấu ghế đã được đặt (không thể chọn)
  markSeatsAsBooked(data.seatNumbers);
});
```

---

#### **`seatStatusUpdate`** - Batch update nhiều ghế

**Payload:**

```typescript
{
  tripId: string;
  seats: Array<{
    seatNumber: string;
    status: 'available' | 'locked' | 'booked';
    expiresAt?: Date;
    sessionId?: string;
  }>;
  timestamp: Date;
}
```

**Use Case:** Đồng bộ toàn bộ trạng thái khi user join room

---

#### **`tripCapacityUpdate`** - Cập nhật capacity tổng quan

**Payload:**

```typescript
{
  tripId: string;
  availableSeats: number;
  bookedSeats: number;
  lockedSeats: number;
  totalSeats: number;
  timestamp: Date;
}
```

**Use Case:** Hiển thị số ghế còn trống trong trip card

---

### 2️⃣ Client → Server Events (`ClientToServerEvents`)

#### **`joinTrip`** - Subscribe vào trip room

**Request:**

```typescript
socket.emit(
  'joinTrip',
  {
    tripId: '675d1234567890abcdef1234',
    sessionId: 'guest-1234567890', // Optional
  },
  (response) => {
    console.log(response);
  }
);
```

**Response:**

```typescript
{
  success: true,
  tripId: '675d1234567890abcdef1234',
  message: 'Joined trip successfully'
}
```

**Backend Logic:**

```typescript
// src/config/socket.ts
socket.on('joinTrip', async (data, callback) => {
  const roomName = `trip:${data.tripId}`;
  await socket.join(roomName);
  socket.data.currentTrips.add(data.tripId);
  // ...
});
```

**Khi Nào Join:**

- Khi user vào trang chọn ghế
- Khi user xem chi tiết chuyến xe

---

#### **`leaveTrip`** - Unsubscribe khỏi trip room

**Request:**

```typescript
socket.emit(
  'leaveTrip',
  {
    tripId: '675d1234567890abcdef1234',
  },
  (response) => {
    console.log(response);
  }
);
```

**Khi Nào Leave:**

- Khi user rời trang chọn ghế
- Khi user chọn chuyến xe khác
- Trước khi component unmount

---

#### **`ping`** - Health check

**Request:**

```typescript
socket.emit('ping', (response) => {
  const latency = Date.now() - response.timestamp;
  console.log(`Latency: ${latency}ms`);
});
```

---

## 🔄 Flow Hoạt Động Chi Tiết

### Flow 1: User Khóa Ghế

```mermaid
sequenceDiagram
    participant U1 as User A (Browser)
    participant API as Backend API
    participant DB as MongoDB
    participant WS as WebSocket Server
    participant U2 as User B (Browser)

    U1->>API: POST /v1/seatlock/lock {seatNumbers: ['A1']}
    API->>DB: Create SeatLock document
    DB-->>API: Lock created
    API->>WS: emitSeatLocked('trip:123', ['A1'])
    WS->>U1: seatLocked event
    WS->>U2: seatLocked event
    U1->>U1: Keep 'A1' selected (own lock)
    U2->>U2: Disable 'A1' (locked by others)
    API-->>U1: 200 OK {success: true}
```

**Code:**

```typescript
// seatlock.service.ts
const seatLock = await SeatLock.create({
  trip: tripId,
  seatNumbers,
  sessionId,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
});

// Emit WebSocket event
emitSeatLocked(tripId, seatNumbers, sessionId, expiresAt, userId);
```

---

### Flow 2: Lock Hết Hạn (Expired)

```mermaid
sequenceDiagram
    participant DB as MongoDB Change Stream
    participant Monitor as SeatLock Monitor
    participant WS as WebSocket Server
    participant U as All Users in Room

    DB->>Monitor: Delete event (lock expired)
    Monitor->>Monitor: Extract tripId, seatNumbers
    Monitor->>WS: emitSeatReleased(reason: 'expired')
    WS->>U: seatReleased event
    U->>U: Enable seats in UI
```

**Code:**

```typescript
// seatlock-monitor.service.ts
changeStream.on('change', (change) => {
  if (change.operationType === 'delete') {
    const { tripId, seatNumbers, sessionId } = change.fullDocumentBeforeDelete;
    emitSeatReleased(tripId, seatNumbers, sessionId, 'expired');
  }
});
```

**MongoDB Change Stream** tự động monitor khi:

- Document bị delete (TTL index xóa lock hết hạn)
- Document được update
- Document được insert

---

### Flow 3: Booking Thành Công

```mermaid
sequenceDiagram
    participant U1 as User A
    participant API as Backend API
    participant DB as MongoDB
    participant WS as WebSocket Server
    participant U2 as Other Users

    U1->>API: POST /v1/bookings {seats: ['A1']}
    API->>DB: Create Booking
    API->>DB: Update Trip.bookedSeats
    API->>DB: Delete SeatLock
    API->>WS: emitSeatBooked(['A1'])
    WS->>U1: seatBooked event
    WS->>U2: seatBooked event
    U1->>U1: Show success, redirect
    U2->>U2: Mark 'A1' as booked
    API-->>U1: 200 OK {booking}
```

**Code:**

```typescript
// booking.service.ts
const booking = await Booking.create(bookingData);

// Update trip
await Trip.findByIdAndUpdate(tripId, {
  $push: { bookedSeats: { $each: seatNumbers } },
  $inc: { availableSeats: -seatNumbers.length },
});

// Release locks
await seatLockService.releaseLocksBySession(tripId, sessionId);

// Emit WebSocket
emitSeatBooked(tripId, seatNumbers, booking._id.toString());
```

---

## 🛠️ Room Management

### Room Naming Convention

```typescript
// src/types/socket.types.ts
export const getRoomName = {
  trip: (tripId: string) => `trip:${tripId}`,
};
```

**Example:**

- Trip ID: `675d1234567890abcdef1234`
- Room Name: `trip:675d1234567890abcdef1234`

### Tracking Connected Clients

```typescript
// Get số lượng clients trong room
const room = io.sockets.adapter.rooms.get(roomName);
const clientCount = room ? room.size : 0;

logger.info(`Room ${roomName} has ${clientCount} clients`);
```

### Cleanup on Disconnect

```typescript
socket.on('disconnect', async (reason) => {
  // Leave tất cả rooms
  const leavePromises = Array.from(socket.data.currentTrips).map((tripId) => {
    return socket.leave(getRoomName.trip(tripId));
  });

  await Promise.all(leavePromises);
});
```

---

## 📊 MongoDB Change Streams

### Setup

```typescript
// seatlock-monitor.service.ts
const changeStream = SeatLock.watch([], {
  fullDocument: 'updateLookup',
  fullDocumentBeforeChange: 'whenAvailable',
});

changeStream.on('change', (change) => {
  // Handle insert, update, delete events
});
```

### Requirements

⚠️ **MongoDB Replica Set hoặc Atlas Cluster required**

Change Streams chỉ hoạt động với:

- ✅ MongoDB Atlas (Cloud)
- ✅ Local Replica Set
- ❌ Standalone MongoDB (không hỗ trợ)

### Verify Connection

```bash
# Check connection string trong .env
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

---

## 🔐 Security Considerations

### 1. Session Validation

```typescript
// Validate sessionId format
if (sessionId && !sessionId.match(/^(guest|user)-/)) {
  logger.warn(`Invalid sessionId format: ${sessionId}`);
}
```

### 2. Room Authorization

Hiện tại: **Không có authorization** cho joinTrip (Public rooms)

**Improvement Ideas:**

```typescript
socket.use((socket, next) => {
  // Verify JWT token
  const token = socket.handshake.auth.token;
  // ...
  next();
});
```

### 3. Rate Limiting

**TODO:** Implement rate limiting cho events:

- `joinTrip`: Max 10 rooms per connection
- `ping`: Max 1 per second

---

## 🚀 Scaling với Redis Adapter

### Problem: Multi-Instance Deployment

```javascript
// ecosystem.config.mjs
instances: 'max',  // ❌ Events chỉ broadcast trong 1 process
```

### Solution: Redis Adapter

```typescript
// socket.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: config.redis.url });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

**Environment Variable:**

```env
REDIS_URL=redis://localhost:6379
```

---

## 🧪 Testing

### Test 1: Verify Connection

```javascript
// Browser console
const socket = io('http://localhost:4000');

socket.on('connected', (data) => {
  console.log('✅ Connected:', data.socketId);
});
```

### Test 2: Join Trip Room

```javascript
socket.emit(
  'joinTrip',
  {
    tripId: '675d1234567890abcdef1234',
    sessionId: 'guest-test123',
  },
  (response) => {
    console.log('✅ Join response:', response);
    // Expected: { success: true, tripId: '...', message: '...' }
  }
);
```

### Test 3: Verify Event Emission

```javascript
// Listen for seat locked events
socket.on('seatLocked', (data) => {
  console.log('🔒 Seat locked:', data);
});

// Lock a seat (in another tab/browser)
// Check if event is received
```

### Test 4: Backend Logs

```bash
# Terminal output khi emit event
[Socket.IO] ✅ Emitted seatLocked to room trip:675d... (2 clients): {
  seatNumbers: [ 'A1' ],
  sessionId: 'guest-123',
  expiresAt: 2026-01-02T10:45:00.000Z
}
```

---

## 📈 Performance Metrics

### Connection Stats

```typescript
// Get total connected clients
const clientCount = io.engine.clientsCount;

// Get all rooms
const rooms = io.sockets.adapter.rooms;
console.log(`Total rooms: ${rooms.size}`);
```

### Recommended Limits

| Metric            | Recommended | Maximum |
| ----------------- | ----------- | ------- |
| Clients per room  | 50-100      | 500     |
| Total connections | 1000-5000   | 10000   |
| Events per second | 100-500     | 1000    |

---

## ⚠️ Common Issues

### Issue 1: CORS Error

**Error:**

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Fix:**

```typescript
// Verify FRONTEND_URL trong .env
FRONTEND_URL=http://localhost:3000
```

### Issue 2: Connection Timeout

**Error:**

```
WebSocket connection timeout
```

**Fix:**

```typescript
// Increase timeout values
{
  pingTimeout: 60000,
  pingInterval: 25000
}
```

### Issue 3: Events Not Received

**Debug Steps:**

1. ✅ Verify `joinTrip` được gọi thành công
2. ✅ Check backend logs: "Emitted seatLocked to room..."
3. ✅ Verify `socket.on('seatLocked')` được setup trước `joinTrip`
4. ✅ Check room name format: `trip:${tripId}`

---

## 📚 API Reference Summary

### Socket Events

| Event          | Direction       | Params                                        | Response             |
| -------------- | --------------- | --------------------------------------------- | -------------------- |
| `connected`    | Server → Client | `{socketId, timestamp}`                       | -                    |
| `seatLocked`   | Server → Client | `{tripId, seatNumbers, sessionId, expiresAt}` | -                    |
| `seatReleased` | Server → Client | `{tripId, seatNumbers, reason}`               | -                    |
| `seatBooked`   | Server → Client | `{tripId, seatNumbers, bookingId}`            | -                    |
| `joinTrip`     | Client → Server | `{tripId, sessionId?}`                        | `{success, message}` |
| `leaveTrip`    | Client → Server | `{tripId}`                                    | `{success, message}` |
| `ping`         | Client → Server | -                                             | `{timestamp}`        |

---

## 🎓 Best Practices

### 1. Always Handle Errors

```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Show user-friendly message
});
```

### 2. Cleanup on Component Unmount

```typescript
useEffect(() => {
  return () => {
    socket.emit('leaveTrip', { tripId });
    socket.disconnect();
  };
}, []);
```

### 3. Optimize Event Listeners

```typescript
// ❌ Bad: Re-create listener on every render
socket.on('seatLocked', handleSeatLocked);

// ✅ Good: Use useCallback
const handleSeatLocked = useCallback(
  (data) => {
    // ...
  },
  [dependencies]
);

useEffect(() => {
  socket.on('seatLocked', handleSeatLocked);
  return () => socket.off('seatLocked', handleSeatLocked);
}, [handleSeatLocked]);
```

---

## 📞 Support

**Files để tham khảo:**

- [`src/config/socket.ts`](../src/config/socket.ts) - Server setup
- [`src/types/socket.types.ts`](../src/types/socket.types.ts) - Type definitions
- [`src/services/socket.service.ts`](../src/services/socket.service.ts) - Emit helpers
- [`docs/WEBSOCKET-IMPLEMENTATION.md`](./WEBSOCKET-IMPLEMENTATION.md) - Implementation guide

---

**Last Updated:** January 2, 2026
**Version:** 1.0.0
