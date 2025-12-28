# WebSocket Real-time Seat Reservation Flow

## 📊 Kiểm tra Implementation - Flow Diagram

### ✅ **1. Seat Lock Flow (Giữ chỗ)**

```
User clicks seat A3
    ↓
Frontend: POST /v1/seat-locks/lock
    {
      tripId: "xxx",
      seatNumbers: ["A3"]
    }
    ↓
Backend: seatlock.service.lockSeats()
    ├─ Kiểm tra seat availability
    ├─ Kiểm tra conflicts (đã booked/locked?)
    ├─ Tạo SeatLock trong MongoDB
    │   {
    │     trip: ObjectId,
    │     seatNumbers: ["A3"],
    │     sessionId: "guest-xxx",
    │     expiresAt: Date (now + 10 min)
    │   }
    ├─ ✅ TTL Index tự động xóa sau expiresAt
    └─ emitSeatLocked() → Socket.IO
        ↓
    io.to('trip:xxx').emit('seatLocked', {
      tripId: 'xxx',
      seatNumbers: ['A3'],
      sessionId: 'guest-xxx',
      expiresAt: Date,
      timestamp: Date
    })
        ↓
All clients in room 'trip:xxx' nhận event
        ↓
Frontend update UI: seat A3 → màu xám (locked)
```

---

### ✅ **2. Seat Release Flow (Hủy giữ chỗ)**

```
User clicks "Cancel" hoặc timeout
    ↓
Frontend: POST /v1/seat-locks/release
    {
      sessionId: "guest-xxx"
    }
    ↓
Backend: seatlock.service.releaseLocks()
    ├─ Query SeatLock by sessionId
    ├─ Lấy thông tin locks trước khi delete
    ├─ Delete locks từ MongoDB
    └─ emitSeatReleased() cho từng lock
        ↓
    io.to('trip:xxx').emit('seatReleased', {
      tripId: 'xxx',
      seatNumbers: ['A3'],
      sessionId: 'guest-xxx',
      reason: 'manual',
      timestamp: Date
    })
        ↓
All clients nhận event
        ↓
Frontend update UI: seat A3 → màu xanh (available)
```

---

### ✅ **3. TTL Expiration Flow (Tự động hết hạn)**

```
10 phút trôi qua...
    ↓
MongoDB TTL Index tự động:
    ├─ Phát hiện expiresAt < now
    ├─ Xóa document từ SeatLock collection
    └─ Trigger Change Stream event
        ↓
seatlock-monitor.service nhận delete event
    ├─ Phát hiện operationType: 'delete'
    └─ (Optional) Emit event nếu cần tracking
        ↓
Frontend: Không cần làm gì thêm
    (Ghế tự động available khi user refresh hoặc query lại)
```

**Note:** TTL Index MongoDB có độ trễ ~60 giây. Không phải xóa ngay lập tức.

---

### ✅ **4. Booking Completion Flow (Đặt vé thành công)**

```
User hoàn tất thanh toán
    ↓
Frontend: POST /v1/bookings
    {
      tripId: "xxx",
      seatNumbers: ["A3"],
      sessionId: "guest-xxx",
      payment: {...}
    }
    ↓
Backend: booking.service.createBooking()
    ├─ Kiểm tra sessionId owns lock
    ├─ Kiểm tra seats chưa bị booked
    ├─ Tạo Booking trong MongoDB
    ├─ Update Trip:
    │   trip.bookedSeats.push("A3")
    │   trip.availableSeats -= 1
    ├─ Delete SeatLock (releaseSpecificLocks)
    │   └─ emitSeatReleased(reason: 'booked')
    └─ emitSeatBooked()
        ↓
    io.to('trip:xxx').emit('seatBooked', {
      tripId: 'xxx',
      seatNumbers: ['A3'],
      bookingId: 'BKG-xxx',
      timestamp: Date
    })
        ↓
All clients nhận event
        ↓
Frontend update UI: seat A3 → màu đỏ (booked permanently)
```

---

### ✅ **5. WebSocket Connection Flow**

```
Frontend loads page '/trips/:tripId/seats'
    ↓
Khởi tạo Socket.IO connection:
    const socket = io('http://localhost:4000', {
      withCredentials: true
    });
    ↓
socket.on('connected', (data) => {
  console.log('Connected:', data.socketId);
});
    ↓
Join trip room:
    socket.emit('joinTrip', {
      tripId: 'xxx',
      sessionId: 'guest-xxx'
    }, (response) => {
      console.log('Joined room:', response);
    });
    ↓
Backend: socket.ts - joinTrip handler
    ├─ socket.join('trip:xxx')
    ├─ socket.data.currentTrips.add('xxx')
    └─ Send response: { success: true }
    ↓
Listen for real-time events:
    socket.on('seatLocked', handleSeatLocked);
    socket.on('seatReleased', handleSeatReleased);
    socket.on('seatBooked', handleSeatBooked);
```

---

### ✅ **6. MongoDB Change Streams Flow**

