# Bus Ticket Booking System - Backend API

Backend API cho hệ thống đặt vé xe buýt được xây dựng với Express.js, TypeScript và MongoDB. Hệ thống hỗ trợ đầy đủ tính năng đặt vé, quản lý chuyến xe, thanh toán trực tuyến, và chatbot hỗ trợ khách hàng.

## 🚀 Features

### Core Features

- ✅ **Authentication & Authorization**: JWT-based auth với refresh tokens
- ✅ **User Management**: CRUD operations với role-based access (user/admin)
- ✅ **Trip Search**: Tìm kiếm chuyến xe theo điểm đi, điểm đến, ngày giờ
- ✅ **Seat Selection**: Chọn ghế với seat locking mechanism (10 phút)
- ✅ **Guest Booking**: Đặt vé không cần đăng ký (chỉ cần email & phone)
- ✅ **Email Notifications**: Xác nhận đặt vé, nhắc lịch, thông báo hủy
- ✅ **Payment Integration**: PayOS payment gateway với webhook
- ✅ **Review System**: Đánh giá chuyến xe, vote hữu ích
- ✅ **Operator Management**: Quản lý nhà xe, xe buýt, tuyến đường
- ✅ **Chatbot**: AI chatbot hỗ trợ tìm chuyến, đặt vé

### Admin Features

- ✅ **Bus Management**: Quản lý xe buýt (loại xe, số ghế, tiện nghi)
- ✅ **Route Management**: Quản lý tuyến đường (điểm đi/đến, điểm dừng)
- ✅ **Trip Management**: Quản lý lịch trình chuyến xe
- ✅ **Operator Management**: Quản lý nhà xe
- ✅ **Booking Overview**: Xem tất cả booking, thống kê

### Security & Performance

- 🔒 **Security**: Helmet, rate limiting, data sanitization, password hashing
- 📊 **Logging**: Winston logger với Morgan HTTP logger
- ⚡ **Performance**: Response compression, MongoDB indexing
- 🧪 **Testing**: Jest với 74 automated tests (>70% coverage)

## 📦 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.9.3
- **Database**: MongoDB with Mongoose 9.0.0
- **Authentication**: Passport.js 0.7.0 + Passport-JWT 4.0.1
- **Validation**: Joi 18.0.2
- **Email**: Nodemailer 7.0.10
- **Payment**: PayOS Node SDK (@payos/node)
- **Testing**: Jest 29.7.0 + Supertest 7.0.0
- **Logging**: Winston 3.18.3 + Morgan 1.10.1
- **Security**: Helmet 8.1.0, express-rate-limit 8.2.1
- **Process Manager**: PM2 6.0.13

## 🛠️ Installation

```bash
# Clone repository và di chuyển vào thư mục backend
cd Source/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Sau đó chỉnh sửa file .env với credentials của bạn
```

### Environment Variables (.env)

```env
# Environment
NODE_ENV=development

# Server
PORT=5000

# Database
MONGODB_URL=mongodb://localhost:27017/bus-ticket-booking

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_RESET_PASSWORD_EXPIRATION_MINUTES=10
JWT_VERIFY_EMAIL_EXPIRATION_MINUTES=10

# SMTP Email Configuration
# For Gmail:
#   1. Enable 2-factor authentication
#   2. Generate an "App Password" at https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Bus Ticket System <noreply@busticket.com>

# PayOS Payment Gateway
# Get credentials from https://payos.vn
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Build và Run

```bash
# Run in development mode với nodemon và ts-node
npm run dev

# Build TypeScript code
npm run build

# Run in production mode
npm start

# Run with PM2 (cluster mode)
npm run start:pm2
```

## 🌱 Seed Data for Testing

The project includes comprehensive seed scripts to populate your database with test data for dashboard testing and development.

### Quick Start

```bash
# Option 1: Seed everything (recommended for first-time setup)
npm run seed:data

