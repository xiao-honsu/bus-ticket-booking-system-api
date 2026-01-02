# Popular Routes & Analytics - Tài Liệu Kỹ Thuật Chi Tiết

## 📋 Tổng Quan

Popular Routes và Analytics cung cấp insights về hành vi người dùng, hiệu suất kinh doanh, và gợi ý tuyến đường phổ biến dựa trên dữ liệu thực tế.

### 🎯 Features

- **Popular Routes** - Tuyến đường có nhiều booking nhất
- **Analytics Dashboard** - Thống kê doanh thu, booking, conversion rate
- **Revenue Stats** - Phân tích doanh thu theo thời gian và payment method
- **Booking Stats** - Thống kê booking theo status và ngày trong tuần
- **Popular Locations** - Địa điểm được tìm kiếm nhiều nhất

---

## 🏗️ Kiến Trúc

### Files Liên Quan

```
src/
├── routes/
│   ├── v1/location.route.ts          # GET /popular-routes
│   └── analytics.route.ts            # GET /analytics/*
├── controllers/
│   ├── location.controller.ts        # getPopularRoutes()
│   └── analytics.controller.ts       # getAnalytics(), etc.
├── services/
│   ├── location.service.ts           # Popular routes from Route model
│   ├── analytics.service.ts          # Analytics calculations
│   └── searchhistory.service.ts      # Search history tracking
└── models/
    ├── route.model.ts                # Route with bookingCount field
    ├── booking.model.ts              # Booking transactions
    └── searchhistory.model.ts        # Search logs
```

---

## 📡 API Endpoints

### 1️⃣ **Get Popular Routes**

**Endpoint:**

```
GET /v1/locations/popular-routes
```

**Authentication:** ❌ Public

**Query Parameters:**

| Parameter | Type     | Required | Default | Mô Tả                 |
| --------- | -------- | -------- | ------- | --------------------- |
| `limit`   | `number` | ❌ No    | `10`    | Số tuyến đường trả về |

**Example Request:**

```bash
GET /v1/locations/popular-routes?limit=5
```

**Response:**

```json
{
  "popularRoutes": [
    {
      "_id": "675d1234567890abcdef1234",
      "origin": {
        "city": "Ho Chi Minh",
        "province": "Ho Chi Minh",
        "coordinates": [106.6297, 10.8231]
      },
      "destination": {
        "city": "Da Lat",
        "province": "Lam Dong",
        "coordinates": [108.4378, 11.9404]
      },
      "distance": 308,
      "duration": 360,
      "basePrice": 250000,
      "bookingCount": 342,
      "isActive": true
    },
    {
      "_id": "675d...",
      "origin": {
        "city": "Ho Chi Minh",
        "province": "Ho Chi Minh"
      },
      "destination": {
        "city": "Nha Trang",
        "province": "Khanh Hoa"
      },
      "distance": 448,
      "duration": 480,
      "basePrice": 300000,
      "bookingCount": 287
    }
    // ... more routes
  ]
}
```

**Source Data:**

- `location.service.ts`: Dùng `Route.bookingCount` field (pre-calculated)
- `analytics.service.ts`: Tính realtime từ `Booking` collection

---

### 2️⃣ **Get Analytics Overview**

**Endpoint:**

```
GET /v1/analytics
```

**Authentication:** ✅ Required (Admin only)

**Query Parameters:**

| Parameter | Type     | Required | Default | Mô Tả                           |
| --------- | -------- | -------- | ------- | ------------------------------- |
| `period`  | `string` | ❌ No    | `7d`    | Time period: `7d`, `30d`, `90d` |

**Example Request:**

```bash
GET /v1/analytics?period=30d
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "summary": {
    "totalRevenue": 125000000,
    "totalBookings": 456,
    "avgTicketPrice": 274123,
    "conversionRate": 78.5
  },
  "revenueByDay": [
    {
      "date": "2026-01-01",
      "revenue": 5400000,
      "bookings": 18
    },
    {
      "date": "2026-01-02",
      "revenue": 4200000,
      "bookings": 15
    }
    // ... 30 days
  ],
  "statusBreakdown": {
    "pending": 23,
    "confirmed": 358,
    "cancelled": 17,
    "completed": 58
  }
}
```

---

### 3️⃣ **Get Revenue Stats**

**Endpoint:**

```
GET /v1/analytics/revenue
```

**Authentication:** ✅ Admin only

**Query Parameters:**

| Parameter | Type     | Required | Default |
| --------- | -------- | -------- | ------- |
| `period`  | `string` | ❌ No    | `7d`    |

**Response:**

```json
{
  "totalRevenue": 125000000,
  "avgRevenue": 274123,
  "bookingCount": 456,
  "byPaymentMethod": {
    "momo": 45000000,
    "zalopay": 38000000,
    "cash": 42000000
  }
}
```

