# Admin Dashboard Security Testing Guide

## Endpoint Details

**GET** `http://localhost:5000/api/admin/dashboard`

---

## ✅ Test Case 1: Authorized Admin Access

### Request
```
Method: GET
URL: http://localhost:5000/api/admin/dashboard
Headers:
  Authorization: Bearer testtoken
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Admin dashboard retrieved",
  "filters": {
    "startDate": "2026-04-14",
    "endDate": "2026-05-14"
  },
  "dashboard": {
    "activePoolsCount": 2,
    "matchedTripsCount": 2,
    "cancelledTripsCount": 0,
    "averageMatchTimeMinutes": 6,
    "safetyIncidentsCount": 0,
    "drivers": {
      "available": 14,
      "busy": 6
    }
  }
}
```

**Current Status**: ⚠️ FAILS - Mock user has role `'user'`, not `'admin'`

---

## ❌ Test Case 2: Unauthorized User Access (Non-Admin)

### Request
```
Method: GET
URL: http://localhost:5000/api/admin/dashboard
Headers:
  Authorization: Bearer testtoken
```

### Expected Response (403 Forbidden)
```json
{
  "success": false,
  "message": "Admin access required"
}
```

**Current Status**: ✅ PASSES - Returns 403 correctly

---

## ❌ Test Case 3: Missing Authorization Header

### Request
```
Method: GET
URL: http://localhost:5000/api/admin/dashboard
```

### Expected Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "Missing Authorization header"
}
```

**Current Status**: ✅ PASSES - Returns 401 correctly

---

## ❌ Test Case 4: Date Filter Query Parameters

### Request
```
Method: GET
URL: http://localhost:5000/api/admin/dashboard?startDate=2026-05-01&endDate=2026-05-14
Headers:
  Authorization: Bearer testtoken
```

### Expected Response (200 OK with filtered dates)
Same as Test Case 1, but with custom date range in `filters` object.

**Current Status**: ⚠️ FAILS - Mock user role needs to be `'admin'`

---

## How to Fix: Update Mock Authentication

To properly test the admin dashboard, update `/src/middleware/authMiddleware.js`:

### Option A: Simple Fix (for testing)
Change the mock user role to `'admin'`:

```javascript
req.user = {
  id: 1,
  name: 'Muhammad Bilal',
  gender: 'male',
  role: 'admin'  // Changed from 'user' to 'admin'
};
```

### Option B: Better Approach (flexible testing)
Accept role as query parameter or header:

```javascript
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return unauthorized(res, 'Missing Authorization header');
  }

  // Allow role override via header for testing
  const role = req.headers['x-user-role'] || 'admin';

  req.user = {
    id: 1,
    name: 'Muhammad Bilal',
    gender: 'male',
    role: role
  };

  next();
};
```

Then in Postman, you can test both:
- **Admin access**: Add header `X-User-Role: admin`
- **Non-admin access**: Add header `X-User-Role: user`

---

## All Protected Admin Routes

The following routes are protected by `requireAdmin`:

1. `GET /api/admin/dashboard` - Dashboard metrics
2. `GET /api/admin/audit-logs` - Audit logs

Both enforce:
- ✅ `authenticateUser` - Authorization header required
- ✅ `requireAdmin` - User role must be `'admin'`

---

## Security Architecture

```
Request → authenticateUser → requireAdmin → Controller
           ↓                  ↓
        Checks for         Checks for
        Auth header        admin role
```

| Middleware | Status Code | Condition |
|-----------|------------|-----------|
| `authenticateUser` | 401 | No Authorization header |
| `requireAdmin` | 403 | role ≠ 'admin' |
| Success | 200 | All checks pass |