```
Server khởi động
    ↓
index.ts: startSeatLockMonitoring()
    ↓
seatlock-monitor.service:
    ├─ Tạo Change Stream trên SeatLock collection
    ├─ Watch for: insert, update, delete
    └─ changeStream.on('change', handler)
        ↓
Khi SeatLock bị xóa (TTL hoặc manual):
    ├─ operationType: 'delete'
    ├─ documentKey: { _id: ObjectId }
    └─ Handle event (logging, analytics, etc.)
```

---

## 🔍 **Checklist - Đã implement đúng?**

### ✅ **Backend Implementation**

| Component                     | Status | File                                       | Function                        |
| ----------------------------- | ------ | ------------------------------------------ | ------------------------------- |
| **Socket.IO Server**          | ✅     | `src/config/socket.ts`                     | `initializeSocket()`            |
| **HTTP + Socket Integration** | ✅     | `src/index.ts`                             | `http.createServer(app)`        |
| **Socket Types**              | ✅     | `src/types/socket.types.ts`                | TypeScript interfaces           |
| **Socket Service**            | ✅     | `src/services/socket.service.ts`           | Emit helpers                    |
| **SeatLock Service**          | ✅     | `src/services/seatlock.service.ts`         | `lockSeats()`, `releaseLocks()` |
| **Booking Service**           | ✅     | `src/services/booking.service.ts`          | `createBooking()` + emit        |
| **Change Streams Monitor**    | ✅     | `src/services/seatlock-monitor.service.ts` | TTL detection                   |
| **MongoDB TTL Index**         | ✅     | `src/models/seatlock.model.ts`             | `{ expiresAt: 1 }`              |

### ✅ **Socket Events Emitted**

| Event          | Emitted From                              | Trigger               |
| -------------- | ----------------------------------------- | --------------------- |
| `seatLocked`   | `seatlock.service.lockSeats()`            | User locks seats      |
| `seatReleased` | `seatlock.service.releaseLocks()`         | Manual release / TTL  |
| `seatReleased` | `seatlock.service.releaseSpecificLocks()` | Booking complete      |
| `seatBooked`   | `booking.service.createBooking()`         | Payment success       |
| `seatBooked`   | `booking.service.createGuestBooking()`    | Guest payment success |

### ✅ **Database Schema**

```typescript
SeatLock {
  _id: ObjectId,
  trip: ObjectId → Trip,
  seatNumbers: ["A3", "B4"],
  sessionId: "guest-1735123456-abc",
  user: ObjectId → User (optional),
  expiresAt: Date,  // ← TTL Index on this field
  createdAt: Date,
  updatedAt: Date
}

// TTL Index
{
  expiresAt: 1
}, {
  expireAfterSeconds: 0  // Delete ngay sau expiresAt
}
```

---

## 🚀 **Testing Flow**

### **Test 1: Lock Seats**

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Test lock
curl -X POST http://localhost:4000/api/v1/seat-locks/lock \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "675d8fee9d61ad3be0ed45f5",
    "seatNumbers": ["A3"]
  }'

# Expected: Lock created + Socket event emitted
```

### **Test 2: WebSocket Connection**

```javascript
// Browser console
const socket = io('http://localhost:4000');

socket.on('connected', (data) => {
  console.log('✅ Connected:', data);
});

socket.emit(
  'joinTrip',
  {
    tripId: '675d8fee9d61ad3be0ed45f5',
  },
  (response) => {
    console.log('✅ Joined room:', response);
  }
);

socket.on('seatLocked', (data) => {
  console.log('🔒 Seat locked:', data);
});

socket.on('seatReleased', (data) => {
  console.log('🔓 Seat released:', data);
});
```

### **Test 3: TTL Expiration**

```bash
# Lock seat with 1 minute expiration (for testing)
# Wait 1 minute + ~60 seconds (TTL delay)
# Check MongoDB - lock should be deleted automatically
```

---

## ⚠️ **Potential Issues & Solutions**

### **Issue 1: TTL Index delay**

**Problem:** MongoDB TTL chạy mỗi 60 giây, có thể delay  
**Solution:** Có fallback cleanup service (đã implement)

### **Issue 2: Socket.IO CORS**

**Problem:** Frontend không connect được  
**Solution:** Đã config `cors: { origin: config.frontendUrl }`

### **Issue 3: PM2 Cluster Mode**

**Problem:** Multiple processes → events không broadcast  
**Solution:** Cần Redis Adapter (chưa implement - chỉ cần khi scale)

### **Issue 4: Change Streams requires Replica Set**

**Problem:** Local MongoDB không support Change Streams  
**Solution:** Dùng MongoDB Atlas (đã có) hoặc local replica set

---

## 📝 **Summary**

### ✅ **Đã implement đúng:**

1. ✅ Socket.IO Server với CORS config
2. ✅ HTTP Server + Socket.IO integration
3. ✅ MongoDB TTL Index cho auto-cleanup
4. ✅ Real-time events: lock, release, booked
5. ✅ Change Streams monitoring (optional)
6. ✅ TypeScript types đầy đủ
7. ✅ Error handling và logging

### ⚠️ **Lưu ý khi production:**

- Cần Redis Adapter nếu scale multiple servers
- Cần SSL/TLS cho WSS (WebSocket Secure)
- Monitor Change Streams stability
- Setup proper logging và metrics

---

**Kết luận:** Implementation hoàn chỉnh và đúng best practices! 🎉