---

### 4️⃣ **Get Booking Stats**

**Endpoint:**

```
GET /v1/analytics/bookings
```

**Authentication:** ✅ Admin only

**Response:**

```json
{
  "total": 456,
  "byStatus": {
    "pending": 23,
    "confirmed": 358,
    "cancelled": 17,
    "completed": 58
  },
  "byDayOfWeek": {
    "Monday": 52,
    "Tuesday": 48,
    "Wednesday": 61,
    "Thursday": 73,
    "Friday": 89,
    "Saturday": 78,
    "Sunday": 55
  }
}
```

**Use Case:** Identify peak booking days

---

### 5️⃣ **Get Popular Routes (Analytics)**

**Endpoint:**

```
GET /v1/analytics/popular-routes
```

**Authentication:** ✅ Admin only

**Query Parameters:**

| Parameter | Type     | Required | Default |
| --------- | -------- | -------- | ------- |
| `limit`   | `number` | ❌ No    | `10`    |

**Response:**

```json
{
  "popularRoutes": [
    {
      "origin": "Ho Chi Minh",
      "destination": "Da Lat",
      "bookings": 342,
      "revenue": 95760000
    },
    {
      "origin": "Ho Chi Minh",
      "destination": "Nha Trang",
      "bookings": 287,
      "revenue": 86100000
    }
    // ... more
  ]
}
```

**Difference from `/v1/locations/popular-routes`:**

- This one: Calculated realtime from `Booking` collection
- Location API: Uses pre-calculated `Route.bookingCount`

---

## 🔄 Implementation Details

### Popular Routes Algorithm (analytics.service.ts)

```typescript
const getPopularRoutes = async (limit: number) => {
  // Step 1: Get all non-cancelled bookings with trip populated
  const bookings: any[] = await Booking.find({
    status: { $ne: 'cancelled' },
  })
    .populate('trip')
    .lean();

  // Step 2: Group by route (origin-destination pair)
  const routeCounts: {
    [key: string]: {
      count: number;
      revenue: number;
      origin: string;
      destination: string;
    };
  } = {};

  bookings.forEach((booking) => {
    if (booking.trip && typeof booking.trip === 'object') {
      const trip = booking.trip as any;
      const routeKey = `${trip.origin || 'Unknown'}-${trip.destination || 'Unknown'}`;

      if (!routeCounts[routeKey]) {
        routeCounts[routeKey] = {
          count: 0,
          revenue: 0,
          origin: trip.origin || 'Unknown',
          destination: trip.destination || 'Unknown',
        };
      }

      routeCounts[routeKey].count += 1;
      routeCounts[routeKey].revenue += booking.totalAmount || 0;
    }
  });

  // Step 3: Sort by booking count descending
  const popularRoutes = Object.entries(routeCounts)
    .map(([_, data]) => ({
      origin: data.origin,
      destination: data.destination,
      bookings: data.count,
      revenue: Math.round(data.revenue),
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, limit);

  return popularRoutes;
};
```

**Key Points:**

- ✅ Exclude cancelled bookings
- ✅ Group by origin-destination pair (not route ID)
- ✅ Calculate both booking count và total revenue
- ✅ Sort by booking count (most popular first)

---

### Popular Routes (Pre-calculated) - location.service.ts

```typescript
const getPopularRoutes = async (limit: number = 10) => {
  const popularRoutes = await Route.find({ isActive: true }).sort({ bookingCount: -1 }).limit(limit);

  return popularRoutes.map((route) => ({
    _id: route._id,
    origin: route.origin,
    destination: route.destination,
    distance: route.distance,
    duration: route.duration,
    basePrice: route.basePrice,
    bookingCount: route.bookingCount || 0,
  }));
};
```

**Assumption:** Route model có field `bookingCount` được update sau mỗi booking

**Update Mechanism (TODO):**

```typescript
// booking.service.ts - after createBooking
await Route.findOneAndUpdate(
  {
    'origin.city': trip.origin.city,
    'destination.city': trip.destination.city,
  },
  { $inc: { bookingCount: 1 } }
);
```

---

### Analytics Calculation (analytics.service.ts)

#### Period Date Range

```typescript
const getPeriodDates = (period: string) => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
};
```

#### Revenue by Day

