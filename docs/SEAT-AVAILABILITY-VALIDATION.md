# Kiểm Tra Tính Đúng Đắn: Số Lượng Chỗ Ngồi

**Date:** December 17, 2025  
**Purpose:** Phân tích logic tính toán số chỗ ngồi available/booked/locked

---

## 🔍 Tổng Quan

Hệ thống có 3 nguồn dữ liệu về chỗ ngồi:

1. **Trip.availableSeats** (stored in DB)
2. **Seat Map API** (calculated real-time)
3. **Trip Details API** (calculated real-time)

---

## ⚠️ VẤN ĐỀ PHÁT HIỆN

### **Vấn đề 1: Trip.availableSeats KHÔNG tính seat locks**

```typescript
// ❌ TRONG DATABASE: Trip Model
availableSeats: number; // Chỉ tính: totalSeats - bookedSeats

// ✅ TRONG API RESPONSE: Calculated real-time
available = totalSeats - bookedSeats - lockedSeats;
```

**Hậu quả:**

- `trip.availableSeats` trong DB = 30
- Nhưng thực tế có 5 ghế đang bị lock
- Số ghế thực sự available = 25 (không phải 30)

---

### **Vấn đề 2: Booking Service check sai logic**

```typescript
// ❌ SAI - File: booking.service.ts:80
if (trip.availableSeats < requestedSeats.length) {
  throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough available seats');
}

// Giải thích:
// - trip.availableSeats = 30 (lấy từ DB)
// - Thực tế có 5 ghế đang lock
// - User request 28 ghế
// - Check pass (30 > 28) ✓
// - Nhưng thực tế chỉ còn 25 ghế available!
// - Gây conflict khi create booking
```

**Đúng phải là:**

```typescript
// ✅ ĐÚNG - Cần tính cả locked seats
const lockedSeatsCount = await SeatLock.countDocuments({
  trip: tripId,
  expiresAt: { $gt: new Date() },
});

const actuallyAvailable = trip.availableSeats - lockedSeatsCount;

if (actuallyAvailable < requestedSeats.length) {
  throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough available seats');
}
```

---

### **Vấn đề 3: Trip.availableSeats update khi booking, KHÔNG update khi lock**

```typescript
// ✅ Khi CREATE BOOKING (booking.service.ts:89)
trip.availableSeats -= requestedSeats.length; // Có update

// ❌ Khi LOCK SEATS (seatlock.service.ts)
// KHÔNG có update trip.availableSeats
// → Dẫn đến trip.availableSeats không reflect locked seats
```

---

## 📊 So Sánh 3 API Responses

### **1. GET /trips (List)**

```typescript
// Code: trip.service.ts - queryTrips()
// Aggregation pipeline tính availableSeats

{
  $addFields: {
    availableSeatsCount: {
      $subtract: ['$bus.totalSeats', { $size: '$bookedSeats' }]
    }
  }
}

// Response
{
  "availableSeats": 30  // ❌ KHÔNG tính locked seats
}
```

**Vấn đề:** Không real-time, không tính seat locks.

---

### **2. GET /trips/:id/details**

```typescript
// Code: trip.service.ts:438 - getTripDetails()

const bookedCount = trip.bookedSeats?.length || 0;
const totalSeats = bus?.totalSeats || 0;
const lockedCount = new Set(lockedSeatNumbers).size;
const availableSeats = totalSeats - bookedCount - lockedCount;

// Response
{
  "seatStats": {
    "total": 36,
    "booked": 3,
    "locked": 5,
    "available": 28  // ✅ ĐÚNG - Có tính locked seats
  }
}
```

**Tốt:** Real-time, tính cả locked seats.

---

### **3. GET /trips/:id/seat-map**

