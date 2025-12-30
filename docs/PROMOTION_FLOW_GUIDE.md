# 🎟️ PROMOTION SYSTEM - Frontend Integration Guide

## 📋 Tổng Quan Flow

Flow hoàn chỉnh cho hệ thống promotion từ việc hiển thị đến áp dụng vào booking:

```
1. Website hiển thị promotions → User xem danh sách
2. User checkout → Nhập mã promotion code
3. Hệ thống validate → AUTO-COLLECT nếu chưa có → Hiển thị preview discount
4. User confirm checkout → TẠO BOOKING với promotion
5. Backend: Giảm giá + Mark promotion "used"
```

## ⚡ **NEW: Simplified Flow - Auto-Collect**

**Frontend không cần gọi collect API nữa!**

✅ **Before (Old - Complicated):**

```
Step 1: User → Click "Lưu mã" → POST /promotions/:id/collect
Step 2: User → Checkout → POST /promotions/validate
Step 3: User → Confirm → POST /bookings
```

✅ **Now (New - Simple):**

```
Step 1: User → Nhập mã → POST /promotions/validate (auto-collect nếu chưa có)
Step 2: User → Confirm → POST /bookings
```

**Backend tự động collect promotion nếu:**

- User chưa có promotion này
- Promotion còn slot available
- Promotion còn hạn sử dụng

## ⚠️ **QUAN TRỌNG: 2 Bước Áp Dụng Promotion**

### **Bước 1: VALIDATE (Preview + Auto-Collect)**

- API: `POST /api/v1/promotions/validate`
- Mục đích:
  - ✅ **Auto-collect** nếu user chưa có promotion
  - ✅ **Validate** và preview discount
  - ❌ **KHÔNG áp dụng** vào booking (chưa mark "used")
- Trả về: `userPromotionId`, `discountAmount`, `finalAmount`
- Frontend: Hiển thị "Giảm XXXđ" cho user xem

### **Bước 2: CREATE BOOKING (Áp dụng thật)**

- API: `POST /api/v1/bookings` (với `userPromotion` field)
- Mục đích: **Thực sự áp dụng** promotion
- Backend tự động:
  ✅ Validate lại promotion  
  ✅ Tính discount  
  ✅ Tạo booking với giá đã giảm  
  ✅ Mark promotion `isUsed = true`  
  ✅ Increment `actualUsedCount`

**Lý do vẫn giữ 2 bước:**

1. ✅ User xem trước giảm bao nhiêu
2. ✅ User có thể thử nhiều mã khác nhau
3. ✅ Tránh mark "used" nếu user cancel
4. ✅ Đảm bảo promotion chỉ dùng khi booking thành công

### **Visual Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│ CHECKOUT PAGE                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tổng tiền: 500.000đ                                       │
│  ┌─────────────────────────────┐                           │
│  │ Mã: [SUMMER2025]  [Áp dụng] │ ← User nhập mã            │
│  └─────────────────────────────┘                           │
│                                                             │
│  [User bấm "Áp dụng"]                                       │
│           ↓                                                 │
│  ┌──────────────────────────────────────────┐              │
│  │ POST /api/v1/promotions/validate         │              │
│  │ Body: { code, orderAmount }              │              │
│  └──────────────────────────────────────────┘              │
│           ↓                                                 │
│  ┌──────────────────────────────────────────┐              │
│  │ Response: {                               │              │
│  │   userPromotion._id: "xyz123",           │              │
│  │   discountAmount: 50000,                 │              │
│  │   finalAmount: 450000                    │              │
│  │ }                                        │              │
│  └──────────────────────────────────────────┘              │
│           ↓                                                 │
│  ✓ Áp mã thành công!                                       │
│  Tổng tiền:           500.000đ                             │
│  Giảm giá:            -50.000đ  ← PREVIEW (chưa áp thật)  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                             │
│  Thành tiền:          450.000đ                             │
│                                                             │
│  [User bấm "Xác nhận đặt vé"]                              │
│           ↓                                                 │
│  ┌──────────────────────────────────────────┐              │
│  │ POST /api/v1/bookings                    │              │
│  │ Body: {                                  │              │
│  │   trip, passengers,                      │              │
│  │   userPromotion: "xyz123"  ← QUAN TRỌNG!│              │
│  │ }                                        │              │
│  └──────────────────────────────────────────┘              │
│           ↓                                                 │
│  Backend tự động:                                           │
│  1. Validate lại promotion                                  │
│  2. Tính discount                                           │
│  3. Tạo booking với totalAmount = 450000                   │
│  4. Mark promotion "isUsed = true"                         │
│  5. Increment actualUsedCount                              │
│           ↓                                                 │
│  ✅ Booking created với giá đã giảm!                       │
│  ✅ Promotion đã được mark "used"!                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 COMPLETE FLOW CHI TIẾT