# Option 2: Seed only admin user
npm run seed:admin
```

### Seed Data Script (`npm run seed:data`)

Creates a complete dataset for testing all dashboard features with **real data**:

**Created Data:**

- **2 Users**: Admin (admin@busticket.com) & Test User (user@busticket.com)
- **2 Operators**: FUTA Bus Lines, Hoang Long Bus
- **3 Buses**: Mix of sleeper & seater buses with different capacities
- **4 Routes**: Popular routes (HCMC-Da Lat, Hanoi-Ha Long, etc.)
- **9 Trips**: Past, present, and future trips for testing
- **9 Bookings**: Various statuses (completed, confirmed, pending, cancelled)

**Features:**

- ✅ **Idempotent**: Safe to run multiple times - checks if data exists before creating
- ✅ **Realistic Data**: Vietnamese city names, proper locations, realistic prices
- ✅ **Time-based Trips**: Past (completed), today (ongoing), future (upcoming)
- ✅ **Multiple Statuses**: Test all booking states (pending, confirmed, cancelled, completed)
- ✅ **Payment States**: Completed payments, pending, refunded statuses

**Login Credentials:**

```
Admin:
  Email: admin@busticket.com
  Password: Admin@123456

Test User:
  Email: user@busticket.com
  Password: User@123456
```

**What You Can Test After Seeding:**

- ✅ Dashboard widgets with real booking data
- ✅ Trip search with actual routes and schedules
- ✅ Booking flow with available seats
- ✅ Admin panel with system statistics
- ✅ User dashboard with booking history
- ✅ Payment integration testing

**Example Output:**

```
✅ Connected to MongoDB
📋 Step 1: Seeding Users...
   ✅ Admin user created: admin@busticket.com
   ✅ Test user created: user@busticket.com
📋 Step 2: Seeding Operators...
   ✅ Operator created: Phuong Trang (FUTA Bus Lines)
   ✅ Operator created: Hoang Long Bus
...
✅ ============= SEED COMPLETE =============
```

### Admin Seed Script (`npm run seed:admin`)

Creates only the admin user if you just need admin access:

- Email: admin@busticket.com
- Password: Admin@123456
- Role: admin

# Lint và format code

npm run lint
npm run format

```

## 🏗️ Project Structure

