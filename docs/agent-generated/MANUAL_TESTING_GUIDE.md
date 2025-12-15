# Manual Testing Guide - Bus Ticket Booking System

## Phase 3: Comprehensive Testing

**Date:** November 26, 2025  
**Status:** Ready for Execution  
**Tester:** [Your Name]

---

## Prerequisites

Before starting tests:

- [ ] Backend server running (`npm run dev` in backend directory)
- [ ] MongoDB connected and running
- [ ] Environment variables configured (.env file)
- [ ] Email service configured (SMTP credentials)
- [ ] Payment gateway configured (PayOS sandbox)
- [ ] Postman or Thunder Client installed
- [ ] Test user accounts created (user and admin)

---

## Test Environment Setup

### 1. Create Test Admin Account

Run this script in MongoDB or use the register endpoint then manually change role to 'admin':

```javascript
// In MongoDB shell
db.users.insertOne({
  name: 'Admin User',
  email: 'admin@test.com',
  password: '$2a$10$...', // bcrypt hash of "Admin123!"
  role: 'admin',
  isEmailVerified: true,
});
```

### 2. Test Data Requirements

- At least 2 routes created
- At least 3 trips created
- At least 1 operator created
- At least 1 bus created

---

## Test Suite 1: Authentication & Authorization

### Test 1.1: User Registration

**Endpoint:** `POST /v1/auth/register`

**Request Body:**

```json
{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "Password123!"
}
```

**Expected Results:**

- ✅ Status: 201 Created
- ✅ Response contains: user object and tokens
- ✅ Email verification email sent (check logs if SMTP configured)
- ✅ User created in database with role "user"

**Actual Results:**

- Status: \_\_\_
- User created: ☐ Yes ☐ No
- Tokens received: ☐ Yes ☐ No
- Email sent: ☐ Yes ☐ No

---

### Test 1.2: User Login

**Endpoint:** `POST /v1/auth/login`

**Request Body:**

