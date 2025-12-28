# Backend Fixes - Real-time Seat Locking Issue

## 📋 Tóm Tắt

Backend đã thực hiện các sửa chữa để hỗ trợ frontend debug vấn đề real-time sync và error handling.

---

## ✅ Các Thay Đổi Đã Thực Hiện

### 1. **Cải Thiện Error Response Format** ✨

**File:** `src/middlewares/error.ts`

**Trước đây:**

```json
{
  "code": 409,
  "message": "Seats A3 are already locked by another user"
}
```

**Bây giờ:**

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Seats A3 are already locked by another user",
  "error": {
    "code": 409,
    "message": "Seats A3 are already locked by another user"
  }
}
```

**Impact cho Frontend:**

- Error object bây giờ có `success: false` flag
- Có thể access error message qua: `error.message` hoặc `error.error.message`
- Dễ dàng parse error hơn trong RTK Query

---

### 2. **Thêm Detailed Logging** 📊

**File:** `src/controllers/seatlock.controller.ts`

**Thêm logs:**

- `[Lock Request]`: Log mỗi request lock seat
- `[Lock Success]`: Xác nhận lock thành công và expiration time
- `[Lock Conflict]`: Chi tiết ghế nào bị conflict

**Ví dụ logs:**

```
[Lock Request] Trip: 675d8fee9d61ad3be0ed45f5, Seats: B2, Session: guest-123
[Lock Success] Seats B2 locked, expires at 2025-12-28T10:35:00.000Z
```

---

### 3. **Cải Thiện Socket.IO Logging** 🔌

**File:** `src/services/socket.service.ts`

**Thêm room client count:**

```typescript
logger.info(`[Socket.IO] ✅ Emitted seatLocked to room trip:675d... (2 clients)`);
```

**File:** `src/config/socket.ts`

**Log khi client join room:**

```
Socket abc123 joined trip room: trip:675d... (now 2 clients in room)
```

**Lợi ích:**

- Backend có thể verify có bao nhiêu client đang lắng nghe
- Nếu `0 clients` → Frontend chưa join room
- Nếu `>1 clients` nhưng không nhận event → Vấn đề ở frontend listener

---

### 4. **Conflict Detection Improvement** 🎯

**File:** `src/services/seatlock.service.ts`

**Cải thiện:**

- Chỉ hiển thị ghế THỰC SỰ bị conflict (không phải tất cả ghế trong lock)
- Log warning khi detect conflict

**Ví dụ:**

```
[Lock Conflict] Seats B2 already locked for trip 675d8fee9d61ad3be0ed45f5
```

---

## 🧪 Testing & Debugging Guide cho Frontend

### **Test 1: Verify Error Response Format**

**Cách test:**

1. Browser 1: Lock ghế B2
2. Browser 2: Lock ghế B2 (sẽ fail)

**Expected response (Browser 2):**

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Seats B2 are already locked by another user",
  "error": {
    "code": 409,
    "message": "Seats B2 are already locked by another user"
  }
}
```

**Frontend cần update error handling:**

```typescript
// ❌ CŨ - có thể fail
const errorMsg = error?.data?.message;

// ✅ MỚI - fallback chain
const errorMsg =
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.error?.message ||
  error?.message ||
  'Failed to lock seat';
```

---

### **Test 2: Verify WebSocket Emit (Backend Logs)**

**Check backend terminal khi Browser 1 lock ghế:**

```bash
# 1. Request received
[Lock Request] Trip: 675d..., Seats: B2, Session: guest-123

# 2. Lock successful
[Lock Success] Seats B2 locked, expires at 2025-12-28T10:35:00.000Z

# 3. Socket event emitted
[Socket.IO] ✅ Emitted seatLocked to room trip:675d... (2 clients): {
  seatNumbers: [ 'B2' ],
  sessionId: 'guest-123',
  expiresAt: 2025-12-28T10:35:00.000Z
}
```

**Nếu thấy `(0 clients)` hoặc `(1 clients)`:**
→ ⚠️ Browser 2 CHƯA join room hoặc connection dropped

---

### **Test 3: Verify Room Join (Backend Logs)**

**Check khi Browser join trip page:**

```bash
Socket abc123 connected: abc123
Socket abc123 joined trip room: trip:675d8fee9d61ad3be0ed45f5 (now 1 clients in room)

# Khi browser 2 join
Socket def456 connected: def456
Socket def456 joined trip room: trip:675d8fee9d61ad3be0ed45f5 (now 2 clients in room)
```

