# Email Notification System - API Documentation

## Overview

The Email Notification System provides automated email delivery for booking confirmations, cancellations, reminders, seat lock alerts, and trip updates. This system ensures customers stay informed throughout their booking journey.

## Features

- ✅ **Booking Confirmation Emails** - Sent immediately after successful booking with full trip details
- ✅ **Seat Lock Reminders** - Sent 2 minutes before seat lock expiration
- ✅ **Booking Reminders** - Sent 24 hours and 2 hours before trip departure
- ✅ **Cancellation Emails** - Sent with refund details when booking is cancelled
- ✅ **Trip Update Notifications** - Sent when trip details change (delays, cancellations, gate changes)
- ✅ **Automated Scheduler** - Background jobs handle all reminder delivery

---

## Email Types

### 1. Booking Confirmation Email

**Trigger:** Automatically sent when a booking is confirmed (status changes to 'confirmed')

**Recipients:**

- Registered users: User's email from account
- Guest bookings: `guestEmail` field

**Email Contains:**

- Booking reference number
- Complete passenger details with seat numbers
- Route information (departure/arrival)
- Bus and operator details
- Payment summary
- Boarding instructions
- QR code for check-in (visual only, not implemented backend)
- Cancellation policy
- Support contact information

**Implementation:**

```typescript
// Automatically sent in booking.service.ts
await emailService.sendBookingConfirmation(userEmail, populatedBooking);
```

**Data Required:**

- Populated booking with trip, route, bus, operator data
- User/guest email address

---

### 2. Booking Reminders

**Trigger:** Automated via cron scheduler

**Schedule:**

- **24-hour reminder**: Sent 24 hours before departure (±15 min window)
- **2-hour reminder**: Sent 2 hours before departure (±7.5 min window)

**Recipients:** All confirmed bookings approaching departure time

**Email Contains:**

- Countdown timer showing time remaining
- Trip details and route information
- Pre-departure checklist
- Boarding location with map link
- Quick actions (view booking, download ticket, cancel)
- Support contact

**Scheduler Configuration:**

```typescript
// Runs every 15 minutes
cron.schedule('*/15 * * * *', () => {
  notificationService.sendBookingReminders();
});
```

**Manual Trigger (for testing):**

```typescript
await notificationService.triggerBookingReminders();
```

---

### 3. Seat Lock Reminder

**Trigger:** Automated via cron scheduler

**Schedule:**

- Sent 2 minutes before lock expiration (±30 sec window)
- Scheduler runs every 30 seconds

**Recipients:** Users with active seat locks approaching expiration

**Email Contains:**

- Urgent countdown timer
- Reserved seat numbers
- Trip summary
- Total price to pay
- Call-to-action buttons:
  - Complete Booking (direct link)
  - Extend Lock (+5 minutes)
- Warning about seat release
- Quick tips for booking completion

**Scheduler Configuration:**

```typescript
// Runs every 30 seconds
cron.schedule('*/30 * * * * *', () => {
  notificationService.sendSeatLockReminders();
});
```

**Requirements:**

- Seat lock must have metadata with `guestEmail` for guest users
- Or linked to registered user via `userId`

**Implementation Example:**

```typescript
// When creating seat lock, include email in metadata
await seatLockService.lockSeats(tripId, seatNumbers, sessionId, userId, {
  guestEmail: 'guest@example.com',
  guestPhone: '+1234567890',
});
```

---

### 4. Cancellation Email (Enhanced)

**Trigger:** When booking is cancelled via API

**Recipients:** Booking owner (user or guest email)

**Email Contains:**

- Booking reference number
- Refund amount and percentage
- Original booking amount
- Refund processing timeline (3-5 business days)
- Refund policy explanation
- Cancellation reason
- Trip details (what was cancelled)
- Support contact for refund queries

**Refund Calculation Policy:**

```
Time Before Departure    |  Refund Percentage
--------------------------|-------------------
> 24 hours               |  90%
12-24 hours              |  70%
6-12 hours               |  50%
2-6 hours                |  25%
< 2 hours                |  0%
```

**API Endpoint:**

```
DELETE /v1/bookings/:bookingId/cancel
```

**Request Body:**

```json
{
  "reason": "Change of plans"
}
```

**Response:**

```json
{
  "booking": {
    "id": "64a7f8e...",
    "status": "cancelled",
    "payment": {
      "refund": {
        "amount": 450000,
        "status": "pending",
        "refundPercentage": 90
      }
    }
  }
}
```

---

### 5. Trip Update Notifications

**Trigger:** When operator updates trip details

**Update Types:**

- `delay` - Trip is delayed
- `cancellation` - Trip is cancelled
- `gate_change` - Boarding point changed
- `time_change` - Departure time changed
- `bus_change` - Bus vehicle changed

**Recipients:** All passengers with confirmed bookings on the trip

**Email Contains:**