```json
{
  "email": "testuser@example.com",
  "password": "Password123!"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Response contains: user object and tokens
- ✅ Access token and refresh token returned

**Actual Results:**

- Status: \_\_\_
- Tokens received: ☐ Yes ☐ No

---

### Test 1.3: Login with Wrong Password

**Endpoint:** `POST /v1/auth/login`

**Request Body:**

```json
{
  "email": "testuser@example.com",
  "password": "WrongPassword123!"
}
```

**Expected Results:**

- ✅ Status: 401 Unauthorized
- ✅ Error message: "Incorrect email or password"

**Actual Results:**

- Status: \_\_\_
- Error message: \_\_\_

---

### Test 1.4: Token Refresh

**Endpoint:** `POST /v1/auth/refresh`

**Request Body:**

```json
{
  "refreshToken": "<refresh_token_from_login>"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ New access token and refresh token returned

**Actual Results:**

- Status: \_\_\_
- New tokens received: ☐ Yes ☐ No

---

### Test 1.5: Access Protected Route Without Token

**Endpoint:** `GET /v1/users`

**Headers:** None (no Authorization header)

**Expected Results:**

- ✅ Status: 401 Unauthorized
- ✅ Error message about missing authentication

**Actual Results:**

- Status: \_\_\_
- Blocked: ☐ Yes ☐ No

---

### Test 1.6: User Access Admin-Only Endpoint

**Endpoint:** `POST /v1/operators`

**Headers:**

```
Authorization: Bearer <user_access_token>
```

**Request Body:**

```json
{
  "name": "Test Operator",
  "email": "operator@test.com",
  "phone": "0123456789",
  "address": "123 Test St"
}
```

**Expected Results:**

- ✅ Status: 403 Forbidden
- ✅ Error message about insufficient permissions

**Actual Results:**

- Status: \_\_\_
- Blocked: ☐ Yes ☐ No

---

### Test 1.7: Admin Access Admin-Only Endpoint

**Endpoint:** `POST /v1/operators`

**Headers:**

```
Authorization: Bearer <admin_access_token>
```

**Request Body:**

```json
{
  "name": "Test Operator",
  "email": "operator@test.com",
  "phone": "0123456789",
  "address": "123 Test St",
  "licenseNumber": "BUS123456"
}
```

**Expected Results:**

- ✅ Status: 201 Created
- ✅ Operator created successfully

**Actual Results:**

- Status: \_\_\_
- Operator created: ☐ Yes ☐ No

---

## Test Suite 2: Guest Booking Flow (CRITICAL)

### Test 2.1: Search Trips (No Auth Required)

**Endpoint:** `GET /v1/trips/search`

**Query Parameters:**

```
?routeId=<route_id>&date=2025-12-01&originCity=Hanoi&destinationCity=Ho Chi Minh
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Returns list of available trips
- ✅ No authentication required
- ✅ Search history logged for authenticated users only

**Actual Results:**

- Status: \_\_\_
- Trips returned: \_\_\_ trips
- Works without auth: ☐ Yes ☐ No

---

### Test 2.2: Lock Seats (Optional, depends on implementation)

**Endpoint:** `POST /v1/seatlock/lock`

**Request Body:**

```json
{
  "tripId": "<trip_id>",
  "seats": ["A1", "A2"],
  "sessionId": "guest_session_123"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Seats locked for 10 minutes
- ✅ Returns lock information

**Actual Results:**

- Status: \_\_\_
- Seats locked: ☐ Yes ☐ No

---

### Test 2.3: Create Guest Booking

**Endpoint:** `POST /v1/bookings/guest`

**Request Body:**

```json
{
  "trip": "<trip_id>",
  "seats": ["A1", "A2"],
  "guestEmail": "guest@example.com",
  "guestPhone": "0123456789",
  "passengers": [
    {
      "name": "John Doe",
      "age": 30,
      "gender": "male"
    },
    {
      "name": "Jane Doe",
      "age": 28,
      "gender": "female"
    }
  ],
  "sessionId": "guest_session_123"
}
```

**Expected Results:**

- ✅ Status: 201 Created
- ✅ Booking created with status "pending"
- ✅ Booking confirmation email sent to guestEmail
- ✅ No authentication required
- ✅ Seat locks released (if locking implemented)

**Actual Results:**

- Status: \_\_\_
- Booking ID: \_\_\_
- Booking status: \_\_\_
- Email sent: ☐ Yes ☐ No (check email logs)
- Email received: ☐ Yes ☐ No

---

### Test 2.4: Create Payment Link

**Endpoint:** `POST /v1/payments/create`

**Request Body:**

```json
{
  "bookingId": "<booking_id_from_previous_step>",
  "returnUrl": "http://localhost:3000/booking-success",
  "cancelUrl": "http://localhost:3000/booking-cancelled"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Returns PayOS checkout URL
- ✅ Payment order created

**Actual Results:**

- Status: \_\_\_
- Checkout URL received: ☐ Yes ☐ No
- Payment URL: \_\_\_

---

### Test 2.5: Check Payment Status

**Endpoint:** `GET /v1/payments/<paymentId>/status`

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Returns payment status (pending/paid/cancelled)

**Actual Results:**

- Status: \_\_\_
- Payment status: \_\_\_

---

### Test 2.6: Simulate Payment Webhook (Success)

**Endpoint:** `POST /v1/payments/webhook`

**Request Body:** (Simulate PayOS webhook)

```json
{
  "data": {
    "orderCode": 123456,
    "amount": 500000,
    "description": "Payment for booking",
    "accountNumber": "0123456789",
    "reference": "<booking_id>",
    "transactionDateTime": "2025-11-26T10:00:00Z",
    "code": "00",
    "desc": "Thành công"
  },
  "signature": "valid_signature"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Booking status updated to "confirmed"
- ✅ Payment status updated to "paid"
- ✅ Success confirmation email sent
- ✅ Available seats decreased

**Actual Results:**

- Status: \_\_\_
- Booking status after webhook: \_\_\_
- Payment status: \_\_\_
- Email sent: ☐ Yes ☐ No

---

### Test 2.7: Attempt Double Booking Same Seats

**Endpoint:** `POST /v1/bookings/guest`

**Request Body:** (Try booking same seats as Test 2.3)

```json
{
  "trip": "<same_trip_id>",
  "seats": ["A1", "A2"],
  "guestEmail": "another@example.com",
  "guestPhone": "0987654321",
  "passengers": [...]
}
```

**Expected Results:**

- ✅ Status: 400 Bad Request
- ✅ Error message: Seats already booked or not available
- ✅ Booking NOT created

**Actual Results:**

- Status: \_\_\_
- Error message: \_\_\_
- Prevented double booking: ☐ Yes ☐ No

---

## Test Suite 3: Email Notifications

### Test 3.1: Booking Confirmation Email

**Trigger:** Create any booking (guest or authenticated)

**Email Check:**

- [ ] Email received at guest/user email address
- [ ] Subject line appropriate
- [ ] Email contains:
  - [ ] Booking ID
  - [ ] Trip details (route, date, time)
  - [ ] Seat numbers
  - [ ] Total price
  - [ ] Payment status
  - [ ] Passenger information
- [ ] Email template renders correctly (no broken HTML)
- [ ] Links work (if any)

**Actual Results:**

- Email received: ☐ Yes ☐ No
- All details present: ☐ Yes ☐ No
- Template looks good: ☐ Yes ☐ No

---

### Test 3.2: Booking Cancellation Email

**Endpoint:** `PATCH /v1/bookings/<booking_id>/cancel`

**Headers:**

```
Authorization: Bearer <user_access_token>
```

**Request Body:**

```json
{
  "reason": "Change of plans"
}
```

**Email Check:**

- [ ] Cancellation email received
- [ ] Contains booking details
- [ ] Contains cancellation reason
- [ ] Contains refund information (if applicable)

**Actual Results:**

- Status: \_\_\_
- Booking cancelled: ☐ Yes ☐ No
- Email sent: ☐ Yes ☐ No

---

## Test Suite 4: Review System

### Test 4.1: Create Review

**Endpoint:** `POST /v1/reviews`

**Headers:**

```
Authorization: Bearer <user_access_token>
```

**Request Body:**

```json
{
  "booking": "<completed_booking_id>",
  "trip": "<trip_id>",
  "operator": "<operator_id>",
  "rating": 5,
  "comment": "Excellent service! Very comfortable ride."
}
```

**Expected Results:**

- ✅ Status: 201 Created
- ✅ Review created successfully
- ✅ Can only review completed bookings

**Actual Results:**

- Status: \_\_\_
- Review created: ☐ Yes ☐ No

---

### Test 4.2: Attempt Duplicate Review

**Endpoint:** `POST /v1/reviews`

**Request Body:** (Same trip as Test 4.1)

**Expected Results:**

- ✅ Status: 400 Bad Request
- ✅ Error: Already reviewed this trip

**Actual Results:**

- Status: \_\_\_
- Duplicate prevented: ☐ Yes ☐ No

---

### Test 4.3: Get Reviews

**Endpoint:** `GET /v1/reviews?trip=<trip_id>`

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Returns list of reviews for the trip
- ✅ Includes vote counts

**Actual Results:**

- Status: \_\_\_
- Reviews returned: \_\_\_ reviews

---

### Test 4.4: Upvote Review

**Endpoint:** `POST /v1/reviews/<review_id>/vote`

**Headers:**

```
Authorization: Bearer <different_user_token>
```

**Request Body:**

```json
{
  "voteType": "upvote"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Upvote count increased by 1
- ✅ Cannot vote on own review

**Actual Results:**

- Status: \_\_\_
- Vote recorded: ☐ Yes ☐ No

---

### Test 4.5: Change Vote to Downvote

**Endpoint:** `POST /v1/reviews/<review_id>/vote`

**Request Body:**

```json
{
  "voteType": "downvote"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Upvote count decreased by 1
- ✅ Downvote count increased by 1

**Actual Results:**

- Status: \_\_\_
- Vote changed: ☐ Yes ☐ No

---

### Test 4.6: Remove Vote

**Endpoint:** `DELETE /v1/reviews/<review_id>/vote`

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Downvote count decreased by 1
- ✅ Vote removed

**Actual Results:**

- Status: \_\_\_
- Vote removed: ☐ Yes ☐ No

---

## Test Suite 5: Seat Locking Mechanism

### Test 5.1: Lock Seats

**Endpoint:** `POST /v1/seatlock/lock`

**Request Body:**

```json
{
  "tripId": "<trip_id>",
  "seats": ["B1", "B2"],
  "sessionId": "session_456"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Seats locked successfully
- ✅ Expiry time set (10 minutes from now)

**Actual Results:**

- Status: \_\_\_
- Seats locked: ☐ Yes ☐ No
- Lock expiry: \_\_\_

---

### Test 5.2: Check Locked Seats

**Endpoint:** `GET /v1/seatlock/trip/<trip_id>`

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Returns list of currently locked seats
- ✅ Shows B1, B2 as locked

**Actual Results:**

- Status: \_\_\_
- Locked seats shown: ☐ Yes ☐ No

---

### Test 5.3: Attempt to Book Locked Seats

**Endpoint:** `POST /v1/bookings/guest`

**Request Body:** (Try to book B1, B2)

**Expected Results:**

- ✅ Status: 400 Bad Request
- ✅ Error: Seats are currently locked

**Actual Results:**

- Status: \_\_\_
- Booking prevented: ☐ Yes ☐ No

---

### Test 5.4: Release Locks After Booking

**Endpoint:** `POST /v1/bookings/guest`

**Request Body:** (Book with correct sessionId that owns the lock)

**Expected Results:**

- ✅ Status: 201 Created
- ✅ Booking created
- ✅ Seat locks automatically released

**Actual Results:**

- Status: \_\_\_
- Locks released: ☐ Yes ☐ No

---

### Test 5.5: Lock Expiry

**Manual Test:**

1. Lock some seats
2. Wait 10+ minutes
3. Try to book those seats with different session

**Expected Results:**

- ✅ Locks expired automatically (TTL index)
- ✅ Seats available for booking again

**Actual Results:**

- Locks expired: ☐ Yes ☐ No (check after 10 min)
- Seats bookable: ☐ Yes ☐ No

---

## Test Suite 6: Operator Management

### Test 6.1: Create Operator (Admin)

**Endpoint:** `POST /v1/operators`

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "name": "VIP Bus Lines",
  "email": "contact@vipbus.com",
  "phone": "0123456789",
  "address": "456 Highway Street, Hanoi",
  "licenseNumber": "BUS789012",
  "status": "active"
}
```

**Expected Results:**

- ✅ Status: 201 Created
- ✅ Operator created

**Actual Results:**

- Status: \_\_\_
- Operator ID: \_\_\_

---

### Test 6.2: List Operators (Public)

**Endpoint:** `GET /v1/operators`

**Expected Results:**

- ✅ Status: 200 OK
- ✅ No authentication required
- ✅ Returns list of operators

**Actual Results:**

- Status: \_\_\_
- Operators returned: \_\_\_ operators
- Works without auth: ☐ Yes ☐ No

---

### Test 6.3: Update Operator (Admin Only)

**Endpoint:** `PATCH /v1/operators/<operator_id>`

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "phone": "0987654321"
}
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Operator updated

**Actual Results:**

- Status: \_\_\_
- Operator updated: ☐ Yes ☐ No

---

### Test 6.4: User Cannot Delete Operator

**Endpoint:** `DELETE /v1/operators/<operator_id>`

**Headers:**

```
Authorization: Bearer <user_token>
```

**Expected Results:**

- ✅ Status: 403 Forbidden
- ✅ Deletion prevented

**Actual Results:**

- Status: \_\_\_
- Access denied: ☐ Yes ☐ No

---

## Test Suite 7: Search History

### Test 7.1: Search History Logged

**Endpoint:** `GET /v1/trips/search?routeId=...&date=...&originCity=Hanoi&destinationCity=HCM`

**Headers:**

```
Authorization: Bearer <user_token>
```

**Expected Results:**

- ✅ Search executes successfully
- ✅ Search history saved for authenticated user

**Actual Results:**

- Search works: ☐ Yes ☐ No
- History logged: ☐ Check in next test

---

### Test 7.2: Retrieve Search History

**Endpoint:** `GET /v1/users/search-history`

**Headers:**

```
Authorization: Bearer <user_token>
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ Returns list of user's search history
- ✅ Sorted by most recent first
- ✅ Contains search from Test 7.1

**Actual Results:**

- Status: \_\_\_
- History returned: \_\_\_ entries
- Contains recent search: ☐ Yes ☐ No

---

### Test 7.3: Guest Search Not Logged

**Endpoint:** `GET /v1/trips/search?routeId=...&date=...`

**Headers:** None

**Expected Results:**

- ✅ Search works
- ✅ No history saved (guest user)

**Actual Results:**

- Search works: ☐ Yes ☐ No

---

## Test Suite 8: Route Management

### Test 8.1: Toggle Route Status

**Endpoint:** `PATCH /v1/routes/<route_id>/toggle-status`

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Expected Results:**

- ✅ Status: 200 OK
- ✅ isActive field toggled
- ✅ If was true, now false (or vice versa)

**Actual Results:**

- Status: \_\_\_
- isActive toggled: ☐ Yes ☐ No
- New status: \_\_\_

---

### Test 8.2: Inactive Route Not in Search

**Setup:**

1. Toggle a route to inactive (isActive = false)
2. Search for trips on that route

**Expected Results:**

- ✅ Route not shown in search results
- ✅ Trips on inactive routes not returned

**Actual Results:**

- Route hidden: ☐ Yes ☐ No

---

## Test Suite 9: Error Handling & Edge Cases

### Test 9.1: Invalid MongoDB ObjectId

**Endpoint:** `GET /v1/bookings/invalid-id-123`

**Expected Results:**

- ✅ Status: 400 Bad Request
- ✅ Error message about invalid ID format

**Actual Results:**

- Status: \_\_\_
- Error message: \_\_\_

---

### Test 9.2: Non-existent Resource

**Endpoint:** `GET /v1/bookings/507f1f77bcf86cd799439011`

**Expected Results:**

- ✅ Status: 404 Not Found
- ✅ Error message: "Booking not found"

**Actual Results:**

- Status: \_\_\_
- Error message: \_\_\_

---

### Test 9.3: Missing Required Fields

**Endpoint:** `POST /v1/bookings/guest`

**Request Body:** (Missing guestEmail)

```json
{
  "trip": "<trip_id>",
  "seats": ["A1"],
  "guestPhone": "0123456789"
}
```

**Expected Results:**

- ✅ Status: 400 Bad Request
- ✅ Validation error about missing guestEmail

**Actual Results:**

- Status: \_\_\_
- Validation works: ☐ Yes ☐ No

---

### Test 9.4: Expired Access Token

**Endpoint:** `GET /v1/users`

**Headers:**

```
Authorization: Bearer <expired_token>
```

**Expected Results:**

- ✅ Status: 401 Unauthorized
- ✅ Error about expired token

**Actual Results:**

- Status: \_\_\_
- Error message: \_\_\_

---

## Test Summary

### Overall Results

**Test Suites Completed:**

- [ ] Authentication & Authorization (7 tests)
- [ ] Guest Booking Flow (7 tests)
- [ ] Email Notifications (2 tests)
- [ ] Review System (6 tests)
- [ ] Seat Locking (5 tests)
- [ ] Operator Management (4 tests)
- [ ] Search History (3 tests)
- [ ] Route Management (2 tests)
- [ ] Error Handling (4 tests)

**Total Tests:** 40 tests

**Pass Rate:** **_ / 40 tests passed (_**%)

---

## Critical Issues Found

| #   | Test | Issue Description | Severity | Status |
| --- | ---- | ----------------- | -------- | ------ |
| 1   |      |                   |          |        |
| 2   |      |                   |          |        |
| 3   |      |                   |          |        |

---

## Recommendations

1.
2.
3.

---

## Sign-off

**Tester:** **\*\***\_\_\_**\*\***  
**Date:** **\*\***\_\_\_**\*\***  
**Status:** ☐ All Tests Passed ☐ Issues Found ☐ Needs Retest

---

**End of Manual Testing Guide**