### **Phase 1: Hiển thị Promotions trên Website**

#### **API: GET /api/v1/promotions/active**

Lấy danh sách promotions đang hoạt động để hiển thị trên trang chủ/banner.

**Request:**

```http
GET /api/v1/promotions/active?page=1&limit=10
```

**Query Parameters:**

- `page` (optional): Số trang, mặc định = 1
- `limit` (optional): Số lượng/trang, mặc định = 10

**Response Success (200):**

```json
{
  "results": [
    {
      "_id": "677295a8b2c3d4e5f6789012",
      "code": "SUMMER2025",
      "title": "Summer Flash Sale",
      "description": "Giảm giá mùa hè - Áp dụng cho tất cả tuyến đường",
      "discountType": "percentage",
      "discountValue": 20,
      "maxDiscount": 50000,
      "minOrderValue": 100000,
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-08-31T23:59:59.999Z",
      "usageLimit": 1000,
      "collectedCount": 245,
      "actualUsedCount": 89,
      "remainingUsage": 755,
      "perUserLimit": 1,
      "isActive": true,
      "imageUrl": "https://example.com/promo-summer.jpg",
      "terms": "Áp dụng cho vé từ 100.000đ trở lên",
      "isValid": true,
      "isExpired": false,
      "usageRate": 36
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "totalResults": 25
}
```

**Frontend Implementation:**

```typescript
// Hiển thị promotion cards
const fetchActivePromotions = async () => {
  const response = await fetch(`${API_URL}/promotions/active?page=1&limit=10`);
  const data = await response.json();

  data.results.forEach((promo) => {
    // Hiển thị card với:
    // - Title, description, imageUrl
    // - Discount: "Giảm 20%" hoặc "Giảm 50.000đ"
    // - Còn lại: remainingUsage
    // - Button "Lưu mã" → trigger collect API
  });
};
```

---

### **Phase 2: User Collect Promotion (OPTIONAL)**

#### **API: POST /api/v1/promotions/:promotionId/collect**

⚠️ **LƯU Ý:** API này giờ là **OPTIONAL** - không bắt buộc phải gọi!

- ✅ Nếu user muốn "save" promotion trước để dùng sau → Gọi API này
- ✅ Nếu user nhập mã trực tiếp lúc checkout → **Bỏ qua**, validate API sẽ auto-collect

**Khi nào dùng collect API:**

- User duyệt trang promotions và muốn lưu mã vào "My Promotions"
- User muốn quản lý danh sách promotions đã lưu
- UI có tính năng "Promotion Wallet"

**Khi nào KHÔNG cần:**

- User nhập mã trực tiếp ở checkout page
- Validate API sẽ tự động collect

User nhấn "Lưu mã" để collect promotion vào tài khoản (optional).

**Authentication:** Required (Bearer Token)

**Request:**

```http
POST /api/v1/promotions/677295a8b2c3d4e5f6789012/collect
Authorization: Bearer <access_token>
```

**Response Success (201):**

