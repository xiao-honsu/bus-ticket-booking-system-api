# PayOS Integration Guide for Bus Booking System

## 📋 Overview

This guide covers the complete PayOS payment integration for the bus booking system, including setup, configuration, and usage.

## 🔧 Prerequisites

- PayOS account (sign up at https://payos.vn)
- PayOS credentials: Client ID, API Key, Checksum Key
- Backend: Node.js 18+, Express.js, MongoDB
- Frontend: Next.js 14+, React

## 📦 Installation

### Backend Dependencies

PayOS SDK is already installed:

```json
"@payos/node": "^2.0.3"
```

## ⚙️ Configuration

### 1. Backend Environment Variables

Add to `backend/.env`:

```env
# PayOS Configuration
PAYOS_CLIENT_ID=your_client_id_here
PAYOS_API_KEY=your_api_key_here
PAYOS_CHECKSUM_KEY=your_checksum_key_here

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

### 2. Get PayOS Credentials

1. Sign up at https://payos.vn
2. Go to Dashboard → Settings → API Keys
3. Copy your:
   - Client ID
   - API Key
   - Checksum Key

### 3. Configure Webhook URL

**Important:** PayOS needs a public URL to send payment notifications.

#### Development (Using ngrok or similar)

```bash
# Install ngrok
npm install -g ngrok

# Expose your backend
ngrok http 4000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

#### Production

Use your production domain (must be HTTPS):

```
https://api.yourdomain.com
```

#### Register Webhook

1. Go to PayOS Dashboard → Settings → Webhooks
2. Set webhook URL: `https://your-domain.com/api/v1/payment/webhook`
3. Save configuration

## 🚀 Payment Flow

### Step-by-Step Process

```
User selects seats → Fills passenger details → Clicks "Complete Payment"
     ↓
Frontend creates booking
     ↓
Frontend calls backend to create PayOS payment link
     ↓
Backend creates payment link with PayOS
     ↓
User redirected to PayOS checkout page
     ↓
User scans QR code and pays via banking app
     ↓
PayOS sends webhook to backend (payment status)
     ↓
Backend updates booking status and sends confirmation email
     ↓
User redirected back to success/cancel page
     ↓
Frontend checks payment status and shows result
```

## 📝 API Endpoints

### 1. Create Payment Link

**Endpoint:** `POST /api/v1/payment/create`

**Headers:**

```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**

```json
{
  "bookingId": "673abc123def456789"
}
```

**Response:**

```json
{
  "checkoutUrl": "https://pay.payos.vn/web/abc123...",
  "orderCode": 1734567890123,
  "bookingId": "673abc123def456789"
}
```

### 2. Payment Webhook (PayOS → Backend)

**Endpoint:** `POST /api/v1/payment/webhook`

**No Authentication Required** (PayOS calls this)

**Request Body (from PayOS):**

```json
{
  "data": {
    "orderCode": 1734567890123,
    "amount": 300000,
    "description": "Bus ticket booking #673abc123",
    "accountNumber": "1234567890",
    "reference": "FT123456",
    "transactionDateTime": "2024-12-18 10:30:45",
    "code": "00",
    "desc": "Giao dịch thành công"
  },
  "signature": "abc123def456..."
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Payment processed successfully",
  "bookingId": "673abc123def456789"
}
```

### 3. Check Payment Status

**Endpoint:** `GET /api/v1/payment/status/:orderCode`

**Headers:**

```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response:**

```json
{
  "paymentInfo": {
    "orderCode": 1734567890123,
    "amount": 300000,
    "status": "PAID",
    "transactions": [...]
  },
  "booking": {
    "id": "673abc123def456789",
    "status": "confirmed",
    "paymentStatus": "completed",
    "totalAmount": 300000
  }
}
```

### 4. Cancel Payment

**Endpoint:** `POST /api/v1/payment/cancel/:bookingId`

**Headers:**

```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment cancelled successfully"
}
```

## 💻 Frontend Usage

### 1. Payment Service

Located at: `frontend/src/lib/services/payment.service.ts`

```typescript
import { createPaymentLink, checkPaymentStatus } from '@/lib/services/payment.service';

// Create payment
const token = localStorage.getItem('accessToken');
const result = await createPaymentLink(bookingId, token);

// Redirect to PayOS
window.location.href = result.checkoutUrl;

// Check status
const status = await checkPaymentStatus(orderCode, token);
```

### 2. Payment Pages

- **Success:** `/payment/success?orderCode=123456`
- **Cancel:** `/payment/cancel?orderCode=123456&bookingId=abc123`
- **Processing:** `/payment/processing` (optional loading state)

## 🔐 Security Best Practices

### 1. Webhook Signature Verification

The payment service already verifies webhook signatures:

```typescript
const webhookData = payOS.webhooks.verify(req.body);
```

### 2. Environment Variables

- Never commit `.env` files
- Use different credentials for dev/production
- Rotate API keys regularly

### 3. HTTPS Only

- Production must use HTTPS
- PayOS webhooks only work with HTTPS URLs

### 4. Rate Limiting

Already configured in Express:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 🧪 Testing

### Test Payment Flow

1. **Use Small Amounts:** Test with amounts like 1,000-10,000 VND
2. **Test Scenarios:**
   - Successful payment
   - Cancelled payment
   - Timeout (don't pay within time limit)
   - Multiple seats booking
   - Guest vs authenticated user

### Check Webhook Reception

```bash
# Check backend logs
tail -f backend/logs/combined.log | grep webhook

# Or in development console
# Look for: "Webhook received: ..."
```

### Verify Booking Status

```bash
# MongoDB query
db.bookings.find({ 'payment.transactionId': '1734567890123' })
```

## 📊 Monitoring & Logs

### Backend Logs

Webhook events are logged:

```
[2024-12-18 10:30:45] Webhook received: { orderCode: 1734567890123, code: '00' }
[2024-12-18 10:30:45] Payment successful for order 1734567890123
```

### Database Queries

Check booking payment status:

```javascript
// Find pending payments
db.bookings.find({ 'payment.status': 'pending' });

// Find completed payments
db.bookings.find({ 'payment.status': 'completed' });

// Find by order code
db.bookings.find({ 'payment.transactionId': '1734567890123' });
```

## 🚨 Troubleshooting

### Problem: Webhook not received

**Solution:**

1. Check webhook URL is publicly accessible
2. Verify HTTPS is enabled
3. Check PayOS dashboard webhook settings
4. Look at backend logs for errors

### Problem: Payment successful but booking not updated

**Solution:**

1. Check webhook signature verification
2. Verify orderCode matches booking's transactionId
3. Check database connection
4. Review backend logs

### Problem: User stuck on payment page

**Solution:**

1. Implement timeout handling on frontend
2. Add "Check Payment Status" button
3. Poll payment status every 5 seconds

## 📞 Support

- **PayOS Documentation:** https://payos.vn/docs
- **PayOS Support:** support@payos.vn
- **System Support:** Check your support contacts in `.env`

## 🔄 Next Steps

1. **Email Notifications:** Already implemented in payment service
2. **SMS Notifications:** Add SMS service integration
3. **Refunds:** Implement refund handling
4. **Partial Payments:** For booking modifications
5. **Analytics:** Track payment success rates

## 📋 Checklist

Before going live:

- [ ] PayOS credentials configured in production
- [ ] Webhook URL set to production HTTPS URL
- [ ] Tested successful payment flow
- [ ] Tested cancelled payment flow
- [ ] Email notifications working
- [ ] Monitoring and logging set up
- [ ] Error handling tested
- [ ] Security review completed
- [ ] Rate limiting configured
- [ ] Database backups enabled

## 🎯 Payment Status Codes

PayOS Response Codes:

- `00` or `0` - Success
- `01` - Cancelled
- `02` - Failed
- `03` - Pending

Map these to your booking statuses:

- `pending` - Initial state
- `completed` - Payment success (code 00)
- `failed` - Payment failed (code 02)
- `cancelled` - User cancelled (code 01)

---

**Last Updated:** December 18, 2024
**Version:** 1.0.0