```typescript
const getAnalytics = async (period: string): Promise<AnalyticsData> => {
  const { startDate, endDate } = getPeriodDates(period);

  // Get bookings in period
  const bookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  // Initialize all days with 0
  const revenueByDay: { [key: string]: { revenue: number; bookings: number } } = {};
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  for (let i = 0; i < days; i++) {
    const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    revenueByDay[dateStr] = { revenue: 0, bookings: 0 };
  }

  // Fill in actual data
  bookings.forEach((booking) => {
    const dateStr = new Date(booking.createdAt).toISOString().split('T')[0];
    if (revenueByDay[dateStr]) {
      if (booking.status !== 'cancelled') {
        revenueByDay[dateStr].revenue += booking.totalAmount || 0;
      }
      revenueByDay[dateStr].bookings += 1;
    }
  });

  // Convert to array and sort
  const revenueByDayArray = Object.entries(revenueByDay)
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      bookings: data.bookings,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    summary: {
      /* ... */
    },
    revenueByDay: revenueByDayArray,
    statusBreakdown: {
      /* ... */
    },
  };
};
```

**Key Features:**

- ✅ Initialize tất cả ngày với 0 (để có đủ data points cho chart)
- ✅ Exclude cancelled bookings khỏi revenue
- ✅ Sort by date ascending (oldest first)

---

### Conversion Rate Calculation

```typescript
const totalBookings = bookings.length;
const completedBookings = bookings.filter((b) => b.status === 'completed').length;
const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
```

**Formula:**

```
Conversion Rate = (Completed Bookings / Total Bookings) × 100
```

**Alternative (TODO):**

```typescript
// More accurate: Compare with search history
const searches = await SearchHistory.countDocuments({
  createdAt: { $gte: startDate, $lte: endDate },
});
const conversionRate = searches > 0 ? (totalBookings / searches) * 100 : 0;
```

---

### Booking Stats by Day of Week

```typescript
const byDayOfWeek: { [key: string]: number } = {
  Monday: 0,
  Tuesday: 0,
  Wednesday: 0,
  Thursday: 0,
  Friday: 0,
  Saturday: 0,
  Sunday: 0,
};

bookings.forEach((booking) => {
  const date = new Date(booking.createdAt);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getDay()];
  byDayOfWeek[dayName] += 1;
});
```

**Use Case:** Identify peak days để:

- Schedule promotions
- Adjust pricing
- Plan marketing campaigns

---

## 📊 Search History Tracking

### Purpose

- Identify popular search queries
- Understand user intent
- Improve search suggestions

### Schema

```typescript
{
  userId?: ObjectId,
  sessionId?: string,
  originCity: string,
  destinationCity: string,
  travelDate?: Date,
  filters: {
    busType?: string[],
    priceRange?: { min: number, max: number },
    departureTimeRange?: { start: string, end: string },
    amenities?: string[]
  },
  resultsCount: number,
  createdAt: Date
}
```

### Popular Locations from Search History

```typescript
const getPopularLocations = async (limit: number = 10) => {
  const searches = await SearchHistory.find({})
    .sort({ createdAt: -1 })
    .limit(1000) // Last 1000 searches
    .lean();

  const locationCounts: { [key: string]: number } = {};

  searches.forEach((search) => {
    locationCounts[search.originCity] = (locationCounts[search.originCity] || 0) + 1;
    locationCounts[search.destinationCity] = (locationCounts[search.destinationCity] || 0) + 1;
  });

  const popular = Object.entries(locationCounts)
    .map(([city, count]) => ({ city, searchCount: count }))
    .sort((a, b) => b.searchCount - a.searchCount)
    .slice(0, limit);

  return popular;
};
```

---

## 🎨 Frontend Integration Examples

### Display Popular Routes

```typescript
// React component
const PopularRoutes = () => {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    fetch('/api/v1/locations/popular-routes?limit=5')
      .then(res => res.json())
      .then(data => setRoutes(data.popularRoutes));
  }, []);

  return (
    <div className="popular-routes">
      <h2>Tuyến Đường Phổ Biến</h2>
      {routes.map(route => (
        <RouteCard
          key={route._id}
          origin={route.origin.city}
          destination={route.destination.city}
          price={route.basePrice}
          bookingCount={route.bookingCount}
        />
      ))}
    </div>
  );
};
```

### Analytics Dashboard

```typescript
const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState('7d');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/analytics?period=${period}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setAnalytics);
  }, [period]);

  return (
    <div>
      <PeriodSelector onChange={setPeriod} />
      <SummaryCards data={analytics?.summary} />
      <RevenueChart data={analytics?.revenueByDay} />
      <StatusPieChart data={analytics?.statusBreakdown} />
    </div>
  );
};
```

---

## 📈 Performance Optimization

### 1. Pre-calculate Route Booking Counts

**Problem:** Calculating popular routes realtime từ Bookings collection chậm

**Solution:** Update `Route.bookingCount` sau mỗi booking

```typescript
// booking.service.ts
const createBooking = async (bookingBody) => {
  // ... create booking

  // Update route booking count
  const trip = await Trip.findById(bookingBody.trip).populate('route');
  if (trip && trip.route) {
    await Route.findByIdAndUpdate(trip.route._id, { $inc: { bookingCount: 1 } });
  }

  return booking;
};
```