```typescript
// Code: trip.service.ts:551 - getSeatMap()

stats: {
  total: bus.totalSeats,
  booked: trip.bookedSeats?.length || 0,
  locked: new Set(allLockedSeats).size,
  available: bus.totalSeats - (trip.bookedSeats?.length || 0) - new Set(allLockedSeats).size,
}

// Response
{
  "stats": {
    "total": 36,
    "booked": 3,
    "locked": 5,
    "available": 28  // ✅ ĐÚNG - Có tính locked seats
  }
}
```

**Tốt:** Real-time, tính cả locked seats.

---

## 🐛 Test Case Phát Hiện Bug

### **Scenario: Double Booking Race Condition**

```
Time | User A                    | User B                    | DB State
-----|---------------------------|---------------------------|-------------------
10:00| -                         | -                         | available: 36
     |                           |                           | booked: 0
     |                           |                           | locked: 0
-----|---------------------------|---------------------------|-------------------
10:01| Lock seats [L1, L2, L3]   | -                         | available: 36 ❌
     | ✓ Success                 |                           | booked: 0
     | Session: "user-a-123"     |                           | locked: 3 (real)
-----|---------------------------|---------------------------|-------------------
10:02| -                         | Lock seats [L4, L5]       | available: 36 ❌
     |                           | ✓ Success                 | booked: 0
     |                           | Session: "user-b-456"     | locked: 5 (real)
-----|---------------------------|---------------------------|-------------------
10:03| GET /trips/:id            | GET /trips/:id            | Response:
     | Response:                 | Response:                 | available: 36 ❌
     | available: 36 ❌          | available: 36 ❌          | (WRONG!)
     | "36 ghế còn trống!"       | "36 ghế còn trống!"       |
-----|---------------------------|---------------------------|-------------------
10:04| -                         | Lock 30 more seats        | available: 36 ❌
     |                           | Request: [L6-L35]         | booked: 0
     |                           |                           | locked: 35 (real)
     |                           | Check: 36 > 30? ✓         | But shows 36!
     |                           | ✓ Lock success (WRONG!)   |
-----|---------------------------|---------------------------|-------------------
10:05| Complete payment          | Complete payment          | CONFLICT!
     | Book [L1, L2, L3]         | Book [L4-L35]             | Total requested: 35
     | ✓ Success                 | Checking...               | Actually available:
     | available: 33             | Check: 33 < 32? ✓         | Should be 33
     |                           | ✓ Success                 |
-----|---------------------------|---------------------------|-------------------
     |                           |                           | available: 1 ✓
     |                           |                           | booked: 35 ✓
     |                           |                           | locked: 0
```

**Vấn đề:**

- User B lock 30 ghế khi thực tế chỉ còn 31 ghế (36 - 5 locked)
- Logic check `trip.availableSeats < requestedSeats` không catch được
- Dẫn đến over-booking

---

## ✅ GIẢI PHÁP ĐỀ XUẤT

### **Fix 1: Sửa Booking Service - Check real available seats**