**Nếu KHÔNG thấy log "joined trip room":**
→ ⚠️ Frontend CHƯA emit `socket.emit('joinTrip', { tripId })`

---

## 🔧 Frontend Action Items

### **Ưu Tiên 1: Fix Error Handling**

```typescript
// File: Frontend error handling
try {
  await lockSeat({ tripId, seatNumber });
} catch (error: any) {
  // ✅ Comprehensive error extraction
  const errorMessage =
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.error?.message ||
    error?.message ||
    'Failed to lock seat';

  console.error('Lock error:', {
    fullError: error,
    extractedMessage: errorMessage,
    statusCode: error?.response?.status || error?.status,
  });

  toast.error(errorMessage);
}
```

---

### **Ưu Tiên 2: Verify WebSocket Connection**

```typescript
// Add connection debugging
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('⚠️ Socket disconnected:', reason);
});

// Verify room join
socket.emit('joinTrip', { tripId }, (response) => {
  console.log('✅ Join room response:', response);
});

// Add listener logs
socket.on('seatLocked', (data) => {
  console.log('🔒 Seat locked event received:', data);
  // ... handle logic
});
```

---

### **Ưu Tiên 3: Check Environment Variables**

```typescript
// Verify API URL
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Socket connecting to:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

// Socket connection
const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

---

## 📊 Expected Flow với Logs

### **Scenario: Browser 1 lock B2, Browser 2 thấy update**

#### Backend Logs:

```bash
# Browser 1 joins
Socket abc123 joined trip room: trip:675d... (now 1 clients in room)

# Browser 2 joins
Socket def456 joined trip room: trip:675d... (now 2 clients in room)

# Browser 1 locks B2
[Lock Request] Trip: 675d..., Seats: B2, Session: guest-123
[Lock Success] Seats B2 locked, expires at ...
[Socket.IO] ✅ Emitted seatLocked to room trip:675d... (2 clients): { seatNumbers: ['B2'], ... }
```

#### Frontend Logs (Browser 2):

```bash
✅ Socket connected: def456
✅ Join room response: { success: true, tripId: '675d...', message: '...' }
🔒 Seat locked event received: { tripId: '675d...', seatNumbers: ['B2'], sessionId: 'guest-123', ... }
```

---

## ❌ Troubleshooting

### **Issue 1: Backend shows `(0 clients)` when emitting**

**Root cause:** Frontend chưa join room hoặc connection failed

**Frontend fixes:**

- Verify `socket.emit('joinTrip')` được gọi
- Check `socket.connected` status trước khi join
- Add reconnection logic

---

### **Issue 2: Error message vẫn rỗng `{}`**

**Root cause:** RTK Query serialization hoặc error interceptor

**Frontend fixes:**

- Check RTK Query `baseQuery` error handling
- Log full error object: `console.log('Full error:', JSON.stringify(error, null, 2))`
- Verify axios/fetch response interceptor

---

### **Issue 3: Browser 2 join room nhưng không nhận event**

**Backend verification:**

- Xem backend log có `(2 clients)` không
- Nếu có 2 clients nhưng frontend không nhận → Vấn đề listener

**Frontend fixes:**

- Verify `socket.on('seatLocked')` được gọi TRƯỚC khi joinTrip
- Check listener không bị override hoặc removed
- Verify `useTripRoom` hook lifecycle

---

## 🎯 Next Steps

1. ✅ **Backend hoàn thành**: Error format, logging, socket emit đã OK
2. ⏳ **Frontend cần làm**:
   - [ ] Update error handling với fallback chain
   - [ ] Add WebSocket connection debugging logs
   - [ ] Verify room join lifecycle
   - [ ] Test với 2 browsers và check cả 2 console + backend terminal

---

## 📞 Support

Nếu sau khi làm theo hướng dẫn mà vẫn có vấn đề:

1. Share cả **Frontend console logs** VÀ **Backend terminal logs**
2. Share network tab → WS connection status
3. Share code snippet của:
   - WebSocket connection setup
   - `useTripRoom` hook
   - Error handling trong RTK Query

---

**Ngày cập nhật:** 28/12/2025  
**Version:** Backend v1.1 - Real-time Debugging Support