```

Source/backend/
├── src/
│ ├── config/ # Configuration files
│ │ ├── config.ts # Environment config với Joi validation
│ │ ├── logger.ts # Winston logger setup
│ │ ├── morgan.ts # Morgan HTTP logger config
│ │ ├── passport.ts # Passport JWT strategy
│ │ ├── roles.ts # Role-based access control (user/admin)
│ │ └── tokens.ts # JWT token generation & verification
│ ├── controllers/ # Route controllers (controller layer)
│ │ ├── auth.controller.ts
│ │ ├── booking.controller.ts
│ │ ├── bus.controller.ts
│ │ ├── chatbot.controller.ts
│ │ ├── operator.controller.ts
│ │ ├── payment.controller.ts
│ │ ├── review.controller.ts
│ │ ├── route.controller.ts
│ │ ├── seatlock.controller.ts
│ │ ├── trip.controller.ts
│ │ └── user.controller.ts
│ ├── middlewares/ # Custom express middlewares
│ │ ├── auth.ts # Authentication & authorization
│ │ ├── error.ts # Error converter & handler
│ │ ├── rateLimiter.ts # Rate limiting (general + auth)
│ │ └── validate.ts # Request validation với Joi
│ ├── models/ # Mongoose models (data layer)
│ │ ├── auditlog.model.ts # Audit logging
│ │ ├── booking.model.ts # Booking management
│ │ ├── bus.model.ts # Bus information
│ │ ├── chatsession.model.ts # Chatbot sessions
│ │ ├── notification.model.ts # User notifications
│ │ ├── operator.model.ts # Bus operators
│ │ ├── passwordreset.model.ts # Password reset tokens
│ │ ├── review.model.ts # Trip reviews
│ │ ├── reviewvote.model.ts # Review voting
│ │ ├── route.model.ts # Bus routes
│ │ ├── searchhistory.model.ts # Search history
│ │ ├── seatlock.model.ts # Seat locking (10-min TTL)
│ │ ├── token.model.ts # Auth tokens
│ │ ├── trip.model.ts # Trip schedules
│ │ └── user.model.ts # User accounts
│ ├── routes/ # API routes
│ │ └── v1/ # Version 1 API routes
│ │ ├── auth.route.ts # Authentication routes
│ │ ├── booking.route.ts # Booking routes
│ │ ├── bus.route.ts # Bus routes
│ │ ├── chatbot.route.ts # Chatbot routes
│ │ ├── operator.route.ts # Operator routes
│ │ ├── payment.route.ts # Payment routes
│ │ ├── review.route.ts # Review routes
│ │ ├── route.route.ts # Route routes
│ │ ├── seatlock.route.ts # Seat locking routes
│ │ ├── trip.route.ts # Trip routes
│ │ ├── user.route.ts # User routes
│ │ └── index.ts # Route aggregator
│ ├── services/ # Business logic (service layer)
│ │ ├── auth.service.ts
│ │ ├── booking.service.ts # Includes seat locking logic
│ │ ├── bus.service.ts
│ │ ├── chatbot.service.ts # AI chatbot service
│ │ ├── email.service.ts # Nodemailer service
│ │ ├── operator.service.ts
│ │ ├── payment.service.ts # PayOS integration
│ │ ├── review.service.ts
│ │ ├── route.service.ts
│ │ ├── seatlock.service.ts # Seat locking mechanism
│ │ ├── token.service.ts
│ │ ├── trip.service.ts
│ │ └── user.service.ts
│ ├── types/ # TypeScript custom types
│ │ └── express.d.ts # Express type extensions
│ ├── utils/ # Utility functions
│ │ ├── ApiError.ts # Custom error class
│ │ ├── catchAsync.ts # Async error wrapper
│ │ └── pick.ts # Object property picker
│ ├── validations/ # Joi validation schemas
│ │ ├── auth.validation.ts
│ │ ├── booking.validation.ts
│ │ ├── bus.validation.ts
│ │ ├── chatbot.validation.ts
│ │ ├── custom.validation.ts
│ │ ├── operator.validation.ts
│ │ ├── payment.validation.ts
│ │ ├── review.validation.ts
│ │ ├── route.validation.ts
│ │ ├── trip.validation.ts
│ │ └── user.validation.ts
│ ├── app.ts # Express app setup với middlewares
│ └── index.ts # Entry point - server start
├── tests/ # Test files
│ ├── setup.ts # Test configuration & in-memory MongoDB
│ ├── helpers/
│ │ └── faker.helper.ts # Test data generation
│ ├── unit/ # Unit tests (29 tests)
│ │ └── services/
│ │ ├── auth.service.test.ts
│ │ ├── booking.service.test.ts
│ │ └── seatlock.service.test.ts
│ └── integration/ # Integration tests (45 tests)
│ ├── auth.test.ts
│ ├── booking.test.ts
│ └── seatlock.test.ts
├── .env # Environment variables (not in repo)
├── .env.example # Example environment file
├── ecosystem.config.js # PM2 configuration (cluster mode)
├── jest.config.js # Jest test configuration
├── nodemon.json # Nodemon configuration
├── package.json # Dependencies và scripts
├── tsconfig.json # TypeScript configuration với path aliases
├── CHATBOT-API.md # Chatbot API documentation
├── SEAT-LOCKING-API.md # Seat locking API documentation
├── TESTING_DOCUMENTATION.md # Complete testing guide
├── TESTING_QUICKSTART.md # Quick testing guide
└── README.md # This file

````

## 🔐 API Endpoints

Base URL: `http://localhost:4000/v1`

### Authentication
- `POST /v1/auth/register` - Đăng ký user mới
- `POST /v1/auth/login` - Đăng nhập
- `POST /v1/auth/logout` - Đăng xuất
- `POST /v1/auth/refresh-tokens` - Refresh access token
- `POST /v1/auth/forgot-password` - Quên mật khẩu
- `POST /v1/auth/reset-password` - Reset mật khẩu
- `POST /v1/auth/send-verification-email` - Gửi email xác thực
- `POST /v1/auth/verify-email` - Xác thực email

### Users
- `GET /v1/users` - Lấy danh sách users (admin)
- `GET /v1/users/:userId` - Lấy thông tin user (admin)
- `GET /v1/users/search-history` - Lấy lịch sử tìm kiếm (user)
- `PATCH /v1/users/:userId` - Cập nhật user (admin)
- `DELETE /v1/users/:userId` - Xóa user (admin)

### Buses
- `POST /v1/buses` - Tạo bus mới (admin)
- `GET /v1/buses` - Lấy danh sách buses
- `GET /v1/buses/:busId` - Lấy chi tiết bus
- `PATCH /v1/buses/:busId` - Cập nhật bus (admin)
- `DELETE /v1/buses/:busId` - Xóa bus (admin)

