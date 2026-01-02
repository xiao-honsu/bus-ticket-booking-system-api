# Tính Năng Đếm Ngược 3 Phút - Hướng Dẫn Backend & Frontend

> **📅 Cập nhật lần cuối:** 02/01/2026  
> **🔧 Backend Status:** ✅ **HOÀN TẤT & SẴN SÀNG**  
> **🎯 Frontend Status:** 🚧 Chờ triển khai

---

## 📋 Tổng Quan Business Logic

Khi user truy cập vào trang booking của một trip, hệ thống sẽ:

1. **Kích hoạt countdown timer 3 phút** ngay khi user chọn ghế
2. **Hiển thị thời gian còn lại** trên UI (3:00 → 0:00)
3. **Tự động release locks** sau 3 phút nếu user chưa hoàn tất booking
4. **Cảnh báo user** khi còn 1 phút (warning notification)
5. **Auto-reload seats** về available khi hết thời gian

---

## ✅ Backend Đã Hoàn Thành

### 1. **TTL (Time-To-Live) Tự Động**

- Seat locks có `expiresAt` field tự động tính toán
- MongoDB TTL index tự động xóa locks hết hạn (không cần manual cleanup)
- Duration: **3 phút** (`LOCK_DURATION_MINUTES = 3`)
- File: [`src/services/seatlock.service.ts`](../src/services/seatlock.service.ts)

### 2. **API Endpoints**

#### 🆕 GET `/api/v1/seat-locks/:tripId/session-info?sessionId=xxx`

**Purpose:** Lấy thông tin lock của session hiện tại để khởi tạo countdown timer

**Query Parameters:**

- `sessionId` (required): Session ID của user

**Response Success (200):**

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

**Response Success (200):**

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

**⚡ Use Case:**

```javascript
// Frontend gọi API này khi:
// 1. User vào trang booking lần đầu
// 2. User refresh page
// 3. User quay lại sau khi đóng tab
const response = await fetch(`/api/v1/seat-locks/${tripId}/session-info?sessionId=${sessionId}`);
const { data } = await response.json();

if (data.hasLock) {
  // Bắt đầu countdown với thời gian còn lại chính xác
  startCountdown(data.remainingSeconds);
  highlightLockedSeats(data.lockedSeats);
}
```

---

#### POST `/api/v1/seat-locks/lock`

**Purpose:** Lock ghế và bắt đầu countdown 3 phút

**Request Body:**

```json
{
  "tripId": "6957be2f0f3ec4eaf4a64d4a",
  "seatNumbers": ["A1", "A2"],
  "sessionId": "guest-1735826400000-xyz"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Seats locked successfully",
  "data": {
    "trip": "6957be2f0f3ec4eaf4a64d4a",
    "seatNumbers": ["A1", "A2"],
    "sessionId": "guest-1735826400000-xyz",
    "expiresAt": "2026-01-02T10:15:00.000Z",
    "createdAt": "2026-01-02T10:12:00.000Z"
  },
  "sessionId": "guest-1735826400000-xyz"
}
```

---

#### GET `/api/v1/seat-locks/:tripId`

**Purpose:** Lấy danh sách tất cả seats đang bị lock của trip (để UI disable)

**Response:**

```json
{
  "success": true,
  "data": {
    "tripId": "6957be2f0f3ec4eaf4a64d4a",
    "lockedSeats": ["A1", "A2", "B3", "C4"],
    "count": 4
  }
}
```

---

### 3. **WebSocket Real-time Events**

Backend tự động emit các events sau qua Socket.IO. Frontend **BẮT BUỘC** phải listen để đồng bộ UI real-time.

#### 🔵 Event: `seatLocked`

**Trigger:** Khi có user lock ghế (bản thân hoặc user khác)

**Payload:**

**Payload:**

```typescript
{
  tripId: "6957be2f0f3ec4eaf4a64d4a",
  seatNumbers: ["A1", "A2"],
  sessionId: "guest-xxx",
  userId?: "user-id-if-logged-in",
  expiresAt: "2026-01-02T10:15:00.000Z",
  lockedBy: "guest" | "user",
  timestamp: "2026-01-02T10:12:00.000Z"
}
```

---

#### 🔴 Event: `seatReleased`

**Trigger:** Khi lock được release (hết hạn, user bỏ chọn, hoặc đã booking)

