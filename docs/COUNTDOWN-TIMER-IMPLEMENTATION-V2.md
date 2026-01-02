# Tính Năng Đếm Ngược 3 Phút - Hướng Dẫn Cho Team Frontend

> **📅 Cập nhật lần cuối:** 02/01/2026  
> **🔧 Backend Status:** ✅ **HOÀN TẤT & SẴN SÀNG**  
> **🎯 Frontend Status:** 🚧 Chờ triển khai  
> **👨‍💻 Responsible:** Backend Team → Frontend Team

---

## 📋 Business Logic Overview

Khi user truy cập trang booking (`/booking/:tripId`), hệ thống thực hiện:

1. ✅ User chọn ghế → Backend tạo lock **3 phút**
2. ⏱️ Frontend hiển thị countdown **3:00 → 0:00**
3. ⚠️ Cảnh báo khi còn **< 1 phút** (warning notification)
4. 🔄 **Auto-release** locks khi hết thời gian
5. 🔁 Reload seats về **available**

---

## ✅ Backend Đã Hoàn Thành

### 1. **TTL (Time-To-Live) Tự Động**

- ✅ Seat locks có `expiresAt` field
- ✅ MongoDB TTL index tự động cleanup
- ✅ Duration: **3 phút** (configurable)
- 📁 File: [`src/services/seatlock.service.ts`](../src/services/seatlock.service.ts)

### 2. **API Endpoints Mới**

#### 🆕 GET `/api/v1/seat-locks/:tripId/session-info`

**Purpose:** Lấy thông tin lock hiện tại để init countdown timer

**Query Params:**

- `sessionId` (required): Session ID của user

**Response khi có lock:**

```json
{
  "success": true,
  "data": {
    "hasLock": true,
    "expiresAt": "2026-01-02T10:15:00.000Z",
    "remainingSeconds": 120,
    "lockedSeats": ["A1", "A2"]
  }
}
```

**Response khi không có lock:**

```json
{
  "success": true,
  "data": {
    "hasLock": false,
    "expiresAt": null,
    "remainingSeconds": 0,
    "lockedSeats": []
  }
}
```

**Use Cases:**

- ✅ User vào trang booking lần đầu
- ✅ User refresh page
- ✅ User quay lại sau khi đóng tab

---

#### POST `/api/v1/seat-locks/lock`

**Purpose:** Lock ghế và bắt đầu countdown

**Request:**

```json
{
  "tripId": "6957be2f0f3ec4eaf4a64d4a",
  "seatNumbers": ["A1", "A2"],
  "sessionId": "guest-1735826400000-xyz"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "expiresAt": "2026-01-02T10:15:00.000Z",
    "seatNumbers": ["A1", "A2"]
  }
}
```

---

#### GET `/api/v1/seat-locks/:tripId`

**Purpose:** Lấy danh sách tất cả seats đang locked (để disable UI)

**Response:**

```json
{
  "success": true,
  "data": {
    "lockedSeats": ["A1", "A2", "B3"],
    "count": 3
  }
}
```

---

### 3. **WebSocket Real-time Events**

Frontend **BẮT BUỘC** listen các events sau để sync UI real-time:

#### 🔵 `seatLocked`

**When:** Có user lock ghế (bản thân hoặc người khác)

```typescript
{
  tripId: string,
  seatNumbers: string[],
  sessionId: string,
  expiresAt: Date,
  timestamp: Date
}
```

**Action:**

- Nếu `sessionId === mySessionId` → Start countdown
- Update seat map UI

---

#### 🔴 `seatReleased`

**When:** Lock được release

```typescript
{
  tripId: string,
  seatNumbers: string[],
  sessionId: string,
  reason: "expired" | "manual" | "booked",
  timestamp: Date
}
```

**Action:**

- Nếu `reason === "expired"` và là session của mình → **RELOAD SEATS**
- Clear countdown timer
- Update seat map

---

#### 🟡 `seatLockExpiring` (MỚI!)

**When:** Còn < 1 phút (backend emit tự động mỗi 30s)

```typescript
{
  tripId: string,
  sessionId: string,
  seatNumbers: string[],
  remainingSeconds: number, // VD: 58
  message: "Your seat lock will expire in 58 seconds",
  timestamp: Date
}
```

**Action Required:**

- ⚠️ Hiển thị warning toast/notification
- 🔴 Đổi màu countdown thành đỏ
- 🔊 Play sound alert (optional)
- 🔄 Sync lại countdown với `remainingSeconds` từ server

---

