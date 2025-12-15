# Token Handling & Authentication Flow Documentation

## 📋 Overview

This document explains how accessToken and refreshToken are managed in the frontend application, including automatic token refresh, session management, and security best practices.

---

## 🔐 Token Architecture

### Token Types

1. **Access Token**
   - **Lifetime**: 30 minutes
   - **Purpose**: Authenticate API requests
   - **Storage**: Redux state + Cookie
   - **Transmission**: Bearer token in Authorization header

2. **Refresh Token**
   - **Lifetime**: 30 days
   - **Purpose**: Obtain new access tokens without re-login
   - **Storage**: Redux state + Cookie
   - **Transmission**: Request body to `/auth/refresh`

---

## 🔄 Automatic Token Refresh Flow

### How It Works

```
┌─────────────┐
│   User      │
│  Makes API  │
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  RTK Query baseQuery        │
│  (adds Authorization header)│
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Backend API Server         │
│  Returns 401 if token       │
│  expired                    │
└──────┬──────────────────────┘
       │
       ▼ (401 Error)
┌─────────────────────────────┐
│  baseQueryWithReauth        │
│  Interceptor                │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Mutex Lock                 │
│  (Prevent multiple refresh) │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Call /auth/refresh  │
│  with refreshToken          │
└──────┬──────────────────────┘
       │
       ├──Success──┐         ├──Failure──┐
       │           │         │           │
       ▼           ▼         ▼           ▼
┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐
│ Update  │ │  Update  │ │ Logout │ │ Redirect │
│ Redux   │ │  Cookies │ │  User  │ │ to Login │
└─────────┘ └──────────┘ └────────┘ └──────────┘
       │           │
       └───────┬───┘
               │
               ▼
┌─────────────────────────────┐
│  Retry Original Request     │
│  with new access token      │
└─────────────────────────────┘
```

---

## 📂 Implementation Files

### 1. API Service (`src/lib/store/services/api.ts`)

**Key Features:**

```typescript
import { Mutex } from 'async-mutex';

// Mutex prevents multiple simultaneous refresh calls
const mutex = new Mutex();

const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
  // Wait for mutex
  await mutex.waitForUnlock();

  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 errors
  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        // Refresh token logic
        const refreshResult = await baseQuery({
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        }, api, extraOptions);

        if (refreshResult.data) {
          // Update tokens and retry
          api.dispatch(setCredentials({...}));
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Logout on failure
          api.dispatch(logoutAction());
        }
      } finally {
        release();
      }
    } else {
      // Wait for ongoing refresh
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};
```

**Why Mutex?**

- Prevents race conditions when multiple API calls fail simultaneously
- Ensures only ONE refresh token request is made
- Other requests wait for refresh to complete, then retry

### 2. Auth Slice (`src/lib/store/features/auth/authSlice.ts`)

**State Structure:**

```typescript
interface AuthState {
  user: User | null;
  token: string | null; // Access token
  refreshToken: string | null; // Refresh token
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions:**

- `setCredentials`: Store user + tokens after login/register/refresh
- `updateToken`: Update tokens after refresh
- `logout`: Clear all auth state
- `setLoading`: Manage loading states

### 3. Login/Register Forms

**Token Storage on Success:**

```typescript
// Store in Redux
dispatch(setCredentials({ user, tokens }));

// Store in cookies for middleware
document.cookie = `token=${tokens.access.token}; path=/; max-age=${60 * 30}`;
document.cookie = `refreshToken=${tokens.refresh.token}; path=/; max-age=${60 * 60 * 24 * 30}`;
document.cookie = `userRole=${user.role}; path=/; max-age=${60 * 60 * 24 * 30}`;
```

---

## 🍪 Cookie Management

### Why Cookies?

1. **Middleware Access**: Next.js middleware can read cookies but not Redux state
2. **SSR Support**: Server-side rendering can check auth status
3. **Persistence**: Survives page refreshes
4. **Security**: Can be httpOnly (not accessible via JavaScript)

### Cookie Lifetimes

| Cookie         | Lifetime | Purpose                                     |
| -------------- | -------- | ------------------------------------------- |
| `token`        | 30 min   | Current access token                        |
| `refreshToken` | 30 days  | Refresh token for getting new access tokens |
| `userRole`     | 30 days  | Quick role check for middleware routing     |

### Security Considerations

**Current Implementation:**

```typescript
document.cookie = `token=${value}; path=/; max-age=${seconds}`;
```

**Production Enhancement:**

```typescript
document.cookie = `token=${value}; path=/; max-age=${seconds}; Secure; SameSite=Strict`;
```

- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: Prevent CSRF attacks
- `httpOnly`: Prevent XSS (requires backend to set)

---

## 🔄 Token Refresh Scenarios

### Scenario 1: Normal API Request (Token Valid)

```
User → API Request → Backend (200 OK) → Data Returned
```

### Scenario 2: API Request with Expired Access Token

```
User → API Request → Backend (401)
     ↓
Interceptor detects 401
     ↓
Lock mutex (prevent concurrent refreshes)
     ↓
Call /auth/refresh
     ↓
Backend validates refresh token (200 OK)
     ↓
Update tokens in Redux + Cookies
     ↓
Retry original request (200 OK)
     ↓
Release mutex
     ↓
Data returned to user
```

### Scenario 3: Refresh Token Also Expired

```
User → API Request → Backend (401)
     ↓
Interceptor calls /auth/refresh
     ↓
Backend returns 401 (refresh token expired)
     ↓
Dispatch logout action
     ↓
Clear Redux state + cookies
     ↓
