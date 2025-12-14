# Email Notifications - Quick Reference

## 🚀 Quick Start

### 1. Initialize Scheduler (Add to `src/index.ts`)

```typescript
import notificationService from './services/notification.service';

// After MongoDB connection
notificationService.initializeScheduler();
logger.info('Email notification scheduler initialized');
```

### 2. Environment Variables (`.env`)

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Bus Ticket System <noreply@busticketing.com>

# URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Support
SUPPORT_PHONE=+1-234-567-8900
SUPPORT_EMAIL=support@busticketing.com
```

---

## 📧 Automatic Email Triggers

### Booking Confirmation

**When**: Booking created with status 'confirmed'
**Who**: User email or guestEmail
**Action**: None required - automatic

### Seat Lock Reminder

**When**: 2 minutes before lock expires
**Who**: Users with active seat locks
**Required**: Include `guestEmail` in metadata when creating lock

```typescript
await seatLockService.lockSeats(tripId, seats, sessionId, userId, {
  guestEmail: 'user@example.com',
});
```

### Booking Reminders

**When**: 24 hours and 2 hours before departure
**Who**: All confirmed bookings
**Action**: None required - automatic

### Cancellation Email

**When**: Booking cancelled via API
**Who**: Booking owner
**Action**: None required - automatic

---

## 🎯 API Endpoints

### Cancel Booking (Triggers Email)

```http
DELETE /v1/bookings/:bookingId/cancel
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Change of plans"
}
```

**Response:**

```json
{
  "booking": {
    "status": "cancelled",
    "payment": {
      "refund": {
        "amount": 450000,
        "refundPercentage": 90,
        "status": "pending"
      }
    }
  }
}
```

### Manual Trigger (Testing Only)

```http
POST /v1/admin/notifications/booking-reminders
Authorization: Bearer {admin-token}
```

---

## 📊 Refund Policy

| Time Before Departure | Refund % |
| --------------------- | -------- |
| > 24 hours            | 90%      |
| 12-24 hours           | 70%      |
| 6-12 hours            | 50%      |
| 2-6 hours             | 25%      |
| < 2 hours             | 0%       |

---

## 🔄 Scheduler Timings

| Task                | Frequency        | Purpose                 |
| ------------------- | ---------------- | ----------------------- |
| Booking Reminders   | Every 15 minutes | 24h and 2h before trips |
| Seat Lock Reminders | Every 30 seconds | 2 min before expiration |

---

## 🎨 Frontend Integration Examples

### Display Email Status

```typescript
<div className="email-status">
  <p>Confirmation: {booking.confirmationEmailSent ? '✅ Sent' : '⏳ Pending'}</p>
  <p>24h Reminder: {booking.reminderSent24h ? '✅ Sent' : '⏳ Scheduled'}</p>
  <p>2h Reminder: {booking.reminderSent2h ? '✅ Sent' : '⏳ Scheduled'}</p>
</div>
```

### Lock Seats with Email

```typescript
const lockResponse = await fetch('/api/v1/seat-locks/lock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tripId,
    seatNumbers: ['A1', 'A2'],
    sessionId,
    metadata: {
      guestEmail: email, // Required for reminders
      guestPhone: phone,
    },
  }),
});
```

### Cancel with Refund Display

```typescript
const cancelBooking = async (bookingId, reason) => {
  const response = await fetch(`/api/v1/bookings/${bookingId}/cancel`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const { booking } = await response.json();
  const refund = booking.payment.refund;

  // Show refund to user
  alert(`Refund: ${refund.amount} VND (${refund.refundPercentage}%)`);
};
```

---

## 🛠️ Testing

### Test Confirmation Email

```bash
# Create booking, email sent automatically
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{"trip":"...","passengers":[...],"contactEmail":"test@example.com"}'
```

### Test Seat Lock Reminder

```bash
# Lock seats, wait 8 minutes, receive reminder at 2 min before expiration
curl -X POST http://localhost:3000/api/v1/seat-locks/lock \
  -d '{"tripId":"...","seatNumbers":["A1"],"metadata":{"guestEmail":"test@example.com"}}'
```

### Test Cancellation Email

```bash
# Cancel booking, email with refund details sent automatically
curl -X DELETE http://localhost:3000/api/v1/bookings/{id}/cancel \
  -H "Authorization: Bearer {token}" \
  -d '{"reason":"Testing"}'
```

---

## 📝 Database Schema Updates

### Booking Model - New Fields

```typescript
reminderSent24h: Boolean; // 24h reminder sent
reminderSent2h: Boolean; // 2h reminder sent
confirmationEmailSent: Boolean; // Confirmation sent
cancellationEmailSent: Boolean; // Cancellation sent
```

### SeatLock Model - New Fields

```typescript
reminderSent: Boolean; // Reminder sent flag
metadata: {
  guestEmail: String; // Guest email for reminders
  guestPhone: String; // Guest phone (optional)
}
```

---

## ⚠️ Important Notes

1. **Email failures don't block bookings** - All email sending is wrapped in try-catch
2. **Seat lock reminders require email** - Include `guestEmail` in metadata when locking seats
3. **Scheduler runs automatically** - Initialize in `index.ts` after DB connection
4. **Refunds calculated automatically** - Based on time before departure
5. **All times in local timezone** - Configure based on deployment location

---

## 🔗 Full Documentation

See [EMAIL-NOTIFICATION-API.md](./EMAIL-NOTIFICATION-API.md) for complete documentation including:

- All email template variables
- Trip update notification types
- Performance optimization
- Monitoring and logging
- Error handling details

---

**Version:** 1.0.0 | **Last Updated:** December 14, 2025