### 2. Cache Analytics Results

```typescript
// Pseudo-code
const getCachedAnalytics = async (period: string) => {
  const cacheKey = `analytics:${period}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const data = await getAnalytics(period);
  await redis.setex(cacheKey, 300, JSON.stringify(data)); // Cache 5 mins

  return data;
};
```

### 3. Database Indexes

```typescript
// booking.model.ts
bookingSchema.index({ createdAt: -1, status: 1 });
bookingSchema.index({ trip: 1 });
bookingSchema.index({ totalAmount: 1 });

// route.model.ts
routeSchema.index({ bookingCount: -1 });
routeSchema.index({ isActive: 1, bookingCount: -1 });
```

---

## 🧪 Testing Examples

### Test 1: Get Popular Routes

```bash
curl -X GET "http://localhost:4000/v1/locations/popular-routes?limit=5"
```

**Expected:** Top 5 routes sorted by booking count

### Test 2: Get Analytics

```bash
curl -X GET "http://localhost:4000/v1/analytics?period=30d" \
  -H "Authorization: Bearer <admin_token>"
```

**Expected:** Analytics data for last 30 days

### Test 3: Verify Booking Count Increment

```bash
# Before booking
curl -X GET "http://localhost:4000/v1/routes/675d..."

# Create booking
curl -X POST "http://localhost:4000/v1/bookings" -d '...'

# After booking - check if bookingCount increased
curl -X GET "http://localhost:4000/v1/routes/675d..."
```

---

## ⚠️ Known Issues

### Issue 1: Booking Count Not Updated

**Cause:** `Route.bookingCount` không được increment sau booking

**Fix:** Implement post-booking hook:

```typescript
bookingSchema.post('save', async function (doc) {
  const trip = await Trip.findById(doc.trip).populate('route');
  if (trip?.route) {
    await Route.findByIdAndUpdate(trip.route._id, { $inc: { bookingCount: 1 } });
  }
});
```

### Issue 2: Analytics Returns Zero Data

**Cause:** Không có bookings trong time period

**Debug:**

```typescript
const bookings = await Booking.find({
  createdAt: { $gte: startDate, $lte: endDate },
});
console.log('Found bookings:', bookings.length);
```

### Issue 3: Popular Routes Includes Cancelled Bookings

**Fix:**

```typescript
// ❌ Wrong
const bookings = await Booking.find({}).populate('trip');

// ✅ Correct
const bookings = await Booking.find({
  status: { $ne: 'cancelled' },
}).populate('trip');
```

---

## 🎓 Best Practices

### 1. Always Filter by Date Range

```typescript
// ❌ Bad: Load all bookings
const bookings = await Booking.find({});

// ✅ Good: Filter by date range
const bookings = await Booking.find({
  createdAt: { $gte: startDate, $lte: endDate },
});
```

### 2. Use Aggregation for Complex Stats

```typescript
// Instead of multiple queries:
const revenue = await Booking.aggregate([
  { $match: { status: 'completed' } },
  {
    $group: {
      _id: null,
      total: { $sum: '$totalAmount' },
      avg: { $avg: '$totalAmount' },
    },
  },
]);
```

### 3. Handle Edge Cases

```typescript
const avgTicketPrice = totalBookings > 0 ? totalRevenue / totalBookings : 0; // Prevent division by zero

const conversionRate = Math.round(rate * 10) / 10; // Round to 1 decimal
```

---

## 📚 API Reference Summary

| Endpoint                       | Method | Auth     | Purpose                   |
| ------------------------------ | ------ | -------- | ------------------------- |
| `/v1/locations/popular-routes` | GET    | ❌ No    | Public popular routes     |
| `/v1/analytics`                | GET    | ✅ Admin | Full analytics overview   |
| `/v1/analytics/revenue`        | GET    | ✅ Admin | Revenue statistics        |
| `/v1/analytics/bookings`       | GET    | ✅ Admin | Booking statistics        |
| `/v1/analytics/popular-routes` | GET    | ✅ Admin | Popular routes (realtime) |

---

## 📞 Support Files

**Tham khảo:**

- [`src/services/analytics.service.ts`](../src/services/analytics.service.ts) - Core calculations
- [`src/services/location.service.ts`](../src/services/location.service.ts) - Popular routes
- [`src/models/searchhistory.model.ts`](../src/models/searchhistory.model.ts) - Search tracking
- [`docs/FIX-ANALYTICS-ZERO-DATA.md`](./FIX-ANALYTICS-ZERO-DATA.md) - Troubleshooting guide

---

**Last Updated:** January 2, 2026
**Version:** 1.0.0
