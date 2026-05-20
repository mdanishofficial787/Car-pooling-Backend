# Admin CNIC Review Workflow - Complete Testing Guide

## 📋 Overview

The CNIC verification system now includes a complete admin review workflow where:
1. Users submit CNIC documents for verification
2. Admin reviews submissions in a queue
3. Admin approves or rejects with feedback
4. Users receive notifications
5. Review timeline is tracked (24-hour deadline)

---

## 🔄 Complete Workflow Flow

```
User submits CNIC
        ↓
Added to review queue (PENDING_REVIEW)
        ↓
Admin views review queue
        ↓
Admin approves/rejects
        ↓
Status updated (APPROVED/REJECTED)
        ↓
User notified + gets notification
        ↓
User checks their CNIC status
```

---

## 🧪 Step-by-Step Testing

### Step 1️⃣: Submit CNIC for Review (User Action)

**Endpoint:**
```
POST http://localhost:5000/api/admin/cnic-review/submit
```

**Headers:**
```
Authorization: Bearer testtoken
X-User-Id: 1
Content-Type: application/json
```

**Request Body:**
```json
{
  "cnicNumber": "35201-1234567-1",
  "cnicFront": "cnic_front_image.jpg",
  "cnicBack": "cnic_back_image.jpg"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "CNIC submitted successfully and added to admin review queue",
  "reviewRequest": {
    "reviewId": 1,
    "userId": 1,
    "userName": "Muhammad Bilal",
    "userGender": "male",
    "cnicNumber": "35201-1234567-1",
    "cnicFront": "cnic_front_image.jpg",
    "cnicBack": "cnic_back_image.jpg",
    "status": "PENDING_REVIEW",
    "submittedAt": "2026-05-14T10:00:00.000Z",
    "reviewDeadline": "2026-05-15T10:00:00.000Z",
    "reviewedAt": null,
    "reviewMessage": null,
    "adminId": null,
    "adminName": null
  }
}
```

---

### Step 2️⃣: Admin Views Review Queue

**Endpoint:**
```
GET http://localhost:5000/api/admin/cnic-reviews
```

**Headers:**
```
Authorization: Bearer testtoken
X-User-Id: 1
X-User-Role: admin
```

**Optional Query Parameters:**
```
?status=PENDING_REVIEW    # Filter by status
?status=APPROVED
?status=REJECTED
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "CNIC review queue retrieved",
  "total": 1,
  "reviews": [
    {
      "reviewId": 1,
      "userId": 1,
      "userName": "Muhammad Bilal",
      "cnicNumber": "35201-1234567-1",
      "cnicFront": "cnic_front_image.jpg",
      "cnicBack": "cnic_back_image.jpg",
      "status": "PENDING_REVIEW",
      "submittedAt": "2026-05-14T10:00:00.000Z",
      "reviewDeadline": "2026-05-15T10:00:00.000Z",
      "reviewedAt": null,
      "reviewMessage": null,
      "daysRemaining": 1
    }
  ]
}
```

---

### Step 3️⃣: Admin Approves CNIC

**Endpoint:**
```
POST http://localhost:5000/api/admin/cnic-review/respond
```

**Headers:**
```
Authorization: Bearer testtoken
X-User-Id: 1
X-User-Role: admin
Content-Type: application/json
```

**Request Body:**
```json
{
  "reviewId": 1,
  "action": "APPROVE",
  "reviewMessage": "Documents verified successfully"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "CNIC verification approved successfully",
  "review": {
    "reviewId": 1,
    "userId": 1,
    "cnicNumber": "35201-1234567-1",
    "status": "APPROVED",
    "reviewedAt": "2026-05-14T10:05:00.000Z",
    "reviewMessage": "Documents verified successfully",
    "adminName": "Muhammad Bilal"
  },
  "notification": {
    "notificationId": 1,
    "userId": 1,
    "type": "CNIC_VERIFICATION",
    "title": "CNIC Verification Update",
    "message": "Your CNIC verification has been approved",
    "status": "APPROVED",
    "details": "Documents verified successfully",
    "createdAt": "2026-05-14T10:05:00.000Z",
    "read": false
  }
}
```

---

### Step 4️⃣: Admin Rejects CNIC

**Endpoint:**
```
POST http://localhost:5000/api/admin/cnic-review/respond
```

**Headers:**
```
Authorization: Bearer testtoken
X-User-Id: 1
X-User-Role: admin
Content-Type: application/json
```

**Request Body:**
```json
{
  "reviewId": 1,
  "action": "REJECT",
  "reviewMessage": "Image is blurry, please resubmit"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "CNIC verification rejected successfully",
  "review": {
    "reviewId": 1,
    "userId": 1,
    "cnicNumber": "35201-1234567-1",
    "status": "REJECTED",
    "reviewedAt": "2026-05-14T10:05:00.000Z",
    "reviewMessage": "Image is blurry, please resubmit",
    "adminName": "Muhammad Bilal"
  },
  "notification": {
    "notificationId": 1,
    "userId": 1,
    "type": "CNIC_VERIFICATION",
    "title": "CNIC Verification Update",
    "message": "Your CNIC verification has been rejected",
    "status": "REJECTED",
    "details": "Image is blurry, please resubmit",
    "createdAt": "2026-05-14T10:05:00.000Z",
    "read": false
  }
}
```