```json
{
  "_id": "677295b1c4d5e6f789abc123",
  "userId": "67729580a1b2c3d4e5f67890",
  "promotionId": {
    "_id": "677295a8b2c3d4e5f6789012",
    "code": "SUMMER2025",
    "title": "Summer Flash Sale",
    "discountType": "percentage",
    "discountValue": 20,
    "maxDiscount": 50000,
    "minOrderValue": 100000
  },
  "collectedAt": "2025-12-30T10:30:00.000Z",
  "isUsed": false,
  "isExpired": false
}
```

**Error Responses:**

**400 - Promotion không còn slot:**

```json
{
  "code": 400,
  "message": "Promotion usage limit reached"
}
```

**400 - User đã collect:**

```json
{
  "code": 400,
  "message": "You have already collected this promotion"
}
```

**400 - Promotion hết hạn:**

```json
{
  "code": 400,
  "message": "Promotion has expired"
}
```

**Frontend Implementation:**

```typescript
const collectPromotion = async (promotionId: string) => {
  try {
    const response = await fetch(`${API_URL}/promotions/${promotionId}/collect`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      toast.success('Lưu mã thành công!');
      // Refresh danh sách "My Promotions"
    } else {
      const error = await response.json();
      toast.error(error.message);
    }
  } catch (error) {
    toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
  }
};
```

---

### **Phase 3: Xem Promotions Đã Collect**

#### **API: GET /api/v1/promotions/my-promotions**

Lấy danh sách promotions user đã collect để hiển thị trong profile/wallet.

**Authentication:** Required

**Request:**