```typescript
// File: src/services/booking.service.ts

const createBooking = async (bookingBody, sessionId) => {
  const trip = await Trip.findById(bookingBody.trip).populate('bus').populate('route');

  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  const requestedSeats = bookingBody.seatNumbers;

  // ✅ FIX: Calculate REAL available seats (including locks)
  const activeLocks = await SeatLock.find({
    trip: trip._id,
    expiresAt: { $gt: new Date() },
  });

  const lockedSeatsCount = new Set(activeLocks.flatMap((lock) => lock.seatNumbers)).size;

  const bus = trip.bus as any;
  const totalSeats = bus.totalSeats;
  const bookedSeatsCount = trip.bookedSeats.length;
  const actuallyAvailable = totalSeats - bookedSeatsCount - lockedSeatsCount;

  // Check if enough seats actually available
  if (actuallyAvailable < requestedSeats.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough available seats. Available: ${actuallyAvailable}, Requested: ${requestedSeats.length}`
    );
  }

  // Check if seats are locked by other users
  const lockedSeats = await seatLockService.areSeatsLocked(trip._id, requestedSeats);
  if (lockedSeats && sessionId) {
    const ownsLock = await seatLockService.doesSessionOwnLock(trip._id, requestedSeats, sessionId);
    if (!ownsLock) {
      throw new ApiError(httpStatus.CONFLICT, 'One or more seats are locked by another user');
    }
  } else if (lockedSeats) {
    throw new ApiError(httpStatus.CONFLICT, 'One or more seats are locked by another user');
  }

  // Check if seats are already booked
  const alreadyBookedSeats = requestedSeats.filter((seat) => trip.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Seats ${alreadyBookedSeats.join(', ')} are already booked`);
  }

  // Create booking
  const booking = await Booking.create(bookingBody);

  // Update trip's booked seats and available seats
  trip.bookedSeats.push(...requestedSeats);
  trip.availableSeats -= requestedSeats.length;
  await trip.save();

  // Release seat locks after successful booking
  if (sessionId) {
    await seatLockService.releaseSpecificLocks(trip._id, requestedSeats, sessionId);
  }

  return booking;
};
```

---

### **Fix 2: Sửa Lock Seats - Check capacity trước khi lock**

```typescript
// File: src/services/seatlock.service.ts

const lockSeats = async (
  tripId: mongoose.Types.ObjectId,
  seatNumbers: string[],
  sessionId: string,
  userId?: mongoose.Types.ObjectId,
  metadata?: any
): Promise<ISeatLock> => {
  // Verify trip exists
  const trip = await Trip.findById(tripId).populate('bus');
  if (!trip) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Trip not found');
  }

  // ✅ FIX: Calculate real available capacity
  const bus = trip.bus as any;
  const totalSeats = bus.totalSeats;
  const bookedSeatsCount = trip.bookedSeats.length;

  const existingLocks = await SeatLock.find({
    trip: tripId,
    expiresAt: { $gt: new Date() },
  });

  const alreadyLockedCount = new Set(existingLocks.flatMap((lock) => lock.seatNumbers)).size;

  const actuallyAvailable = totalSeats - bookedSeatsCount - alreadyLockedCount;

  // Check if enough capacity
  if (actuallyAvailable < seatNumbers.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough available seats to lock. Available: ${actuallyAvailable}, Requested: ${seatNumbers.length}`
    );
  }

  // Check if any seats are already locked or booked
  const lockedByOthers = await SeatLock.find({
    trip: tripId,
    seatNumbers: { $in: seatNumbers },
    expiresAt: { $gt: new Date() },
    sessionId: { $ne: sessionId }, // Exclude own session
  });

  if (lockedByOthers.length > 0) {
    const lockedSeats = lockedByOthers.flatMap((lock) => lock.seatNumbers);
    throw new ApiError(httpStatus.CONFLICT, `Seats ${lockedSeats.join(', ')} are already locked by another user`);
  }

  // Check if seats are already booked
  const alreadyBookedSeats = seatNumbers.filter((seat) => trip.bookedSeats.includes(seat));
  if (alreadyBookedSeats.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Seats ${alreadyBookedSeats.join(', ')} are already booked`);
  }

  // Set expiration time (10 minutes from now)
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  // Create lock
  try {
    const lock = await SeatLock.create({
      trip: tripId,
      seatNumbers,
      sessionId,
      user: userId,
      expiresAt,
      metadata,
    });

    logger.info(`Seats ${seatNumbers.join(', ')} locked for trip ${tripId} until ${expiresAt}`);
    return lock;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'One or more seats are already locked by another user');
    }
    throw error;
  }
};
```

---

### **Fix 3: Update Trip List API - Tính real-time available**

**Option A: Thêm virtual field (Recommended)**

```typescript
// File: src/models/trip.model.ts

// Add virtual field
tripSchema.virtual('realAvailableSeats').get(async function () {
  const locks = await mongoose.model('SeatLock').find({
    trip: this._id,
    expiresAt: { $gt: new Date() },
  });

  const lockedCount = new Set(locks.flatMap((l) => l.seatNumbers)).size;

  return this.availableSeats - lockedCount;
});
```

**Option B: Thêm warning note trong response**

```typescript
// File: src/services/trip.service.ts - queryTrips()

// Add warning field to each trip
results.forEach((trip) => {
  trip._doc.availableSeatsNote =
    'This number does not include temporarily locked seats. ' +
    'Use GET /trips/:id/seat-map for real-time availability.';
});
```

---

## 📋 CHECKLIST VALIDATION

### **Test Cases Cần Chạy:**

#### **1. Test Lock Seats Capacity**

```bash
# Setup: Trip có 36 ghế, 0 booked, 0 locked

# Test 1: Lock 10 ghế
curl -X POST http://localhost:4000/api/v1/seat-locks/lock \
  -H "Content-Type: application/json" \
  -d '{"tripId":"675b123","seatNumbers":["L1","L2","L3","L4","L5","L6","L7","L8","L9","L10"]}'
# Expected: Success, locked = 10

# Test 2: Lock thêm 30 ghế (exceed capacity)
curl -X POST http://localhost:4000/api/v1/seat-locks/lock \
  -H "Content-Type: application/json" \
  -d '{"tripId":"675b123","seatNumbers":["L11","L12",...,"L40"]}'
# Expected: ❌ Error "Not enough available seats. Available: 26, Requested: 30"
```

#### **2. Test Booking Check**

```bash
# Setup: Trip có 36 ghế, 5 locked, 0 booked

# Test: Book 32 ghế
curl -X POST http://localhost:4000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{"tripId":"675b123","seatNumbers":["L6",...,"L37"]}'
# Expected: ❌ Error "Not enough available seats. Available: 31, Requested: 32"
```

#### **3. Test Concurrent Locks**

```javascript
// Simulate 2 users locking at same time
Promise.all([
  // User A: Lock 20 seats
  fetch('/api/v1/seat-locks/lock', {
    body: JSON.stringify({tripId, seatNumbers: ["L1"..."L20"]})
  }),

  // User B: Lock 20 seats (different seats)
  fetch('/api/v1/seat-locks/lock', {
    body: JSON.stringify({tripId, seatNumbers: ["L21"..."L40"]})
  })
]);

// Expected:
// - User A: Success (20 seats locked)
// - User B: Error "Not enough available seats. Available: 16, Requested: 20"
```

#### **4. Test API Consistency**

```bash
# Setup: Trip 36 ghế, 3 booked, 5 locked

# Check 1: GET /trips/:id
curl http://localhost:4000/api/v1/trips/675b123
# Expected: availableSeats = 33 (hoặc có warning note)

# Check 2: GET /trips/:id/details
curl http://localhost:4000/api/v1/trips/675b123/details
# Expected: seatStats.available = 28 (36 - 3 - 5)

# Check 3: GET /trips/:id/seat-map
curl http://localhost:4000/api/v1/trips/675b123/seat-map
# Expected: stats.available = 28 (36 - 3 - 5)

# Verify: Details và Seat Map phải giống nhau!
```

---

## 🎯 KẾT LUẬN

### **Vấn Đề Hiện Tại:**

1. ❌ `Trip.availableSeats` không tính locked seats
2. ❌ Booking service không check locked seats trước khi book
3. ❌ Lock service không check capacity trước khi lock
4. ❌ Trip list API trả về số không accurate

### **Độ Nghiêm Trọng:**

- **Critical:** Có thể gây double booking
- **Impact:** Ảnh hưởng UX (hiển thị sai số ghế available)
- **Urgency:** Cần fix ngay

### **Giải Pháp:**

✅ Fix booking service - check real available  
✅ Fix lock service - check capacity  
✅ Add warning/note trong trip list API  
✅ Add test cases đầy đủ

---

**Last Updated:** December 17, 2025