---

### Step 5️⃣: User Checks Their CNIC Status

**Endpoint:**
```
GET http://localhost:5000/api/admin/my-cnic-status
```

**Headers:**
```
Authorization: Bearer testtoken
X-User-Id: 1
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "User CNIC reviews retrieved",
  "reviews": [
    {
      "reviewId": 1,
      "cnicNumber": "35201-1234567-1",
      "status": "APPROVED",
      "submittedAt": "2026-05-14T10:00:00.000Z",
      "reviewDeadline": "2026-05-15T10:00:00.000Z",
      "reviewedAt": "2026-05-14T10:05:00.000Z",
      "reviewMessage": "Documents verified successfully",
      "daysRemaining": null
    }
  ]
}
```

---

## ❌ Error Cases & Responses

### Invalid CNIC Format
```json
{
  "success": false,
  "message": "Invalid CNIC format. Expected format: XXXXX-XXXXXXX-X (e.g., 35201-1234567-1)"
}
```

### Duplicate CNIC (Pending)
```json
{
  "success": false,
  "message": "CNIC already submitted and pending review"
}
```

### Duplicate CNIC (Already Approved)
```json
{
  "success": false,
  "message": "This CNIC has already been approved"
}
```

### Review Already Completed
```json
{
  "success": false,
  "message": "Review already completed with status: APPROVED"
}
```

### Invalid Action
```json
{
  "success": false,
  "message": "action must be APPROVE or REJECT"
}
```

### Missing Authorization (Non-Admin)
```json
{
  "success": false,
  "message": "Admin access required"
}
```

---

## 📊 Valid CNIC Format Examples

**✅ Valid:**
- `35201-1234567-1`
- `12345-0987654-0`
- `37405-9876543-5`

**❌ Invalid:**
- `1540292532363` (no hyphens)
- `35201-1234567` (incomplete)
- `35201-123456-12` (wrong digit count)
- `XXXXX-XXXXXXX-X` (letters)

---

## 📋 All CNIC Review Endpoints

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `/api/admin/cnic-review/submit` | POST | User | Submit CNIC for review |
| `/api/admin/cnic-reviews` | GET | Admin | View all review queue |
| `/api/admin/cnic-review/respond` | POST | Admin | Approve/reject CNIC |
| `/api/admin/my-cnic-status` | GET | User | Check own review status |

---

## ✅ Acceptance Criteria Met

| Requirement | Status | Evidence |
|-----------|--------|----------|
| CNIC submissions stored in review queue | ✅ | `cnicReviewQueue` array in mockDB |
| Admin can view user documents | ✅ | GET `/api/admin/cnic-reviews` endpoint |
| Admin can approve or reject | ✅ | POST `/api/admin/cnic-review/respond` |
| Status updates after review | ✅ | Status changed to APPROVED/REJECTED |
| User is notified of result | ✅ | Notification created in `userNotifications` |
| Review timeline tracked (24 hours) | ✅ | `reviewDeadline` + `daysRemaining` field |

---

## 🔐 Security Features

1. **Admin-Only Access**: All admin actions require `requireAdmin` middleware
2. **CNIC Format Validation**: Regex pattern validates `XXXXX-XXXXXXX-X` format
3. **Duplicate Prevention**: Same CNIC cannot be submitted multiple times
4. **User Verification Update**: Approved CNICs automatically mark user as verified
5. **Audit Trail**: Admin name and review timestamp recorded for each action

---

## 🔧 Testing Checklist

- [ ] Submit valid CNIC → Review added to queue
- [ ] Submit invalid CNIC → Error returned
- [ ] Admin views queue → All submissions displayed
- [ ] Admin approves → User marked verified
- [ ] Admin rejects → User notified with reason
- [ ] User checks status → Shows correct status
- [ ] Filter by status → Works correctly
- [ ] 24-hour deadline → Tracked and displayed

---

## 📝 Example Test Sequence

```bash
# 1. User 1 submits CNIC
POST /api/admin/cnic-review/submit
Body: { "cnicNumber": "35201-1234567-1", ... }

# 2. Admin views queue (5 submissions pending)
GET /api/admin/cnic-reviews

# 3. Admin filters pending only
GET /api/admin/cnic-reviews?status=PENDING_REVIEW

# 4. Admin approves first submission
POST /api/admin/cnic-review/respond
Body: { "reviewId": 1, "action": "APPROVE" }

# 5. User checks their status
GET /api/admin/my-cnic-status

# 6. User sees: APPROVED status with reviewer name and message
```

