# CORS & WebSocket Configuration Fix - Quick Guide

## 📋 Vấn Đề Đã Fix

### 1️⃣ **API `/promotions/active` - 404 Not Found**

**Nguyên nhân:**

- ✅ Route `/promotions/active` **TỒN TẠI** trên backend
- ❌ Vấn đề: **CORS blocking** - Backend chỉ accept requests từ 1 domain duy nhất

**Giải pháp:** Cấu hình CORS để accept nhiều domains (localhost + production)

---

### 2️⃣ **WebSocket không hoạt động ở Production**

**Nguyên nhân:**

- ✅ WebSocket code hoạt động tốt
- ❌ Vấn đề: **CORS config** trong Socket.IO chỉ allow 1 origin duy nhất

**Giải pháp:** Cấu hình Socket.IO CORS để accept nhiều domains

---

## ✅ Solution Implemented

### Changes Made:

1. **config.ts** - Thêm `ALLOWED_ORIGINS` config
2. **app.ts** - Update Express CORS để accept multiple origins
3. **socket.ts** - Update Socket.IO CORS để accept multiple origins
4. **.env.example** - Template cho environment variables

---

## 🔧 Configuration Steps

### Step 1: Update `.env` file

Thêm biến `ALLOWED_ORIGINS` vào file `.env` của bạn:

```env
# For Development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# For Production
ALLOWED_ORIGINS=https://dsa-bus-booking.io.vn,https://www.dsa-bus-booking.io.vn,https://api.dsa-bus-booking.io.vn
```

**Format:** Danh sách các domain cách nhau bởi dấu phẩy (`,`) - **KHÔNG CÓ KHOẢNG TRẮNG**

✅ **Correct:**

```
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

❌ **Wrong:**

```
ALLOWED_ORIGINS=https://domain1.com, https://domain2.com
              spaces here ↑ will cause errors
```

---

### Step 2: Restart Backend Server

```bash
# Development
npm run dev

# Production
pm2 restart all
# or
pm2 restart ecosystem.config.mjs
```

---

## 🌐 Production Deployment Checklist

### Backend (.env on server)

```env
NODE_ENV=production
PORT=4000

# MongoDB Atlas or your production DB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/bus-booking

# CORS - Multiple origins
ALLOWED_ORIGINS=https://dsa-bus-booking.io.vn,https://www.dsa-bus-booking.io.vn

# Frontend URL (for redirects)
FRONTEND_URL=https://dsa-bus-booking.io.vn
CLIENT_URL=https://dsa-bus-booking.io.vn

# ... other configs
```

---

### Frontend Configuration

**If using Socket.IO client:**

```typescript
// ✅ Production
const socket = io('https://api.dsa-bus-booking.io.vn', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

// ✅ Development
const socket = io('http://localhost:4000', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});
```

**Environment-based config (recommended):**

```typescript
// .env.production (Frontend)
VITE_API_URL=https://api.dsa-bus-booking.io.vn
VITE_SOCKET_URL=https://api.dsa-bus-booking.io.vn

// .env.development (Frontend)
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000

// In your code
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
```

---

## 🧪 Testing

### Test API CORS

```bash
# From browser console
fetch('https://api.dsa-bus-booking.io.vn/v1/promotions/active?page=1&limit=4', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
```

**Expected:** ✅ Success response with promotions data

---

### Test WebSocket Connection

```javascript
// From browser console
const socket = io('https://api.dsa-bus-booking.io.vn', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection Error:', error);
});

socket.on('connected', (data) => {
  console.log('✅ Server confirmed:', data);
});
```

**Expected:**

```
✅ Connected: abc123xyz
✅ Server confirmed: {socketId: "abc123xyz", timestamp: "2026-01-02..."}
```

---

## 🔍 Troubleshooting

### Issue: Still getting CORS errors

**Check:**

1. Restart backend server sau khi update `.env`
2. Verify `ALLOWED_ORIGINS` không có khoảng trắng
3. Check browser console để xem origin nào đang bị block

**Debug:**

```bash
# Check backend logs
pm2 logs

# Look for CORS errors
tail -f /var/log/your-app.log | grep CORS
```

---

### Issue: WebSocket connecting but immediately disconnecting

**Possible causes:**

1. Nginx/reverse proxy chưa config WebSocket upgrade
2. SSL certificate issues

**Nginx config for WebSocket:**

```nginx
location / {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

### Issue: API works but WebSocket doesn't

**Check transport:**

```javascript
// Try forcing polling first
const socket = io('https://api.dsa-bus-booking.io.vn', {
  withCredentials: true,
  transports: ['polling', 'websocket'], // Try polling first
});
```

---

## 📊 Verification

### Backend logs should show:

```
[INFO] Socket.IO server initialized successfully
[INFO] CORS enabled for origins: https://dsa-bus-booking.io.vn, https://www.dsa-bus-booking.io.vn
```

### Network tab should show:

```
Request URL: https://api.dsa-bus-booking.io.vn/socket.io/?EIO=4&transport=polling
Status: 200 OK
Access-Control-Allow-Origin: https://dsa-bus-booking.io.vn
Access-Control-Allow-Credentials: true
```

---

## 🎯 Summary

| Issue                    | Root Cause                   | Solution                                   |
| ------------------------ | ---------------------------- | ------------------------------------------ |
| `/promotions/active` 404 | CORS blocking requests       | Add production domain to `ALLOWED_ORIGINS` |
| WebSocket not working    | Socket.IO CORS single origin | Update Socket.IO CORS config               |

**Key Changes:**

- ✅ Multiple origin support via `ALLOWED_ORIGINS` env variable
- ✅ Dynamic CORS check function instead of static string
- ✅ Both Express and Socket.IO now use same origin validation

---

**Last Updated:** January 2, 2026
