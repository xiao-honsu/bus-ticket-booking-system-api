# Seat Map Generation - Summary

## 📋 Vấn đề phát hiện

Khi test APIs, phát hiện tất cả buses trong database có **empty seatMap.seats array**, khiến seat selection feature không thể hoạt động:

```json
{
  "seats": []
}
```

## 🔍 Nguyên nhân

Script `seedData.ts` tạo buses với thông tin cơ bản (busNumber, busType, totalSeats, amenities) nhưng **không generate seat layout** (seat objects với seatNumber, row, column, position).

## ✅ Giải pháp

### 1. Tạo script generate seat maps

Đã tạo `src/generateSeatMaps.ts` để tự động generate seat layouts cho tất cả buses dựa trên:

- **Bus Type**: standard, limousine, sleeper
- **Total Seats**: số ghế của mỗi xe

### 2. Seat Layouts được generate

#### **Standard Bus (2-2 Layout)**

- Configuration: `A B | C D` (aisle ở giữa)
- Columns: 4 (A, B, C, D)
- Seat numbering: A1, B1, C1, D1, A2, B2...
- Seat types:
  - `window`: ghế cửa sổ (A, D)
  - `aisle`: ghế lối đi (B, C)

**Example**: Bus 45 seats → 12 rows × 4 columns

#### **Limousine Bus (1-2-1 Layout)**

- Configuration: `A | B C | D` (dual aisle, luxury spacing)
- Columns: 4 (A, B, C, D)
- Seat numbering: A1, B1, C1, D1, A2...
- Seat types:
  - `vip`: ghế đơn sang trọng (A, D)
  - `standard`: ghế đôi (B, C)

**Example**: Bus 24 seats → 6 rows × 4 columns

#### **Sleeper Bus (Double Deck, 3 columns)**

- Configuration: **Lower deck** (L1-L18) + **Upper deck** (U1-U18)
- Columns: 3 per deck
- Seat numbering:
  - Lower: L1, L2, L3, L4...
  - Upper: U1, U2, U3, U4...
- Seat types:
  - `window`: giường cạnh cửa (col 1, 3)
  - `standard`: giường giữa (col 2)

**Example**: Bus 36 berths → 18 lower + 18 upper

### 3. Chạy script

```bash
npm run generate:seatmaps
```

## 📊 Kết quả

```
✅ Seat map generation completed!
   - Buses updated: 3
   - Buses skipped: 10
   - Total buses: 13

📊 Final Summary:
   ✅ BUS-004 (standard): 48/48 seats
   ✅ BUS-005 (limousine): 27/27 seats
   ✅ BUS-006 (standard): 40/40 seats
   ✅ BUS-007 (sleeper): 36/36 seats
   ✅ BUS-003 (sleeper): 32/32 seats
   ✅ BUS-008 (limousine): 22/22 seats
   ✅ BUS-009 (standard): 44/44 seats
   ✅ BUS-010 (sleeper): 30/30 seats
   ✅ BUS-002 (limousine): 24/24 seats
   ✅ BUS-001 (standard): 40/40 seats
   ✅ FT-001 (sleeper): 40/40 seats
   ✅ FT-002 (standard): 45/45 seats
   ✅ HL-001 (sleeper): 36/36 seats
```

## 🐛 Bug fix trong trip.service.ts

Phát hiện lỗi khi xử lý `seatPricing` Map:

```
TypeError: trip.seatPricing?.get is not a function
```

### Nguyên nhân

`seatPricing` là MongoDB Map, nhưng sau khi populate có thể thành plain object, không còn method `.get()`

### Fix

```typescript
// Old (lỗi)
const seatPrice = trip.seatPricing?.get(seat.seatNumber) || basePrice;

// New (fix)
let seatPrice = basePrice;
if (trip.seatPricing) {
  if (trip.seatPricing instanceof Map) {
    seatPrice = trip.seatPricing.get(seat.seatNumber) || basePrice;
  } else if (typeof trip.seatPricing === 'object') {
    seatPrice = (trip.seatPricing as any)[seat.seatNumber] || basePrice;
  }
}
```

## ✅ Verification

### Test seat-map API cho sleeper bus

```bash
curl "http://localhost:4000/api/v1/trips/693ecdcdb1ff96e63a5998b6/seat-map"
```

**Response** (trước khi fix):

```json
{
  "seats": []
}
```

**Response** (sau khi fix):

```json
{
  "tripId": "693ecdcdb1ff96e63a5998b6",
  "busType": "sleeper",
  "layout": {
    "rows": 12,
    "columns": 3,
    "name": "Sleeper 36-berth Double Deck"
  },
  "seats": [
    {
      "seatNumber": "L1",
      "row": 1,
      "column": 1,
      "seatType": "window",
      "position": {"x": 1, "y": 1},
      "status": "available",
      "price": 250000,
      "selectable": true
    },
    {
      "seatNumber": "L2",
      "row": 1,
      "column": 2,
      "seatType": "standard",
      "position": {"x": 2, "y": 1},
      "status": "available",
      "price": 250000,
      "selectable": true
    },
    ...36 seats total
  ]
}
```

### Test seat-map API cho standard bus

```bash
curl "http://localhost:4000/api/v1/trips/693ecdceb1ff96e63a5998bb/details"
```

**Key data**:

- Total seats: 45
- Booked seats: ["C1", "C2"]
- Available seats: 43
- Seat layout: 12 rows × 4 columns (A, B, C, D)
- Seat statuses:
  - `C1`: booked
  - `C2`: booked
  - All others: available

## 📁 Files Created/Modified

### Created

1. **src/generateSeatMaps.ts** - Script to generate seat maps
2. **docs/SEAT-MAP-GENERATION-SUMMARY.md** - This document

### Modified

1. **package.json** - Added `generate:seatmaps` script
2. **src/services/trip.service.ts** - Fixed seatPricing Map handling (line 501-515)

## 🎯 Impact

✅ **Seat Selection Feature** hoàn toàn hoạt động:

- GET `/trips/:id/seat-map` trả về đầy đủ seat layout
- Seat statuses chính xác: available, booked, locked, selected
- Lock seats API có thể validate với real seat numbers
- Booking API validate với actual seat layout

✅ **Frontend có thể**:

- Hiển thị seat map với layout chuẩn
- Render đúng bus types (standard 2-2, limousine 1-2-1, sleeper 2-deck)
- Lock và book seats với seat numbers thực

## 🔄 Quy trình cho buses mới

Khi thêm buses mới trong tương lai:

1. **Option 1**: Thêm seat map trực tiếp trong seed data

```typescript
{
  busNumber: 'NEW-001',
  busType: 'standard',
  totalSeats: 40,
  seatMap: {
    name: 'Standard 40-seat Layout',
    rows: 10,
    columns: 4,
    seats: [
      // ... generate seats
    ]
  }
}
```

2. **Option 2**: Tạo bus trước, sau đó chạy

```bash
npm run generate:seatmaps
```

Script sẽ tự động skip buses đã có seat map, chỉ generate cho buses mới.

## 📌 Notes

- Script có **idempotent design**: skip buses đã có seat map
- Có thể chạy nhiều lần mà không duplicate data
- Position coordinates (`x`, `y`) dùng cho frontend rendering
- Row numbering: Lower deck (1-6), Upper deck (101-106) để phân biệt
- Seat types help frontend apply styling (window, aisle, vip)

---

**Status**: ✅ Completed  
**Date**: 2025-01-01  
**By**: Backend Team