```http
GET /api/v1/promotions/my-promotions?status=available&page=1&limit=10
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `status`: `available` | `used` | `expired` | `all` (default: `all`)
- `page` (optional): Số trang
- `limit` (optional): Số lượng/trang

**Response Success (200):**

```json
{
  "results": [
    {
      "_id": "677295b1c4d5e6f789abc123",
      "userId": "67729580a1b2c3d4e5f67890",
      "promotionId": "677295a8b2c3d4e5f6789012",
      "promotion": {
        "_id": "677295a8b2c3d4e5f6789012",
        "code": "SUMMER2025",
        "title": "Summer Flash Sale",
        "description": "Giảm giá mùa hè",
        "discountType": "percentage",
        "discountValue": 20,
        "maxDiscount": 50000,
        "minOrderValue": 100000,
        "endDate": "2025-08-31T23:59:59.999Z"
      },
      "collectedAt": "2025-12-30T10:30:00.000Z",
      "isUsed": false,
      "isExpired": false
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 3
}
```

**Frontend Implementation:**

```typescript
const fetchMyPromotions = async (status = 'available') => {
  const response = await fetch(`${API_URL}/promotions/my-promotions?status=${status}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();

  // Hiển thị tabs: Available | Used | Expired
  // Render promotion cards với status tương ứng
  return data.results;
};
```

---

### **Phase 4: Checkout - Validate Promotion (AUTO-COLLECT + PREVIEW)**

#### **API: POST /api/v1/promotions/validate**

⚠️ **LƯU Ý QUAN TRỌNG - UPDATED FLOW:**

✅ **API này sẽ TỰ ĐỘNG:**

1. **Kiểm tra** user đã có promotion chưa
2. **Auto-collect** nếu chưa có (không cần gọi collect API riêng!)
3. **Validate** và tính discount
4. **Trả về** preview discount

❌ **CHƯA áp dụng thật:**

- Promotion vẫn `isUsed = false`
- Chỉ mark "used" khi tạo booking thành công

**Authentication:** Required

**Request:**

```http
POST /api/v1/promotions/validate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "SUMMER2025",
  "orderAmount": 500000
}
```

**Request Body:**

- `code` (string, required): Mã promotion code
- `orderAmount` (number, required): Tổng tiền trước giảm giá

**Response Success (200):**

```json
{
  "data": {
    "promotion": {
      "_id": "677295a8b2c3d4e5f6789012",
      "code": "SUMMER2025",
      "title": "Summer Flash Sale",
      "discountType": "percentage",
      "discountValue": 20,
      "maxDiscount": 50000,
      "minOrderValue": 100000
    },
    "userPromotion": {
      "_id": "677295b1c4d5e6f789abc123",
      "userId": "67729580a1b2c3d4e5f67890",
      "promotionId": "677295a8b2c3d4e5f6789012",
      "isUsed": false
    },
    "discountAmount": 50000,
    "finalAmount": 450000
  }
}
```

**Error Responses:**

**404 - Mã không tồn tại:**

```json
{
  "code": 404,
  "message": "Invalid promotion code"
}
```

**400 - Chưa collect mã:**

```json
{
  "code": 400,
  "message": "You have not collected this promotion or it has been used/expired"
}
```

**400 - Không đủ điều kiện (min order):**

```json
{
  "code": 400,
  "message": "Minimum order value is 100,000₫"
}
```

**Frontend Implementation:**

```typescript
// Trong checkout page
const validatePromoCode = async (code: string, orderAmount: number) => {
  try {
    const response = await fetch(`${API_URL}/promotions/validate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, orderAmount }),
    });

    if (response.ok) {
      const result = await response.json();
      const data = result.data; // ⚠️ Response có wrapper "data"

      // ✅ AUTO-COLLECTED: Nếu user chưa có promotion, đã được tự động collect!
      // ⚠️ CHỈ HIỂN THỊ PREVIEW - CHƯA ÁP DỤNG THẬT!
      setDiscountAmount(data.discountAmount);
      setFinalAmount(data.finalAmount);
      setUserPromotionId(data.userPromotion._id); // Lưu để dùng ở Phase 5
      setAppliedPromotionCode(code); // Lưu code để hiển thị

      toast.success(`Áp mã thành công! Giảm ${formatCurrency(data.discountAmount)}`);

      // ⚠️ NOTE: Promotion CHỈ thực sự được áp dụng khi user confirm booking (Phase 5)
    } else {
      const error = await response.json();
      toast.error(error.message);
    }
  } catch (error) {
    toast.error('Không thể áp dụng mã');
  }
};
```

---

### **Phase 5: Tạo Booking với Promotion (ÁP DỤNG THẬT)**

#### **API: POST /api/v1/bookings**

✅ **ĐÂY MỚI LÀ BƯỚC ÁP DỤNG PROMOTION THỰC SỰ:**

- Giá sẽ được giảm trong database
- Promotion được mark "isUsed = true"
- User không thể dùng lại promotion này nữa

Tạo booking và tự động áp dụng promotion đã validate ở Phase 4.

**Authentication:** Required

**Request:**

```http
POST /api/v1/bookings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "trip": "677295c0d1e2f3a4b5c67890",
  "passengers": [
    {
      "name": "Nguyen Van A",
      "age": 30,
      "gender": "male",
      "seatNumber": "A1"
    }
  ],
  "contactPhone": "0912345678",
  "contactEmail": "user@example.com",
  "userPromotion": "677295b1c4d5e6f789abc123",
  "sessionId": "session_xyz123"
}
```

**Request Body:**

- `trip` (ObjectId): ID của chuyến xe
- `passengers` (array): Danh sách hành khách
- `contactPhone`, `contactEmail`: Thông tin liên hệ
- `userPromotion` (ObjectId, optional): **ID của UserPromotion** (lấy từ validate API)
- `sessionId`: Session ID để verify seat lock

**Response Success (201):**

```json
{
  "_id": "677295d5e6f7a8b9c0d12345",
  "referenceNumber": "BKG-1735559125-ABC123",
  "user": "67729580a1b2c3d4e5f67890",
  "trip": {...},
  "passengers": [...],
  "totalPassengers": 1,
  "originalAmount": 500000,
  "discountAmount": 50000,
  "totalAmount": 450000,
  "appliedPromotion": "677295a8b2c3d4e5f6789012",
  "userPromotion": "677295b1c4d5e6f789abc123",
  "status": "pending",
  "payment": {
    "amount": 450000,
    "currency": "VND",
    "status": "pending",
    "method": "payos"
  },
  "createdAt": "2025-12-30T10:45:00.000Z"
}
```

**Frontend Implementation:**

```typescript
const createBookingWithPromotion = async (bookingData) => {
  const payload = {
    trip: selectedTrip._id,
    passengers: selectedSeats.map((seat) => ({
      name: seat.passengerName,
      age: seat.passengerAge,
      gender: seat.passengerGender,
      seatNumber: seat.number,
    })),
    contactPhone: contactForm.phone,
    contactEmail: contactForm.email,
    userPromotion: userPromotionId, // ⚠️ QUAN TRỌNG: Lấy từ validate API (Phase 4)
    sessionId: sessionStorage.getItem('sessionId'),
  };

  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    const booking = await response.json();

    // ✅ Promotion đã được áp dụng thành công!
    // - booking.discountAmount: Số tiền đã giảm
    // - booking.totalAmount: Giá sau khi giảm
    // - Promotion đã được mark "used"

    console.log(`Đã áp promotion: ${booking.appliedPromotion}`);
    console.log(`Giảm: ${booking.discountAmount}đ`);
    console.log(`Tổng tiền: ${booking.totalAmount}đ`);

    // Redirect to payment
    window.location.href = `/payment/${booking.referenceNumber}`;
  }
};
```

**⚠️ CHÚ Ý:**

- **PHẢI có** `userPromotion` trong request body (lấy từ Phase 4)
- Nếu không có → booking tạo bình thường, không giảm giá
- Backend tự động:
  1. Validate lại promotion
  2. Tính discount
  3. Tạo booking với giá đã giảm
  4. Mark promotion "isUsed = true"
  5. Increment `actualUsedCount`

````

---

## 🎯 CÁC API BỔ SUNG

### **API: GET /api/v1/promotions/by-code/:code**

Lấy thông tin chi tiết promotion theo code (public, không cần auth).

**Request:**

```http
GET /api/v1/promotions/by-code/SUMMER2025
````