- Update type (color-coded by urgency)
- Before/After comparison for changes
- Explanation message
- Refund eligibility (for cancellations)
- New trip details
- Actions available (rebook, get refund, contact support)

**Implementation:**

```typescript
// Send update to all affected passengers
await emailService.sendEnhancedTripUpdate(passengerEmail, booking, 'delay', {
  message: 'Your trip has been delayed by 2 hours due to weather conditions',
  oldValue: '10:00 AM',
  newValue: '12:00 PM',
});
```

---

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Bus Ticket System <noreply@busticketing.com>

# Frontend URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Support Contact
SUPPORT_PHONE=+1-234-567-8900
SUPPORT_EMAIL=support@busticketing.com
```

### Initialize Scheduler

In your main application file (`src/index.ts`):

```typescript
import notificationService from './services/notification.service';

// After database connection
notificationService.initializeScheduler();
logger.info('Email notification scheduler started');
```

---

## API Endpoints

### Manual Notification Triggers (Admin/Testing Only)

#### Trigger Booking Reminders

```
POST /v1/admin/notifications/booking-reminders
```

**Response:**

```json
{
  "success": true,
  "remindersSent": {
    "twentyFourHour": 5,
    "twoHour": 3
  }
}
```

#### Trigger Seat Lock Reminders

```
POST /v1/admin/notifications/seat-lock-reminders
```

**Response:**

```json
{
  "success": true,
  "remindersSent": 12
}
```

---

## Database Schema Updates

### Booking Model - New Fields

```typescript
{
  // Email notification tracking
  reminderSent24h: Boolean,        // 24h reminder sent flag
  reminderSent2h: Boolean,         // 2h reminder sent flag
  confirmationEmailSent: Boolean,  // Confirmation email sent flag
  cancellationEmailSent: Boolean,  // Cancellation email sent flag
}
```

### SeatLock Model - New Fields

```typescript
{
  reminderSent: Boolean,           // Reminder sent flag
  metadata: {
    guestEmail: String,            // Guest email for reminders
    guestPhone: String,            // Guest phone (optional)
  }
}
```

---

## Frontend Integration Guide

### 1. Create Booking with Email Notifications

```typescript
// Create booking (confirmation email sent automatically)
const response = await fetch('/api/v1/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    trip: tripId,
    passengers: [{ name: 'John Doe', age: 30, gender: 'male', seatNumber: 'A1', seatPrice: 500000 }],
    contactPhone: '+84901234567',
    contactEmail: 'john@example.com',
    sessionId: sessionId, // To release seat locks
  }),
});

// Response includes booking with confirmation that email was sent
const { booking } = await response.json();
console.log('Booking confirmed, email sent to:', booking.contactEmail);
```

### 2. Lock Seats with Reminder Support (Guest Users)

```typescript
// Lock seats with email for reminder
const response = await fetch('/api/v1/seat-locks/lock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tripId: tripId,
    seatNumbers: ['A1', 'A2'],
    sessionId: sessionId,
    metadata: {
      guestEmail: 'guest@example.com', // Required for reminder
      guestPhone: '+84901234567',
    },
  }),
});

// User will receive email reminder 2 minutes before expiration
```

### 3. Cancel Booking with Refund

```typescript
const response = await fetch(`/api/v1/bookings/${bookingId}/cancel`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    reason: 'Change of plans',
  }),
});

const { booking } = await response.json();

// Display refund information to user
const refund = booking.payment.refund;
alert(`Cancellation confirmed. Refund: ${refund.amount} VND (${refund.refundPercentage}%)`);
// User receives cancellation email with refund details
```

### 4. Display Notification Status

```typescript
// Show notification status in booking details
function BookingDetails({ booking }) {
  return (
    <div>
      <h2>Booking #{booking.referenceNumber}</h2>

      <div className="notification-status">
        <h3>Email Notifications</h3>
        <ul>
          <li>
            Confirmation: {booking.confirmationEmailSent ? '✅ Sent' : '⏳ Pending'}
          </li>
          <li>
            24h Reminder: {booking.reminderSent24h ? '✅ Sent' : '⏳ Scheduled'}
          </li>
          <li>
            2h Reminder: {booking.reminderSent2h ? '✅ Sent' : '⏳ Scheduled'}
          </li>
        </ul>
      </div>

      {/* Rest of booking details */}
    </div>
  );
}
```

---

## Email Template Variables

### Booking Confirmation Template Variables

```typescript
{
  bookingId: string;
  seats: string; // e.g., "A1, A2, A3"
  seatCount: number;
  totalPrice: string; // Formatted with commas
  ticketPrice: string;
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string; // Formatted date
  arrivalTime: string;
  operatorName: string;
  busType: string;
  busNumber: string;
  amenities: string; // Comma-separated
  passengersList: string; // HTML list of passengers
  boardingPoint: string;
  viewBookingUrl: string;
  downloadTicketUrl: string;
  cancelBookingUrl: string;
  supportPhone: string;
  supportEmail: string;
  websiteUrl: string;
  termsUrl: string;
  privacyUrl: string;
  supportUrl: string;
}
```

### Seat Lock Reminder Template Variables

```typescript
{
  minutesLeft: string; // e.g., "2"
  sessionId: string;
  seatNumbers: string; // e.g., "A1, A2"
  seatNumbersDisplay: string; // HTML badges
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  busType: string;
  totalPrice: string;
  completeBookingUrl: string;
  extendLockUrl: string;
  supportPhone: string;
  supportEmail: string;
}
```

### Booking Reminder Template Variables

```typescript
{
  bookingId: string;
  timeRemaining: string; // e.g., "24 hours" or "2 hours"
  departureLocation: string;
  arrivalLocation: string;
  departureTime: string;
  arrivalTime: string;
  seats: string;
  operatorName: string;
  busType: string;
  boardingPoint: string;
  viewBookingUrl: string;
  downloadTicketUrl: string;
  cancelBookingUrl: string;
  supportPhone: string;
  supportEmail: string;
}
```

---

## Testing Guide

### 1. Test Confirmation Email

```bash
# Create a booking
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "trip": "64a7f8e...",
    "passengers": [
      { "name": "Test User", "age": 30, "gender": "male", "seatNumber": "A1", "seatPrice": 500000 }
    ],
    "contactPhone": "+84901234567",
    "contactEmail": "test@example.com"
  }'

