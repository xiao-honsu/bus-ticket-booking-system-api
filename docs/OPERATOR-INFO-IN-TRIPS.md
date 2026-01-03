# Hiển Thị Thông Tin Operator Trong Trip API

## 🎯 Tổng Quan

Backend đã được cập nhật để **tự động trả về đầy đủ thông tin operator** cho mọi trip. Frontend không cần phải gọi thêm API khác để lấy thông tin nhà xe.

---

## ✅ Các API Đã Được Cập Nhật

### 1. **GET /v1/trips/:tripId** - Lấy thông tin trip đơn lẻ

**Request:**

```http
GET /v1/trips/507f1f77bcf86cd799439014
```

**Response:**

```json
{
  "id": "507f1f77bcf86cd799439014",
  "departureTime": "2026-01-15T08:00:00.000Z",
  "arrivalTime": "2026-01-15T15:00:00.000Z",
  "pricePerSeat": 250000,
  "availableSeats": 25,
  "status": "scheduled",
  "route": {
    "id": "507f...",
    "routeName": "Sài Gòn - Đà Lạt",
    "origin": { "city": "Hồ Chí Minh", "province": "Hồ Chí Minh" },
    "destination": { "city": "Đà Lạt", "province": "Lâm Đồng" }
  },
  "bus": {
    "id": "507f...",
    "busNumber": "BUS-001",
    "busType": "limousine",
    "totalSeats": 30,
    "amenities": ["wifi", "aircon", "entertainment"]
  },
  "operator": {
    "id": "507f1f77bcf86cd799439013",
    "companyName": "Phương Trang FUTA Bus",
    "email": "contact@futabus.vn",
    "phoneNumber": "1900 6067",
    "logoUrl": "https://example.com/logo.png",
    "description": "Nhà xe uy tín hàng đầu Việt Nam",
    "status": "active",
    "rating": {
      "overall": 4.5,
      "cleanliness": 4.6,
      "punctuality": 4.4,
      "staff": 4.7,
      "comfort": 4.5,
      "value": 4.3,
      "totalReviews": 1234
    },
    "stats": {
      "totalBuses": 50,
      "totalTrips": 500,
      "totalRevenue": 10000000000
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "createdAt": "2024-12-15T00:00:00.000Z",
  "updatedAt": "2024-12-15T00:00:00.000Z"
}
```

---

### 2. **GET /v1/trips** - Lấy danh sách trips

**Request:**

```http
GET /v1/trips?page=1&limit=10
```

Hoặc có thể tùy chỉnh populate:

```http
GET /v1/trips?populate=bus,route,operator
```

**Response:**

```json
{
  "results": [
    {
      "id": "...",
      "departureTime": "...",
      "operator": {
        "id": "...",
        "companyName": "Phương Trang FUTA Bus",
        "logoUrl": "...",
        "rating": { "overall": 4.5 }
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 50
}
```

---

### 3. **GET /v1/trips/search** - Tìm kiếm trips

**Request:**

```http
GET /v1/trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Lat&departureDate=2026-01-15
```

**Response:**

```json
{
  "results": [
    {
      "_id": "...",
      "departureTime": "2026-01-15T08:00:00.000Z",
      "arrivalTime": "2026-01-15T15:00:00.000Z",
      "pricePerSeat": 250000,
      "availableSeats": 25,
      "route": {
        "origin": { "city": "Ho Chi Minh" },
        "destination": { "city": "Da Lat" }
      },
      "bus": {
        "busType": "limousine",
        "totalSeats": 30
      },
      "operator": {
        "id": "507f1f77bcf86cd799439013",
        "companyName": "Phương Trang FUTA Bus",
        "logoUrl": "https://example.com/logo.png",
        "rating": {
          "overall": 4.5,
          "totalReviews": 1234
        }
      }
    }
  ],
  "page": 1,
  "totalResults": 10
}
```

**Lưu ý:** API `/v1/trips/search` đã luôn trả về thông tin operator từ trước (sử dụng MongoDB aggregation pipeline).

---

### 4. **GET /v1/trips/:tripId/details** - Lấy chi tiết đầy đủ của trip

**Request:**

```http
GET /v1/trips/507f1f77bcf86cd799439014/details
```

**Response:**