**Payload:**

```typescript
{
  tripId: "6957be2f0f3ec4eaf4a64d4a",
  seatNumbers: ["A1", "A2"],
  sessionId: "guest-xxx",
  reason: "expired" | "manual" | "booked",
  timestamp: "2026-01-02T10:15:00.000Z"
}
```

**⚠️ Quan trọng:** Khi `reason === "expired"` và `sessionId` là của bản thân → **RELOAD SEATS**

---

#### 🟡 Event: `seatLockExpiring` (MỚI - Cảnh Báo 1 Phút)

**Trigger:** Backend cron job tự động emit khi còn < 1 phút (chạy mỗi 30s)

**Payload:**
**Payload:**

```typescript
{
  tripId: "6957be2f0f3ec4eaf4a64d4a",
  sessionId: "guest-xxx",
  seatNumbers: ["A1", "A2"],
  remainingSeconds: 58, // Số giây còn lại
  message: "Your seat lock will expire in 58 seconds",
  timestamp: "2026-01-02T10:14:02.000Z"
}
```

**⚡ Action Required:**

- Hiển thị toast/notification cảnh báo
- Đổi màu countdown thành đỏ
- Play sound alert (optional)
- Đồng bộ lại countdown timer với `remainingSeconds` từ server

---

### 4. **Cron Job Tự Động** (Backend)

**File:** [`src/jobs/seatLockExpiry.job.ts`](../src/jobs/seatLockExpiry.job.ts)

**Cấu hình:**

- **Frequency:** Chạy mỗi 30 giây
- **Logic:** Tìm locks có `expiresAt` trong khoảng `(now, now + 60s)` và chưa gửi reminder
- **Action:** Emit `seatLockExpiring` event qua WebSocket
- **Auto-start:** Được khởi động tự động trong `src/app.ts`

**Log Example:**

```
[Cron] Seat lock expiry warning job scheduled (runs every 30 seconds)
[Cron] Found 2 lock(s) expiring in the next minute
[Cron] Sent expiry warning for session guest-xxx, seats: A1,A2, remaining: 58s
[Socket.IO] Emitted seatLockExpiring to room trip:6957be2f0f3ec4eaf4a64d4a
```

---

## 🎯 Hướng Dẫn Triển Khai Frontend

### ⚙️ Setup & Initialization

#### Bước 1: Tạo/Lấy Session ID

```javascript
// 1. Lấy hoặc tạo sessionId
let sessionId = localStorage.getItem('sessionId');
if (!sessionId) {
  sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('sessionId', sessionId);
}

// 2. Connect Socket.IO
const socket = io('http://localhost:3000');
socket.emit('joinTrip', { tripId });

// 3. Kiểm tra xem session có lock nào không
const checkExistingLock = async () => {
  const response = await fetch(`/api/v1/seat-locks/${tripId}/session-info?sessionId=${sessionId}`);
  const { data } = await response.json();

  if (data.hasLock) {
    // User đã có lock từ trước, tiếp tục countdown
    startCountdown(data.remainingSeconds);
    highlightLockedSeats(data.lockedSeats);
  }
};

checkExistingLock();
```

### Bước 2: Khi User Chọn Ghế (Lock Seats)

```javascript
const lockSeats = async (seatNumbers) => {
  try {
    const response = await fetch('/api/v1/seat-locks/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        seatNumbers,
        sessionId,
      }),
    });

    const { data } = await response.json();

    // Bắt đầu countdown 3 phút (180 giây)
    startCountdown(180);

    // Hoặc dùng expiresAt để tính chính xác
    const remainingMs = new Date(data.expiresAt) - new Date();
    const remainingSeconds = Math.floor(remainingMs / 1000);
    startCountdown(remainingSeconds);
  } catch (error) {
    console.error('Failed to lock seats:', error);
  }
};
```

### Bước 3: Implement Countdown Timer