Redirect to /login?session_expired=true
```

### Scenario 4: Multiple Concurrent Requests (All 401)

```
Request A → 401 → Acquire mutex → Refresh token
Request B → 401 → Waits for mutex
Request C → 401 → Waits for mutex
     ↓
Request A completes refresh
     ↓
Request B & C retry with new token
```

---

## 🧪 Testing Token Refresh

### Manual Test

1. **Login** to get tokens
2. **Wait 30 minutes** (or manually expire access token in backend)
3. **Make any API call** (e.g., view dashboard)
4. **Expected**: Request fails → auto-refresh → retries → succeeds

### Simulated Test

```typescript
// In browser console:
// Manually set expired token
document.cookie = 'token=expired.token.here; path=/';

// Make API call
fetch('http://localhost:4000/api/v1/bookings', {
  headers: { Authorization: 'Bearer expired.token.here' },
});
```

**Expected Result:**

- 401 error triggers refresh
- New token obtained
- Original request retries automatically

### Debug Logging

Add to `api.ts`:

```typescript
console.log('[Token Refresh] Starting refresh...');
console.log('[Token Refresh] Refresh successful');
console.log('[Token Refresh] Refresh failed, logging out');
```

---

## 🛡️ Security Best Practices

### Current Implementation

✅ **Implemented:**

- Tokens stored in Redux (in-memory)
- Tokens in cookies for SSR/middleware
- Automatic refresh on 401
- Mutex prevents race conditions
- Logout on refresh failure

⚠️ **Production Enhancements Needed:**

1. **HttpOnly Cookies** (Backend Implementation)

```typescript
// Backend should set cookies instead of sending in response
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 30 * 60 * 1000,
});
```

2. **CSRF Protection**

- Add CSRF tokens for state-changing operations
- Use `SameSite=Strict` cookie attribute

3. **Token Rotation**

- Refresh token should rotate on each use
- Backend invalidates old refresh token after issuing new one

4. **Rate Limiting**

- Limit refresh token requests per user
- Prevent brute force attacks

---

## 📊 Flow Diagrams

### Login Flow

```
┌─────────────┐
│   User      │
│ Enters      │
│ Credentials │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  LoginForm       │
│  onSubmit()      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  RTK Query       │
│  useLoginMutation│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Backend         │
│  /auth/login     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Returns         │
│  { user, tokens }│
└──────┬───────────┘
       │
       ├─────────────┬──────────────┐
       ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Dispatch │  │  Store   │  │   Redirect   │
│setCreden-│  │  in      │  │     to       │
│tials     │  │ Cookies  │  │  /dashboard  │
└──────────┘  └──────────┘  └──────────────┘
```

### Logout Flow

```
┌─────────────┐
│   User      │
│  Clicks     │
│  Logout     │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Navbar          │
│  handleLogout()  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Confirmation    │
│  Modal           │
└──────┬───────────┘
       │ Confirmed
       ▼
┌──────────────────┐
│  RTK Query       │
│  useLogoutMutation│
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Backend         │
│  /auth/logout    │
│  (invalidate RT) │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Dispatch        │
│  logout()        │
└──────┬───────────┘
       │
       ├─────────────┬──────────────┐
       ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│  Clear   │  │  Clear   │  │   Redirect   │
│  Redux   │  │ Cookies  │  │     to       │
│  State   │  │          │  │   /login     │
└──────────┘  └──────────┘  └──────────────┘
```

---

## 🐛 Troubleshooting

### Issue 1: Token Not Refreshing

**Symptoms:**

- User logged out after 30 minutes
- No automatic refresh

**Debug Steps:**

1. Check browser console for errors
2. Verify refreshToken exists in Redux state
3. Check `/auth/refresh` endpoint response
4. Verify mutex is working (no multiple refresh calls)

**Solution:**

```typescript
// Check Redux state
console.log(store.getState().auth);

// Check cookies
console.log(document.cookie);
```

### Issue 2: Infinite Refresh Loop

**Symptoms:**

- Continuous refresh token calls
- App frozen

**Causes:**

- Backend returning 401 even for refresh endpoint
- Mutex not working properly

**Solution:**

- Ensure `/auth/refresh` doesn't require auth header
- Add breakpoint in baseQueryWithReauth to debug

### Issue 3: Tokens Out of Sync

**Symptoms:**

- Redux has token but cookies don't (or vice versa)

**Solution:**

```typescript
// Sync tokens on app init
useEffect(() => {
  const token = document.cookie.match(/token=([^;]+)/)?.[1];
  const refreshToken = document.cookie.match(/refreshToken=([^;]+)/)?.[1];

  if (token && refreshToken && !auth.token) {
    // Decode token to get user
    const payload = JSON.parse(atob(token.split('.')[1]));
    dispatch(setCredentials({...}));
  }
}, []);
```

---

## 📚 References

- [RTK Query Authentication](https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#automatic-re-authorization-by-extending-fetchbasequery)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [async-mutex Documentation](https://github.com/DirtyHairy/async-mutex)

---

## ✅ Checklist

### Implementation Complete:

- [x] Automatic token refresh on 401 errors
- [x] Mutex to prevent concurrent refresh calls
- [x] Redux state management for tokens
- [x] Cookie storage for SSR/middleware
- [x] Logout on refresh failure
- [x] Redirect to login with session_expired parameter
- [x] Retry original request after refresh

### Production Enhancements Needed:

- [ ] HttpOnly cookies (backend implementation)
- [ ] CSRF protection
- [ ] Token rotation on refresh
- [ ] Rate limiting on refresh endpoint
- [ ] Secure + SameSite cookie flags
- [ ] Token fingerprinting
- [ ] Refresh token family detection

---

**Last Updated:** November 26, 2025  
**Version:** 1.0.0