### Routes
- `POST /v1/routes` - Tạo route mới (admin)
- `GET /v1/routes` - Lấy danh sách routes
- `GET /v1/routes/search` - Tìm kiếm routes theo origin/destination
- `GET /v1/routes/:routeId` - Lấy chi tiết route
- `PATCH /v1/routes/:routeId` - Cập nhật route (admin)
- `DELETE /v1/routes/:routeId` - Xóa route (admin)

### Trips
- `POST /v1/trips` - Tạo trip mới (admin)
- `GET /v1/trips` - Lấy danh sách trips
- `GET /v1/trips/search` - Tìm kiếm trips (origin, destination, date)
- `GET /v1/trips/:tripId` - Lấy chi tiết trip
- `GET /v1/trips/:tripId/available-seats` - Lấy ghế còn trống
- `PATCH /v1/trips/:tripId` - Cập nhật trip (admin)
- `DELETE /v1/trips/:tripId` - Xóa trip (admin)

### Bookings
- `POST /v1/bookings` - Tạo booking (authenticated user)
- `POST /v1/bookings/guest` - Tạo booking (guest - không cần login)
- `GET /v1/bookings` - Lấy danh sách bookings
- `GET /v1/bookings/:bookingId` - Lấy chi tiết booking
- `PATCH /v1/bookings/:bookingId` - Cập nhật booking
- `POST /v1/bookings/:bookingId/cancel` - Hủy booking
- `DELETE /v1/bookings/:bookingId` - Xóa booking (admin)

### Seat Locking
- `POST /v1/seatlock/lock` - Lock ghế (10 phút)
- `POST /v1/seatlock/release` - Release ghế
- `GET /v1/seatlock/trip/:tripId` - Lấy danh sách ghế đang bị lock

### Payments
- `POST /v1/payments/:bookingId/create` - Tạo payment link (PayOS)
- `GET /v1/payments/:bookingId/status` - Kiểm tra trạng thái payment
- `POST /v1/payments/webhook` - PayOS webhook (tự động)

### Operators
- `POST /v1/operators` - Tạo operator mới (admin)
- `GET /v1/operators` - Lấy danh sách operators
- `GET /v1/operators/:operatorId` - Lấy chi tiết operator
- `PATCH /v1/operators/:operatorId` - Cập nhật operator (admin)
- `DELETE /v1/operators/:operatorId` - Xóa operator (admin)

### Reviews
- `POST /v1/reviews` - Tạo review (user)
- `GET /v1/reviews` - Lấy danh sách reviews
- `GET /v1/reviews/:reviewId` - Lấy chi tiết review
- `POST /v1/reviews/:reviewId/vote` - Vote helpful/unhelpful
- `PATCH /v1/reviews/:reviewId` - Cập nhật review (user)
- `DELETE /v1/reviews/:reviewId` - Xóa review (admin)

### Chatbot
- `POST /v1/chatbot/sessions` - Tạo chat session
- `POST /v1/chatbot/messages` - Gửi message
- `GET /v1/chatbot/sessions` - Lấy danh sách sessions (user)
- `GET /v1/chatbot/sessions/:sessionId` - Lấy chat history

## 🧪 Testing

Hệ thống sử dụng **Jest** với **TypeScript** cho automated testing.

### Test Structure

- **Total Tests:** 74 (29 unit + 45 integration)
- **Test Suites:** 6
- **Coverage Target:** > 70% overall, > 80% for services
- **Features Tested:**
  - ✅ Authentication & Authorization (22 tests)
  - ✅ Booking System (Guest & Authenticated) (25 tests)
  - ✅ Seat Locking Mechanism (27 tests)

### Running Tests

```bash
# Install test dependencies (nếu chưa có)
npm install --save-dev mongodb-memory-server

# Run all tests (74 tests total)
npm test

# Run tests in watch mode (development)
npm run test:watch

# Generate coverage report (target: >70%)
npm run coverage

# View HTML coverage report
# Open: coverage/lcov-report/index.html
````

### Test Files

```
tests/
├── setup.ts                          # Test configuration & in-memory MongoDB
├── helpers/
│   └── faker.helper.ts               # Test data generation
├── unit/
│   └── services/
│       ├── auth.service.test.ts      # Auth service tests (8 tests)
│       ├── booking.service.test.ts   # Booking service tests (9 tests)
│       └── seatlock.service.test.ts  # SeatLock service tests (12 tests)
└── integration/
    ├── auth.test.ts                  # Auth API tests (14 tests)
    ├── booking.test.ts               # Booking API tests (16 tests)
    └── seatlock.test.ts              # SeatLock API tests (15 tests)
