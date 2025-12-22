# Bus Ticket Booking System - Complete API Documentation

## 📖 Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Routes](#api-routes)
  - [Authentication Routes](#1-authentication-routes)
  - [User Routes](#2-user-routes)
  - [Bus Routes](#3-bus-routes)
  - [Route Routes](#4-route-routes)
  - [Trip Routes](#5-trip-routes)
  - [Booking Routes](#6-booking-routes)
  - [Operator Routes](#7-operator-routes)
  - [Review Routes](#8-review-routes)
  - [Payment Routes](#9-payment-routes)
  - [Seat Lock Routes](#10-seat-lock-routes)
  - [Chatbot Routes](#11-chatbot-routes)
  - [Location Routes](#12-location-routes)
- [Response Codes](#response-codes)
- [Error Handling](#error-handling)

---

## Overview

This is the complete API documentation for the Bus Ticket Booking System. All endpoints are versioned under `/api/v1`.

## Base URL

```
Development: http://localhost:4000/api/v1
Production: https://your-domain.com/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in:

**Option 1: HTTP-Only Cookie (Recommended)**

```
Cookie: refreshToken=<your-token>
Cookie: accessToken=<your-token>
```

**Option 2: Authorization Header**

```
Authorization: Bearer <your-access-token>
```

### Permission Levels

- **Public**: No authentication required
- **User**: Requires valid user authentication
- **Admin**: Requires admin role
- **Operator**: Requires operator role

---

## API Routes

### 1. Authentication Routes

Base path: `/api/v1/auth`

#### 1.1 Register New User

```http
POST /auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe",
  "phone": "0123456789"
}
```

**Response:** `201 Created`

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "tokens": {
    "access": {
      "token": "eyJhbGc...",
      "expires": "2025-01-22T10:00:00.000Z"
    },
    "refresh": {
      "token": "eyJhbGc...",
      "expires": "2025-02-21T10:00:00.000Z"
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### 1.2 Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "tokens": {
    "access": {
      "token": "eyJhbGc...",
      "expires": "2025-01-22T10:00:00.000Z"
    },
    "refresh": {
      "token": "eyJhbGc...",
      "expires": "2025-02-21T10:00:00.000Z"
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

#### 1.3 Logout

```http
POST /auth/logout
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `204 No Content`

---

#### 1.4 Refresh Tokens

```http
POST /auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`

```json
{
  "access": {
    "token": "eyJhbGc...",
    "expires": "2025-01-22T10:00:00.000Z"
  },
  "refresh": {
    "token": "eyJhbGc...",
    "expires": "2025-02-21T10:00:00.000Z"
  }
}
```

---

#### 1.5 Get Current User

```http
GET /auth/me
```

**Auth Required:** Yes

**Response:** `200 OK`

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "phone": "0123456789",
  "isEmailVerified": true
}
```

---

#### 1.6 Forgot Password

```http
POST /auth/forgot-password
```

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:** `204 No Content`

---

#### 1.7 Reset Password

```http
POST /auth/reset-password
```

**Request Body:**

```json
{
  "token": "reset_token_from_email",
  "password": "NewPassword123!"
}
```

**Response:** `204 No Content`

---

#### 1.8 Verify Email

```http
POST /auth/verify-email
```

**Request Body:**

```json
{
  "token": "verification_token_from_email"
}
```

**Response:** `204 No Content`

---

#### 1.9 Resend Verification Email

```http
POST /auth/resend-verification-email
```

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:** `204 No Content`

**Rate Limit:** 5 requests per 15 minutes

---

#### 1.10 Google OAuth Login

```http
GET /auth/google
```

**Description:** Redirects to Google OAuth consent screen

---

#### 1.11 Google OAuth Callback

```http
GET /auth/google/callback
```

**Description:** Google OAuth callback handler (automatic redirect)

---

### 2. User Routes

Base path: `/api/v1/users`

#### 2.1 Get All Users

```http
GET /users
```

**Auth Required:** Yes (Admin only)

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 10)
- `sortBy` (string): Sort field (e.g., "createdAt:desc")
- `role` (string): Filter by role
- `search` (string): Search by name or email

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 50
}
```

---

#### 2.2 Get User by ID

```http
GET /users/:userId
```

**Auth Required:** Yes (Admin only)

**Response:** `200 OK`

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "phone": "0123456789",
  "isEmailVerified": true,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

#### 2.3 Update User

```http
PATCH /users/:userId
```

**Auth Required:** Yes (Admin only)

**Request Body:**

```json
{
  "name": "Jane Doe",
  "phone": "0987654321"
}
```

**Response:** `200 OK`

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "Jane Doe",
  "phone": "0987654321",
  "role": "user"
}
```

---

#### 2.4 Delete User

```http
DELETE /users/:userId
```

**Auth Required:** Yes (Admin only)

**Response:** `204 No Content`

---

#### 2.5 Reset User Password

```http
PATCH /users/:userId/reset-password
```

**Auth Required:** Yes (Admin only)

**Request Body:**

```json
{
  "password": "NewPassword123!"
}
```

**Response:** `204 No Content`

---

#### 2.6 Block/Unblock User

```http
PATCH /users/:userId/block
```

**Auth Required:** Yes (Admin only)

**Request Body:**

```json
{
  "isBlocked": true
}
```

**Response:** `200 OK`

```json
{
  "id": "user_id",
  "isBlocked": true,
  "blockedAt": "2025-01-22T10:00:00.000Z"
}
```

---

#### 2.7 Get My Search History

```http
GET /users/search-history
```

**Auth Required:** Yes

**Response:** `200 OK`

```json
{
  "history": [
    {
      "from": "Ho Chi Minh",
      "to": "Da Nang",
      "date": "2025-01-25",
      "searchedAt": "2025-01-22T10:00:00.000Z"
    }
  ]
}
```

---

### 3. Bus Routes

Base path: `/api/v1/buses`

#### 3.1 Create Bus

```http
POST /buses
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "busNumber": "BUS-001",
  "busType": "standard",
  "totalSeats": 40,
  "licensePlate": "29A-12345",
  "amenities": ["wifi", "ac", "toilet"],
  "operatorId": "operator_id"
}
```

**Response:** `201 Created`

```json
{
  "id": "bus_id",
  "busNumber": "BUS-001",
  "busType": "standard",
  "totalSeats": 40,
  "licensePlate": "29A-12345",
  "amenities": ["wifi", "ac", "toilet"],
  "operator": {
    "id": "operator_id",
    "name": "Phuong Trang"
  },
  "seatMap": {
    "name": "Standard 40-seat Layout",
    "rows": 10,
    "columns": 4,
    "seats": []
  }
}
```

---

#### 3.2 Get All Buses

```http
GET /buses
```

**Auth Required:** Yes (Admin/Operator)

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `busType` (string): Filter by type (standard, limousine, sleeper)
- `operatorId` (string): Filter by operator

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "bus_id",
      "busNumber": "BUS-001",
      "busType": "standard",
      "totalSeats": 40,
      "operator": {
        "id": "operator_id",
        "name": "Phuong Trang"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "totalResults": 25
}
```

---

#### 3.3 Get Bus by ID

```http
GET /buses/:busId
```

**Auth Required:** Yes (Admin/Operator)

**Response:** `200 OK`

```json
{
  "id": "bus_id",
  "busNumber": "BUS-001",
  "busType": "standard",
  "totalSeats": 40,
  "licensePlate": "29A-12345",
  "amenities": ["wifi", "ac", "toilet"],
  "operator": {
    "id": "operator_id",
    "name": "Phuong Trang",
    "logo": "logo_url"
  },
  "seatMap": {
    "name": "Standard 40-seat Layout",
    "rows": 10,
    "columns": 4,
    "seats": [
      {
        "seatNumber": "A1",
        "row": 1,
        "column": 1,
        "seatType": "window",
        "position": { "x": 1, "y": 1 }
      }
    ]
  }
}
```

---

#### 3.4 Update Bus

```http
PATCH /buses/:busId
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "amenities": ["wifi", "ac", "toilet", "charging_port"],
  "totalSeats": 45
}
```

**Response:** `200 OK`

---

#### 3.5 Delete Bus

```http
DELETE /buses/:busId
```

**Auth Required:** Yes (Admin/Operator)

**Response:** `204 No Content`

---

#### 3.6 Update Seat Map

```http
PATCH /buses/:busId/seatmap
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "seatMap": {
    "name": "Custom Layout",
    "rows": 10,
    "columns": 4,
    "seats": [
      {
        "seatNumber": "A1",
        "row": 1,
        "column": 1,
        "seatType": "window",
        "position": { "x": 1, "y": 1 }
      }
    ]
  }
}
```

**Response:** `200 OK`

---

### 4. Route Routes

Base path: `/api/v1/routes`

#### 4.1 Create Route

```http
POST /routes
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "name": "Ho Chi Minh - Da Nang",
  "from": "Ho Chi Minh",
  "to": "Da Nang",
  "distance": 964,
  "duration": 18,
  "operatorId": "operator_id"
}
```

**Response:** `201 Created`

```json
{
  "id": "route_id",
  "name": "Ho Chi Minh - Da Nang",
  "from": "Ho Chi Minh",
  "to": "Da Nang",
  "distance": 964,
  "duration": 18,
  "operator": {
    "id": "operator_id",
    "name": "Phuong Trang"
  },
  "status": "active"
}
```

---

#### 4.2 Get All Routes

```http
GET /routes
```

**Auth Required:** No (Public)

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `from` (string): Filter by departure location
- `to` (string): Filter by destination
- `operatorId` (string): Filter by operator
- `status` (string): Filter by status (active/inactive)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "route_id",
      "name": "Ho Chi Minh - Da Nang",
      "from": "Ho Chi Minh",
      "to": "Da Nang",
      "distance": 964,
      "duration": 18,
      "operator": {
        "id": "operator_id",
        "name": "Phuong Trang"
      },
      "status": "active"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 50
}
```

---

#### 4.3 Search Routes

```http
GET /routes/search
```

**Auth Required:** No (Public)

**Query Parameters:**

- `from` (string): Departure location (required)
- `to` (string): Destination (required)
- `date` (string): Travel date (YYYY-MM-DD)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "route_id",
      "name": "Ho Chi Minh - Da Nang",
      "from": "Ho Chi Minh",
      "to": "Da Nang",
      "distance": 964,
      "duration": 18,
      "availableTrips": 5
    }
  ]
}
```

---

#### 4.4 Get Route by ID

```http
GET /routes/:routeId
```

**Auth Required:** No (Public)

**Response:** `200 OK`

---

#### 4.5 Update Route

```http
PATCH /routes/:routeId
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "distance": 970,
  "duration": 19
}
```

**Response:** `200 OK`

---

#### 4.6 Delete Route

```http
DELETE /routes/:routeId
```

**Auth Required:** Yes (Admin/Operator)

**Response:** `204 No Content`

---

#### 4.7 Toggle Route Status

```http
PATCH /routes/:routeId/toggle-status
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "status": "inactive"
}
```

**Response:** `200 OK`

---

### 5. Trip Routes

Base path: `/api/v1/trips`

#### 5.1 Create Trip

```http
POST /trips
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "routeId": "route_id",
  "busId": "bus_id",
  "departureTime": "2025-01-25T08:00:00.000Z",
  "arrivalTime": "2025-01-26T02:00:00.000Z",
  "price": 350000,
  "availableSeats": 40
}
```

**Response:** `201 Created`

```json
{
  "id": "trip_id",
  "route": {
    "id": "route_id",
    "name": "Ho Chi Minh - Da Nang",
    "from": "Ho Chi Minh",
    "to": "Da Nang"
  },
  "bus": {
    "id": "bus_id",
    "busNumber": "BUS-001",
    "busType": "standard"
  },
  "departureTime": "2025-01-25T08:00:00.000Z",
  "arrivalTime": "2025-01-26T02:00:00.000Z",
  "price": 350000,
  "availableSeats": 40,
  "status": "scheduled"
}
```

---

#### 5.2 Get All Trips

```http
GET /trips
```

**Auth Required:** Yes (Admin/Operator)

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `routeId` (string): Filter by route
- `busId` (string): Filter by bus
- `status` (string): Filter by status
- `date` (string): Filter by date (YYYY-MM-DD)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "trip_id",
      "route": {
        "name": "Ho Chi Minh - Da Nang"
      },
      "departureTime": "2025-01-25T08:00:00.000Z",
      "price": 350000,
      "availableSeats": 40,
      "status": "scheduled"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "totalResults": 100
}
```

---

#### 5.3 Search Trips

```http
GET /trips/search
```

**Auth Required:** No (Public)

**Query Parameters:**

- `from` (string): Departure location (required)
- `to` (string): Destination (required)
- `date` (string): Travel date YYYY-MM-DD (required)
- `busType` (string): Filter by bus type
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `departureTimeRange` (string): e.g., "morning", "afternoon", "evening"
- `amenities` (array): Filter by amenities
- `sortBy` (string): Sort by (price, departureTime, duration, rating)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "trip_id",
      "route": {
        "from": "Ho Chi Minh",
        "to": "Da Nang",
        "distance": 964,
        "duration": 18
      },
      "bus": {
        "busType": "standard",
        "amenities": ["wifi", "ac"]
      },
      "operator": {
        "name": "Phuong Trang",
        "logo": "logo_url",
        "rating": 4.5
      },
      "departureTime": "2025-01-25T08:00:00.000Z",
      "arrivalTime": "2025-01-26T02:00:00.000Z",
      "price": 350000,
      "availableSeats": 40,
      "status": "scheduled"
    }
  ],
  "totalResults": 15
}
```

---

#### 5.4 Get Trip Details

```http
GET /trips/:tripId/details
```

**Auth Required:** No (Public)

**Response:** `200 OK`

```json
{
  "id": "trip_id",
  "route": {
    "id": "route_id",
    "name": "Ho Chi Minh - Da Nang",
    "from": "Ho Chi Minh",
    "to": "Da Nang",
    "distance": 964,
    "duration": 18
  },
  "bus": {
    "id": "bus_id",
    "busNumber": "BUS-001",
    "busType": "standard",
    "totalSeats": 40,
    "amenities": ["wifi", "ac", "toilet"]
  },
  "operator": {
    "id": "operator_id",
    "name": "Phuong Trang",
    "logo": "logo_url",
    "phone": "1900...",
    "rating": 4.5
  },
  "departureTime": "2025-01-25T08:00:00.000Z",
  "arrivalTime": "2025-01-26T02:00:00.000Z",
  "price": 350000,
  "availableSeats": 38,
  "bookedSeats": ["A1", "B2"],
  "status": "scheduled",
  "policies": {
    "cancellation": "Free cancellation up to 24h before departure",
    "luggage": "20kg free, 5kg hand carry"
  }
}
```

---

#### 5.5 Get Seat Map

```http
GET /trips/:tripId/seat-map
```

**Auth Required:** No (Public)

**Response:** `200 OK`

```json
{
  "tripId": "trip_id",
  "busType": "standard",
  "layout": {
    "rows": 10,
    "columns": 4,
    "name": "Standard 40-seat Layout"
  },
  "seats": [
    {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "seatType": "window",
      "position": { "x": 1, "y": 1 },
      "status": "booked",
      "price": 350000,
      "selectable": false
    },
    {
      "seatNumber": "A2",
      "row": 1,
      "column": 2,
      "seatType": "aisle",
      "position": { "x": 2, "y": 1 },
      "status": "available",
      "price": 350000,
      "selectable": true
    },
    {
      "seatNumber": "A3",
      "row": 1,
      "column": 3,
      "seatType": "aisle",
      "position": { "x": 3, "y": 1 },
      "status": "locked",
      "price": 350000,
      "selectable": false,
      "lockedUntil": "2025-01-22T10:15:00.000Z"
    }
  ]
}
```

**Seat Status Values:**

- `available`: Seat is available for booking
- `booked`: Seat is already booked
- `locked`: Seat is temporarily locked by another user
- `selected`: Seat is selected by current user

---

#### 5.6 Get Trip by ID

```http
GET /trips/:tripId
```

**Auth Required:** No (Public)

**Response:** `200 OK`

---

#### 5.7 Update Trip

```http
PATCH /trips/:tripId
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "price": 380000,
  "status": "cancelled"
}
```

**Response:** `200 OK`

---

#### 5.8 Delete Trip

```http
DELETE /trips/:tripId
```

**Auth Required:** Yes (Admin/Operator)

**Response:** `204 No Content`

---

#### 5.9 Update Seat Pricing

```http
PATCH /trips/:tripId/seatpricing
```

**Auth Required:** Yes (Admin/Operator)

**Request Body:**

```json
{
  "seatPricing": {
    "A1": 400000,
    "A2": 400000,
    "D9": 400000,
    "D10": 400000
  }
}
```

**Response:** `200 OK`

**Note:** VIP seats (window seats, front rows) can have premium pricing

---

### 6. Booking Routes

Base path: `/api/v1/bookings`

#### 6.1 Create Booking (Authenticated)

```http
POST /bookings
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6"],
  "passengerInfo": {
    "name": "Nguyen Van A",
    "phone": "0123456789",
    "email": "nguyenvana@example.com",
    "idNumber": "079123456789"
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "booking_id",
  "bookingCode": "BK20250122001",
  "trip": {
    "id": "trip_id",
    "route": {
      "from": "Ho Chi Minh",
      "to": "Da Nang"
    },
    "departureTime": "2025-01-25T08:00:00.000Z"
  },
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com"
  },
  "seatNumbers": ["A5", "A6"],
  "totalPrice": 700000,
  "passengerInfo": {
    "name": "Nguyen Van A",
    "phone": "0123456789",
    "email": "nguyenvana@example.com"
  },
  "status": "pending",
  "paymentStatus": "pending",
  "createdAt": "2025-01-22T10:00:00.000Z",
  "expiresAt": "2025-01-22T10:15:00.000Z"
}
```

---

#### 6.2 Create Guest Booking

```http
POST /bookings/guest
```

**Auth Required:** No (Public)

**Request Body:**

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6"],
  "passengerInfo": {
    "name": "Nguyen Van A",
    "phone": "0123456789",
    "email": "nguyenvana@example.com",
    "idNumber": "079123456789"
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "booking_id",
  "bookingCode": "BK20250122001",
  "guestEmail": "nguyenvana@example.com",
  "seatNumbers": ["A5", "A6"],
  "totalPrice": 700000,
  "status": "pending",
  "paymentStatus": "pending",
  "expiresAt": "2025-01-22T10:15:00.000Z"
}
```

**Note:** Guest bookings expire in 15 minutes if not paid

---

#### 6.3 Get All Bookings

```http
GET /bookings
```

**Auth Required:** Yes (Admin only)

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `status` (string): Filter by status (pending, confirmed, cancelled)
- `paymentStatus` (string): Filter by payment status
- `tripId` (string): Filter by trip
- `userId` (string): Filter by user
- `sortBy` (string): Sort field

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "booking_id",
      "bookingCode": "BK20250122001",
      "user": {
        "name": "John Doe",
        "email": "user@example.com"
      },
      "trip": {
        "route": {
          "from": "Ho Chi Minh",
          "to": "Da Nang"
        },
        "departureTime": "2025-01-25T08:00:00.000Z"
      },
      "seatNumbers": ["A5", "A6"],
      "totalPrice": 700000,
      "status": "confirmed",
      "paymentStatus": "paid"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 20,
  "totalResults": 200
}
```

---

#### 6.4 Get Booking by ID

```http
GET /bookings/:bookingId
```

**Auth Required:** Yes (Owner or Admin)

**Response:** `200 OK`

```json
{
  "id": "booking_id",
  "bookingCode": "BK20250122001",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "0123456789"
  },
  "trip": {
    "id": "trip_id",
    "route": {
      "from": "Ho Chi Minh",
      "to": "Da Nang",
      "distance": 964,
      "duration": 18
    },
    "bus": {
      "busNumber": "BUS-001",
      "busType": "standard"
    },
    "operator": {
      "name": "Phuong Trang",
      "phone": "1900...",
      "logo": "logo_url"
    },
    "departureTime": "2025-01-25T08:00:00.000Z",
    "arrivalTime": "2025-01-26T02:00:00.000Z"
  },
  "seatNumbers": ["A5", "A6"],
  "totalPrice": 700000,
  "passengerInfo": {
    "name": "Nguyen Van A",
    "phone": "0123456789",
    "email": "nguyenvana@example.com",
    "idNumber": "079123456789"
  },
  "status": "confirmed",
  "paymentStatus": "paid",
  "paymentMethod": "payos",
  "createdAt": "2025-01-22T10:00:00.000Z",
  "paidAt": "2025-01-22T10:05:00.000Z",
  "qrCode": "data:image/png;base64,..."
}
```

---

#### 6.5 Update Booking

```http
PATCH /bookings/:bookingId
```

**Auth Required:** Yes (Admin only)

**Request Body:**

```json
{
  "status": "confirmed",
  "passengerInfo": {
    "phone": "0987654321"
  }
}
```

**Response:** `200 OK`

---

#### 6.6 Cancel Booking

```http
POST /bookings/:bookingId/cancel
```

**Auth Required:** Yes (Owner or Admin)

**Request Body:**

```json
{
  "reason": "Changed travel plans"
}
```

**Response:** `200 OK`

```json
{
  "id": "booking_id",
  "status": "cancelled",
  "cancelledAt": "2025-01-22T11:00:00.000Z",
  "cancellationReason": "Changed travel plans",
  "refundAmount": 630000,
  "refundStatus": "pending"
}
```

**Cancellation Policy:**

- More than 24h before departure: 90% refund
- 12-24h before departure: 50% refund
- Less than 12h: No refund

---

### 7. Operator Routes

Base path: `/api/v1/operators`

#### 7.1 Create Operator

```http
POST /operators
```

**Auth Required:** Yes (Admin only)

**Request Body:**

```json
{
  "name": "Phuong Trang",
  "description": "Leading bus operator in Vietnam",
  "logo": "https://example.com/logo.png",
  "phone": "1900 6067",
  "email": "info@futa.vn",
  "website": "https://futabus.vn",
  "rating": 4.5
}
```

**Response:** `201 Created`

---

#### 7.2 Get All Operators

```http
GET /operators
```

**Auth Required:** No (Public)

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `sortBy` (string): Sort field (rating, name)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "operator_id",
      "name": "Phuong Trang",
      "logo": "https://example.com/logo.png",
      "rating": 4.5,
      "totalTrips": 150,
      "totalReviews": 1250
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "totalResults": 25
}
```

---

#### 7.3 Get Operator by ID

```http
GET /operators/:operatorId
```

**Auth Required:** No (Public)

**Response:** `200 OK`

```json
{
  "id": "operator_id",
  "name": "Phuong Trang",
  "description": "Leading bus operator in Vietnam",
  "logo": "https://example.com/logo.png",
  "phone": "1900 6067",
  "email": "info@futa.vn",
  "website": "https://futabus.vn",
  "rating": 4.5,
  "totalReviews": 1250,
  "totalBuses": 50,
  "totalRoutes": 30,
  "policies": {
    "cancellation": "Free cancellation up to 24h",
    "luggage": "20kg free"
  }
}
```

---

#### 7.4 Update Operator

```http
PATCH /operators/:operatorId
```

**Auth Required:** Yes (Admin only)

**Request Body:**

```json
{
  "phone": "1900 1234",
  "description": "Updated description"
}
```

**Response:** `200 OK`

---

#### 7.5 Delete Operator

```http
DELETE /operators/:operatorId
```

**Auth Required:** Yes (Admin only)

**Response:** `204 No Content`

---

### 8. Review Routes

Base path: `/api/v1/reviews`

#### 8.1 Create Review

```http
POST /reviews
```

**Auth Required:** Yes (User must have completed the trip)

**Request Body:**

```json
{
  "tripId": "trip_id",
  "bookingId": "booking_id",
  "rating": 5,
  "comment": "Excellent service, very comfortable",
  "aspects": {
    "punctuality": 5,
    "comfort": 5,
    "service": 4,
    "cleanliness": 5
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "review_id",
  "user": {
    "id": "user_id",
    "name": "John Doe"
  },
  "trip": {
    "id": "trip_id",
    "route": {
      "from": "Ho Chi Minh",
      "to": "Da Nang"
    }
  },
  "rating": 5,
  "comment": "Excellent service, very comfortable",
  "aspects": {
    "punctuality": 5,
    "comfort": 5,
    "service": 4,
    "cleanliness": 5
  },
  "helpful": 0,
  "notHelpful": 0,
  "createdAt": "2025-01-22T10:00:00.000Z"
}
```

---

#### 8.2 Get All Reviews

```http
GET /reviews
```

**Auth Required:** No (Public)

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `tripId` (string): Filter by trip
- `operatorId` (string): Filter by operator
- `rating` (number): Filter by rating
- `sortBy` (string): Sort by (rating, createdAt, helpful)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "id": "review_id",
      "user": {
        "name": "John Doe",
        "avatar": "avatar_url"
      },
      "rating": 5,
      "comment": "Excellent service",
      "helpful": 15,
      "notHelpful": 2,
      "createdAt": "2025-01-22T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 10,
  "totalResults": 100
}
```

---

#### 8.3 Get Review by ID

```http
GET /reviews/:reviewId
```

**Auth Required:** No (Public)

**Response:** `200 OK`

---

#### 8.4 Update Review

```http
PATCH /reviews/:reviewId
```

**Auth Required:** Yes (Review owner only)

**Request Body:**

```json
{
  "rating": 4,
  "comment": "Updated review comment"
}
```

**Response:** `200 OK`

---

#### 8.5 Delete Review

```http
DELETE /reviews/:reviewId
```

**Auth Required:** Yes (Review owner or Admin)

**Response:** `204 No Content`

---

#### 8.6 Vote on Review

```http
POST /reviews/:reviewId/vote
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "vote": "helpful"
}
```

**Vote Options:** `helpful` or `not_helpful`

**Response:** `200 OK`

```json
{
  "id": "review_id",
  "helpful": 16,
  "notHelpful": 2
}
```

---

#### 8.7 Get Trip Review Stats

```http
GET /reviews/trip/:tripId/stats
```

**Auth Required:** No (Public)

**Response:** `200 OK`

```json
{
  "tripId": "trip_id",
  "averageRating": 4.5,
  "totalReviews": 120,
  "ratingDistribution": {
    "5": 80,
    "4": 30,
    "3": 7,
    "2": 2,
    "1": 1
  },
  "aspectAverages": {
    "punctuality": 4.6,
    "comfort": 4.5,
    "service": 4.4,
    "cleanliness": 4.7
  }
}
```

---

### 9. Payment Routes

Base path: `/api/v1/payments`

#### 9.1 Create Payment Link

```http
POST /payments/create
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "bookingId": "booking_id",
  "returnUrl": "https://yourwebsite.com/payment/success",
  "cancelUrl": "https://yourwebsite.com/payment/cancel"
}
```

**Response:** `200 OK`

```json
{
  "orderCode": 1234567890,
  "paymentUrl": "https://pay.payos.vn/web/1234567890",
  "qrCode": "data:image/png;base64,...",
  "amount": 700000,
  "currency": "VND",
  "description": "Payment for booking BK20250122001",
  "expiresAt": "2025-01-22T10:15:00.000Z"
}
```

**Payment Methods Supported:**

- QR Code (VietQR)
- Banking app
- Credit/Debit card
- E-wallets (Momo, ZaloPay, etc.)

---

#### 9.2 Payment Webhook

```http
POST /payments/webhook
```

**Auth Required:** No (PayOS webhook)

**Description:** This endpoint is called by PayOS when payment status changes

**Request Body:** (PayOS signature)

```json
{
  "code": "00",
  "desc": "success",
  "data": {
    "orderCode": 1234567890,
    "amount": 700000,
    "description": "Payment for booking BK20250122001",
    "accountNumber": "12345678",
    "reference": "FT12345678",
    "transactionDateTime": "2025-01-22T10:05:00.000Z",
    "paymentLinkId": "abc123",
    "code": "00",
    "desc": "Thành công",
    "counterAccountBankId": "970422",
    "counterAccountBankName": "MB Bank",
    "counterAccountName": "NGUYEN VAN A",
    "counterAccountNumber": "0123456789",
    "virtualAccountName": "PHUONG TRANG",
    "virtualAccountNumber": "9704220123456789"
  },
  "signature": "..."
}
```

**Response:** `200 OK`

---

#### 9.3 Check Payment Status

```http
GET /payments/status/:orderCode
```

**Auth Required:** Yes

**Response:** `200 OK`

```json
{
  "orderCode": 1234567890,
  "status": "PAID",
  "amount": 700000,
  "paidAt": "2025-01-22T10:05:00.000Z",
  "booking": {
    "id": "booking_id",
    "bookingCode": "BK20250122001",
    "status": "confirmed"
  }
}
```

**Payment Status Values:**

- `PENDING`: Payment link created, awaiting payment
- `PAID`: Payment successful
- `CANCELLED`: Payment cancelled
- `EXPIRED`: Payment link expired

---

#### 9.4 Cancel Payment

```http
POST /payments/cancel/:bookingId
```

**Auth Required:** Yes

**Request Body:**

```json
{
  "reason": "Changed mind"
}
```

**Response:** `200 OK`

```json
{
  "orderCode": 1234567890,
  "status": "CANCELLED",
  "cancelledAt": "2025-01-22T10:10:00.000Z"
}
```

---

### 10. Seat Lock Routes

Base path: `/api/v1/seat-locks`

#### 10.1 Lock Seats

```http
POST /seat-locks/lock
```

**Auth Required:** No (Uses session ID)

**Request Body:**

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6"],
  "sessionId": "session_123456"
}
```

**Response:** `200 OK`

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6"],
  "sessionId": "session_123456",
  "lockedUntil": "2025-01-22T10:15:00.000Z",
  "remainingTime": 900
}
```

**Notes:**

- Seats are locked for 15 minutes by default
- User can lock maximum 6 seats at once
- Lock prevents other users from selecting the same seats

---

#### 10.2 Release Seat Locks

```http
POST /seat-locks/release
```

**Auth Required:** No (Uses session ID)

**Request Body:**

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5"],
  "sessionId": "session_123456"
}
```

**Response:** `200 OK`

```json
{
  "message": "Seats released successfully",
  "releasedSeats": ["A5"],
  "remainingLocks": ["A6"]
}
```

---

#### 10.3 Extend Seat Locks

```http
POST /seat-locks/extend
```

**Auth Required:** No (Uses session ID)

**Request Body:**

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6"],
  "sessionId": "session_123456"
}
```

**Response:** `200 OK`

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6"],
  "lockedUntil": "2025-01-22T10:30:00.000Z",
  "remainingTime": 900
}
```

**Notes:**

- Can extend lock up to 3 times (total 45 minutes max)
- Extension must be requested before current lock expires

---

#### 10.4 Check Seat Availability

```http
POST /seat-locks/check-availability
```

**Auth Required:** No

**Request Body:**

```json
{
  "tripId": "trip_id",
  "seatNumbers": ["A5", "A6", "A7"]
}
```

**Response:** `200 OK`

```json
{
  "tripId": "trip_id",
  "availability": [
    {
      "seatNumber": "A5",
      "isAvailable": false,
      "reason": "locked",
      "lockedBy": "other_session",
      "lockedUntil": "2025-01-22T10:15:00.000Z"
    },
    {
      "seatNumber": "A6",
      "isAvailable": false,
      "reason": "booked"
    },
    {
      "seatNumber": "A7",
      "isAvailable": true
    }
  ]
}
```

---

#### 10.5 Get Locked Seats for Trip

```http
GET /seat-locks/:tripId
```

**Auth Required:** No

**Query Parameters:**

- `sessionId` (string): Optional - filter by session

**Response:** `200 OK`

```json
{
  "tripId": "trip_id",
  "locks": [
    {
      "seatNumber": "A5",
      "sessionId": "session_123456",
      "lockedAt": "2025-01-22T10:00:00.000Z",
      "lockedUntil": "2025-01-22T10:15:00.000Z",
      "isOwnLock": true
    },
    {
      "seatNumber": "B3",
      "sessionId": "other_session",
      "lockedAt": "2025-01-22T10:05:00.000Z",
      "lockedUntil": "2025-01-22T10:20:00.000Z",
      "isOwnLock": false
    }
  ],
  "totalLocked": 2
}
```

---

### 11. Chatbot Routes

Base path: `/api/v1/chatbot`

#### 11.1 Create Chat Session

```http
POST /chatbot/sessions
```

**Auth Required:** No

**Request Body:**

```json
{
  "userId": "user_id"
}
```

**Response:** `201 Created`

```json
{
  "sessionId": "session_123456",
  "userId": "user_id",
  "createdAt": "2025-01-22T10:00:00.000Z",
  "status": "active",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "123.45.67.89"
  }
}
```

**Notes:**

- For guest users, `userId` can be omitted or set to `null`
- Session expires after 30 minutes of inactivity

---

#### 11.2 Get Chat Session

```http
GET /chatbot/sessions/:sessionId
```

**Auth Required:** No

**Response:** `200 OK`

```json
{
  "sessionId": "session_123456",
  "userId": "user_id",
  "status": "active",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Tìm chuyến từ Sài Gòn đi Đà Nẵng ngày 25/1",
      "timestamp": "2025-01-22T10:00:00.000Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "Tôi tìm thấy 15 chuyến xe từ Hồ Chí Minh đi Đà Nẵng ngày 25/1/2025...",
      "timestamp": "2025-01-22T10:00:05.000Z",
      "data": {
        "trips": [...]
      }
    }
  ],
  "createdAt": "2025-01-22T10:00:00.000Z"
}
```

---

#### 11.3 Send Message

```http
POST /chatbot/sessions/:sessionId/messages
```

**Auth Required:** No

**Request Body:**

```json
{
  "message": "Tìm chuyến từ Sài Gòn đi Đà Nẵng ngày 25/1"
}
```

**Response:** `200 OK`

```json
{
  "sessionId": "session_123456",
  "userMessage": {
    "id": "msg_1",
    "role": "user",
    "content": "Tìm chuyến từ Sài Gòn đi Đà Nẵng ngày 25/1",
    "timestamp": "2025-01-22T10:00:00.000Z"
  },
  "botResponse": {
    "id": "msg_2",
    "role": "assistant",
    "content": "Tôi tìm thấy 15 chuyến xe từ Hồ Chí Minh đi Đà Nẵng ngày 25/1/2025. Dưới đây là một số gợi ý:\n\n1. Phương Trang - 08:00 - 350.000đ\n2. Thành Bưởi - 09:30 - 320.000đ\n...",
    "timestamp": "2025-01-22T10:00:05.000Z",
    "intent": "search_trips",
    "data": {
      "from": "Ho Chi Minh",
      "to": "Da Nang",
      "date": "2025-01-25",
      "trips": [
        {
          "id": "trip_id",
          "operator": "Phuong Trang",
          "departureTime": "08:00",
          "price": 350000
        }
      ]
    },
    "suggestedActions": [
      {
        "type": "view_details",
        "label": "Xem chi tiết chuyến",
        "tripId": "trip_id"
      },
      {
        "type": "book",
        "label": "Đặt vé ngay",
        "tripId": "trip_id"
      }
    ]
  }
}
```

**Chatbot Capabilities:**

- Search trips by route and date
- Get trip details
- Check seat availability
- Answer FAQs about booking, payment, cancellation
- Provide operator information
- Help with booking process

---

#### 11.4 Close Session

```http
POST /chatbot/sessions/:sessionId/close
```

**Auth Required:** No

**Request Body:**

```json
{
  "feedback": {
    "rating": 5,
    "comment": "Very helpful"
  }
}
```

**Response:** `200 OK`

```json
{
  "sessionId": "session_123456",
  "status": "closed",
  "closedAt": "2025-01-22T10:30:00.000Z",
  "duration": 1800,
  "messageCount": 12
}
```

---

#### 11.5 Get User Sessions

```http
GET /chatbot/my-sessions
```

**Auth Required:** Yes

**Query Parameters:**

- `page` (number): Page number
- `limit` (number): Results per page
- `status` (string): Filter by status (active, closed)

**Response:** `200 OK`

```json
{
  "results": [
    {
      "sessionId": "session_123456",
      "status": "closed",
      "messageCount": 12,
      "createdAt": "2025-01-22T10:00:00.000Z",
      "closedAt": "2025-01-22T10:30:00.000Z",
      "lastMessage": "Cảm ơn bạn đã sử dụng dịch vụ"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "totalResults": 25
}
```

---

### 12. Location Routes

Base path: `/api/v1/locations`

#### 12.1 Search Locations (Autocomplete)

```http
GET /locations/search
```

**Auth Required:** No (Public)

**Query Parameters:**

- `q` (string): Search query (required, min 2 characters)
- `limit` (number): Max results (default: 10)

**Response:** `200 OK`

```json
{
  "query": "hcm",
  "suggestions": [
    {
      "name": "Ho Chi Minh",
      "type": "city",
      "province": "Ho Chi Minh",
      "aliases": ["Sài Gòn", "HCMC", "TP.HCM"],
      "popularity": 1500
    },
    {
      "name": "Bến xe Miền Đông",
      "type": "terminal",
      "city": "Ho Chi Minh",
      "address": "292 Đinh Bộ Lĩnh, Bình Thạnh",
      "popularity": 800
    }
  ]
}
```

**Location Types:**

- `city`: Major cities
- `province`: Provinces
- `district`: Districts
- `terminal`: Bus terminals

---

#### 12.2 Get Popular Locations

```http
GET /locations/popular
```

**Auth Required:** No (Public)

**Query Parameters:**

- `limit` (number): Max results (default: 10)
- `type` (string): Filter by type (city, terminal)

**Response:** `200 OK`

```json
{
  "popular": [
    {
      "name": "Ho Chi Minh",
      "type": "city",
      "searchCount": 15000,
      "bookingCount": 8000,
      "imageUrl": "https://..."
    },
    {
      "name": "Ha Noi",
      "type": "city",
      "searchCount": 12000,
      "bookingCount": 6500,
      "imageUrl": "https://..."
    },
    {
      "name": "Da Nang",
      "type": "city",
      "searchCount": 10000,
      "bookingCount": 5500,
      "imageUrl": "https://..."
    }
  ]
}
```

---

#### 12.3 Get Popular Routes

```http
GET /locations/popular-routes
```

**Auth Required:** No (Public)

**Query Parameters:**

- `limit` (number): Max results (default: 10)

**Response:** `200 OK`

```json
{
  "popularRoutes": [
    {
      "from": "Ho Chi Minh",
      "to": "Da Nang",
      "bookingCount": 3500,
      "averagePrice": 350000,
      "duration": 18,
      "distance": 964,
      "imageUrl": "https://..."
    },
    {
      "from": "Ho Chi Minh",
      "to": "Nha Trang",
      "bookingCount": 2800,
      "averagePrice": 280000,
      "duration": 10,
      "distance": 450,
      "imageUrl": "https://..."
    }
  ]
}
```

---

## Response Codes

### Success Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Request successful, no content to return

### Client Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate booking)
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded

### Server Error Codes

- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Error Handling

All errors follow a consistent format:

```json
{
  "code": 400,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Common Error Messages

**Authentication Errors:**

```json
{
  "code": 401,
  "message": "Please authenticate"
}
```

**Permission Errors:**

```json
{
  "code": 403,
  "message": "Forbidden - Insufficient permissions"
}
```

**Validation Errors:**

```json
{
  "code": 422,
  "message": "Validation Error",
  "errors": [
    {
      "field": "seatNumbers",
      "message": "Seat A1 is already booked"
    }
  ]
}
```

**Rate Limit Errors:**

```json
{
  "code": 429,
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

---

## Additional Notes

### Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes per IP
- **Chatbot**: 20 messages per minute per session

### Pagination

All list endpoints support pagination with these query parameters:

- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 10, max: 100)
- `sortBy` (string): Sort field with order (e.g., "createdAt:desc")

### Filtering

Most GET endpoints support filtering through query parameters. Check each endpoint's documentation for available filters.

### Sorting

Use the `sortBy` parameter with format: `field:order`

Examples:

- `sortBy=createdAt:desc` - Sort by creation date, newest first
- `sortBy=price:asc` - Sort by price, lowest first
- `sortBy=rating:desc,createdAt:desc` - Multiple sorts

---

**Documentation Version:** 1.0  
**Last Updated:** December 22, 2025  
**API Version:** v1