### 4. **Cron Job Tự Động**

Backend đã setup cron job:

- ⚙️ Runs every **30 seconds**
- 🔍 Finds locks expiring < 60 seconds
- 📤 Emits `seatLockExpiring` event
- 📁 File: [`src/jobs/seatLockExpiry.job.ts`](../src/jobs/seatLockExpiry.job.ts)

---

## 🎯 Frontend Implementation Guide

### Step 1: Setup Session ID

```javascript
// Tạo hoặc lấy session ID từ localStorage
let sessionId = localStorage.getItem('sessionId');

if (!sessionId) {
  sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('sessionId', sessionId);
}

// Nếu user logged in, có thể dùng userId
// sessionId = currentUser.id;
```

---

### Step 2: Connect WebSocket & Join Trip Room

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
});

// Join trip room để nhận real-time updates
socket.emit('joinTrip', { tripId, sessionId }, (response) => {
  console.log('✅ Joined trip room:', response);
});

// Cleanup khi component unmount
useEffect(() => {
  return () => {
    socket.emit('leaveTrip', { tripId });
    socket.disconnect();
  };
}, []);
```

---

### Step 3: Check Existing Lock (Page Load)

```javascript
const checkExistingLock = async () => {
  try {
    const response = await fetch(`/api/v1/seat-locks/${tripId}/session-info?sessionId=${sessionId}`);
    const { data } = await response.json();

    if (data.hasLock && data.remainingSeconds > 0) {
      console.log('🔄 Existing lock found, resuming countdown...');
      startCountdown(data.remainingSeconds);
      highlightLockedSeats(data.lockedSeats);
    }
  } catch (error) {
    console.error('❌ Failed to check existing lock:', error);
  }
};

// Call when component mounts
useEffect(() => {
  checkExistingLock();
}, []);
```

---

### Step 4: Lock Seats (User Click)

```javascript
const lockSeats = async (seatNumbers) => {
  try {
    const response = await fetch('/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, seatNumbers, sessionId }),
    });

    if (!response.ok) throw new Error('Failed to lock seats');

    const { data } = await response.json();

    // Tính thời gian còn lại chính xác
    const remainingMs = new Date(data.expiresAt) - new Date();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    startCountdown(remainingSeconds);
    console.log(`✅ Locked ${seatNumbers.length} seat(s) for ${remainingSeconds}s`);
  } catch (error) {
    console.error('❌ Lock error:', error);
    alert(error.message);
  }
};

// Usage
lockSeats(['A1', 'A2']);
```

---

### Step 5: Countdown Timer Implementation

```javascript
let countdownInterval = null;
let remainingTime = 0;