```

### Documentation

Xem chi tiết:

- **Complete Testing Guide:** [`TESTING_DOCUMENTATION.md`](./TESTING_DOCUMENTATION.md)
- **Quick Start Guide:** [`TESTING_QUICKSTART.md`](./TESTING_QUICKSTART.md)
- **Implementation Summary:** [`TASK_3.4_SUMMARY.md`](./TASK_3.4_SUMMARY.md)

## 📚 Additional Documentation

- **Chatbot API:** [`CHATBOT-API.md`](./CHATBOT-API.md) - Complete chatbot implementation guide
- **Seat Locking:** [`SEAT-LOCKING-API.md`](./SEAT-LOCKING-API.md) - Seat locking mechanism
- **Manual Testing:** [`MANUAL_TESTING_GUIDE.md`](./MANUAL_TESTING_GUIDE.md) - 40 detailed test cases
- **Postman Collection:** [`postman_collection.json`](./postman_collection.json) - Import vào Postman

## 🔒 Security Features

- ✅ **Password Hashing**: bcryptjs với salt rounds = 10
- ✅ **JWT Authentication**: Access + Refresh tokens
- ✅ **Rate Limiting**:
  - General: 100 requests/15 minutes
  - Auth: 20 requests/15 minutes
- ✅ **Data Sanitization**: MongoDB injection prevention
- ✅ **Helmet**: Security HTTP headers
- ✅ **CORS**: Cross-Origin Resource Sharing enabled
- ✅ **Input Validation**: Joi schemas cho tất cả requests
- ✅ **Role-Based Access Control**: Admin/User permissions

## 🚀 Key Features Explained

### 1. Guest Booking Flow

Người dùng có thể đặt vé mà không cần đăng ký tài khoản:

```bash
POST /v1/bookings/guest
{
  "trip": "trip_id",
  "guestEmail": "guest@example.com",
  "guestPhone": "0123456789",
  "passengers": [...],
  "totalAmount": 500000
}
```

### 2. Seat Locking Mechanism

Ghế sẽ bị lock trong 10 phút khi user chọn:

```bash
# Lock seat
POST /v1/seatlock/lock
{
  "tripId": "trip_id",
  "seatNumbers": ["A1", "A2"],
  "sessionId": "user_session_id"
}

# Auto-release after 10 minutes hoặc khi booking thành công
```

### 3. Payment Integration (PayOS)

```bash
# 1. Create payment link
POST /v1/payments/:bookingId/create
Response: { checkoutUrl: "https://payos.vn/..." }

# 2. User thanh toán trên PayOS

# 3. PayOS gọi webhook tự động
POST /v1/payments/webhook
# Backend tự động update booking status
```

### 4. Email Notifications

Tự động gửi email khi:

- ✅ Đăng ký tài khoản thành công
- ✅ Đặt vé thành công (booking confirmation)
- ✅ Thanh toán thành công
- ✅ Hủy vé
- ✅ Nhắc lịch trước chuyến đi (scheduled job)

### 5. Chatbot Service

AI chatbot hỗ trợ:

- 🔍 Tìm chuyến xe
- 💺 Kiểm tra ghế trống
- 📋 Xem booking history
- 💰 Hỏi giá vé
- ℹ️ Trả lời câu hỏi thường gặp

```bash
POST /v1/chatbot/messages
{
  "sessionId": "session_id",
  "message": "Tìm xe từ Hà Nội đi Sapa ngày mai"
}
```

## 🔄 How It Works

### Booking Flow

```
1. User search trips → GET /v1/trips/search
2. User select trip → GET /v1/trips/:tripId/available-seats
3. User select seats → POST /v1/seatlock/lock (lock 10 phút)
4. User fill passenger info → Frontend form
5. User create booking → POST /v1/bookings or /v1/bookings/guest
6. System create payment link → POST /v1/payments/:bookingId/create
7. User thanh toán → PayOS website
8. PayOS webhook → POST /v1/payments/webhook
9. System update booking status → confirmed
10. System send email → booking confirmation
11. System release seat lock → available lại
```

### Authentication Flow

```
1. Register → POST /v1/auth/register
2. Get access token (30 min) + refresh token (30 days)
3. Use access token → Authorization: Bearer <token>
4. When expired → POST /v1/auth/refresh-tokens
5. Get new access token + refresh token
6. Logout → POST /v1/auth/logout (invalidate refresh token)
```

## 📊 Database Models

13 MongoDB collections:

- `users` - User accounts (role: user/admin)
- `tokens` - Refresh tokens
- `buses` - Bus information (type, seats, amenities)
- `routes` - Routes (origin → destination, stops)
- `trips` - Trip schedules (bus + route + datetime + price)
- `bookings` - Bookings (user/guest, passengers, payment)
- `seatlock` - Temporary seat locks (TTL 10 min)
- `operators` - Bus operators/companies
- `reviews` - Trip reviews (rating, vote)
- `reviewvotes` - Review voting (helpful/unhelpful)
- `chatsessions` - Chatbot conversations
- `notifications` - User notifications
- `searchhistory` - Search history tracking

## 🚢 Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
NODE_ENV=production npm start

# Or with PM2 (recommended)
npm run start:pm2
```

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'bus-booking-api',
      script: './dist/index.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