**Response:** Giống như promotion object trong active promotions

**Use case:** Hiển thị popup chi tiết promotion khi user click vào card.

---

## 🔐 ADMIN APIs

### **1. Tạo Promotion**

```http
POST /api/v1/promotions
Authorization: Bearer <admin_token>
```

### **2. Xem Thống Kê Promotion**

```http
GET /api/v1/promotions/:promotionId/statistics
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "promotion": {
    "_id": "677295a8b2c3d4e5f6789012",
    "code": "SUMMER2025",
    "usageLimit": 1000,
    "collectedCount": 245,
    "actualUsedCount": 89
  },
  "statistics": {
    "totalCollected": 245,
    "totalUsed": 89,
    "totalExpired": 23,
    "totalAvailable": 133,
    "usageRate": 36,
    "collectionRate": 25
  },
  "topCollectors": [
    {
      "userId": "...",
      "userName": "Nguyen Van A",
      "collectCount": 1,
      "usedCount": 1
    }
  ]
}
```

---

## 💡 BUSINESS LOGIC QUAN TRỌNG

### **Xử Lý Số Lượng (Quantity Management)**

1. **`usageLimit`**: Tổng số lượng promotion có thể phát hành (VD: 1000 mã)
2. **`collectedCount`**: Số lượng đã được collect bởi users
   - Tăng khi user collect (atomic operation để tránh race condition)
   - Kiểm tra: `collectedCount < usageLimit` trước khi cho collect
3. **`actualUsedCount`**: Số lượng thực sự được dùng trong booking
   - Tăng khi booking thành công với promotion
4. **`perUserLimit`**: Mỗi user được collect tối đa bao nhiêu lần (mặc định: 1)

### **Flow Kiểm Tra:**

```
User click "Lưu mã"
  ↓
Check: promotion.collectedCount < promotion.usageLimit?
  ↓ NO → Error: "Promotion usage limit reached"
  ↓ YES
Check: user đã collect < promotion.perUserLimit?
  ↓ NO → Error: "You have already collected"
  ↓ YES
Atomic increment: collectedCount += 1
  ↓
Tạo UserPromotion record
```