# Check your email inbox for confirmation
```

### 2. Test Seat Lock Reminder

```bash
# Lock seats with short expiration (for testing)
curl -X POST http://localhost:3000/api/v1/seat-locks/lock \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "64a7f8e...",
    "seatNumbers": ["A1"],
    "sessionId": "test-session-123",
    "metadata": {
      "guestEmail": "test@example.com"
    }
  }'

# Wait ~8 minutes, should receive reminder at 2 minutes before expiration
```

### 3. Test Cancellation Email

```bash
# Cancel a booking
curl -X DELETE http://localhost:3000/api/v1/bookings/64a7f8e.../cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "Testing cancellation flow"
  }'

# Check email for cancellation with refund details
```

### 4. Test Manual Reminder Trigger

```bash
# Manually trigger reminders (admin endpoint)
curl -X POST http://localhost:3000/api/v1/admin/notifications/booking-reminders \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Error Handling

Email failures do not block booking operations. All email services implement try-catch with logging:

```typescript
try {
  await emailService.sendBookingConfirmation(email, booking);
  logger.info(`Confirmation email sent to ${email}`);
} catch (error) {
  logger.error('Failed to send confirmation email:', error);
  // Booking continues successfully even if email fails
}
```

**Important:**

- Email failures are logged but don't throw errors
- Users can still access booking details via the app
- Failed emails can be resent manually via admin dashboard

---

## Monitoring & Logs

### Log Messages

```
[INFO] Booking confirmation email sent to user@example.com for booking 64a7f8e...
[INFO] 24h reminder sent for booking 64a7f8e...
[INFO] Seat lock reminder sent for session abc-123
[ERROR] Failed to send booking confirmation email: SMTP connection timeout
```

### Recommended Monitoring

1. **Email Delivery Rate**: Track successful vs failed emails
2. **Scheduler Health**: Monitor cron job execution
3. **Queue Length**: If implementing email queue, monitor backlog
4. **SMTP Connection**: Alert on connection failures

---

## Performance Considerations

### Email Sending

- **Asynchronous**: Emails sent after booking is saved
- **Non-blocking**: Email failures don't affect booking creation
- **Batching**: Reminders sent in batches to avoid SMTP rate limits

### Scheduler Optimization

```typescript
// Booking reminders: Every 15 minutes
// - Queries only bookings in time window
// - Uses indexed fields for fast lookup
// - Processes in batches of 50

// Seat lock reminders: Every 30 seconds
// - Very fast query with TTL index
// - Minimal records to process
// - Immediate delivery for time-sensitive nature
```

### Database Indexes

```typescript
// Efficient reminder queries
bookingSchema.index({ status: 1, reminderSent24h: 1, 'trip.departureTime': 1 });
bookingSchema.index({ status: 1, reminderSent2h: 1, 'trip.departureTime': 1 });
seatLockSchema.index({ expiresAt: 1, reminderSent: 1 });
```

---

## Future Enhancements

- [ ] SMS notifications alongside emails
- [ ] Push notifications for mobile app
- [ ] Email preferences (opt-out of reminders)
- [ ] Multi-language email templates
- [ ] Email analytics dashboard
- [ ] A/B testing for email content
- [ ] Custom email templates per operator
- [ ] WhatsApp integration
- [ ] Real-time email delivery status tracking

---

## Support

For issues or questions:

- **Email**: dev-support@busticketing.com
- **Documentation**: https://docs.busticketing.com/notifications
- **GitHub Issues**: https://github.com/yourrepo/issues

---

**Last Updated:** December 14, 2025
**Version:** 1.0.0