const startCountdown = (seconds) => {
  remainingTime = seconds;

  // Clear existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update UI immediately
  updateCountdownUI(remainingTime);

  // Start interval
  countdownInterval = setInterval(() => {
    remainingTime--;

    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
      handleCountdownExpired();
    } else {
      updateCountdownUI(remainingTime);
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  remainingTime = 0;
};

const updateCountdownUI = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;

  const timerElement = document.getElementById('countdown-timer');
  if (timerElement) {
    timerElement.textContent = timeString;

    // Thêm class warning khi < 1 phút
    if (seconds <= 60) {
      timerElement.classList.add('warning', 'text-red-600', 'font-bold');
    } else {
      timerElement.classList.remove('warning', 'text-red-600', 'font-bold');
    }
  }
};

const handleCountdownExpired = () => {
  console.warn('⏰ Countdown expired');

  // Show notification
  showNotification({
    type: 'warning',
    message: 'Your seat reservation has expired. Please select seats again.',
  });

  // Reload page after 2 seconds
  setTimeout(() => {
    window.location.reload();
  }, 2000);
};
```

---

### Step 6: WebSocket Event Listeners

```javascript
// Event: Seat locked
socket.on('seatLocked', (data) => {
  console.log('🔒 seatLocked:', data);

  if (data.sessionId === sessionId) {
    // Lock của chính mình
    const remainingMs = new Date(data.expiresAt) - new Date();
    const remainingSeconds = Math.floor(remainingMs / 1000);
    startCountdown(remainingSeconds);
  }

  // Update seat map UI (mark as locked)
  markSeatsAsLocked(data.seatNumbers);
});

// Event: Seat released
socket.on('seatReleased', (data) => {
  console.log('🔓 seatReleased:', data);

  if (data.sessionId === sessionId && data.reason === 'expired') {
    // Lock của mình đã hết hạn
    stopCountdown();
    handleCountdownExpired();
  }

  // Update seat map UI (mark as available)
  markSeatsAsAvailable(data.seatNumbers);
});

// Event: Seat lock expiring (WARNING - < 1 minute)
socket.on('seatLockExpiring', (data) => {
  console.warn('⚠️ seatLockExpiring:', data);

  if (data.sessionId === sessionId) {
    // Sync countdown với server (tránh drift)
    remainingTime = data.remainingSeconds;
    updateCountdownUI(remainingTime);

    // Show warning toast
    showWarning({
      title: 'Time Running Out!',
      message: `Only ${data.remainingSeconds} seconds left to complete booking!`,
      type: 'warning',
    });

    // Optional: Play alert sound
    playAlertSound();
  }
});
```

---

### Step 7: React Component Example

```jsx
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const CountdownTimer = ({ tripId, sessionId }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    // 1. Check existing lock
    const checkLock = async () => {
      const res = await fetch(`/api/v1/seat-locks/${tripId}/session-info?sessionId=${sessionId}`);
      const { data } = await res.json();

      if (data.hasLock) {
        setRemainingSeconds(data.remainingSeconds);
        setIsActive(true);
      }
    };

    checkLock();

    // 2. Setup WebSocket
    const socket = io('http://localhost:3000');
    socket.emit('joinTrip', { tripId, sessionId });

    socket.on('seatLocked', (data) => {
      if (data.sessionId === sessionId) {
        const remaining = Math.floor((new Date(data.expiresAt) - new Date()) / 1000);
        setRemainingSeconds(remaining);
        setIsActive(true);
      }
    });

    socket.on('seatLockExpiring', (data) => {
      if (data.sessionId === sessionId) {
        setRemainingSeconds(data.remainingSeconds);
        setIsWarning(true);
      }
    });

    socket.on('seatReleased', (data) => {
      if (data.sessionId === sessionId && data.reason === 'expired') {
        setIsActive(false);
        setRemainingSeconds(0);
        window.location.reload();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [tripId, sessionId]);

  // 3. Countdown interval
  useEffect(() => {
    if (!isActive || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remainingSeconds]);

  // 4. Warning state
  useEffect(() => {
    setIsWarning(remainingSeconds <= 60 && remainingSeconds > 0);
  }, [remainingSeconds]);

  if (!isActive || remainingSeconds === 0) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div
      className={`
        fixed top-4 right-4 p-4 rounded-lg shadow-lg
        ${isWarning ? 'bg-red-50 border-2 border-red-500' : 'bg-blue-50 border-2 border-blue-500'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{isWarning ? '⚠️' : '⏱️'}</div>
        <div>
          <div className="text-sm font-medium text-gray-600">Time Remaining</div>
          <div
            className={`
              text-3xl font-bold
              ${isWarning ? 'text-red-600 animate-pulse' : 'text-blue-600'}
            `}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>
      {isWarning && <div className="mt-2 text-sm text-red-600 font-medium">⚠️ Hurry! Complete your booking now!</div>}
    </div>
  );
};

export default CountdownTimer;
```

---

## 🔄 Flow Diagrams

### Kịch Bản 1: User Chọn Ghế Mới

```
1. User vào /booking/:tripId
   └─> Frontend: GET /seat-locks/:tripId/session-info
       ├─> hasLock: false → Hiển thị seat map bình thường
       └─> hasLock: true → Tiếp tục countdown

2. User click ghế A1, A2
   └─> Frontend: POST /seat-locks/lock
       └─> Backend: Tạo lock, expiresAt = now + 3min
           └─> Emit: seatLocked
               └─> Frontend: Start countdown (180s)

3. Mỗi 30 giây
   └─> Backend Cron: Check locks < 60s
       └─> Emit: seatLockExpiring (remainingSeconds: 58)
           └─> Frontend: Show warning toast

4a. User hoàn tất booking
    └─> Lock deleted → Emit: seatReleased (reason: "booked")

4b. Hết 3 phút
    └─> MongoDB TTL cleanup → Emit: seatReleased (reason: "expired")
        └─> Frontend: Reload page
```

### Kịch Bản 2: User Refresh Page

```
1. User refresh /booking/:tripId
   └─> Frontend: GET /seat-locks/:tripId/session-info
       ├─> hasLock: true, remainingSeconds: 120
       │   └─> Resume countdown từ 120s
       └─> hasLock: false
           └─> Seat map trạng thái ban đầu
```

---

## 📊 Testing Checklist

### Frontend Cần Test

- [ ] Countdown starts khi lock seats thành công
- [ ] Countdown hiển thị format `3:00` → `0:00`
- [ ] Màu đổi thành đỏ khi < 1 phút
- [ ] Warning toast hiện khi nhận `seatLockExpiring` event
- [ ] Countdown sync chính xác với server
- [ ] Page reload khi hết thời gian
- [ ] Existing lock được resume sau refresh
- [ ] Multiple tabs sync countdown
- [ ] WebSocket reconnect khi mất kết nối

### Backend Testing (Đã hoàn thành ✅)

- [x] Lock creation with 3-minute TTL
- [x] Cron job emits warning at < 60s
- [x] Auto-cleanup expired locks
- [x] WebSocket events emit correctly
- [x] API `/session-info` returns accurate data

---

## ⚙️ Configuration

### Backend Config

File: [`src/services/seatlock.service.ts`](../src/services/seatlock.service.ts)

```typescript
const LOCK_DURATION_MINUTES = 3; // Thay đổi nếu cần
```

File: [`src/jobs/seatLockExpiry.job.ts`](../src/jobs/seatLockExpiry.job.ts)

```typescript
// Warning threshold: 60 seconds (1 minute)
const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

// Cron schedule: every 30 seconds
cron.schedule('*/30 * * * * *', ...);
```

### Frontend Config

```javascript
const CONFIG = {
  COUNTDOWN_UPDATE_INTERVAL: 1000, // 1 second
  WARNING_THRESHOLD: 60, // 1 minute
  AUTO_RELOAD_ON_EXPIRY: true,
  SOCKET_URL: 'http://localhost:3000',
};
```

---

## 📚 API Reference Summary

| Endpoint                                  | Method | Purpose                          |
| ----------------------------------------- | ------ | -------------------------------- |
| `/api/v1/seat-locks/lock`                 | POST   | Lock seats (start countdown)     |
| `/api/v1/seat-locks/:tripId/session-info` | GET    | Get lock info & remainingSeconds |
| `/api/v1/seat-locks/release`              | POST   | Release locks manually           |
| `/api/v1/seat-locks/:tripId`              | GET    | Get all locked seats for trip    |
| `/api/v1/seat-locks/extend`               | POST   | Extend lock duration (nếu cần)   |

---

## 🎨 UI/UX Recommendations

1. **Timer Position:** Fixed top-right hoặc floating component
2. **Color Scheme:**
   - 🟢 Green/Blue: > 1 phút
   - 🟡 Yellow: 60-90 giây
   - 🔴 Red + Pulse: < 60 giây
3. **Warning Notification:** Toast/modal khi còn 1 phút
4. **Progress Bar:** Optional visual progress
5. **Sound Alert:** Beep sound khi < 30 giây (opt-in)
6. **Accessibility:** Screen reader announcements

---

## ❓ FAQ

**Q: Frontend có cần poll API liên tục không?**  
**A:** Không! Chỉ cần:

- 1 lần gọi API khi page load (check existing lock)
- Tự countdown bằng `setInterval`
- Listen WebSocket events để sync

**Q: Nếu user đóng tab rồi mở lại?**  
**A:** `sessionId` được lưu trong `localStorage`, khi mở lại:

- Call API `/session-info` để lấy `remainingSeconds`
- Resume countdown từ thời gian còn lại

**Q: Nhiều tabs cùng lúc sao?**  
**A:** Tất cả tabs dùng chung `sessionId`:

- Share lock với nhau
- WebSocket events sync UI giữa các tabs

**Q: Lock có extend được không?**  
**A:** Có API `/extend` nhưng cần product decision có cho phép hay không.

**Q: Backend emit event bao nhiêu lần cho warning?**  
**A:** Chỉ 1 lần (khi detect lock < 60s lần đầu). Sau đó set `reminderSent: true`.

---

## 🚀 Next Steps for Frontend

1. ✅ Implement session ID management
2. ✅ Setup WebSocket connection
3. ✅ Create countdown timer component
4. ✅ Add event listeners (seatLocked, seatReleased, seatLockExpiring)
5. ✅ Implement warning notifications
6. ✅ Handle expired state (reload/clear)
7. ✅ Test all scenarios (new lock, refresh, expired)
8. ✅ Add UI/UX enhancements (colors, animations)

---

**Kết luận:** Backend đã hoàn thành 100%! Frontend chỉ cần implement UI countdown timer và lắng nghe WebSocket events. 🎉

**Contact Backend Team:** Nếu có vấn đề hoặc cần support, ping team backend!