```json
{
  "trip": {
    "id": "...",
    "departureTime": "...",
    "operator": {
      "id": "507f1f77bcf86cd799439013",
      "companyName": "Phương Trang FUTA Bus",
      "logoUrl": "https://example.com/logo.png",
      "rating": {
        "overall": 4.5,
        "cleanliness": 4.6,
        "punctuality": 4.4,
        "staff": 4.7,
        "comfort": 4.5,
        "value": 4.3,
        "totalReviews": 1234
      },
      "description": "Nhà xe uy tín hàng đầu Việt Nam"
    }
  },
  "seatAvailability": { ... },
  "statistics": { ... }
}
```

---

## 🎨 Frontend Implementation

### TypeScript Interface

```typescript
interface Operator {
  id: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  licenseNumber?: string;
  description?: string;
  logoUrl?: string;
  status: 'pending' | 'approved' | 'active' | 'suspended';
  rating: {
    overall: number;
    cleanliness: number;
    punctuality: number;
    staff: number;
    comfort: number;
    value: number;
    totalReviews: number;
  };
  stats?: {
    totalBuses: number;
    totalTrips: number;
    totalRevenue: number;
  };
  createdAt: string;
  updatedAt?: string;
}

interface Trip {
  id: string;
  departureTime: string;
  arrivalTime: string;
  pricePerSeat: number;
  availableSeats: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  route: Route;
  bus: Bus;
  operator: Operator; // ← Đầy đủ thông tin operator
  createdAt: string;
  updatedAt: string;
}
```

---

### React Example

```tsx
import React from 'react';
import axios from 'axios';

interface TripCardProps {
  tripId: string;
}

const TripCard: React.FC<TripCardProps> = ({ tripId }) => {
  const [trip, setTrip] = React.useState<Trip | null>(null);

  React.useEffect(() => {
    const fetchTrip = async () => {
      const { data } = await axios.get(`/v1/trips/${tripId}`);
      setTrip(data);
    };
    fetchTrip();
  }, [tripId]);

  if (!trip) return <div>Loading...</div>;

  return (
    <div className="trip-card">
      {/* Route Info */}
      <h3>{trip.route.routeName}</h3>

      {/* Operator Info - Sẵn sàng để sử dụng */}
      <div className="operator-info">
        {trip.operator.logoUrl && (
          <img src={trip.operator.logoUrl} alt={trip.operator.companyName} className="operator-logo" />
        )}
        <div>
          <h4>{trip.operator.companyName}</h4>
          <div className="rating">
            ⭐ {trip.operator.rating.overall.toFixed(1)}
            <span>({trip.operator.rating.totalReviews} reviews)</span>
          </div>
          <p>{trip.operator.description}</p>
          <p>📞 {trip.operator.phoneNumber}</p>
        </div>
      </div>

      {/* Bus Info */}
      <div className="bus-info">
        <span>{trip.bus.busType}</span>
        <span>{trip.bus.totalSeats} seats</span>
      </div>

      {/* Price & Availability */}
      <div className="trip-details">
        <p>Price: {trip.pricePerSeat.toLocaleString('vi-VN')} VND</p>
        <p>Available: {trip.availableSeats} seats</p>
      </div>
    </div>
  );
};

export default TripCard;
```

---

### Vue.js Example

```vue
<template>
  <div class="trip-card" v-if="trip">
    <!-- Route -->
    <h3>{{ trip.route.routeName }}</h3>

    <!-- Operator Info -->
    <div class="operator-section">
      <img
        v-if="trip.operator.logoUrl"
        :src="trip.operator.logoUrl"
        :alt="trip.operator.companyName"
        class="operator-logo"
      />
      <div class="operator-details">
        <h4>{{ trip.operator.companyName }}</h4>
        <div class="rating">
          ⭐ {{ trip.operator.rating.overall.toFixed(1) }}
          <span>({{ trip.operator.rating.totalReviews }} đánh giá)</span>
        </div>
        <p class="description">{{ trip.operator.description }}</p>
        <p class="contact">📞 {{ trip.operator.phoneNumber }}</p>
      </div>
    </div>

    <!-- Detailed Ratings -->
    <div class="detailed-ratings">
      <div class="rating-item">
        <span>Sạch sẽ:</span>
        <span>{{ trip.operator.rating.cleanliness }}/5</span>
      </div>
      <div class="rating-item">
        <span>Đúng giờ:</span>
        <span>{{ trip.operator.rating.punctuality }}/5</span>
      </div>
      <div class="rating-item">
        <span>Nhân viên:</span>
        <span>{{ trip.operator.rating.staff }}/5</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps<{ tripId: string }>();
const trip = ref<Trip | null>(null);

onMounted(async () => {
  const { data } = await axios.get(`/v1/trips/${props.tripId}`);
  trip.value = data;
});
</script>
```

