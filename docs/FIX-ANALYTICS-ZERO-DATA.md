# Fix Analytics Zero Data Issue

## Vấn đề

Trang analytics hiển thị 0 bookings mặc dù database có bookings với status "completed".

## Nguyên nhân

Bookings trong database có `createdAt` timestamp cũ (ngoài khoảng 30 ngày), do đó analytics service không query được dữ liệu khi filter theo period (7d/30d/90d).

## Giải pháp

### 1. Cập nhật timestamps của bookings hiện có

Chạy script để update timestamps của tất cả bookings về trong vòng 30 ngày gần đây:

```bash
npm run update:timestamps
```

Script này sẽ:

- Lấy tất cả bookings từ database
- Random generate `createdAt` trong khoảng 0-30 ngày gần đây
- Update timestamps cho từng booking
- Hiển thị thống kê phân bổ bookings

### 2. Kiểm tra kết quả

Sau khi chạy script, kiểm tra:

**Backend API:**

```bash
# Test analytics API (cần authentication)
curl http://localhost:4000/api/v1/analytics?period=30d
```

**Frontend:**

- Mở trang `/admin/dashboard/analytics`
- Chọn period "Last 30 days"
- Kiểm tra xem có dữ liệu hiển thị không

### 3. Seed data mới (tùy chọn)

Nếu muốn tạo bookings mới với timestamps phù hợp, có thể chỉnh sửa `seedData.ts`:

```typescript
// Trong createBooking function, thêm createdAt random:
const daysAgo = Math.floor(Math.random() * 30); // Random 0-30 days ago
const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

const booking = await Booking.create({
  // ... existing fields
  createdAt,
  updatedAt: createdAt,
});
```

## Kết quả mong đợi

Sau khi fix:

- ✅ Analytics dashboard hiển thị tổng revenue, bookings
- ✅ Revenue chart hiển thị dữ liệu theo ngày
- ✅ Status breakdown hiển thị phân bổ bookings
- ✅ Popular routes hiển thị các tuyến đường phổ biến

## Lưu ý

- Script `update:timestamps` sẽ update **tất cả** bookings trong database
- Nếu cần giữ timestamps gốc, hãy backup database trước
- Chỉ cần chạy script này **một lần**
