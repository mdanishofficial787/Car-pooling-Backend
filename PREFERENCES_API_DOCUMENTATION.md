# Carpool Preferences API - Implementation Documentation

## ✅ Implementation Complete

The **Carpool Preferences API** endpoint has been successfully implemented in your carpool project.

---

## 📍 Endpoint Details

**Route:** `POST /api/carpool/preferences`

**Purpose:** Publish a draft carpool offer with preferences and convert it to an active carpool.

---

## 📝 Code Changes Made

### 1. **Added Draft Carpools Array** (server.js - Line 319)
```javascript
const draftCarpoolOffers = [];
```

### 2. **Implemented Preferences Endpoint** (server.js - Lines 3115-3495)
Complete implementation with:
- ✅ User authentication
- ✅ Required field validation (7 fields)
- ✅ Draft carpool lookup
- ✅ Prevent republish check
- ✅ Gender preference validation (ANY, MALE_ONLY, FEMALE_ONLY)
- ✅ Luggage policy validation (NONE, SMALL, LARGE)
- ✅ Large luggage surcharge validation
- ✅ Smoking preference validation (NO_SMOKING, SMOKING_ALLOWED)
- ✅ Payment methods validation (CASH, EASYPAISA, JAZZCASH, BANK_TRANSFER)
- ✅ Payment schedule validation (PER_RIDE, WEEKLY, MONTHLY)
- ✅ Base fare validation (must be > 0)
- ✅ Draft to active carpool conversion
- ✅ Success response with published carpool details

### 3. **Added Test Draft Data** (server.js - Lines 465-508)

Two sample draft carpools added for testing:

**Draft #1:**
- draftId: 1
- userId: 1
- Pickup: NUML Islamabad
- Dropoff: Rawalpindi Saddar
- Date: 2026-05-20
- Time: 08:30

**Draft #2:**
- draftId: 2
- userId: 2
- Pickup: NUST Islamabad
- Dropoff: F-6 Islamabad
- Date: 2026-05-21
- Time: 09:00

---

## 🧪 Testing Instructions

### Prerequisites
1. Navigate to the carpool-project directory
2. Start the server: `node server.js`
3. Server will run at `http://localhost:5000`

### Test Request

**Method:** POST  
**URL:** `http://localhost:5000/api/carpool/preferences`

**Headers:**
```
Authorization: Bearer 123456
Content-Type: application/json
```

**Request Body:**
```json
{
  "draftId": 1,
  "genderPreference": "ANY",
  "organizationName": "NUML Islamabad",
  "luggagePolicy": "LARGE",
  "extraLuggageCharge": 200,
  "smokingPreference": "NO_SMOKING",
  "paymentMethods": ["CASH", "EASYPAISA"],
  "paymentSchedule": "PER_RIDE",
  "baseFare": 500,
  "note": "Please be on time"
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Carpool published successfully",
  "publishedCarpoolId": 1,
  "carpool": {
    "offerId": 1,
    "pickupLocation": "NUML Islamabad",
    "destinationStation": "Rawalpindi Saddar",
    "travelDate": "2026-05-20",
    "departureTime": "08:30",
    "genderPreference": "ANY",
    "luggagePolicy": "LARGE",
    "smokingPreference": "NO_SMOKING",
    "paymentMethods": ["CASH", "EASYPAISA"],
    "paymentSchedule": "PER_RIDE",
    "fareBreakdown": {
      "baseFare": 500,
      "luggageCharge": 200
    },
    "status": "ACTIVE"
  }
}
```

---

## 🔍 Validation Scenarios

### Error: Missing Required Fields
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields",
  "missingFields": ["baseFare"]
}
```

### Error: Invalid Gender Preference
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid genderPreference"
}
```

### Error: Missing Luggage Surcharge
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "extraLuggageCharge is required when LARGE luggage policy is selected"
}
```

### Error: Invalid Payment Method
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid payment method: CREDIT_CARD"
}
```

### Error: Draft Not Found
**Status:** 404 Not Found
```json
{
  "success": false,
  "message": "Draft carpool not found"
}
```

### Error: Already Published
**Status:** 400 Bad Request
```json
{
  "success": false,
  "message": "Carpool already published"
}
```

---

## 📋 Required Fields

| Field | Type | Allowed Values | Required |
|-------|------|----------------|----------|
| `draftId` | Number | - | ✅ Yes |
| `genderPreference` | String | ANY, MALE_ONLY, FEMALE_ONLY | ✅ Yes |
| `luggagePolicy` | String | NONE, SMALL, LARGE | ✅ Yes |
| `extraLuggageCharge` | Number | > 0 (if LARGE) | ✅ Required for LARGE |
| `smokingPreference` | String | NO_SMOKING, SMOKING_ALLOWED | ✅ Yes |
| `paymentMethods` | Array | CASH, EASYPAISA, JAZZCASH, BANK_TRANSFER | ✅ Yes (min 1) |
| `paymentSchedule` | String | PER_RIDE, WEEKLY, MONTHLY | ✅ Yes |
| `baseFare` | Number | > 0 | ✅ Yes |
| `organizationName` | String | - | ❌ Optional |
| `note` | String | - | ❌ Optional |

---

## 📂 Files Modified

- **[server.js](server.js)** - Added preferences endpoint and test data
  - Line 319: Added `draftCarpoolOffers` array
  - Lines 465-508: Added test draft carpools
  - Lines 3115-3495: Added preferences endpoint handler

---

## ✨ Features Implemented

✅ Full field validation with meaningful error messages  
✅ Conversion of draft to active carpool  
✅ Automatic status update (DRAFT → ACTIVE)  
✅ Fare breakdown calculation  
✅ Support for recurring and one-time trips  
✅ Coordinates preservation  
✅ Timestamp recording  
✅ Available seats initialization (default: 4)

---

## 🚀 Next Steps

1. Test the endpoint using Postman or the provided test script
2. Verify all validation scenarios work as expected
3. Check that published carpools appear in the carpools array
4. Test the endpoint with invalid data to trigger error scenarios

---

## 📞 Support

If you need to test the endpoint in Postman:
1. Create a new POST request
2. Set URL to: `http://localhost:5000/api/carpool/preferences`
3. Go to Headers tab and add: `Authorization: Bearer 123456`
4. Go to Body tab, select "raw" and "JSON"
5. Paste the example request body provided above
6. Click Send

The endpoint is now ready for integration testing! 🎉