---

## 📊 Operator Rating Breakdown

Mỗi operator có **7 loại đánh giá**:

| Field          | Mô Tả                | Giá Trị |
| -------------- | -------------------- | ------- |
| `overall`      | Đánh giá tổng thể    | 0-5     |
| `cleanliness`  | Mức độ sạch sẽ       | 0-5     |
| `punctuality`  | Đúng giờ             | 0-5     |
| `staff`        | Chất lượng nhân viên | 0-5     |
| `comfort`      | Thoải mái            | 0-5     |
| `value`        | Giá trị/Tiền         | 0-5     |
| `totalReviews` | Tổng số đánh giá     | number  |

---

## 🎯 Use Cases

### 1. **Trip Listing Page**

Hiển thị danh sách trips với logo và tên nhà xe:

```tsx
trips.map((trip) => (
  <TripCard key={trip.id}>
    <img src={trip.operator.logoUrl} />
    <span>{trip.operator.companyName}</span>
    <span>⭐ {trip.operator.rating.overall}</span>
  </TripCard>
));
```

### 2. **Trip Detail Page**

Hiển thị đầy đủ thông tin nhà xe:

```tsx
<OperatorSection>
  <img src={trip.operator.logoUrl} />
  <h3>{trip.operator.companyName}</h3>
  <p>{trip.operator.description}</p>
  <RatingBreakdown ratings={trip.operator.rating} />
  <ContactInfo phone={trip.operator.phoneNumber} />
</OperatorSection>
```

### 3. **Filter by Operator**

Lọc trips theo nhà xe yêu thích:

```tsx
const filteredTrips = trips.filter((trip) => trip.operator.rating.overall >= 4.0);
```

---

## 🔍 Operator Status

Operator có 4 trạng thái:

| Status      | Mô Tả          | Hiển Thị? |
| ----------- | -------------- | --------- |
| `pending`   | Đang chờ duyệt | ❌ Không  |
| `approved`  | Đã duyệt       | ✅ Có     |
| `active`    | Đang hoạt động | ✅ Có     |
| `suspended` | Bị tạm ngưng   | ❌ Không  |

**Lưu ý:** Chỉ những operator có status `active` hoặc `approved` mới được hiển thị trong search results.

---

## 🚀 Migration Notes

### Không Cần Thay Đổi Gì

Nếu frontend đã gọi các API này:

- ✅ `/v1/trips/search` - Đã có operator từ trước
- ✅ `/v1/trips/:id/details` - Đã có operator từ trước

### Cần Cập Nhật

Nếu frontend đang gọi:

- 🔄 `/v1/trips/:id` - **Giờ đã có operator**, không cần gọi thêm API
- 🔄 `/v1/trips` - **Giờ đã có operator** (mặc định), hoặc custom `?populate=bus,route,operator`

---

## 📞 Support

Nếu có vấn đề hoặc cần thêm field nào khác, vui lòng liên hệ backend team.

**Endpoints:**

- 🔗 API Base: `/v1/trips`
- 📖 Swagger Docs: `/v1/docs`
- 📧 Contact: backend-team@example.com

---

## ✅ Checklist Frontend

- [ ] Update TypeScript interfaces để include `operator: Operator`
- [ ] Remove các API call riêng lẻ để fetch operator (nếu có)
- [ ] Hiển thị operator logo trong trip cards
- [ ] Hiển thị operator rating
- [ ] Hiển thị operator description trong trip details
- [ ] Test với data thật từ API
- [ ] Handle trường hợp operator không có logoUrl (fallback image)
- [ ] Responsive design cho operator info section

---

**Ngày cập nhật:** 2026-01-03  
**Version:** 1.0.0