### **Discount Calculation:**

```javascript
if (discountType === 'fixed') {
  discount = discountValue; // VD: 50000đ
}

if (discountType === 'percentage') {
  discount = (orderAmount * discountValue) / 100;

  // Áp dụng maxDiscount nếu có
  if (maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }
}

// Đảm bảo discount không vượt quá order amount
finalDiscount = Math.min(discount, orderAmount);
```

---

## 🎨 UI/UX RECOMMENDATIONS

### **1. Promotion Card (Trang chủ)**

```
┌─────────────────────────────────────┐
│ [IMAGE]                             │
│ SUMMER2025                          │
│ Summer Flash Sale                   │
│ Giảm 20% (tối đa 50.000đ)          │
│ Áp dụng: Đơn từ 100.000đ           │
│ Còn lại: 755/1000                   │
│                                     │
│         [Lưu mã]  [Chi tiết]       │
└─────────────────────────────────────┘
```

### **2. My Promotions (User Profile)**

```
[Available (3)] [Used (5)] [Expired (2)]

Available:
┌─────────────────────────────────────┐
│ SUMMER2025 • Giảm 20%               │
│ Hết hạn: 31/08/2025                 │
│ [Sử dụng ngay] [Chi tiết]           │
└─────────────────────────────────────┘
```

### **3. Checkout - Apply Promo**

```
Tổng tiền:           500.000đ
━━━━━━━━━━━━━━━━━━━━━━━━━━
Mã giảm giá: [SUMMER2025] [Áp dụng]

✓ Áp dụng thành công!
  Giảm giá:        -50.000đ
━━━━━━━━━━━━━━━━━━━━━━━━━━
Thành tiền:         450.000đ
```

---

## ⚠️ ERROR HANDLING

### **Common Errors:**

| Status | Message                       | Xử lý Frontend                     |
| ------ | ----------------------------- | ---------------------------------- |
| 400    | Promotion usage limit reached | "Mã đã hết, vui lòng chọn mã khác" |
| 400    | You have already collected    | "Bạn đã lưu mã này rồi"            |
| 400    | Promotion has expired         | "Mã đã hết hạn"                    |
| 400    | Minimum order value is...     | Hiển thị số tiền tối thiểu         |
| 404    | Invalid promotion code        | "Mã không hợp lệ"                  |
| 401    | Unauthorized                  | Redirect to login                  |

---

## 🐛 TROUBLESHOOTING - Các Lỗi Thường Gặp

### **Vấn đề 1: "Đã validate nhưng giá không giảm"**

**Triệu chứng:**

- Gọi `POST /promotions/validate` thành công (200)
- Giá vẫn không giảm
- Promotion không được mark "used"

**Nguyên nhân:**
Bạn **CHỈ validate** (preview) mà chưa tạo booking!

**Giải pháp:**

```typescript
// ❌ SAI - Chỉ validate thôi
await fetch('/promotions/validate', { ... });
// Promotion chưa được áp dụng!

// ✅ ĐÚNG - Phải tạo booking
const result = await fetch('/promotions/validate', { ... }).then(r => r.json());
const userPromotionId = result.data.userPromotion._id; // ⚠️ Lưu ý: result.data

// Sau khi user confirm checkout:
await fetch('/bookings', {
  method: 'POST',
  body: JSON.stringify({
    ...bookingData,
    userPromotion: userPromotionId  // ⚠️ QUAN TRỌNG!
  })
});
```

---

### **Vấn đề 2: "Promotion đã used nhưng booking không có discount"**

**Triệu chứng:**

- Promotion được mark "used"
- Nhưng booking vẫn full price (không giảm)

**Nguyên nhân:**
Frontend gọi sai thứ tự hoặc gửi sai `userPromotionId`

**Giải pháp:**
Kiểm tra request body của `POST /bookings`:

```json
{
  "trip": "...",
  "passengers": [...],
  "userPromotion": "677295b1c4d5e6f789abc123"  // ← PHẢI có field này!
}
```