```

### Environment Checklist

Trước khi deploy, đảm bảo:

- ✅ MongoDB URL (production database)
- ✅ JWT_SECRET (strong random string)
- ✅ SMTP credentials (for emails)
- ✅ PayOS credentials (for payments)
- ✅ FRONTEND_URL (for payment redirects)
- ✅ NODE_ENV=production

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Failed**

```bash
# Check MongoDB is running
mongod --version

# Start MongoDB
mongod --dbpath C:\data\db  # Windows
mongod --dbpath /data/db    # Linux/Mac
```

**2. Email Not Sending**

```bash
# For Gmail:
# 1. Enable 2FA on Google Account
# 2. Generate App Password: https://myaccount.google.com/apppasswords
# 3. Use app password in SMTP_PASSWORD (not your Gmail password)
```

**3. PayOS Payment Failed**

```bash
# Check credentials in .env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...

# Verify webhook URL is accessible
# PayOS needs to call: http://your-domain/v1/payments/webhook
```

**4. Tests Failing**

```bash
# Clear Jest cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

## 📝 Code Quality

```bash
# Lint code
npm run lint

# Fix lint errors
npm run lint:fix

# Format code with Prettier
npm run prettier:fix

# Run all checks
npm run format
```

## 🪝 Git Hooks Setup

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality before commits.

### Automatic Setup

Git hooks are automatically installed when you run:

```bash
npm install
```

This triggers the `prepare` script which sets up Husky.

### Git Hooks

#### Pre-commit Hook

- Runs `lint-staged` on all staged files
- TypeScript files (\*.ts): ESLint + Prettier
- JSON/Markdown files: Prettier only
- Prevents commits if linting fails

#### Commit-msg Hook

- Validates commit message format
- Enforces [Conventional Commits](https://www.conventionalcommits.org/)
- Required format: `<type>(<scope>): <subject>`
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Examples

**Valid commit messages**:

```bash
git commit -m "feat: add user authentication"
git commit -m "fix(api): resolve booking endpoint error"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for seat locking"
```

**Invalid commit messages**:

```bash
git commit -m "fixed bug"          # Missing type prefix
git commit -m "WIP"                # Not conventional format
git commit -m "FEAT: new feature"  # Type should be lowercase
```

### Troubleshooting

**Hooks not running?**

```bash
# Reinstall Husky
rm -rf .husky
npx husky init
```

**Bypass hooks (not recommended)**:

```bash
# Only use in emergencies
git commit --no-verify -m "emergency fix"
```

**Check hook status**:

```bash
# Windows PowerShell
Get-Content .husky/pre-commit
Get-Content .husky/commit-msg

# Unix/Mac/Git Bash
cat .husky/pre-commit
cat .husky/commit-msg
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

## 📞 Support

- **Documentation**: Xem các file `.md` trong thư mục gốc
- **API Testing**: Import [`postman_collection.json`](./postman_collection.json) vào Postman
- **Issues**: Create issue trên GitHub repository

---

**Version:** 1.0.0  
**Last Updated:** November 2025  
**Status:** ✅ Production Ready