```javascript
let countdownInterval = null;
let remainingTime = 0;

const startCountdown = (seconds) => {
  remainingTime = seconds;

  // Clear existing countdown if any
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update UI immediately
  updateCountdownUI(remainingTime);

  // Start countdown
  countdownInterval = setInterval(() => {
    remainingTime--;

    if (remainingTime <= 0) {
      // Hết thời gian
      clearInterval(countdownInterval);
      handleCountdownExpired();
    } else {
      updateCountdownUI(remainingTime);
    }
  }, 1000);
};

const updateCountdownUI = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;

  // Update UI element
  document.getElementById('countdown-timer').textContent = timeString;

  // Đổi màu cảnh báo khi còn < 1 phút
  if (seconds <= 60) {
    document.getElementById('countdown-timer').classList.add('text-red-500');
  }
};

const handleCountdownExpired = () => {
  // Hiển thị notification
  alert('Your seat reservation has expired. Please select seats again.');

  // Reload lại seat map
  window.location.reload();
};
```

### Bước 4: Lắng Nghe WebSocket Events

```javascript
// Khi có seat bị lock (bởi user khác hoặc chính mình)
socket.on('seatLocked', (data) => {
  console.log('Seats locked:', data);

  // Nếu là lock của chính mình, bắt đầu/reset countdown
  if (data.sessionId === sessionId) {
    const remainingMs = new Date(data.expiresAt) - new Date();
    const remainingSeconds = Math.floor(remainingMs / 1000);
    startCountdown(remainingSeconds);
  }

  // Update seat map UI
  markSeatsAsLocked(data.seatNumbers);
});

// Khi có seat được release
socket.on('seatReleased', (data) => {
  console.log('Seats released:', data);

  // Nếu là release của chính mình và lý do là expired
  if (data.sessionId === sessionId && data.reason === 'expired') {
    handleCountdownExpired();
  }

  // Update seat map UI
  markSeatsAsAvailable(data.seatNumbers);
});

// Cảnh báo khi còn 1 phút (NEW!)
socket.on('seatLockExpiring', (data) => {
  if (data.sessionId === sessionId) {
    // Hiển thị warning toast/notification
    showWarning(`⚠️ Only ${data.remainingSeconds} seconds left to complete your booking!`);

    // Optional: Play sound alert
    playAlertSound();
  }
});
```

### Bước 5: UI Components Đề Xuất

```jsx
// React Component Example
const CountdownTimer = ({ tripId, sessionId }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    // Fetch initial lock info
    const fetchLockInfo = async () => {
      const res = await fetch(`/api/v1/seat-locks/${tripId}/session-info?sessionId=${sessionId}`);
      const { data } = await res.json();

      if (data.hasLock) {
        setRemainingSeconds(data.remainingSeconds);
      }
    };

    fetchLockInfo();

    // Setup countdown interval
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tripId, sessionId]);

  useEffect(() => {
    setIsWarning(remainingSeconds <= 60);
  }, [remainingSeconds]);

  if (remainingSeconds === 0) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className={`countdown-timer ${isWarning ? 'warning' : ''}`}>
      <div className="timer-icon">⏱️</div>
      <div className="timer-text">
        Time remaining:{' '}
        <strong>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </strong>
      </div>
      {isWarning && <div className="timer-warning">⚠️ Hurry! Your reservation will expire soon!</div>}
    </div>
  );
};
```

## 🔄 Luồng Hoạt Động Hoàn Chỉnh

### Kịch Bản 1: User Chọn Ghế Mới

```
1. User vào /booking/:tripId
   └─> Frontend: Check existing lock qua API
       └─> Không có lock: Hiển thị seat map bình thường
       └─> Có lock: Tiếp tục countdown từ remainingSeconds

2. User click chọn ghế A1, A2
   └─> Frontend: Call API POST /seat-locks/lock
       └─> Backend: Tạo SeatLock với expiresAt = now + 3 phút
       └─> Backend: Emit seatLocked event qua WebSocket
       └─> Frontend: Bắt đầu countdown 180 giây

3. Mỗi giây
   └─> Frontend: Giảm counter, update UI

4. Khi còn 1 phút (60 giây)
   └─> Backend Cron: Phát hiện lock sắp hết hạn
       └─> Emit seatLockExpiring event
       └─> Frontend: Hiển thị warning toast

5a. User hoàn tất booking trước khi hết thời gian
    └─> Seats chuyển sang "booked"
    └─> Lock bị xóa
    └─> Emit seatReleased (reason: "booked")

5b. Hết 3 phút mà user chưa booking
    └─> MongoDB TTL index tự động xóa lock
    └─> Backend: Emit seatReleased (reason: "expired")
    └─> Frontend: Reload page hoặc clear selection
```

