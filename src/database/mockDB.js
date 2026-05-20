/*
========================================
 Mock Database - In-Memory Data Store
========================================

This file contains all mock database arrays.
In production, replace with MongoDB or PostgreSQL.
*/

// User base data
const users = [
  {
    userId: 1,
    name: "Muhammad Bilal",
    gender: "male",
    verificationScore: 5,
    status: "ACTIVE"
  },
  {
    userId: 2,
    name: "Ayesha",
    gender: "female",
    verificationScore: 4,
    status: "ACTIVE"
  },
  {
    userId: 3,
    name: "Ali Khan",
    gender: "male",
    verificationScore: 0,
    status: "ACTIVE"
  }
];

// User signup profiles
const userProfiles = [];

// Institutions
const institutions = [
  "NUML Islamabad",
  "NUST Islamabad",
  "FAST Islamabad",
  "COMSATS Islamabad",
  "Punjab University Lahore",
  "LUMS Lahore",
  "IBA Karachi",
  "NED Karachi"
];

// User verification status
const verifications = [
  {
    userId: 1,
    phone: "verified",
    email: "verified",
    cnic: "pending",
    policeVerification: "not_done",
    linkedIn: "verified",
    bankCard: "pending"
  },
  {
    userId: 2,
    phone: "verified",
    email: "verified",
    cnic: "verified",
    policeVerification: "verified",
    linkedIn: "pending",
    bankCard: "not_done"
  }
];

// Carpools
const carpools = [
  {
    offerId: 1,
    userId: 1,
    driverName: "Muhammad Bilal",
    pickupLocation: "NUML Islamabad",
    destinationStation: "Rawalpindi Saddar",
    travelDate: "2026-05-20",
    departureTime: "08:30",
    availableSeats: 3,
    fare: 500,
    vehicleType: "CAR",
    luggageAllowed: true,
    verificationLevel: 4,
    genderPreference: "OPEN",
    travelPreferences: "Non-smoker",
    expiryTime: new Date("2026-05-20T08:30:00").toISOString(),
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  },
  {
    offerId: 2,
    userId: 2,
    driverName: "Ayesha",
    pickupLocation: "NUML Islamabad",
    destinationStation: "F-6 Islamabad",
    travelDate: "2026-05-20",
    departureTime: "09:00",
    availableSeats: 2,
    fare: 300,
    vehicleType: "SUV",
    luggageAllowed: false,
    verificationLevel: 3,
    genderPreference: "FEMALE_ONLY",
    travelPreferences: "Friendly & chatty",
    expiryTime: new Date("2026-05-20T09:00:00").toISOString(),
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  },
  {
    offerId: 3,
    userId: 1,
    driverName: "Muhammad Bilal",
    pickupLocation: "Lahore Fort",
    destinationStation: "Model Town Lahore",
    travelDate: "2026-05-21",
    departureTime: "10:00",
    availableSeats: 4,
    fare: 250,
    vehicleType: "CAR",
    luggageAllowed: true,
    verificationLevel: 2,
    genderPreference: "OPEN",
    travelPreferences: "Music lover",
    expiryTime: new Date("2026-05-21T10:00:00").toISOString(),
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  }
];

// Join requests
const joinRequests = [];

// Trip assignments
const tripAssignments = [];

// Audit logs
const auditLogs = [];

// Trip ratings
const ratings = [];

// CNIC uploads
const cnicUploads = [];

// Selfie verifications
const selfieVerifications = [];

// CNIC verifications (metadata submission for review)
const cnicVerifications = [];

// CNIC review queue (for admin review workflow)
const cnicReviewQueue = [];

// User notifications
const userNotifications = [];

// Seat bookings
const bookings = [];

// Seat holds (temporary locks during checkout)
const seatHolds = [];

// Draft carpool offers
const draftOffers = [];

// Confirmed trips from booking confirmations
const confirmedTrips = [];

/*
========================================
 Export All Arrays
========================================
*/
module.exports = {
  users,
  userProfiles,
  institutions,
  verifications,
  carpools,
  joinRequests,
  tripAssignments,
  auditLogs,
  ratings,
  cnicUploads,
  selfieVerifications,
  cnicVerifications,
  cnicReviewQueue,
  userNotifications,
  bookings,
  seatHolds,
  draftOffers,
  confirmedTrips
};