---

### **Vấn đề 3: "Validate thành công nhưng create booking lỗi"**

**Triệu chứng:**

- `POST /promotions/validate` → 200 OK
- `POST /bookings` → 400 Bad Request

**Nguyên nhân:**

- Promotion đã được dùng bởi booking khác
- Promotion hết hạn giữa lúc validate và create booking
- `userPromotionId` không đúng

**Giải pháp:**
Backend tự động validate lại trong booking service. Frontend cần handle error:

```typescript
try {
  const booking = await createBooking(data);
} catch (error) {
  if (error.message.includes('already been used')) {
    toast.error('Mã đã được sử dụng. Vui lòng chọn mã khác.');
    // Clear promotion state
    setUserPromotionId(null);
  }
}
```

---

### **Vấn đề 4: "Race condition - nhiều user collect cùng lúc"**

**Triệu chứng:**

- Promotion có `usageLimit: 100`
- Nhưng `collectedCount` vượt quá 100

**Giải pháp:**
Backend đã xử lý bằng **atomic operation**:

```typescript
// Trong promotion.service.ts - collectPromotion
const updatedPromotion = await Promotion.findOneAndUpdate(
  {
    _id: promotionId,
    collectedCount: { $lt: promotion.usageLimit }, // Atomic check
  },
  { $inc: { collectedCount: 1 } },
  { new: true }
);

if (!updatedPromotion) {
  throw new ApiError(400, 'Promotion usage limit reached');
}
```

Frontend không cần xử lý gì thêm, chỉ cần handle error 400.

---

## 🧪 TESTING CHECKLIST

- [ ] Hiển thị promotions active
- [ ] Collect promotion (success case)
- [ ] Collect promotion đã full slot (error case)
- [ ] Collect promotion đã collect rồi (error case)
- [ ] Xem "My Promotions" với các tab status
- [ ] Validate promotion trước checkout
- [ ] Validate với order không đủ min value
- [ ] Tạo booking có áp promotion
- [ ] Tạo booking không áp promotion
- [ ] Promotion được mark "used" sau booking thành công
- [ ] Không thể dùng lại promotion đã used

---

## 📞 SUPPORT

Nếu cần hỗ trợ hoặc có vấn đề về integration, vui lòng liên hệ Backend Team.

**Migration:** Nếu hệ thống đã có data cũ, chạy migration script:

```bash
npm run ts-node src/migratePromotions.ts
```

---

## 🚀 QUICK START - Frontend Checklist

### **Để áp dụng promotion thành công, cần 3 bước:**

**1️⃣ User nhập mã promotion:**

```typescript
// State cần có
const [userPromotionId, setUserPromotionId] = useState(null);
const [discountAmount, setDiscountAmount] = useState(0);
```

**2️⃣ Validate để preview (khi user bấm "Áp dụng"):**

```typescript
const result = await fetch('/promotions/validate', {
  method: 'POST',
  body: JSON.stringify({ code: 'SUMMER2025', orderAmount: 500000 }),
}).then((r) => r.json());

const data = result.data; // ⚠️ Response có wrapper "data"

setUserPromotionId(data.userPromotion._id); // ⚠️ LƯU LẠI ID NÀY!
setDiscountAmount(data.discountAmount);
```

**3️⃣ Tạo booking với promotion (khi user confirm):**

```typescript
await fetch('/bookings', {
  method: 'POST',
  body: JSON.stringify({
    trip: '...',
    passengers: [...],
    userPromotion: userPromotionId // ⚠️ TRUYỀN ID TỪ BƯỚC 2!
  })
});
```

**✅ Done!** Backend tự động xử lý discount và mark promotion "used".

---

## 📚 TÀI LIỆU LIÊN QUAN

- [Booking API Documentation](./FRONTEND_API_GUIDE.md)
- [PayOS Payment Integration](./PAYOS_INTEGRATION_GUIDE.md)
- [WebSocket Real-time Updates](./WEBSOCKET-IMPLEMENTATION.md)