### Kịch Bản 2: User Quay Lại Trang Booking (Refresh)

```
1. User refresh page hoặc quay lại sau vài phút
   └─> Frontend: Lấy sessionId từ localStorage
       └─> Call API GET /seat-locks/:tripId/session-info

2a. Lock còn hiệu lực (chưa hết 3 phút)
    └─> Backend: Trả về hasLock: true, remainingSeconds
    └─> Frontend: Tiếp tục countdown từ remainingSeconds
    └─> Highlight các seats đã lock

2b. Lock đã hết hạn
    └─> Backend: Trả về hasLock: false
    └─> Frontend: Seat map về trạng thái ban đầu
```

## 📊 Monitoring & Debugging

### Log Messages Backend

```
[Cron] Seat lock expiry warning job scheduled (runs every 30 seconds)
[Cron] Found 2 lock(s) expiring in the next minute
[Cron] Sent expiry warning for session guest-xxx, seats: A1,A2, remaining: 58s
[Socket.IO] Emitted seatLockExpiring to room trip:xxx
```

### Console Debug Frontend

```javascript
// Enable debug logs
localStorage.setItem('debug', 'socket:*');

// Monitor countdown
setInterval(() => {
  console.log('Countdown remaining:', remainingTime);
}, 5000);
```

## ⚙️ Cấu Hình

### Backend Configuration

File: `src/services/seatlock.service.ts`

```typescript
const LOCK_DURATION_MINUTES = 3; // Thay đổi nếu cần
```

File: `src/jobs/seatLockExpiry.job.ts`

```typescript
// Thay đổi warning threshold (mặc định: 1 phút)
const oneMinuteLater = new Date(now.getTime() + 60 * 1000); // 60 seconds
```

### Frontend Configuration

```javascript
// Countdown interval refresh rate
const COUNTDOWN_UPDATE_INTERVAL = 1000; // 1 second

// Warning threshold (show warning when < this value)
const WARNING_THRESHOLD_SECONDS = 60; // 1 minute

// Auto-reload on expiry
const AUTO_RELOAD_ON_EXPIRY = true;
```

## 🚀 API Reference Summary

| Endpoint                                  | Method | Purpose                          |
| ----------------------------------------- | ------ | -------------------------------- |
| `/api/v1/seat-locks/lock`                 | POST   | Lock seats (bắt đầu countdown)   |
| `/api/v1/seat-locks/:tripId/session-info` | GET    | Lấy thông tin lock & countdown   |
| `/api/v1/seat-locks/release`              | POST   | Release locks thủ công           |
| `/api/v1/seat-locks/:tripId`              | GET    | Lấy tất cả locked seats của trip |
| `/api/v1/seat-locks/extend`               | POST   | Extend lock thêm thời gian       |

## 🎨 UI/UX Recommendations

1. **Countdown Timer**: Hiển thị prominent ở đầu trang
2. **Color Coding**:
   - Green: > 2 phút
   - Yellow: 1-2 phút
   - Red: < 1 phút
3. **Warning Notifications**: Toast/modal khi còn 1 phút
4. **Progress Bar**: Visual progress bar cùng với số
5. **Sound Alert** (optional): Beep khi còn 30 giây

## ❓ FAQ

**Q: Frontend có cần poll API để cập nhật countdown không?**  
A: Không cần. Frontend chỉ cần:

1. Lấy `remainingSeconds` ban đầu từ API
2. Tự countdown bằng setInterval
3. Lắng nghe WebSocket events để sync với server

**Q: Nếu user đóng tab rồi mở lại?**  
A: SessionId được lưu trong localStorage, khi mở lại:

- Call API `session-info` để lấy `remainingSeconds`
- Tiếp tục countdown từ thời gian còn lại

**Q: Lock có thể extend được không?**  
A: Có, dùng API `POST /seat-locks/extend` nhưng cần cân nhắc business logic.

**Q: Nhiều tab cùng lúc?**  
A: Tất cả tabs dùng chung sessionId sẽ share lock. WebSocket events sẽ sync UI giữa các tabs.

---

**Kết luận**: Backend đã sẵn sàng, frontend chỉ cần implement UI countdown và lắng nghe WebSocket events! 🎉
