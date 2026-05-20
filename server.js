/*
========================================
 Calculate Verification Score
========================================
*/
const calculateVerificationScore = (userId) => {
  const verification = verifications.find(
    (v) => v.userId === userId
  );

  if (!verification) {
    return {
      score: 0,
      total: 6,
    };
  }

  let score = 0;

  if (verification.phone === 'verified') score++;
  if (verification.email === 'verified') score++;
  if (verification.cnic === 'verified') score++;
  if (verification.policeVerification === 'verified') score++;
  if (verification.linkedIn === 'verified') score++;
  if (verification.bankCard === 'verified') score++;

  return {
    score,
    total: 6,
  };
};

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LinkedInStrategy =
  require('passport-linkedin-oauth2').Strategy;
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const usersModel = require('./src/models/userModel');
const { updateVerificationFlags } = require('./src/utils/verificationHelper');

const app = express();

app.use(express.json());

/*
========================================
 Session Middleware
========================================
*/
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

/*
========================================
 Passport Initialization
========================================
*/
app.use(passport.initialize());
app.use(passport.session());

/*
========================================
 Passport LinkedIn Strategy
========================================
*/
passport.use(
  new LinkedInStrategy(
    {
      clientID:
        process.env.LINKEDIN_CLIENT_ID,

      clientSecret:
        process.env.LINKEDIN_CLIENT_SECRET,

      callbackURL:
        process.env.LINKEDIN_CALLBACK_URL,

      scope: ['openid', 'profile', 'email'],
    },

    async (
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        /*
        ====================================
         MOCK DATABASE SAVE
        ====================================
        */

        const linkedInUser = {
          linkedinId: profile.id,
          displayName: profile.displayName,
          accessToken,
        };

        console.log(
          'LinkedIn User:',
          linkedInUser
        );

        return done(null, linkedInUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

/*
========================================
 Serialize User
========================================
*/
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

/*
========================================
 LinkedIn Routes
========================================
*/
const linkedinRoutes = require('./src/routes/linkedinRoutes');
app.use('/auth', linkedinRoutes);

const port = process.env.PORT || 5000;
console.log(`DEBUG: Server configured to use port: ${port}`);

/*
========================================
 Create Upload Folder
========================================
*/
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/*
========================================
 Multer Storage Config
========================================
*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

/*
========================================
 File Filter
========================================
*/
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }

  cb(new Error('Only JPG, JPEG, and PNG files are allowed'));
};

/*
========================================
 Multer Upload Config
========================================
*/
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter
});

/*
========================================
 POLICE DOCUMENT STORAGE
========================================
*/

const policeUploadPath = path.join(__dirname, 'uploads/police');

if (!fs.existsSync(policeUploadPath)) {
  fs.mkdirSync(policeUploadPath, { recursive: true });
}

const policeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, policeUploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + file.fieldname + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const policeFileFilter = (req, file, cb) => {

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only PDF, JPG, PNG files are allowed'));
  }

  cb(null, true);
};

const policeUpload = multer({
  storage: policeStorage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },

  fileFilter: policeFileFilter,
});

/*
========================================
 In-Memory Mock Database
========================================
*/
const users = [
  {
    id: 1,
    userId: 1,
    name: "Muhammad Bilal",
    gender: "male",
    role: "admin",
    cnic: "37405-1234567-1",
    status: "ACTIVE",
    strikeCount: 0,
    suspensionUntil: null,
    averageDriverRating: 0,
    totalDriverRatings: 0,
    coRiderTrustScore: 0,
    totalCoRiderRatings: 0
  },
  {
    id: 2,
    userId: 2,
    name: "Ayesha",
    gender: "female",
    role: "user",
    cnic: "37405-7654321-2",
    status: "ACTIVE",
    strikeCount: 0,
    suspensionUntil: null,
    averageDriverRating: 0,
    totalDriverRatings: 0,
    coRiderTrustScore: 0,
    totalCoRiderRatings: 0
  }
];

const userProfiles = []; // Store user signup profiles
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

const carpools = [];
const draftCarpoolOffers = [];
const joinRequests = [];
const bookings = [];
const tripAssignments = [];
const auditLogs = [];
const ratings = []; // Store submitted trip ratings
const cnicUploads = [];
const selfieVerifications = [];
const policeDocuments = [];

const complaints = [
  {
    complaintId: 1,
    tripId: 101,
    reporterId: 1,
    reportedUserId: 2,
    reportType: 'DRIVER',
    issueTypes: ['fraud', 'harassment'],
    description: 'Driver deliberately took a longer route to charge extra. This is a serious issue.',
    status: 'OPEN',
    severity: 'HIGH',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    complaintId: 2,
    tripId: 102,
    reporterId: 1,
    reportedUserId: 2,
    reportType: 'CO_RIDER',
    issueTypes: ['rude'],
    description: 'Co-rider was very rude during the entire trip.',
    status: 'RESOLVED',
    severity: 'MEDIUM',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    complaintId: 3,
    tripId: 103,
    reporterId: 1,
    reportedUserId: 2,
    reportType: 'DRIVER',
    issueTypes: ['harassment', 'abuse'],
    description: 'Driver harassed me during the ride. Repeated offensive behavior and verbal abuse.',
    status: 'ESCALATED',
    severity: 'HIGH',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    complaintId: 4,
    tripId: 104,
    reporterId: 1,
    reportedUserId: 2,
    reportType: 'CO_RIDER',
    issueTypes: ['late', 'damaged'],
    description: 'Co-rider arrived very late and damaged car seat.',
    status: 'IN_REVIEW',
    severity: 'MEDIUM',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    complaintId: 5,
    tripId: 105,
    reporterId: 1,
    reportedUserId: 2,
    reportType: 'DRIVER',
    issueTypes: ['safety'],
    description: 'Driver was driving recklessly and endangering passengers.',
    status: 'OPEN',
    severity: 'HIGH',
    createdAt: new Date().toISOString(),
  },
];

const blacklist = [
  {
    userId: 9,
    reason: 'Fraud'
  }
];

const paymentDisputes = [
  {
    disputeId: 1,
    status: 'OPEN'
  }
];

const bankCardVerifications = [
  {
    userId: 1,
    status: 'PENDING'
  },
  {
    userId: 2,
    status: 'APPROVED'
  }
];

const bankCardData = [];
const paymentPreferences = [];
const paymentReminders = [];
const linkedInProfiles = [];
const recurringCarpools = [];
const generatedTrips = [];
const moderationLogs = [];
const blacklistRecords = [];
const blockedAccessLogs = [];
const tripReviews = [];
const moderationFlags = [];
const liveRideTracking = [];
const sosAlerts = [];

// Initialize with a completed trip for testing
tripAssignments.push({
  assignmentId: 1,
  tripId: 101,
  driverId: 2,
  pickupLocation: "NUML Islamabad",
  destination: "Rawalpindi Saddar",
  estimatedEarnings: 1500,
  route: "Main GT Road",
  requiredSeats: 3,
  status: 'COMPLETED',
  createdAt: new Date(),
  completedAt: new Date(),
});

// Add another completed trip for testing
tripAssignments.push({
  assignmentId: 2,
  tripId: 202,
  driverId: 3,
  pickupLocation: "Lahore Airport",
  destination: "Islamabad F-10",
  estimatedEarnings: 2000,
  route: "M-2 Motorway",
  requiredSeats: 2,
  status: 'COMPLETED',
  createdAt: new Date(),
  completedAt: new Date(),
});

// Initialize draft carpool offers for testing
draftCarpoolOffers.push({
  draftId: 1,
  userId: 1,
  pickupLocation: {
    area: "NUML Islamabad",
    latitude: 33.7298,
    longitude: 73.1334
  },
  dropoffLocation: {
    area: "Rawalpindi Saddar",
    latitude: 33.5731,
    longitude: 73.1456
  },
  travelDate: "2026-05-20",
  preferredTime: "08:30",
  flexibilityMinutes: 15,
  recurrenceType: "ONCE",
  weekdays: [],
  dayOfMonth: null,
  status: 'DRAFT',
  createdAt: new Date().toISOString()
});

// Add another draft carpool for testing
draftCarpoolOffers.push({
  draftId: 2,
  userId: 2,
  pickupLocation: {
    area: "NUST Islamabad",
    latitude: 33.7200,
    longitude: 73.1450
  },
  dropoffLocation: {
    area: "F-6 Islamabad",
    latitude: 33.7840,
    longitude: 73.1221
  },
  travelDate: "2026-05-21",
  preferredTime: "09:00",
  flexibilityMinutes: 20,
  recurrenceType: "ONCE",
  weekdays: [],
  dayOfMonth: null,
  status: 'DRAFT',
  createdAt: new Date().toISOString()
});

// Initialize test carpools for results API testing
carpools.push({
  offerId: 1,
  draftId: 1,
  userId: 1,
  driverName: "Muhammad Bilal",
  driverImage: null,
  driverRating: 4.8,
  pickupLocation: "NUML Islamabad",
  pickupCoordinates: {
    latitude: 33.7298,
    longitude: 73.1334
  },
  destinationStation: "Rawalpindi Saddar",
  dropoffCoordinates: {
    latitude: 33.5731,
    longitude: 73.1456
  },
  travelDate: "2026-05-20",
  departureTime: "08:30",
  flexibilityMinutes: 15,
  recurrenceType: "ONCE",
  weekdays: [],
  dayOfMonth: null,
  genderPreference: "ANY",
  organizationName: "NUML Islamabad",
  luggagePolicy: "LARGE",
  extraLuggageCharge: 200,
  smokingPreference: "NO_SMOKING",
  paymentMethods: ["CASH", "EASYPAISA"],
  paymentSchedule: "PER_RIDE",
  baseFare: 500,
  fareBreakdown: {
    baseFare: 500,
    luggageCharge: 200
  },
  note: "Please be on time",
  availableSeats: 3,
  totalSeats: 5,
  vehicleType: "Sedan",
  vehicleModel: "Honda City",
  status: "ACTIVE",
  createdAt: new Date().toISOString()
});

carpools.push({
  offerId: 2,
  draftId: 2,
  userId: 2,
  driverName: "Ayesha Khan",
  driverImage: null,
  driverRating: 4.6,
  pickupLocation: "NUST Islamabad",
  pickupCoordinates: {
    latitude: 33.7200,
    longitude: 73.1450
  },
  destinationStation: "F-6 Islamabad",
  dropoffCoordinates: {
    latitude: 33.7840,
    longitude: 73.1221
  },
  travelDate: "2026-05-20",
  departureTime: "09:00",
  flexibilityMinutes: 20,
  recurrenceType: "ONCE",
  weekdays: [],
  dayOfMonth: null,
  genderPreference: "FEMALE_ONLY",
  organizationName: "NUST Islamabad",
  luggagePolicy: "SMALL",
  extraLuggageCharge: 0,
  smokingPreference: "NO_SMOKING",
  paymentMethods: ["CASH", "JAZZCASH"],
  paymentSchedule: "PER_RIDE",
  baseFare: 300,
  fareBreakdown: {
    baseFare: 300,
    luggageCharge: 0
  },
  note: "Friendly and chatty",
  availableSeats: 2,
  totalSeats: 4,
  vehicleType: "SUV",
  vehicleModel: "Toyota Fortuner",
  status: "ACTIVE",
  createdAt: new Date().toISOString()
});

carpools.push({
  offerId: 3,
  userId: 1,
  driverName: "Muhammad Bilal",
  driverImage: null,
  driverRating: 4.8,
  pickupLocation: "Rawalpindi Saddar",
  pickupCoordinates: {
    latitude: 33.5731,
    longitude: 73.1456
  },
  destinationStation: "Lahore Fort",
  dropoffCoordinates: {
    latitude: 31.5897,
    longitude: 74.3044
  },
  travelDate: "2026-05-21",
  departureTime: "10:00",
  flexibilityMinutes: 10,
  recurrenceType: "ONCE",
  weekdays: [],
  dayOfMonth: null,
  genderPreference: "ANY",
  organizationName: "",
  luggagePolicy: "LARGE",
  extraLuggageCharge: 150,
  smokingPreference: "SMOKING_ALLOWED",
  paymentMethods: ["CASH", "BANK_TRANSFER"],
  paymentSchedule: "PER_RIDE",
  baseFare: 800,
  fareBreakdown: {
    baseFare: 800,
    luggageCharge: 150
  },
  note: "Highway trip",
  availableSeats: 4,
  totalSeats: 5,
  vehicleType: "Sedan",
  vehicleModel: "Honda Civic",
  status: "ACTIVE",
  createdAt: new Date().toISOString()
});

const rideParticipants = [
  {
    rideId: 101,
    userId: 1,
    role: 'RIDER'
  },
  {
    rideId: 101,
    userId: 2,
    role: 'DRIVER'
  }
];

/*
========================================
 JSON Body Parser
========================================
*/
const parseJsonBody = (req) => {

  return new Promise((resolve, reject) => {

    let body = '';

    // Request timeout
    req.setTimeout(5000, () => {

      reject(
        new Error('Request body parsing timeout')
      );
    });

    req.on('data', (chunk) => {

      body += chunk.toString();

      // Prevent huge payload
      if (body.length > 1e6) {

        req.destroy();

        reject(
          new Error('Payload too large')
        );
      }
    });

    req.on('end', () => {

      try {

        // Empty body
        if (!body || body.trim() === '') {

          resolve({});
          return;
        }

        const parsedBody = JSON.parse(body);

        resolve(parsedBody);

      } catch (error) {

        reject(
          new Error('Invalid JSON format')
        );
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
};

/*
========================================
 Authentication Middleware
========================================
*/
const authenticateUser = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized: Missing Authorization header' }));
    return null;
  }

  /*
    Mock authenticated user.
    In production: decode & verify JWT token here.
    For now, return the first user (admin)
  */
  return users[0];
};

/*
========================================
 ENFORCE USER RESTRICTIONS (BLACKLIST/SUSPENSION)
========================================
*/
const enforceUserRestrictions = (user, req, res) => {
  // BLACKLISTED USER
  if (user.status === 'BLACKLISTED') {
    const blacklistData = blacklistRecords.find(
      (b) => b.userId === user.userId
    );

    // Log blocked attempt
    blockedAccessLogs.push({
      userId: user.userId,
      endpoint: req.url,
      method: req.method,
      reason: 'BLACKLISTED_ACCESS_BLOCKED',
      timestamp: new Date().toISOString(),
    });

    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: false,
      message: 'Your account is blacklisted',
      restriction: {
        complaintReferenceId: blacklistData?.complaintReferenceId || 'N/A',
        restrictionDate: blacklistData?.timestamp || new Date().toISOString(),
        reason: blacklistData?.reason || 'Violation reported',
      },
    }));

    return false;
  }

  // SUSPENDED USER
  if (user.status === 'SUSPENDED') {
    const expiry = new Date(user.suspensionUntil);

    // Suspension still active
    if (expiry > new Date()) {
      blockedAccessLogs.push({
        userId: user.userId,
        endpoint: req.url,
        method: req.method,
        reason: 'SUSPENDED_ACCESS_BLOCKED',
        timestamp: new Date().toISOString(),
      });

      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        message: 'Your account is temporarily suspended',
        suspensionExpiry: user.suspensionUntil,
        daysRemaining: Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)),
      }));

      return false;
    }

    // Auto-restore after expiry
    user.status = 'ACTIVE';
    user.suspensionUntil = null;
  }

  return true;
};

/*
========================================
 VALIDATE RIDE PARTICIPANT
========================================
*/
const validateRideParticipant = (
  rideId,
  userId
) => {

  return rideParticipants.some(
    (participant) =>
      participant.rideId == rideId &&
      participant.userId == userId
  );
};

/*
========================================
 CALCULATE ETA HELPER
========================================
*/
const calculateETA = () => {

  return {
    nextStopETA: 5,
    destinationETA: 18
  };
};

/*
========================================
 Send JSON Response Helper
========================================
*/
const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

/*
========================================
 Calculate Average Rating Helper
========================================
*/
const calculateAverage = (currentAverage, totalRatings, newRating) => {
  const totalScore = currentAverage * totalRatings;
  return Number(
    (
      (totalScore + newRating) /
      (totalRatings + 1)
    ).toFixed(1)
  );
};

/*
========================================
 Validate Required Fields Helper
========================================
*/
const validateFields = (data, requiredFields) => {
  return requiredFields.filter((field) => !(field in data) || data[field] === '' || data[field] === null);
};

/*
========================================
 Check Minimum Verification Access
========================================
*/
const hasMinimumVerification = (userId) => {
  const verification = verifications.find((v) => v.userId === userId);
  if (!verification) return false;
  const score = calculateVerificationScore(userId);
  return score.score >= 1;
};

/*
========================================
 Require Verification Middleware
========================================
*/
const requireVerification = (user, res, actionName) => {
  if (!hasMinimumVerification(user.id)) {
    sendJson(res, 403, {
      success: false,
      message: `Complete at least one verification before ${actionName}`,
    });
    return false;
  }
  return true;
};

/*
========================================
 Recurring Carpool Helper Functions
========================================
*/

const calculateNextRun = (recurrence) => {
  const now = new Date();
  let next = new Date(now);

  if (recurrence.recurrenceType === 'WEEKLY') {
    // Move to next week on same day
    const daysOfWeek = recurrence.daysOfWeek || [1];
    const currentDay = next.getDay();
    
    let daysUntilNext = 7;
    for (let day of daysOfWeek.sort()) {
      const adjustedDay = day === 0 ? 7 : day; // Convert 0=Sunday to 7
      if (adjustedDay > currentDay) {
        daysUntilNext = adjustedDay - currentDay;
        break;
      }
    }
    
    next.setDate(next.getDate() + daysUntilNext);
  }

  if (recurrence.recurrenceType === 'MONTHLY') {
    next.setMonth(next.getMonth() + 1);
    next.setDate(recurrence.dayOfMonth || 1);
  }

  // Set time
  if (recurrence.time) {
    const [hours, minutes] = recurrence.time.split(':');
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  return next;
};

const generateFutureTrips = (recurrence, count = 5) => {
  const trips = [];
  let currentDate = new Date(recurrence.nextRunAt);

  for (let i = 0; i < count; i++) {
    trips.push({
      tripId: generatedTrips.length + i + 1,
      recurringId: recurrence.recurringId,
      date: new Date(currentDate),
      route: recurrence.route,
      fare: recurrence.fare,
      driverId: recurrence.userId,
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
    });

    // Calculate next occurrence
    if (recurrence.recurrenceType === 'WEEKLY') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (recurrence.recurrenceType === 'MONTHLY') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return trips;
};

const checkNotificationRule = (recurrence) => {
  if (!recurrence.nextRunAt) return false;

  const now = new Date();
  const diffMs = recurrence.nextRunAt - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  // Notify if within 24 hours
  return diffHours > 0 && diffHours <= 24;
};

const sendRecurringRideNotification = (recurrence, type) => {
  console.log(`🔔 [NOTIFICATION] ${type} for recurring carpool ${recurrence.recurringId}:`);
  console.log(`   Route: ${recurrence.route.from} → ${recurrence.route.to}`);
  console.log(`   Next ride: ${recurrence.nextRunAt}`);
  console.log(`   Fare: Rs. ${recurrence.fare}`);
  
  // In production, integrate with:
  // - Email service
  // - Push notifications
  // - Socket.IO broadcast to co-riders
};

/*
========================================
 Complaint Management Helper Functions
========================================
*/

const detectSeverity = (issueTypes) => {
  if (!issueTypes || issueTypes.length === 0) {
    return 'LOW';
  }

  const highRiskKeywords = ['fraud', 'harassment', 'abuse', 'assault', 'theft', 'violence'];
  const mediumRiskKeywords = ['rude', 'late', 'damaged', 'accident', 'safety'];

  const issueTypesLower = issueTypes.map((i) => 
    typeof i === 'string' ? i.toLowerCase() : String(i).toLowerCase()
  );

  for (let keyword of highRiskKeywords) {
    if (issueTypesLower.some((i) => i.includes(keyword))) {
      return 'HIGH';
    }
  }

  for (let keyword of mediumRiskKeywords) {
    if (issueTypesLower.some((i) => i.includes(keyword))) {
      return 'MEDIUM';
    }
  }

  return 'LOW';
};

const triggerModerationWorkflow = (complaint) => {
  if (complaint.severity === 'HIGH') {
    console.log(`🚨 [ESCALATION] Complaint #${complaint.complaintId} requires immediate review`);
    console.log(`   Issue: ${complaint.issueTypes.join(', ')}`);
    console.log(`   Reported user: ${complaint.reportedUserId}`);
    
    // In production, integrate with:
    // - Admin notification dashboard
    // - Email alert to moderators
    // - Auto-flag user account
    // - Create support ticket
  } else if (complaint.severity === 'MEDIUM') {
    console.log(`🟡 [REVIEW QUEUE] Complaint #${complaint.complaintId} added to moderation queue`);
  } else {
    console.log(`ℹ️ [LOGGED] Low-severity complaint #${complaint.complaintId} recorded`);
  }
};

const checkDuplicateComplaint = (tripId, reporterId, reportedUserId) => {
  return complaints.find(
    (c) =>
      c.tripId === tripId &&
      c.reporterId === reporterId &&
      c.reportedUserId === reportedUserId &&
      c.status !== 'RESOLVED'
  );
};

const getTripById = (tripId) => {
  return tripAssignments.find((t) => t.tripId === tripId) ||
         generatedTrips.find((t) => t.tripId === tripId);
};

/*
=========================================================
 APPLY PENALTY TO USER
=========================================================
*/
const applyPenalty = (userId, actionType) => {
  const user = users.find((u) => u.userId === userId);
  
  if (!user) {
    return { success: false, message: 'User not found' };
  }

  switch (actionType) {
    case 'WARN':
      user.strikeCount += 1;
      user.status = 'WARNED';
      break;

    case 'SUSPEND':
      user.status = 'SUSPENDED';
      // 7 days suspension
      const suspensionEnd = new Date();
      suspensionEnd.setDate(suspensionEnd.getDate() + 7);
      user.suspensionUntil = suspensionEnd;
      user.strikeCount += 2;
      break;

    case 'BLACKLIST':
      user.status = 'BLACKLISTED';
      user.strikeCount = 999;
      break;

    case 'DISMISS':
      // No penalty applied
      break;

    default:
      return { success: false, message: 'Invalid action type' };
  }

  return { success: true, user };
};

/*
=========================================================
 CHECK FOR DUPLICATE MODERATION ACTION
=========================================================
*/
const checkDuplicateModerationAction = (complaintId) => {
  const complaint = complaints.find((c) => c.complaintId === parseInt(complaintId));
  
  if (!complaint) {
    return {
      isDuplicate: false,
      complaintExists: false,
    };
  }

  // Already resolved or dismissed
  if (complaint.status === 'RESOLVED' || complaint.status === 'DISMISSED') {
    return {
      isDuplicate: true,
      message: `Action already taken on this complaint. Current status: ${complaint.status}`,
      complaintExists: true,
    };
  }

  return { isDuplicate: false, complaintExists: true };
};

/*
=========================================================
 LOG MODERATION ACTION
=========================================================
*/
const logModerationAction = (complaintId, adminId, actionType, reason = '') => {
  const logEntry = {
    logId: moderationLogs.length + 1,
    complaintId,
    adminId,
    actionType,
    reason,
    timestamp: new Date().toISOString(),
  };

  moderationLogs.push(logEntry);
  return logEntry;
};

/*
========================================
 ADMIN - BLACKLIST USER
========================================
*/
app.post('/api/admin/blacklist-user', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can blacklist users',
      });
    }

    const { userId, reason, complaintReferenceId } = req.body;

    // Validate required fields
    if (!userId || !reason || !complaintReferenceId) {
      return res.status(400).json({
        success: false,
        message: 'userId, reason, and complaintReferenceId are required',
      });
    }

    // Find user
    const targetUser = users.find((u) => u.userId === parseInt(userId));
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user status
    targetUser.status = 'BLACKLISTED';

    // Create blacklist record
    const blacklistRecord = {
      blacklistId: blacklistRecords.length + 1,
      userId: targetUser.userId,
      name: targetUser.name,
      cnic: targetUser.cnic,
      reason,
      complaintReferenceId,
      timestamp: new Date().toISOString(),
      blacklistedBy: user.userId,
    };

    blacklistRecords.push(blacklistRecord);

    console.log(`🚫 [BLACKLIST ADMIN] User #${userId} blacklisted by admin`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Complaint: ${complaintReferenceId}`);

    res.json({
      success: true,
      message: 'User blacklisted successfully',
      blacklistRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to blacklist user',
      error: error.message,
    });
  }
});

/*
========================================
 ADMIN - SUSPEND USER
========================================
*/
app.post('/api/admin/suspend-user', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can suspend users',
      });
    }

    const { userId, suspensionExpiry, reason } = req.body;

    // Validate required fields
    if (!userId || !suspensionExpiry) {
      return res.status(400).json({
        success: false,
        message: 'userId and suspensionExpiry are required',
      });
    }

    // Find user
    const targetUser = users.find((u) => u.userId === parseInt(userId));
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate date
    const expiryDate = new Date(suspensionExpiry);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suspensionExpiry date format',
      });
    }

    if (expiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Suspension expiry must be in the future',
      });
    }

    // Update user status
    targetUser.status = 'SUSPENDED';
    targetUser.suspensionUntil = suspensionExpiry;

    const daysRemaining = Math.ceil(
      (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    console.log(`🔒 [SUSPEND ADMIN] User #${userId} suspended for ${daysRemaining} days`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    res.json({
      success: true,
      message: 'User suspended successfully',
      suspension: {
        userId: targetUser.userId,
        status: 'SUSPENDED',
        suspensionExpiry,
        daysRemaining,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user',
      error: error.message,
    });
  }
});

/*
========================================
 ADMIN - VIEW BLOCKED ACCESS LOGS
========================================
*/
app.get('/api/admin/blocked-logs', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view blocked logs',
      });
    }

    const filterUserId = req.query.userId;
    const filterReason = req.query.reason;

    let filtered = [...blockedAccessLogs];

    if (filterUserId) {
      filtered = filtered.filter((l) => l.userId === parseInt(filterUserId));
    }

    if (filterReason) {
      filtered = filtered.filter((l) => l.reason === filterReason);
    }

    // Sort by newest first
    const sorted = filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const summary = {
      total: blockedAccessLogs.length,
      byReason: {
        BLACKLISTED_ACCESS_BLOCKED: blockedAccessLogs.filter(
          (l) => l.reason === 'BLACKLISTED_ACCESS_BLOCKED'
        ).length,
        SUSPENDED_ACCESS_BLOCKED: blockedAccessLogs.filter(
          (l) => l.reason === 'SUSPENDED_ACCESS_BLOCKED'
        ).length,
      },
    };

    res.json({
      success: true,
      summary,
      logs: sorted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blocked logs',
      error: error.message,
    });
  }
});

/*
========================================
 ADMIN - VIEW BLACKLIST RECORDS
========================================
*/
app.get('/api/admin/blacklist-records', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view blacklist records',
      });
    }

    res.json({
      success: true,
      summary: {
        total: blacklistRecords.length,
      },
      blacklistedUsers: blacklistRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blacklist records',
      error: error.message,
    });
  }
});

/*
========================================
 LinkedIn OAuth Routes
========================================
*/

/*
========================================
 LINKEDIN LOGIN
========================================
*/
app.get(
  '/auth/linkedin',
  passport.authenticate('linkedin')
);

/*
========================================
 LINKEDIN CALLBACK
========================================
*/
app.get(
  '/auth/linkedin/callback',

  passport.authenticate('linkedin', {
    failureRedirect: '/auth/linkedin/failure',
  }),

  async (req, res) => {
    try {
      /*
      =========================================
       EXTRACT SAFE DATA FROM PASSPORT
      =========================================
      */
      const passportUser = req.user;

      if (!passportUser || !passportUser.accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Access token not available'
        });
      }

      /*
      =========================================
       FETCH ADDITIONAL PROFILE DATA
      =========================================
      */
      let profileData = {};

      try {
        const userInfoResponse = await axios.get(
          'https://api.linkedin.com/v2/userinfo',
          {
            headers: {
              Authorization: `Bearer ${passportUser.accessToken}`,
              'Accept': 'application/json'
            },
          }
        );

        const linkedinData = userInfoResponse.data;

        profileData = {
          name: linkedinData.name || passportUser.displayName || 'Unknown',
          photo: linkedinData.picture || null,
          email: linkedinData.email || null,
          linkedinId: linkedinData.sub || passportUser.linkedinId,
        };
      } catch (apiError) {
        console.warn('LinkedIn API call failed, using passport data:', apiError.message);
        
        // Fallback to passport data if API fails
        profileData = {
          name: passportUser.displayName || 'Unknown',
          photo: null,
          email: null,
          linkedinId: passportUser.linkedinId,
        };
      }

      /*
      =========================================
       CREATE SAFE STORAGE OBJECT
       (Only these fields stored)
      =========================================
      */
      const safeLinkedInData = {
        profileId: linkedInProfiles.length + 1,
        linkedinId: profileData.linkedinId,
        name: profileData.name,
        photo: profileData.photo,
        email: profileData.email,
        employer: 'Not directly available', // LinkedIn positions require extra permissions
        accountAgeStart: new Date().toISOString(), // First login timestamp
        userId: 1, // From authenticated user
        lastUpdated: new Date().toISOString(),
      };

      /*
      =========================================
       FIND OR UPDATE EXISTING PROFILE
      =========================================
      */
      const existingProfile = linkedInProfiles.find(
        (p) => p.linkedinId === profileData.linkedinId
      );

      if (existingProfile) {
        // Update existing profile
        Object.assign(existingProfile, safeLinkedInData);
      } else {
        // Add new profile
        linkedInProfiles.push(safeLinkedInData);
      }

      /*
      =========================================
       UPDATE USER VERIFICATION STATUS
      =========================================
      */
      const userVerification = verifications.find((v) => v.userId === 1);
      if (userVerification) {
        userVerification.linkedIn = 'verified';
      }

      /*
      =========================================
       SUCCESS RESPONSE
      =========================================
      */
      res.json({
        success: true,
        message: 'LinkedIn profile stored successfully',
        user: {
          linkedinId: safeLinkedInData.linkedinId,
          name: safeLinkedInData.name,
          photo: safeLinkedInData.photo,
          email: safeLinkedInData.email,
        },
        verification: {
          linkedIn: 'verified',
          verificationScore: calculateVerificationScore(1),
        }
      });
    } catch (error) {
      console.error('LinkedIn Callback Error:', error.message);

      res.status(500).json({
        success: false,
        message: 'Failed to process LinkedIn profile',
        error: error.message,
      });
    }
  }
);

/*
========================================
 LINKEDIN FAILURE
========================================
*/
app.get(
  '/auth/linkedin/failure',
  (req, res) => {
    res.status(401).json({
      success: false,
      message:
        'LinkedIn authentication failed',
    });
  }
);

/*
========================================
 GET STORED LINKEDIN PROFILE
========================================
*/
app.get('/api/user/linkedin-profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const profile = linkedInProfiles.find(
      (p) => p.userId === parseInt(userId)
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'LinkedIn profile not found for this user',
      });
    }

    res.json({
      success: true,
      message: 'LinkedIn profile retrieved successfully',
      profile: {
        linkedinId: profile.linkedinId,
        name: profile.name,
        photo: profile.photo,
        email: profile.email,
        employer: profile.employer,
        accountAgeStart: profile.accountAgeStart,
        lastUpdated: profile.lastUpdated,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve LinkedIn profile',
      error: error.message,
    });
  }
});

/*
========================================
 LIST ALL LINKEDIN PROFILES (ADMIN)
========================================
*/
app.get('/api/admin/linkedin-profiles', (req, res) => {
  try {
    const safeProfiles = linkedInProfiles.map((p) => ({
      profileId: p.profileId,
      linkedinId: p.linkedinId,
      name: p.name,
      email: p.email,
      userId: p.userId,
      lastUpdated: p.lastUpdated,
    }));

    res.json({
      success: true,
      message: 'LinkedIn profiles retrieved',
      totalProfiles: linkedInProfiles.length,
      profiles: safeProfiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve LinkedIn profiles',
      error: error.message,
    });
  }
});

/*
========================================
 RECURRING CARPOOLS - GET USER'S RECURRENCES
========================================
*/
app.get('/api/recurring-carpools', (req, res) => {
  try {
    const userId = 1; // From authenticated user

    const userRecurrences = recurringCarpools.filter(
      (r) => r.userId === userId
    );

    const enriched = userRecurrences.map((r) => {
      const notificationDue = checkNotificationRule(r);
      return {
        ...r,
        notificationDue,
      };
    });

    res.json({
      success: true,
      message: 'Recurring carpools retrieved',
      totalRecurrences: enriched.length,
      recurrences: enriched,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recurring carpools',
      error: error.message,
    });
  }
});

/*
========================================
 RECURRING CARPOOLS - CREATE NEW
========================================
*/
app.post('/api/recurring-carpools', async (req, res) => {
  try {
    const data = req.body;

    const requiredFields = [
      'recurrenceType',
      'time',
      'route',
      'fare',
    ];

    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
      });
    }

    // Validate recurrence type
    if (!['WEEKLY', 'MONTHLY'].includes(data.recurrenceType)) {
      return res.status(400).json({
        success: false,
        message: 'recurrenceType must be WEEKLY or MONTHLY',
      });
    }

    // For WEEKLY, require daysOfWeek
    if (
      data.recurrenceType === 'WEEKLY' &&
      (!data.daysOfWeek || data.daysOfWeek.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'daysOfWeek required for WEEKLY recurrence (e.g., [1,3,5] for Mon/Wed/Fri)',
      });
    }

    // For MONTHLY, require dayOfMonth
    if (
      data.recurrenceType === 'MONTHLY' &&
      (!data.dayOfMonth || data.dayOfMonth < 1 || data.dayOfMonth > 31)
    ) {
      return res.status(400).json({
        success: false,
        message: 'dayOfMonth required for MONTHLY recurrence (1-31)',
      });
    }

    // Create recurrence
    const recurrence = {
      recurringId: recurringCarpools.length + 1,
      userId: 1, // From authenticated user
      recurrenceType: data.recurrenceType,
      daysOfWeek: data.daysOfWeek || null,
      dayOfMonth: data.dayOfMonth || null,
      time: data.time,
      route: data.route,
      fare: parseFloat(data.fare),
      coRiders: data.coRiders || [],
      status: 'ACTIVE',
      nextRunAt: calculateNextRun(data),
      createdAt: new Date().toISOString(),
    };

    recurringCarpools.push(recurrence);

    // Auto-generate future trips
    const futureTrips = generateFutureTrips(recurrence, 5);
    generatedTrips.push(...futureTrips);

    res.status(201).json({
      success: true,
      message: 'Recurring carpool created successfully',
      recurrence,
      upcomingTrips: futureTrips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create recurring carpool',
      error: error.message,
    });
  }
});

/*
========================================
 RECURRING CARPOOLS - PAUSE/RESUME/CANCEL
========================================
*/
app.patch('/api/recurring-carpools/:recurringId/action', async (req, res) => {
  try {
    const { recurringId } = req.params;
    const { action } = req.body;

    if (!['PAUSE', 'RESUME', 'CANCEL'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be PAUSE, RESUME, or CANCEL',
      });
    }

    const recurrence = recurringCarpools.find(
      (r) => r.recurringId === parseInt(recurringId)
    );

    if (!recurrence) {
      return res.status(404).json({
        success: false,
        message: 'Recurring carpool not found',
      });
    }

    // Prevent modification of already cancelled recurrences
    if (recurrence.status === 'CANCELLED' && action !== 'RESUME') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify cancelled recurrence',
      });
    }

    const previousStatus = recurrence.status;

    if (action === 'PAUSE') {
      recurrence.status = 'PAUSED';
    }

    if (action === 'RESUME') {
      recurrence.status = 'ACTIVE';
      // Recalculate next run when resuming
      recurrence.nextRunAt = calculateNextRun(recurrence);
    }

    if (action === 'CANCEL') {
      recurrence.status = 'CANCELLED';
      recurrence.nextRunAt = null;

      // Send cancellation notification (24 hours rule)
      sendRecurringRideNotification(recurrence, 'CANCELLATION');
    }

    res.json({
      success: true,
      message: `Recurring carpool ${action.toLowerCase()}ed successfully`,
      recurrence,
      statusChange: {
        from: previousStatus,
        to: recurrence.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update recurring carpool status',
      error: error.message,
    });
  }
});

/*
========================================
 RECURRING CARPOOLS - GET GENERATED TRIPS
========================================
*/
app.get('/api/recurring-carpools/:recurringId/trips', (req, res) => {
  try {
    const { recurringId } = req.params;

    const recurrence = recurringCarpools.find(
      (r) => r.recurringId === parseInt(recurringId)
    );

    if (!recurrence) {
      return res.status(404).json({
        success: false,
        message: 'Recurring carpool not found',
      });
    }

    const trips = generatedTrips.filter(
      (t) => t.recurringId === parseInt(recurringId)
    );

    res.json({
      success: true,
      message: 'Generated trips retrieved',
      recurringId: parseInt(recurringId),
      recurrence: {
        type: recurrence.recurrenceType,
        route: recurrence.route,
        status: recurrence.status,
      },
      totalTrips: trips.length,
      trips: trips.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      ),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve generated trips',
      error: error.message,
    });
  }
});

/*
========================================
 COMPLAINTS - SUBMIT NEW COMPLAINT
========================================
*/
app.post('/api/complaints', async (req, res) => {
  try {
    const data = req.body;
    const reporterId = 1; // From authenticated user

    const requiredFields = [
      'tripId',
      'reportedUserId',
      'reportType',
      'description',
    ];

    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
      });
    }

    /*
    =========================================
     VALIDATE DESCRIPTION LENGTH
    =========================================
    */
    if (data.description.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 50 characters',
        currentLength: data.description.length,
        required: 50,
      });
    }

    /*
    =========================================
     VALIDATE REPORT TYPE
    =========================================
    */
    if (!['DRIVER', 'CO_RIDER'].includes(data.reportType)) {
      return res.status(400).json({
        success: false,
        message: 'reportType must be DRIVER or CO_RIDER',
      });
    }

    /*
    =========================================
     VALIDATE TRIP EXISTS
    =========================================
    */
    const trip = getTripById(data.tripId);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
        tripId: data.tripId,
      });
    }

    /*
    =========================================
     VALIDATE TRIP STATUS
    =========================================
    */
    const validTripStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
    
    if (!validTripStatuses.includes(trip.status)) {
      return res.status(400).json({
        success: false,
        message: 'Complaints allowed only for scheduled, in-progress, or completed trips',
        tripStatus: trip.status,
      });
    }

    /*
    =========================================
     CHECK DUPLICATE COMPLAINT
    =========================================
    */
    const existingComplaint = checkDuplicateComplaint(
      data.tripId,
      reporterId,
      data.reportedUserId
    );

    if (existingComplaint) {
      return res.status(409).json({
        success: false,
        message: 'Complaint already exists for this trip and user',
        existingComplaintId: existingComplaint.complaintId,
      });
    }

    /*
    =========================================
     DETERMINE SEVERITY
    =========================================
    */
    const severity = detectSeverity(data.issueTypes);

    /*
    =========================================
     CREATE COMPLAINT RECORD
    =========================================
    */
    const complaint = {
      complaintId: complaints.length + 1,
      tripId: data.tripId,
      reporterId: reporterId,
      reportedUserId: data.reportedUserId,
      reportType: data.reportType,
      issueTypes: data.issueTypes || [],
      description: data.description,
      evidence: data.evidence || [],
      status: severity === 'HIGH' ? 'ESCALATED' : 'OPEN',
      severity: severity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    complaints.push(complaint);

    /*
    =========================================
     TRIGGER MODERATION WORKFLOW
    =========================================
    */
    triggerModerationWorkflow(complaint);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaintId: complaint.complaintId,
      status: complaint.status,
      severity: complaint.severity,
      caseReference: `CASE-${complaint.complaintId}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint',
      error: error.message,
    });
  }
});

/*
========================================
 COMPLAINTS - GET USER'S COMPLAINTS
========================================
*/
app.get('/api/complaints', (req, res) => {
  try {
    const userId = 1; // From authenticated user

    const userComplaints = complaints.filter(
      (c) => c.reporterId === userId
    );

    const summary = {
      total: userComplaints.length,
      byStatus: {
        OPEN: userComplaints.filter((c) => c.status === 'OPEN').length,
        IN_REVIEW: userComplaints.filter((c) => c.status === 'IN_REVIEW').length,
        ESCALATED: userComplaints.filter((c) => c.status === 'ESCALATED').length,
        RESOLVED: userComplaints.filter((c) => c.status === 'RESOLVED').length,
      },
      bySeverity: {
        HIGH: userComplaints.filter((c) => c.severity === 'HIGH').length,
        MEDIUM: userComplaints.filter((c) => c.severity === 'MEDIUM').length,
        LOW: userComplaints.filter((c) => c.severity === 'LOW').length,
      },
    };

    res.json({
      success: true,
      message: 'Complaints retrieved successfully',
      summary,
      complaints: userComplaints.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints',
      error: error.message,
    });
  }
});

/*
========================================
 COMPLAINTS - GET SINGLE COMPLAINT
========================================
*/
app.get('/api/complaints/:complaintId', (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = complaints.find(
      (c) => c.complaintId === parseInt(complaintId)
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
        complaintId: parseInt(complaintId),
      });
    }

    const trip = getTripById(complaint.tripId);

    res.json({
      success: true,
      message: 'Complaint retrieved successfully',
      complaint,
      tripDetails: trip ? {
        tripId: trip.tripId,
        route: trip.route,
        status: trip.status,
      } : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint',
      error: error.message,
    });
  }
});

/*
========================================
 COMPLAINTS - UPDATE STATUS (ADMIN)
========================================
*/
app.patch('/api/complaints/:complaintId/status', (req, res) => {
  try {
    const { complaintId } = req.params;
    const { newStatus } = req.body;

    const validStatuses = ['OPEN', 'IN_REVIEW', 'ESCALATED', 'RESOLVED'];

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'newStatus must be OPEN, IN_REVIEW, ESCALATED, or RESOLVED',
        validStatuses,
      });
    }

    const complaint = complaints.find(
      (c) => c.complaintId === parseInt(complaintId)
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    const previousStatus = complaint.status;
    complaint.status = newStatus;
    complaint.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint,
      statusChange: {
        from: previousStatus,
        to: newStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint status',
      error: error.message,
    });
  }
});

/*
========================================
 COMPLAINTS - GET ALL (ADMIN)
========================================
*/
app.get('/api/admin/complaints', (req, res) => {
  try {
    const filterStatus = req.query.status;
    const filterSeverity = req.query.severity;

    let filtered = [...complaints];

    if (filterStatus) {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (filterSeverity) {
      filtered = filtered.filter((c) => c.severity === filterSeverity);
    }

    const summary = {
      total: complaints.length,
      filtered: filtered.length,
      byStatus: {
        OPEN: complaints.filter((c) => c.status === 'OPEN').length,
        IN_REVIEW: complaints.filter((c) => c.status === 'IN_REVIEW').length,
        ESCALATED: complaints.filter((c) => c.status === 'ESCALATED').length,
        RESOLVED: complaints.filter((c) => c.status === 'RESOLVED').length,
      },
      bySeverity: {
        HIGH: complaints.filter((c) => c.severity === 'HIGH').length,
        MEDIUM: complaints.filter((c) => c.severity === 'MEDIUM').length,
        LOW: complaints.filter((c) => c.severity === 'LOW').length,
      },
    };

    res.json({
      success: true,
      message: 'All complaints retrieved',
      summary,
      complaints: filtered.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaints',
      error: error.message,
    });
  }
});

/*
=========================================================
 COMPLAINT RESOLUTION & BLACKLIST ENFORCEMENT
=========================================================
*/

/*
=========================================================
 POST /api/admin/resolve-complaint
 Resolve a complaint with moderation actions
=========================================================
*/
app.post('/api/admin/resolve-complaint', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    // Only admins can resolve complaints
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can resolve complaints',
      });
    }

    const { complaintId, actionType, reason } = req.body;

    // Validate required fields
    if (!complaintId || !actionType) {
      return res.status(400).json({
        success: false,
        message: 'complaintId and actionType are required',
      });
    }

    // Validate action type
    const validActions = ['DISMISS', 'WARN', 'SUSPEND', 'BLACKLIST'];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({
        success: false,
        message: `actionType must be one of: ${validActions.join(', ')}`,
      });
    }

    // BLACKLIST requires reason
    if (actionType === 'BLACKLIST' && !reason) {
      return res.status(400).json({
        success: false,
        message: 'reason is required for BLACKLIST action',
      });
    }

    // Check for duplicate action and complaint existence
    const duplicateCheck = checkDuplicateModerationAction(complaintId);
    
    if (!duplicateCheck.complaintExists) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({
        success: false,
        message: duplicateCheck.message,
      });
    }

    // Fetch complaint (now we know it exists)
    const complaint = complaints.find((c) => c.complaintId === parseInt(complaintId));

    // Fetch reported user
    const reportedUser = users.find((u) => u.userId === complaint.reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'Reported user not found',
      });
    }

    // Apply penalty based on action type
    const penaltyResult = applyPenalty(complaint.reportedUserId, actionType);
    if (!penaltyResult.success) {
      return res.status(500).json({
        success: false,
        message: penaltyResult.message,
      });
    }

    // Update complaint status
    let complaintStatus = 'RESOLVED';

    if (actionType === 'DISMISS') {
      complaintStatus = 'DISMISSED';
    } else if (actionType === 'BLACKLIST') {
      complaintStatus = 'ESCALATED';
    } else {
      complaintStatus = 'RESOLVED';
    }

    complaint.status = complaintStatus;
    complaint.updatedAt = new Date().toISOString();
    complaint.resolvedBy = user.id;
    complaint.resolutionAction = actionType;

    // Log moderation action
    const logEntry = logModerationAction(
      complaintId,
      user.id,
      actionType,
      reason
    );

    // Log to console for visibility
    if (actionType === 'BLACKLIST') {
      console.log(`🚫 [BLACKLIST] User #${complaint.reportedUserId} has been BLACKLISTED`);
      console.log(`   Reason: ${reason}`);
      console.log(`   By admin: ${user.name}`);
    } else if (actionType === 'SUSPEND') {
      console.log(`🔒 [SUSPENDED] User #${complaint.reportedUserId} suspended for 7 days`);
    } else if (actionType === 'WARN') {
      console.log(`⚠️ [WARNING] User #${complaint.reportedUserId} warned (Strike ${reportedUser.strikeCount})`);
    } else {
      console.log(`✅ [DISMISSED] Complaint #${complaintId} dismissed`);
    }

    res.json({
      success: true,
      message: 'Moderation action completed successfully',
      resolution: {
        complaintId: parseInt(complaintId),
        action: actionType,
        complaintStatus: complaintStatus,
      },
      userPenalty: {
        userId: complaint.reportedUserId,
        userStatus: reportedUser.status,
        strikeCount: reportedUser.strikeCount,
        suspensionUntil: reportedUser.suspensionUntil,
      },
      auditLog: {
        logId: logEntry.logId,
        timestamp: logEntry.timestamp,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resolve complaint',
      error: error.message,
    });
  }
});

/*
=========================================================
 GET /api/admin/moderation-logs
 View all moderation actions and audit trail
=========================================================
*/
app.get('/api/admin/moderation-logs', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view moderation logs',
      });
    }

    const filterAction = req.query.action;
    const filterUserId = req.query.userId;

    let filtered = [...moderationLogs];

    if (filterAction) {
      filtered = filtered.filter((l) => l.actionType === filterAction);
    }

    if (filterUserId) {
      filtered = filtered.filter(
        (l) => {
          const complaint = complaints.find((c) => c.complaintId === l.complaintId);
          return complaint && complaint.reportedUserId === parseInt(filterUserId);
        }
      );
    }

    // Sort by newest first
    const sorted = filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const summary = {
      total: moderationLogs.length,
      byAction: {
        DISMISS: moderationLogs.filter((l) => l.actionType === 'DISMISS').length,
        WARN: moderationLogs.filter((l) => l.actionType === 'WARN').length,
        SUSPEND: moderationLogs.filter((l) => l.actionType === 'SUSPEND').length,
        BLACKLIST: moderationLogs.filter((l) => l.actionType === 'BLACKLIST').length,
      },
    };

    res.json({
      success: true,
      summary,
      logs: sorted.map((log) => {
        const complaint = complaints.find((c) => c.complaintId === log.complaintId);
        return {
          ...log,
          complaintDetails: {
            complaintId: log.complaintId,
            severity: complaint?.severity,
            reportedUserId: complaint?.reportedUserId,
          },
        };
      }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve moderation logs',
      error: error.message,
    });
  }
});

/*
=========================================================
 GET /api/admin/blacklist
 View all blacklisted users
=========================================================
*/
app.get('/api/admin/blacklist', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view blacklist',
      });
    }

    const blacklistedUsers = users.filter((u) => u.status === 'BLACKLISTED');

    const blacklistData = blacklistedUsers.map((u) => {
      const relevantLogs = moderationLogs.filter(
        (l) => {
          const complaint = complaints.find((c) => c.complaintId === l.complaintId);
          return complaint && complaint.reportedUserId === u.userId && l.actionType === 'BLACKLIST';
        }
      );

      const latestBlacklistLog = relevantLogs[relevantLogs.length - 1];

      return {
        userId: u.userId,
        name: u.name,
        status: u.status,
        strikeCount: u.strikeCount,
        blacklistedAt: latestBlacklistLog?.timestamp,
        blacklistReason: latestBlacklistLog?.reason,
        totalComplaints: complaints.filter((c) => c.reportedUserId === u.userId).length,
      };
    });

    res.json({
      success: true,
      summary: {
        totalBlacklisted: blacklistData.length,
      },
      blacklistedUsers: blacklistData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blacklist',
      error: error.message,
    });
  }
});

/*
=========================================================
 GET /api/user/moderation-status/:userId
 Check a user's moderation status
=========================================================
*/
app.get('/api/user/moderation-status/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const user = users.find((u) => u.userId === parseInt(userId));
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get all complaints against this user
    const userComplaints = complaints.filter(
      (c) => c.reportedUserId === parseInt(userId)
    );

    // Get all moderation actions on this user
    const userModerationLogs = moderationLogs.filter((l) => {
      const complaint = complaints.find((c) => c.complaintId === l.complaintId);
      return complaint && complaint.reportedUserId === parseInt(userId);
    });

    // Check if suspension is still active
    let isSuspensionActive = false;
    if (
      user.status === 'SUSPENDED' &&
      user.suspensionUntil &&
      new Date(user.suspensionUntil) > new Date()
    ) {
      isSuspensionActive = true;
    } else if (user.status === 'SUSPENDED' && new Date(user.suspensionUntil) <= new Date()) {
      // Auto-revert suspension if expired
      user.status = 'ACTIVE';
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        status: user.status,
        strikeCount: user.strikeCount,
        suspensionUntil: user.suspensionUntil,
        isSuspensionActive,
      },
      complaints: {
        total: userComplaints.length,
        byStatus: {
          OPEN: userComplaints.filter((c) => c.status === 'OPEN').length,
          IN_REVIEW: userComplaints.filter((c) => c.status === 'IN_REVIEW').length,
          ESCALATED: userComplaints.filter((c) => c.status === 'ESCALATED').length,
          RESOLVED: userComplaints.filter((c) => c.status === 'RESOLVED').length,
          DISMISSED: userComplaints.filter((c) => c.status === 'DISMISSED').length,
        },
        bySeverity: {
          HIGH: userComplaints.filter((c) => c.severity === 'HIGH').length,
          MEDIUM: userComplaints.filter((c) => c.severity === 'MEDIUM').length,
          LOW: userComplaints.filter((c) => c.severity === 'LOW').length,
        },
      },
      moderationHistory: userModerationLogs.map((log) => ({
        logId: log.logId,
        action: log.actionType,
        reason: log.reason,
        timestamp: log.timestamp,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve moderation status',
      error: error.message,
    });
  }
});

/*
=========================================================
 ADMIN - BLACKLIST USER
=========================================================
*/
app.post('/api/admin/blacklist-user', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can blacklist users',
      });
    }

    const { userId, reason, complaintReferenceId } = req.body;

    // Validate required fields
    if (!userId || !reason || !complaintReferenceId) {
      return res.status(400).json({
        success: false,
        message: 'userId, reason, and complaintReferenceId are required',
      });
    }

    // Find user
    const targetUser = users.find((u) => u.userId === parseInt(userId));
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user status
    targetUser.status = 'BLACKLISTED';

    // Create blacklist record
    const blacklistRecord = {
      blacklistId: blacklistRecords.length + 1,
      userId: targetUser.userId,
      name: targetUser.name,
      cnic: targetUser.cnic,
      reason,
      complaintReferenceId,
      timestamp: new Date().toISOString(),
      blacklistedBy: user.userId,
    };

    blacklistRecords.push(blacklistRecord);

    console.log(`🚫 [BLACKLIST ADMIN] User #${userId} blacklisted by admin`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Complaint: ${complaintReferenceId}`);

    res.json({
      success: true,
      message: 'User blacklisted successfully',
      blacklistRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to blacklist user',
      error: error.message,
    });
  }
});

/*
=========================================================
 ADMIN - SUSPEND USER
=========================================================
*/
app.post('/api/admin/suspend-user', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can suspend users',
      });
    }

    const { userId, suspensionExpiry, reason } = req.body;

    // Validate required fields
    if (!userId || !suspensionExpiry) {
      return res.status(400).json({
        success: false,
        message: 'userId and suspensionExpiry are required',
      });
    }

    // Find user
    const targetUser = users.find((u) => u.userId === parseInt(userId));
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate date
    const expiryDate = new Date(suspensionExpiry);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid suspensionExpiry date format',
      });
    }

    if (expiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Suspension expiry must be in the future',
      });
    }

    // Update user status
    targetUser.status = 'SUSPENDED';
    targetUser.suspensionUntil = suspensionExpiry;

    const daysRemaining = Math.ceil(
      (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    console.log(`🔒 [SUSPEND ADMIN] User #${userId} suspended for ${daysRemaining} days`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    res.json({
      success: true,
      message: 'User suspended successfully',
      suspension: {
        userId: targetUser.userId,
        status: 'SUSPENDED',
        suspensionExpiry,
        daysRemaining,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user',
      error: error.message,
    });
  }
});

/*
=========================================================
 ADMIN - VIEW BLOCKED ACCESS LOGS
=========================================================
*/
app.get('/api/admin/blocked-logs', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view blocked logs',
      });
    }

    const filterUserId = req.query.userId;
    const filterReason = req.query.reason;

    let filtered = [...blockedAccessLogs];

    if (filterUserId) {
      filtered = filtered.filter((l) => l.userId === parseInt(filterUserId));
    }

    if (filterReason) {
      filtered = filtered.filter((l) => l.reason === filterReason);
    }

    // Sort by newest first
    const sorted = filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const summary = {
      total: blockedAccessLogs.length,
      byReason: {
        BLACKLISTED_ACCESS_BLOCKED: blockedAccessLogs.filter(
          (l) => l.reason === 'BLACKLISTED_ACCESS_BLOCKED'
        ).length,
        SUSPENDED_ACCESS_BLOCKED: blockedAccessLogs.filter(
          (l) => l.reason === 'SUSPENDED_ACCESS_BLOCKED'
        ).length,
      },
    };

    res.json({
      success: true,
      summary,
      logs: sorted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blocked logs',
      error: error.message,
    });
  }
});

/*
=========================================================
 ADMIN - VIEW BLACKLIST RECORDS
=========================================================
*/
app.get('/api/admin/blacklist-records', (req, res) => {
  try {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view blacklist records',
      });
    }

    res.json({
      success: true,
      summary: {
        total: blacklistRecords.length,
      },
      blacklistedUsers: blacklistRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blacklist records',
      error: error.message,
    });
  }
});

/*
========================================
 PRIVACY POLICY
========================================
*/
app.get('/privacy-policy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Privacy Policy - Carpool App</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <h1>Privacy Policy</h1>
      <p><strong>Last Updated: May 15, 2026</strong></p>
      
      <h2>1. Introduction</h2>
      <p>Welcome to Carpool App ("we", "us", "our", or "Company"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
      
      <h2>2. Information We Collect</h2>
      <p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
      <ul>
        <li>Personal Data: name, email address, phone number, LinkedIn profile information</li>
        <li>Payment Information: payment method details (for secure processing)</li>
        <li>Location Data: pickup and destination locations</li>
        <li>Device Information: IP address, browser type</li>
      </ul>
      
      <h2>3. Use of Your Information</h2>
      <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
      <ul>
        <li>Generate accounts and allow you to access our services</li>
        <li>Process your carpool requests and payments</li>
        <li>Email you regarding your account or order</li>
        <li>Improve our website and services</li>
        <li>Prevent fraudulent transactions</li>
      </ul>
      
      <h2>4. Disclosure of Your Information</h2>
      <p>We may share information we have collected about you in certain situations:</p>
      <ul>
        <li>By Law or to Protect Rights</li>
        <li>Third-Party Service Providers</li>
        <li>Business Transfers</li>
      </ul>
      
      <h2>5. Security of Your Information</h2>
      <p>We use administrative, technical, and physical security measures to protect your personal information. However, perfect security does not exist on the Internet.</p>
      
      <h2>6. Contact Us</h2>
      <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
      <p>Email: info@carpoolapp.com<br>
      Address: Islamabad, Pakistan</p>
      
      <hr>
      <p>&copy; 2026 Carpool App. All rights reserved.</p>
    </body>
    </html>
  `);
});

/*
========================================
 TERMS OF SERVICE
========================================
*/
app.get('/terms-of-service', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Terms of Service - Carpool App</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <h1>Terms of Service</h1>
      <p><strong>Last Updated: May 15, 2026</strong></p>
      
      <h2>1. Agreement to Terms</h2>
      <p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.</p>
      
      <h2>2. Use License</h2>
      <p>Permission is granted to temporarily download one copy of the materials (information or software) on Carpool App's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
      <ul>
        <li>Modify or copy the materials</li>
        <li>Use the materials for any commercial purpose or for any public display</li>
        <li>Attempt to decompile or reverse engineer any software contained on the website</li>
        <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
        <li>Violate any applicable laws or regulations</li>
      </ul>
      
      <h2>3. Disclaimer</h2>
      <p>The materials on Carpool App's website are provided on an 'as is' basis. Carpool App makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
      
      <h2>4. Limitations</h2>
      <p>In no event shall Carpool App or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Carpool App's website.</p>
      
      <h2>5. Accuracy of Materials</h2>
      <p>The materials appearing on Carpool App's website could include technical, typographical, or photographic errors. Carpool App does not warrant that any of the materials on its website are accurate, complete, or current.</p>
      
      <h2>6. Modifications</h2>
      <p>Carpool App may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p>
      
      <h2>7. Governing Law</h2>
      <p>These terms and conditions are governed by and construed in accordance with the laws of Pakistan, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
      
      <hr>
      <p>&copy; 2026 Carpool App. All rights reserved.</p>
    </body>
    </html>
  `);
});

/*
========================================
 Main Request Listener
========================================
*/

/*
=========================================================
 CALCULATE HIGHLY VERIFIED STATUS
=========================================================
*/
const getVerificationDetails = (verificationData) => {
  const verificationFields = [
    'phone',
    'email',
    'cnic',
    'policeVerification',
    'linkedIn',
    'bankCard'
  ];

  let verifiedCount = 0;

  verificationFields.forEach((field) => {
    if (verificationData[field] === 'verified') {
      verifiedCount++;
    }
  });

  return {
    verificationScore: verifiedCount,
    totalVerifications: verificationFields.length,
    highlyVerified: verifiedCount >= 4
  };
};

/*
=========================================================
 BUILD VERIFICATION BADGES
=========================================================
*/
const buildVerificationBadges = (userId) => {
  const verification = verifications.find(
    (v) => v.userId === userId
  );

  if (!verification) {
    return {
      verificationCount: 0,
      verificationBadges: {
        phone_verified: false,
        email_verified: false,
        cnic_verified: false,
        police_verified: false,
        linkedin_verified: false,
        bank_verified: false
      }
    };
  }

  const badges = {
    phone_verified: verification.phone === 'verified',
    email_verified: verification.email === 'verified',
    cnic_verified: verification.cnic === 'verified',
    police_verified: verification.policeVerification === 'verified',
    linkedin_verified: verification.linkedIn === 'verified',
    bank_verified: verification.bankCard === 'verified'
  };

  const verificationCount = Object.values(badges).filter(Boolean).length;

  return {
    verificationCount,
    verificationBadges: badges
  };
};

/*
=========================================================
 VERIFICATION DISCLAIMER STATUS
=========================================================
*/
const getVerificationStatus = (userId) => {
  const verification = verifications.find(
    (v) => v.userId === userId
  );

  if (!verification) {
    return {
      verificationCount: 0,
      isUnverified: true,
      showUnverifiedWarning: true,
      verificationLevel: 'UNVERIFIED'
    };
  }

  const verificationFields = [
    verification.phone,
    verification.email,
    verification.cnic,
    verification.policeVerification,
    verification.linkedIn,
    verification.bankCard
  ];

  const completedVerifications = verificationFields.filter(
    (status) => status === 'verified'
  ).length;

  const isUnverified = completedVerifications < 2;

  return {
    verificationCount: completedVerifications,
    isUnverified,
    showUnverifiedWarning: isUnverified,
    verificationLevel: isUnverified ? 'UNVERIFIED' : 'VERIFIED'
  };
};

/*
========================================
 Main Request Listener
========================================
*/
const requestListener = async (req, res) => {
  /*
  =========================================================
   GET USER VERIFICATION STATUS
   GET /api/user/verifications/:userId
  =========================================================
  */
  const verificationMatch = req.url.match(/^\/api\/user\/verifications\/(\d+)$/);
  if (req.method === 'GET' && verificationMatch) {
    const userId = parseInt(verificationMatch[1]);
    const userVerification = verifications.find(v => v.userId === userId);
    if (!userVerification) {
      sendJson(res, 404, { success: false, message: 'User verification not found' });
      return;
    }

    const verificationDetails = getVerificationDetails(userVerification);
    const verificationStatus = getVerificationStatus(userId);

    sendJson(res, 200, {
      success: true,
      userId,
      verifications: {
        phone: userVerification.phone,
        email: userVerification.email,
        cnic: userVerification.cnic,
        policeVerification: userVerification.policeVerification,
        linkedIn: userVerification.linkedIn,
        bankCard: userVerification.bankCard
      },
      verificationScore: `${verificationDetails.verificationScore}/${verificationDetails.totalVerifications}`,
      highlyVerified: verificationDetails.highlyVerified,
      uiFlags: {
        showGreenShield: verificationDetails.highlyVerified
      },
      verificationSummary: {
        verificationCount: verificationStatus.verificationCount,
        isUnverified: verificationStatus.isUnverified,
        showUnverifiedWarning: verificationStatus.showUnverifiedWarning,
        verificationLevel: verificationStatus.verificationLevel
      }
    });
    return;
  }

  /*
  ================================
   CORS Headers
  ================================
  */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  /*
  ================================
   Home / Health Check Route
  ================================
  */
  if (req.method === 'GET' && req.url === '/') {
    sendJson(res, 200, {
      success: true,
      message: 'Carpool API Server Running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  /*
  =========================================================
   USER SIGNUP
   POST /api/user/signup
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/user/signup') {
    try {
      const data = req.body;

      // Required fields validation
      const requiredFields = ['fullName', 'mobileNumber', 'email'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          error: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Check for duplicate mobile number
      const existingUser = userProfiles.find((u) => u.mobileNumber === data.mobileNumber);
      if (existingUser) {
        sendJson(res, 409, {
          success: false,
          message: 'Mobile number already registered',
        });
        return;
      }

      // Validate email format (basic validation)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      // Validate mobile number format (Pakistan format)
      const mobileRegex = /^03\d{9}$/;
      if (!mobileRegex.test(data.mobileNumber)) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid mobile number format. Use Pakistan format: 03XXXXXXXXX',
        });
        return;
      }

      // Create user profile
      const newUser = {
        userId: userProfiles.length + 1,
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        email: data.email,
        location: data.location || '',
        weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
        institution: data.institution || '',
        createdAt: new Date().toISOString(),
      };

      userProfiles.push(newUser);

      sendJson(res, 201, {
        success: true,
        message: 'User profile created successfully',
        user: {
          userId: newUser.userId,
          fullName: newUser.fullName,
          mobileNumber: newUser.mobileNumber,
          email: newUser.email,
          location: newUser.location,
          weeklySchedule: newUser.weeklySchedule,
          institution: newUser.institution,
        },
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        error: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   SEARCH INSTITUTIONS
   GET /api/institutions/search?q=<query>
  =========================================================
  */
  if (req.method === 'GET' && req.url.startsWith('/api/institutions/search')) {
    const urlObj = new URL(req.url, 'http://localhost');
    const searchQuery = urlObj.searchParams.get('q') || '';

    if (!searchQuery || searchQuery.trim() === '') {
      sendJson(res, 200, {
        success: true,
        query: searchQuery,
        totalResults: 0,
        suggestions: [],
      });
      return;
    }

    // Partial matching (case-insensitive)
    const suggestions = institutions.filter((institution) =>
      institution.toLowerCase().includes(searchQuery.toLowerCase())
    );

    sendJson(res, 200, {
      success: true,
      query: searchQuery,
      totalResults: suggestions.length,
      suggestions,
    });

    return;
  }

  /*
  =========================================================
   CREATE CARPOOL OFFER
   POST /api/carpool/create
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/carpool/create') {
    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed = enforceUserRestrictions(user, req, res);
    if (!allowed) return;

    if (!requireVerification(user, res, 'creating a carpool')) return;

    try {
      const data = req.body;

      // Required field check
      const requiredFields = ['pickupLocation', 'destinationStation', 'travelDate', 'departureTime', 'availableSeats'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Past date validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tripDate = new Date(data.travelDate);

      if (isNaN(tripDate.getTime())) {
        sendJson(res, 400, { success: false, message: 'Invalid travelDate format. Use YYYY-MM-DD' });
        return;
      }

      if (tripDate < today) {
        sendJson(res, 400, { success: false, message: 'Past travel dates are not allowed' });
        return;
      }

      // Departure time format validation (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(data.departureTime)) {
        sendJson(res, 400, { success: false, message: 'Invalid departureTime format. Use HH:MM (24-hour)' });
        return;
      }

      // Seat count validation
      const seats = parseInt(data.availableSeats);
      if (isNaN(seats) || seats <= 0) {
        sendJson(res, 400, { success: false, message: 'availableSeats must be a positive integer' });
        return;
      }

      if (seats > 10) {
        sendJson(res, 400, { success: false, message: 'availableSeats cannot exceed 10' });
        return;
      }

      // Gender preference validation
      const allowedGenderPrefs = ['OPEN', 'FEMALE_ONLY', 'MALE_ONLY'];
      const genderPreference = data.genderPreference || 'OPEN';

      if (!allowedGenderPrefs.includes(genderPreference)) {
        sendJson(res, 400, {
          success: false,
          message: `Invalid genderPreference. Allowed values: ${allowedGenderPrefs.join(', ')}`,
        });
        return;
      }

      // Create carpool
      const newCarpool = {
        offerId: carpools.length + 1,
        userId: user.id,
        driverName: user.name,
        pickupLocation: data.pickupLocation,
        destinationStation: data.destinationStation,
        travelDate: data.travelDate,
        departureTime: data.departureTime,
        availableSeats: seats,
        travelPreferences: data.travelPreferences || '',
        genderPreference,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      carpools.push(newCarpool);

      sendJson(res, 201, {
        success: true,
        message: 'Carpool created successfully',
        offerId: newCarpool.offerId,
        carpool: newCarpool,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   CREATE DRAFT CARPOOL
   POST /api/carpool/draft
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/carpool/draft') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      // Draft ID
      const draftId = draftCarpoolOffers.length + 1;

      // Create draft object
      const draft = {
        draftId,
        userId: user.id,
        driverName: user.fullName || 'Unknown Driver',
        
        // Location details
        pickupLocation: data.pickupLocation || {
          latitude: null,
          longitude: null,
          area: '',
          street: '',
        },
        destinationStation: data.destinationStation || '',
        
        // Travel details
        travelDate: data.travelDate || null,
        preferredTime: data.preferredTime || null,
        flexibilityMinutes: data.flexibilityMinutes || 30,
        recurrenceType: data.recurrenceType || 'ONCE',
        weekdays: data.weekdays || [],
        dayOfMonth: data.dayOfMonth || null,
        
        // Carpool preferences
        genderPreference: data.genderPreference || 'OPEN',
        ageRange: data.ageRange || { min: 18, max: 70 },
        allowedOccupations: data.allowedOccupations || [],
        travelPreferences: data.travelPreferences || '',
        
        // Vehicle & Seats (optional - can be added later)
        vehicleCategory: null,
        vehicleType: null,
        vehicleModel: null,
        registrationNumber: null,
        selectedSeats: [],
        totalSeats: 0,
        availableSeats: 0,
        
        // Additional preferences (optional)
        luggageAllowed: data.luggageAllowed !== false,
        petsAllowed: data.petsAllowed === true,
        smokingAllowed: data.smokingAllowed === false,
        musicPreference: data.musicPreference || 'MODERATE',
        conversationLevel: data.conversationLevel || 'MODERATE',
        
        // Pricing
        basePrice: data.basePrice || null,
        pricePerSeat: data.pricePerSeat || null,
        
        // Status
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: null,
      };

      // Add to draft storage
      draftCarpoolOffers.push(draft);

      // Return success
      sendJson(res, 201, {
        success: true,
        message: 'Draft carpool created successfully',
        draftId,
        draft: {
          draftId: draft.draftId,
          userId: draft.userId,
          driverName: draft.driverName,
          pickupLocation: draft.pickupLocation,
          destinationStation: draft.destinationStation,
          travelDate: draft.travelDate,
          status: draft.status,
          createdAt: draft.createdAt,
        },
        nextSteps: [
          'POST /api/carpool/preferences - Add travel preferences',
          'POST /api/carpool/vehicle - Add vehicle details',
          'POST /api/carpool/create - Publish draft as active carpool',
        ],
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   FINALIZE & PUBLISH CARPOOL PREFERENCES API
   POST /api/carpool/preferences
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/carpool/preferences') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      /*
      =========================================
       REQUIRED FIELDS
      =========================================
      */
      const requiredFields = [
        'draftId',
        'genderPreference',
        'luggagePolicy',
        'smokingPreference',
        'paymentMethods',
        'paymentSchedule',
        'baseFare'
      ];

      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields
        });
        return;
      }

      /*
      =========================================
       FIND DRAFT
      =========================================
      */
      const draft = draftCarpoolOffers.find(
        (d) =>
          d.draftId === data.draftId &&
          d.userId === user.id
      );

      if (!draft) {
        sendJson(res, 404, {
          success: false,
          message: 'Draft carpool not found'
        });
        return;
      }

      /*
      =========================================
       PREVENT REPUBLISH
      =========================================
      */
      if (draft.status === 'ACTIVE') {
        sendJson(res, 400, {
          success: false,
          message: 'Carpool already published'
        });
        return;
      }

      /*
      =========================================
       GENDER PREFERENCE VALIDATION
      =========================================
      */
      const allowedGenderPrefs = [
        'ANY',
        'MALE_ONLY',
        'FEMALE_ONLY'
      ];

      if (
        !allowedGenderPrefs.includes(
          data.genderPreference
        )
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid genderPreference'
        });
        return;
      }

      /*
      =========================================
       LUGGAGE POLICY VALIDATION
      =========================================
      */
      const allowedLuggagePolicies = [
        'NONE',
        'SMALL',
        'LARGE'
      ];

      if (
        !allowedLuggagePolicies.includes(
          data.luggagePolicy
        )
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid luggagePolicy'
        });
        return;
      }

      /*
      =========================================
       LARGE LUGGAGE VALIDATION
      =========================================
      */
      if (data.luggagePolicy === 'LARGE') {
        if (
          !data.extraLuggageCharge ||
          data.extraLuggageCharge <= 0
        ) {
          sendJson(res, 400, {
            success: false,
            message:
              'extraLuggageCharge is required when LARGE luggage policy is selected'
          });
          return;
        }
      }

      /*
      =========================================
       SMOKING PREFERENCE VALIDATION
      =========================================
      */
      const allowedSmokingPrefs = [
        'NO_SMOKING',
        'SMOKING_ALLOWED'
      ];

      if (
        !allowedSmokingPrefs.includes(
          data.smokingPreference
        )
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid smokingPreference'
        });
        return;
      }

      /*
      =========================================
       PAYMENT METHODS VALIDATION
      =========================================
      */
      const allowedPaymentMethods = [
        'CASH',
        'EASYPAISA',
        'JAZZCASH',
        'BANK_TRANSFER'
      ];

      if (
        !Array.isArray(data.paymentMethods) ||
        data.paymentMethods.length === 0
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            'At least one payment method is required'
        });
        return;
      }

      const invalidPaymentMethod =
        data.paymentMethods.find(
          (method) =>
            !allowedPaymentMethods.includes(method)
        );

      if (invalidPaymentMethod) {
        sendJson(res, 400, {
          success: false,
          message:
            `Invalid payment method: ${invalidPaymentMethod}`
        });
        return;
      }

      /*
      =========================================
       PAYMENT SCHEDULE VALIDATION
      =========================================
      */
      const allowedSchedules = [
        'PER_RIDE',
        'WEEKLY',
        'MONTHLY'
      ];

      if (
        !allowedSchedules.includes(
          data.paymentSchedule
        )
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid paymentSchedule'
        });
        return;
      }

      /*
      =========================================
       BASE FARE VALIDATION
      =========================================
      */
      if (
        isNaN(data.baseFare) ||
        Number(data.baseFare) <= 0
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            'baseFare must be greater than 0'
        });
        return;
      }

      /*
      =========================================
       CONVERT DRAFT → ACTIVE CARPOOL
      =========================================
      */
      const publishedCarpool = {
        offerId:
          carpools.length + 1,

        draftId:
          draft.draftId,

        userId:
          user.id,

        driverName:
          user.name,

        pickupLocation:
          draft.pickupLocation.area,

        pickupCoordinates: {
          latitude:
            draft.pickupLocation.latitude,

          longitude:
            draft.pickupLocation.longitude
        },

        destinationStation:
          draft.dropoffLocation.area,

        dropoffCoordinates: {
          latitude:
            draft.dropoffLocation.latitude,

          longitude:
            draft.dropoffLocation.longitude
        },

        travelDate:
          draft.travelDate,

        departureTime:
          draft.preferredTime,

        flexibilityMinutes:
          draft.flexibilityMinutes,

        recurrenceType:
          draft.recurrenceType,

        weekdays:
          draft.weekdays || [],

        dayOfMonth:
          draft.dayOfMonth || null,

        /*
        =====================================
         PREFERENCES
        =====================================
        */
        genderPreference:
          data.genderPreference,

        organizationName:
          data.organizationName || '',

        luggagePolicy:
          data.luggagePolicy,

        extraLuggageCharge:
          data.extraLuggageCharge || 0,

        smokingPreference:
          data.smokingPreference,

        paymentMethods:
          data.paymentMethods,

        paymentSchedule:
          data.paymentSchedule,

        /*
        =====================================
         PRICING
        =====================================
        */
        baseFare:
          Number(data.baseFare),

        fareBreakdown: {
          baseFare:
            Number(data.baseFare),

          luggageCharge:
            data.extraLuggageCharge || 0
        },

        /*
        =====================================
         OPTIONAL NOTE
        =====================================
        */
        note:
          data.note || '',

        /*
        =====================================
         DEFAULTS
        =====================================
        */
        availableSeats: 4,

        status: 'ACTIVE',

        createdAt:
          new Date().toISOString()
      };

      /*
      =========================================
       SAVE CARPOOL
      =========================================
      */
      carpools.push(publishedCarpool);

      /*
      =========================================
       UPDATE DRAFT STATUS
      =========================================
      */
      draft.status = 'ACTIVE';

      draft.publishedAt =
        new Date().toISOString();

      /*
      =========================================
       SUCCESS RESPONSE
      =========================================
      */
      sendJson(res, 201, {
        success: true,

        message:
          'Carpool published successfully',

        publishedCarpoolId:
          publishedCarpool.offerId,

        carpool: {
          offerId:
            publishedCarpool.offerId,

          pickupLocation:
            publishedCarpool.pickupLocation,

          destinationStation:
            publishedCarpool.destinationStation,

          travelDate:
            publishedCarpool.travelDate,

          departureTime:
            publishedCarpool.departureTime,

          genderPreference:
            publishedCarpool.genderPreference,

          luggagePolicy:
            publishedCarpool.luggagePolicy,

          smokingPreference:
            publishedCarpool.smokingPreference,

          paymentMethods:
            publishedCarpool.paymentMethods,

          paymentSchedule:
            publishedCarpool.paymentSchedule,

          fareBreakdown:
            publishedCarpool.fareBreakdown,

          status:
            publishedCarpool.status
        }
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message
      });
    }

    return;
  }

  /*
  =========================================================
   CARPOOL RESULTS API
   GET /api/carpool/results
  =========================================================
  */
  if (req.method === 'GET' && req.url.startsWith('/api/carpool/results')) {
    const user = authenticateUser(req, res);
    if (!user) return;

    // Verification check
    const userVerification = verifications.find(v => v.userId === user.id);

    if (!userVerification) {
      sendJson(res, 403, {
        success: false,
        message: 'Complete at least one verification to access carpool search'
      });
      return;
    }

    // Parse Query Params
    const urlObj = new URL(req.url, 'http://localhost');

    const pickup = urlObj.searchParams.get('pickup');
    const destination = urlObj.searchParams.get('destination');
    const travelDate = urlObj.searchParams.get('travelDate');
    const genderPreference = urlObj.searchParams.get('genderPreference');
    const minFare = Number(urlObj.searchParams.get('minFare')) || 0;
    const maxFare = Number(urlObj.searchParams.get('maxFare')) || 999999;
    const vehicleType = urlObj.searchParams.get('vehicleType');

    const page = Number(urlObj.searchParams.get('page')) || 1;
    const limit = Number(urlObj.searchParams.get('limit')) || 10;

    /*
    =========================================================
     FILTER ACTIVE CARPOOLS
    =========================================================
    */
    let filteredCarpools = carpools.filter(carpool => {
      // Only ACTIVE
      if (carpool.status !== 'ACTIVE') {
        return false;
      }

      // Pickup filter
      if (
        pickup &&
        !carpool.pickupLocation.toLowerCase().includes(pickup.toLowerCase())
      ) {
        return false;
      }

      // Destination filter
      if (
        destination &&
        !carpool.destinationStation.toLowerCase().includes(destination.toLowerCase())
      ) {
        return false;
      }

      // Date filter
      if (
        travelDate &&
        carpool.travelDate !== travelDate
      ) {
        return false;
      }

      // Gender restrictions
      if (
        carpool.genderPreference === 'FEMALE_ONLY' &&
        user.gender !== 'female'
      ) {
        return false;
      }

      if (
        carpool.genderPreference === 'MALE_ONLY' &&
        user.gender !== 'male'
      ) {
        return false;
      }

      // Vehicle type filter
      if (
        vehicleType &&
        carpool.vehicleType !== vehicleType
      ) {
        return false;
      }

      // Fare filters
      const baseFare = carpool.baseFare || 0;

      if (baseFare < minFare || baseFare > maxFare) {
        return false;
      }

      // Real-time seat validation
      if (carpool.availableSeats <= 0) {
        return false;
      }

      return true;
    });

    /*
    =========================================================
     RANKING LOGIC
    =========================================================
    */
    filteredCarpools = filteredCarpools.map(carpool => {
      // Driver verification
      const verification = verifications.find(
        v => v.userId === carpool.userId
      );

      const verificationScore = verification
        ? [
            verification.phone === 'verified',
            verification.email === 'verified',
            verification.cnic === 'verified',
            verification.linkedIn === 'verified',
            verification.bankCard === 'verified'
          ].filter(Boolean).length
        : 0;

      // Mock driver rating
      const driverRating = carpool.driverRating || 4.5;

      // Mock route score
      const routeMatchScore = Math.floor(Math.random() * 100);

      // Mock time proximity
      const timeProximity = Math.floor(Math.random() * 60);

      // Final ranking score
      const rankingScore =
        routeMatchScore +
        verificationScore * 10 +
        driverRating * 5 -
        timeProximity;

      return {
        ...carpool,
        verification,
        verificationScore,
        driverRating,
        routeMatchScore,
        timeProximity,
        rankingScore
      };
    });

    // Sort Best Matches First
    filteredCarpools.sort(
      (a, b) => b.rankingScore - a.rankingScore
    );

    /*
    =========================================================
     PAGINATION
    =========================================================
    */
    const startIndex = (page - 1) * limit;
    const paginatedResults = filteredCarpools.slice(
      startIndex,
      startIndex + limit
    );

    /*
    =========================================================
     RESPONSE FORMAT
    =========================================================
    */
    const results = paginatedResults.map(carpool => ({
      carpoolId: carpool.offerId,

      driver: {
        userId: carpool.userId,
        name: carpool.driverName,
        image: carpool.driverImage || null,
        rating: carpool.driverRating,

        verification: {
          phone_verified:
            carpool.verification?.phone === 'verified',

          email_verified:
            carpool.verification?.email === 'verified',

          cnic_verified:
            carpool.verification?.cnic === 'verified',

          linkedin_verified:
            carpool.verification?.linkedIn === 'verified',

          bank_verified:
            carpool.verification?.bankCard === 'verified',

          verification_score:
            `${carpool.verificationScore}/5`
        }
      },

      pickupLocation: {
        area: carpool.pickupLocation,
        latitude: carpool.pickupCoordinates?.latitude || 33.6844,
        longitude: carpool.pickupCoordinates?.longitude || 73.0479
      },

      destination: {
        station: carpool.destinationStation
      },

      departure: {
        time: carpool.departureTime,
        flexibility: carpool.flexibilityMinutes || 30,
        flexibilityUnit: 'minutes'
      },

      vehicle: {
        model: carpool.vehicleModel || 'Honda City',
        type: carpool.vehicleType || 'Sedan'
      },

      seats: {
        total: carpool.totalSeats || 5,
        available: carpool.availableSeats,
        booked:
          (carpool.totalSeats || 5) -
          carpool.availableSeats,

        genderTaggedBookings: {
          male: 1,
          female: 1
        }
      },

      pricing: {
        baseFare: carpool.baseFare || 500,

        luggageSurcharge:
          carpool.extraLuggageCharge || 0
      },

      luggagePolicy:
        carpool.luggagePolicy || 'NONE',

      smokingPreference:
        carpool.smokingPreference || 'NO_SMOKING',

      paymentMethods:
        carpool.paymentMethods || ['CASH'],

      genderRestriction:
        carpool.genderPreference || 'ANY',

      seatAvailability:
        `${carpool.availableSeats}/${carpool.totalSeats || 5}`,

      ranking: {
        routeMatchScore:
          carpool.routeMatchScore,

        timeProximity:
          carpool.timeProximity,

        driverRating:
          carpool.driverRating,

        verificationStrength:
          carpool.verificationScore
      }
    }));

    sendJson(res, 200, {
      success: true,

      pagination: {
        page,
        limit,
        totalResults: filteredCarpools.length,
        totalPages: Math.ceil(
          filteredCarpools.length / limit
        )
      },

      filters: {
        pickup,
        destination,
        travelDate,
        genderPreference,
        vehicleType,
        minFare,
        maxFare
      },

      results
    });

    return;
  }

  /*
  =========================================================
   STORE VEHICLE & SEAT AVAILABILITY API
   POST /api/carpool/vehicle
  =========================================================
  */

  if (req.method === 'POST' && req.url === '/api/carpool/vehicle') {

    console.log('✓✓✓ VEHICLE ENDPOINT HIT ✓✓✓');
    console.log('req.body:', req.body);
    console.log('typeof req.body:', typeof req.body);

    const user = authenticateUser(req, res);
    if (!user) {
      console.log('Auth failed');
      return;
    }

    try {

      const data = req.body;

      /*
      =========================================================
       REQUIRED FIELDS
      =========================================================
      */

      const requiredFields = [
        'draftId',
        'vehicleCategory',
        'vehicleType',
        'vehicleModel',
        'registrationNumber'
      ];

      const missingFields = validateFields(
        data,
        requiredFields
      );

      if (missingFields.length > 0) {

        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          details: {
            missingFields
          }
        });

        return;
      }

      /*
      =========================================================
       FIND DRAFT
      =========================================================
      */

      const draft = draftCarpoolOffers.find(
        d =>
          d.draftId === data.draftId &&
          d.userId === user.id
      );

      if (!draft) {

        sendJson(res, 404, {
          success: false,
          message: 'Draft carpool not found'
        });

        return;
      }

      /*
      =========================================================
       DRAFT MUST NOT BE ACTIVE
      =========================================================
      */

      if (draft.status === 'ACTIVE') {

        sendJson(res, 400, {
          success: false,
          message: 'Cannot modify published carpool'
        });

        return;
      }

      /*
      =========================================================
       VALIDATE VEHICLE CATEGORY
      =========================================================
      */

      const allowedCategories = [
        'CAR',
        'BIKE'
      ];

      if (
        !allowedCategories.includes(
          data.vehicleCategory
        )
      ) {

        sendJson(res, 400, {
          success: false,
          message:
            'vehicleCategory must be CAR or BIKE'
        });

        return;
      }

      /*
      =========================================================
       VALIDATE VEHICLE TYPE
      =========================================================
      */

      const allowedVehicleTypes = [
        'Economy',
        'Standard',
        'SUV/Van',
        'Premium'
      ];

      if (
        !allowedVehicleTypes.includes(
          data.vehicleType
        )
      ) {

        sendJson(res, 400, {
          success: false,
          message:
            'Invalid vehicleType'
        });

        return;
      }

      /*
      =========================================================
       REGISTRATION NUMBER VALIDATION
       Example:
       ABC-123
       LEA-20-1234
      =========================================================
      */

      const registrationRegex =
        /^[A-Z0-9-]{5,15}$/i;

      if (
        !registrationRegex.test(
          data.registrationNumber
        )
      ) {

        sendJson(res, 400, {
          success: false,
          message:
            'Invalid registration number format'
        });

        return;
      }

      /*
      =========================================================
       SEAT LAYOUTS
      =========================================================
      */

      const allowedCarSeats = [
        'FP',
        'B1',
        'B2',
        'B3',
        'B4'
      ];

      /*
      =========================================================
       BIKE RULES
      =========================================================
      */

      let selectedSeats = [];

      if (
        data.vehicleCategory === 'BIKE'
      ) {

        // Auto assign single passenger seat
        selectedSeats = ['P1'];

      } else {

        /*
        =========================================================
         CAR VALIDATIONS
        =========================================================
        */

        if (
          !Array.isArray(data.selectedSeats) ||
          data.selectedSeats.length === 0
        ) {

          sendJson(res, 400, {
            success: false,
            message:
              'At least 1 seat is required for CAR'
          });

          return;
        }

        /*
        =========================================================
         INVALID SEAT VALIDATION
        =========================================================
        */

        const invalidSeats =
          data.selectedSeats.filter(
            seat =>
              !allowedCarSeats.includes(
                seat
              )
          );

        if (
          invalidSeats.length > 0
        ) {

          sendJson(res, 400, {
            success: false,
            message:
              'Invalid seat selection',
            invalidSeats
          });

          return;
        }

        /*
        =========================================================
         REMOVE DUPLICATES
        =========================================================
        */

        selectedSeats =
          [...new Set(data.selectedSeats)];

        /*
        =========================================================
         MAX SEAT LIMIT
        =========================================================
        */

        if (
          selectedSeats.length >
          allowedCarSeats.length
        ) {

          sendJson(res, 400, {
            success: false,
            message:
              'Selected seats exceed vehicle capacity'
          });

          return;
        }
      }

      /*
      =========================================================
       UPDATE DRAFT
      =========================================================
      */

      draft.vehicleCategory =
        data.vehicleCategory;

      draft.vehicleType =
        data.vehicleType;

      draft.vehicleModel =
        data.vehicleModel;

      draft.registrationNumber =
        data.registrationNumber;

      draft.selectedSeats =
        selectedSeats;

      draft.totalSeats =
        selectedSeats.length;

      draft.availableSeats =
        selectedSeats.length;

      draft.updatedAt =
        new Date().toISOString();

      /*
      =========================================================
       RESPONSE
      =========================================================
      */

      sendJson(res, 200, {
        success: true,
        message:
          'Vehicle & seat configuration saved successfully',

        draft: {
          draftId: draft.draftId,

          vehicleCategory:
            draft.vehicleCategory,

          vehicleType:
            draft.vehicleType,

          vehicleModel:
            draft.vehicleModel,

          registrationNumber:
            draft.registrationNumber,

          selectedSeats:
            draft.selectedSeats,

          totalSeats:
            draft.totalSeats,

          availableSeats:
            draft.availableSeats,

          status:
            draft.status
        }
      });

    } catch (error) {

      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        error: error.message
      });
    }

    return;

    return;
  }

  /*
  =========================================================
   GET ALL CARPOOLS
   GET /api/carpool/list
  =========================================================
  */
  if (req.method === 'GET' && req.url === '/api/carpool/list') {
    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed = enforceUserRestrictions(user, req, res);
    if (!allowed) return;

    const activeCarpools = carpools.filter((c) => c.status === 'ACTIVE');

    sendJson(res, 200, {
      success: true,
      total: activeCarpools.length,
      carpools: activeCarpools.map((carpool) => {
        const driver = usersModel.find(u => u.userId === carpool.userId);
        const verificationData = buildVerificationBadges(carpool.userId);
        const verificationStatus = getVerificationStatus(carpool.userId);

        return {
          ...carpool,
          verificationCount: verificationData.verificationCount,
          verificationBadges: verificationData.verificationBadges,
          isUnverified: verificationStatus.isUnverified,
          showUnverifiedWarning: verificationStatus.showUnverifiedWarning,
          verificationLevel: verificationStatus.verificationLevel,
          verification: driver ? {
            phone_verified: driver.verificationStatuses.phone_verified,
            email_verified: driver.verificationStatuses.email_verified,
            cnic_verified: driver.verificationStatuses.cnic_verified,
            police_verified: driver.verificationStatuses.police_verified,
            bank_verified: driver.verificationStatuses.bank_verified,
            linkedin_verified: driver.verificationStatuses.linkedin_verified,
            verificationScore: driver.verificationScore,
            highlyVerified: driver.highlyVerified,
          } : {}
        };
      }),
    });

    return;
  }

  /*
  =========================================================
   SEARCH CARPOOLS WITH GENDER FILTERING
   GET /api/carpool/search
  =========================================================
  */
  if (req.method === 'GET' && req.url.startsWith('/api/carpool/search')) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed = enforceUserRestrictions(user, req, res);
    if (!allowed) return;

    const visibleCarpools = carpools.filter((carpool) => {
      // Hide female-only carpools from non-female users
      if (
        carpool.genderPreference === 'FEMALE_ONLY' &&
        user.gender !== 'female'
      ) {
        return false;
      }

      // Hide male-only carpools from non-male users
      if (
        carpool.genderPreference === 'MALE_ONLY' &&
        user.gender !== 'male'
      ) {
        return false;
      }

      return true;
    });

    // Add verification score to each carpool
    const carpoolsWithScores = visibleCarpools.map((carpool) => {
      const driver = usersModel.find(u => u.userId === carpool.userId);
      const driverVerification = verifications.find(
        (v) => v.userId === carpool.userId
      );

      const verificationDetails = driverVerification
        ? getVerificationDetails(driverVerification)
        : {
            verificationScore: 0,
            totalVerifications: 6,
            highlyVerified: false
          };

      const verificationData = buildVerificationBadges(carpool.userId);
      const verificationStatus = getVerificationStatus(carpool.userId);

      return {
        ...carpool,
        verificationScore: `${verificationDetails.verificationScore}/${verificationDetails.totalVerifications}`,
        highlyVerified: verificationDetails.highlyVerified,
        verificationBadge: verificationDetails.highlyVerified ? 'GREEN_SHIELD' : null,
        verificationCount: verificationData.verificationCount,
        verificationBadges: verificationData.verificationBadges,
        isUnverified: verificationStatus.isUnverified,
        showUnverifiedWarning: verificationStatus.showUnverifiedWarning,
        verificationLevel: verificationStatus.verificationLevel,
        verification: driver ? {
          phone_verified: driver.verificationStatuses.phone_verified,
          email_verified: driver.verificationStatuses.email_verified,
          cnic_verified: driver.verificationStatuses.cnic_verified,
          police_verified: driver.verificationStatuses.police_verified,
          bank_verified: driver.verificationStatuses.bank_verified,
          linkedin_verified: driver.verificationStatuses.linkedin_verified,
          verificationScore: driver.verificationScore,
          highlyVerified: driver.highlyVerified,
        } : {}
      };
    });

    // Sort by highly verified first, then by other factors
    carpoolsWithScores.sort((a, b) => {
      if (a.highlyVerified !== b.highlyVerified) {
        return b.highlyVerified ? 1 : -1;
      }
      return 0;
    });

    sendJson(res, 200, {
      success: true,
      totalResults: carpoolsWithScores.length,
      carpools: carpoolsWithScores,
    });

    return;
  }

  /*
  =========================================================
   MATCH ROUTES
   POST /api/match/route
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/match/route') {
    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed = enforceUserRestrictions(user, req, res);
    if (!allowed) return;

    try {
      const data = req.body;

      const missingFields = validateFields(data, ['pickupLocation', 'destinationStation']);
      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Find matching carpools based on pickup and destination
      const matchedRoutes = carpools.filter((carpool) => {
        const pickupMatch = carpool.pickupLocation.toLowerCase().includes(data.pickupLocation.toLowerCase());
        const destinationMatch = carpool.destinationStation.toLowerCase().includes(data.destinationStation.toLowerCase());
        
        return pickupMatch && destinationMatch && carpool.status === 'ACTIVE';
      });

      // Filter by gender preference for current user
      const visibleRoutes = matchedRoutes.filter((route) => {
        if (route.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
          return false;
        }
        if (route.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
          return false;
        }
        return true;
      });

      sendJson(res, 200, {
        success: true,
        pickupLocation: data.pickupLocation,
        destinationStation: data.destinationStation,
        matchedCount: visibleRoutes.length,
        routes: visibleRoutes.map((route) => ({
          offerId: route.offerId,
          driverName: route.driverName,
          pickupLocation: route.pickupLocation,
          destinationStation: route.destinationStation,
          travelDate: route.travelDate,
          departureTime: route.departureTime,
          availableSeats: route.availableSeats,
          genderPreference: route.genderPreference,
          travelPreferences: route.travelPreferences,
        })),
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   MATCH CARPOOLS BY TIME
   POST /api/match/time
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/match/time') {
    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed = enforceUserRestrictions(user, req, res);
    if (!allowed) return;

    try {
      const data = req.body;

      const missingFields = validateFields(data, ['travelDate', 'departureTime']);
      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Validate date format
      const travelDate = new Date(data.travelDate);
      if (isNaN(travelDate.getTime())) {
        sendJson(res, 400, { success: false, message: 'Invalid travelDate format. Use YYYY-MM-DD' });
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(data.departureTime)) {
        sendJson(res, 400, { success: false, message: 'Invalid departureTime format. Use HH:MM (24-hour)' });
        return;
      }

      // Find matching carpools by date and time
      const matchedByTime = carpools.filter((carpool) => {
        const dateMatch = carpool.travelDate === data.travelDate;
        const timeMatch = carpool.departureTime === data.departureTime;
        
        return dateMatch && timeMatch && carpool.status === 'ACTIVE';
      });

      // Filter by gender preference for current user
      const visibleTimeRoutes = matchedByTime.filter((route) => {
        if (route.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
          return false;
        }
        if (route.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
          return false;
        }
        return true;
      });

      sendJson(res, 200, {
        success: true,
        travelDate: data.travelDate,
        departureTime: data.departureTime,
        matchedCount: visibleTimeRoutes.length,
        routes: visibleTimeRoutes.map((route) => ({
          offerId: route.offerId,
          driverName: route.driverName,
          pickupLocation: route.pickupLocation,
          destinationStation: route.destinationStation,
          travelDate: route.travelDate,
          departureTime: route.departureTime,
          availableSeats: route.availableSeats,
          genderPreference: route.genderPreference,
          travelPreferences: route.travelPreferences,
        })),
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   GET SINGLE CARPOOL
   GET /api/carpool/:offerId
  =========================================================
  */
  const carpoolDetailMatch = req.url.match(/^\/api\/carpool\/(\d+)$/);
  if (req.method === 'GET' && carpoolDetailMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const offerId = parseInt(carpoolDetailMatch[1]);
    const carpool = carpools.find((c) => c.offerId === offerId);

    if (!carpool) {
      sendJson(res, 404, { success: false, message: 'Carpool not found' });
      return;
    }

    const driver = usersModel.find(u => u.userId === carpool.userId);
    const verificationData = buildVerificationBadges(carpool.userId);
    const verificationStatus = getVerificationStatus(carpool.userId);

    sendJson(res, 200, {
      success: true,
      carpool: {
        ...carpool,
        verificationCount: verificationData.verificationCount,
        verificationBadges: verificationData.verificationBadges,
        isUnverified: verificationStatus.isUnverified,
        showUnverifiedWarning: verificationStatus.showUnverifiedWarning,
        verificationLevel: verificationStatus.verificationLevel,
        verification: driver ? {
          phone_verified: driver.verificationStatuses.phone_verified,
          email_verified: driver.verificationStatuses.email_verified,
          cnic_verified: driver.verificationStatuses.cnic_verified,
          police_verified: driver.verificationStatuses.police_verified,
          bank_verified: driver.verificationStatuses.bank_verified,
          linkedin_verified: driver.verificationStatuses.linkedin_verified,
          verificationScore: driver.verificationScore,
          highlyVerified: driver.highlyVerified,
        } : {}
      }
    });
    return;
  }

  /*
  =========================================================
   JOIN REQUEST
   POST /api/carpool/join-request
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/carpool/join-request') {
    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed = enforceUserRestrictions(user, req, res);
    if (!allowed) return;

    if (!requireVerification(user, res, 'joining a carpool')) return;

    try {
      const data = req.body;

      const missingFields = validateFields(data, ['carpoolId', 'message']);
      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Find carpool
      const carpool = carpools.find((c) => c.offerId === data.carpoolId);
      if (!carpool) {
        sendJson(res, 404, { success: false, message: 'Carpool not found' });
        return;
      }

      // Carpool must be active
      if (carpool.status !== 'ACTIVE') {
        sendJson(res, 400, { success: false, message: 'This carpool is no longer active' });
        return;
      }

      // Prevent joining own carpool
      if (carpool.userId === user.id) {
        sendJson(res, 400, { success: false, message: 'You cannot join your own carpool' });
        return;
      }

      // Duplicate request check
      const existingRequest = joinRequests.find(
        (r) => r.userId === user.id && r.carpoolId === data.carpoolId
      );
      if (existingRequest) {
        sendJson(res, 400, { success: false, message: 'You have already requested to join this carpool' });
        return;
      }

      // Seat availability
      if (carpool.availableSeats <= 0) {
        sendJson(res, 400, { success: false, message: 'No seats available in this carpool' });
        return;
      }

      // Gender restriction check
      if (carpool.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
        auditLogs.push({
          userId: user.id,
          action: 'JOIN_BLOCKED',
          reason: 'Female only restriction',
          carpoolId: data.carpoolId,
          createdAt: new Date().toISOString(),
        });
        sendJson(res, 403, { success: false, message: 'This carpool is restricted to female users only' });
        return;
      }

      if (carpool.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
        auditLogs.push({
          userId: user.id,
          action: 'JOIN_BLOCKED',
          reason: 'Male only restriction',
          carpoolId: data.carpoolId,
          createdAt: new Date().toISOString(),
        });
        sendJson(res, 403, { success: false, message: 'This carpool is restricted to male users only' });
        return;
      }

      // Create join request
      const joinRequest = {
        requestId: joinRequests.length + 1,
        carpoolId: data.carpoolId,
        userId: user.id,
        userName: user.name,
        message: data.message,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      joinRequests.push(joinRequest);

      sendJson(res, 201, {
        success: true,
        message: 'Join request submitted successfully',
        requestId: joinRequest.requestId,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   ACCEPT / REJECT JOIN REQUEST
   POST /api/carpool/join-request/:requestId/respond
  =========================================================
  */
  const respondMatch = req.url.match(/^\/api\/carpool\/join-request\/(\d+)\/respond$/);
  if (req.method === 'POST' && respondMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;
      const requestId = parseInt(respondMatch[1]);

      if (!data.action || !['ACCEPT', 'REJECT'].includes(data.action)) {
        sendJson(res, 400, { success: false, message: 'action must be either ACCEPT or REJECT' });
        return;
      }

      const joinRequest = joinRequests.find((r) => r.requestId === requestId);
      if (!joinRequest) {
        sendJson(res, 404, { success: false, message: 'Join request not found' });
        return;
      }

      if (joinRequest.status !== 'PENDING') {
        sendJson(res, 400, { success: false, message: `Request already ${joinRequest.status.toLowerCase()}` });
        return;
      }

      const carpool = carpools.find((c) => c.offerId === joinRequest.carpoolId);

      // Only carpool owner can respond
      if (!carpool || carpool.userId !== user.id) {
        sendJson(res, 403, { success: false, message: 'You are not authorized to respond to this request' });
        return;
      }

      joinRequest.status = data.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
      joinRequest.respondedAt = new Date().toISOString();

      if (data.action === 'ACCEPT') {
        carpool.availableSeats -= 1;
        if (carpool.availableSeats === 0) {
          carpool.status = 'FULL';
        }
      }

      sendJson(res, 200, {
        success: true,
        message: `Join request ${joinRequest.status.toLowerCase()} successfully`,
        requestId,
        newStatus: joinRequest.status,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   ASSIGN DRIVER TO TRIP
   POST /api/driver/assign-trip
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/driver/assign-trip') {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (!requireVerification(user, res, 'assigning a trip')) return;

    try {
      const data = req.body;

      const requiredFields = ['tripId', 'pickupLocation', 'destination', 'estimatedEarnings', 'route', 'requiredSeats'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Validate route is an array
      if (!Array.isArray(data.route) || data.route.length === 0) {
        sendJson(res, 400, { success: false, message: 'route must be a non-empty array of stops' });
        return;
      }

      // Duplicate assignment check
      const existingAssignment = tripAssignments.find((t) => t.tripId === data.tripId);
      if (existingAssignment) {
        sendJson(res, 400, { success: false, message: 'This trip has already been assigned to a driver' });
        return;
      }

      const assignment = {
        assignmentId: tripAssignments.length + 1,
        tripId: data.tripId,
        driverId: user.id,
        driverName: user.name,
        pickupLocation: data.pickupLocation,
        destination: data.destination,
        estimatedEarnings: data.estimatedEarnings,
        route: data.route,
        requiredSeats: data.requiredSeats,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      tripAssignments.push(assignment);

      sendJson(res, 200, {
        success: true,
        message: 'Trip assigned to driver successfully',
        assignment,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   START TRIP
   POST /api/trip/start
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/trip/start') {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (!requireVerification(user, res, 'starting a trip')) return;

    try {
      const data = req.body;

      if (!data.tripId) {
        sendJson(res, 400, { success: false, message: 'tripId is required' });
        return;
      }

      // Find assignment and update status
      const assignment = tripAssignments.find((t) => t.tripId === data.tripId);

      if (!assignment) {
        sendJson(res, 404, { success: false, message: 'Trip assignment not found' });
        return;
      }

      if (assignment.status === 'IN_PROGRESS') {
        sendJson(res, 400, { success: false, message: 'Trip is already in progress' });
        return;
      }

      if (assignment.status === 'COMPLETED') {
        sendJson(res, 400, { success: false, message: 'Trip has already been completed' });
        return;
      }

      assignment.status = 'IN_PROGRESS';
      assignment.startedAt = new Date().toISOString();

      sendJson(res, 200, {
        success: true,
        message: 'Trip started successfully',
        tripId: data.tripId,
        startedAt: assignment.startedAt,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    return;
  }

  /*
  =========================================================
   END TRIP
   POST /api/trip/end
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/trip/end') {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (!requireVerification(user, res, 'ending a trip')) return;

    try {
      const data = req.body;

      if (!data.tripId) {
        sendJson(res, 400, { success: false, message: 'tripId is required' });
        return;
      }

      const assignment = tripAssignments.find((t) => t.tripId === data.tripId);

      if (!assignment) {
        sendJson(res, 404, { success: false, message: 'Trip assignment not found' });
        return;
      }

      if (assignment.status !== 'IN_PROGRESS') {
        sendJson(res, 400, { success: false, message: 'Trip is not currently in progress' });
        return;
      }

      assignment.status = 'COMPLETED';
      assignment.completedAt = new Date().toISOString();

      sendJson(res, 200, {
        success: true,
        message: 'Trip ended successfully',
        tripId: data.tripId,
        completedAt: assignment.completedAt,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    return;
  }

  /*
  =========================================================
   GET TRIP STATUS
   GET /api/trip/:tripId/status
  =========================================================
  */
  const tripStatusMatch = req.url.match(/^\/api\/trip\/([^/]+)\/status$/);
  if (req.method === 'GET' && tripStatusMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const tripId = tripStatusMatch[1];
    const assignment = tripAssignments.find((t) => String(t.tripId) === tripId);

    if (!assignment) {
      sendJson(res, 404, { success: false, message: 'Trip not found' });
      return;
    }

    sendJson(res, 200, {
      success: true,
      tripId,
      status: assignment.status,
      driverName: assignment.driverName,
      pickupLocation: assignment.pickupLocation,
      destination: assignment.destination,
      route: assignment.route,
      requiredSeats: assignment.requiredSeats,
      startedAt: assignment.startedAt || null,
      completedAt: assignment.completedAt || null,
      etaMinutes: assignment.status === 'IN_PROGRESS' ? 10 : null,
      driverLocation: assignment.status === 'IN_PROGRESS'
        ? { latitude: 33.6844, longitude: 73.0479 }
        : null,
    });

    return;
  }

  /*
  =========================================================
   GET TRIP CONTACT INFO
   GET /api/trip/contact/:tripId
  =========================================================
  */
  const tripContactMatch = req.url.match(/^\/api\/trip\/contact\/([^/]+)$/);
  if (req.method === 'GET' && tripContactMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const tripId = tripContactMatch[1];

    // Mock contact information with privacy protection
    // Note: In a real app, this would check trip status and timing
    sendJson(res, 200, {
      success: true,
      releaseWindowMinutes: 30,
      minutesRemaining: 120,
      riderPhone: "*******4567",
      driverPhone: "*******4567"
    });

    return;
  }

  /*
  =========================================================
   SUBMIT RATING & REVIEW
   POST /api/trip/review
  =========================================================
  */
  if (req.method === 'POST' &&
      req.url === '/api/trip/review') {

    const user = authenticateUser(req, res);
    if (!user) return;

    const allowed =
      enforceUserRestrictions(user, req, res);

    if (!allowed) return;

    try {

      const data = req.body;

      /*
      =========================================
       Required Fields Validation
      =========================================
      */
      const requiredFields = [
        'trip_id',
        'driver_rating'
      ];

      const missingFields =
        validateFields(data, requiredFields);

      if (missingFields.length > 0) {

        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });

        return;
      }

      /*
      =========================================
       Validate Ratings
      =========================================
      */
      const driverRating =
        Number(data.driver_rating);

      if (
        isNaN(driverRating) ||
        driverRating < 1 ||
        driverRating > 5
      ) {

        sendJson(res, 400, {
          success: false,
          message:
            'driver_rating must be between 1 and 5',
        });

        return;
      }

      if (data.co_rider_rating !== undefined) {

        const coRiderRating =
          Number(data.co_rider_rating);

        if (
          isNaN(coRiderRating) ||
          coRiderRating < 1 ||
          coRiderRating > 5
        ) {

          sendJson(res, 400, {
            success: false,
            message:
              'co_rider_rating must be between 1 and 5',
          });

          return;
        }
      }

      /*
      =========================================
       Trip Validation
      =========================================
      */
      const trip = tripAssignments.find(
        (t) =>
          String(t.tripId) ===
          String(data.trip_id)
      );

      if (!trip) {

        sendJson(res, 404, {
          success: false,
          message: 'Trip not found',
        });

        return;
      }

      /*
      =========================================
       Trip Must Be Completed
      =========================================
      */
      if (trip.status !== 'COMPLETED') {

        sendJson(res, 400, {
          success: false,
          message:
            'Ratings allowed only after trip completion',
        });

        return;
      }

      /*
      =========================================
       Prevent Duplicate Reviews
      =========================================
      */
      const existingReview =
        tripReviews.find(
          (r) =>
            r.trip_id === data.trip_id &&
            r.reviewedBy === user.userId
        );

      if (existingReview) {

        sendJson(res, 400, {
          success: false,
          message:
            'You already submitted review for this trip',
        });

        return;
      }

      /*
      =========================================
       Create Review
      =========================================
      */
      const review = {

        reviewId:
          tripReviews.length + 1,

        trip_id: data.trip_id,

        reviewedBy: user.userId,

        driverId: trip.driverId,

        driver_rating: driverRating,

        co_rider_rating:
          data.co_rider_rating || null,

        comment:
          data.comment || '',

        moderationFlagged: false,

        createdAt:
          new Date().toISOString(),
      };

      /*
      =========================================
       Moderation Flagging
      =========================================
      */
      const flaggedWords = [
        'fraud',
        'abuse',
        'scam',
        'unsafe',
        'harassment'
      ];

      if (review.comment) {

        const lowerComment =
          review.comment.toLowerCase();

        const hasFlaggedContent =
          flaggedWords.some((word) =>
            lowerComment.includes(word)
          );

        if (hasFlaggedContent) {

          review.moderationFlagged = true;

          moderationFlags.push({
            flagId:
              moderationFlags.length + 1,

            reviewId: review.reviewId,

            trip_id: review.trip_id,

            comment: review.comment,

            flaggedAt:
              new Date().toISOString(),
          });
        }
      }

      /*
      =========================================
       Save Review
      =========================================
      */
      tripReviews.push(review);

      /*
      =========================================
       Update Driver Rating
      =========================================
      */
      const driver =
        users.find(
          (u) =>
            u.userId === trip.driverId
        );

      if (driver) {

        driver.averageDriverRating =
          calculateAverage(
            driver.averageDriverRating,
            driver.totalDriverRatings,
            driverRating
          );

        driver.totalDriverRatings += 1;
      }

      /*
      =========================================
       Update Co-rider Trust Score
      =========================================
      */
      if (
        data.co_rider_rating !== undefined
      ) {

        user.coRiderTrustScore =
          calculateAverage(
            user.coRiderTrustScore,
            user.totalCoRiderRatings,
            data.co_rider_rating
          );

        user.totalCoRiderRatings += 1;
      }

      /*
      =========================================
       Response
      =========================================
      */
      sendJson(res, 201, {
        success: true,
        message:
          'Rating & review submitted successfully',

        review: {
          reviewId: review.reviewId,
          trip_id: review.trip_id,
          driver_rating:
            review.driver_rating,
          co_rider_rating:
            review.co_rider_rating,
          moderationFlagged:
            review.moderationFlagged,
        },
      });

    } catch (error) {

      sendJson(res, 400, {
        success: false,
        error: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   GET AUDIT LOGS (Admin)
   GET /api/admin/audit-logs
  =========================================================
  */
  if (req.method === 'GET' && req.url === '/api/admin/audit-logs') {
    const user = authenticateUser(req, res);
    if (!user) return;

    sendJson(res, 200, {
      success: true,
      total: auditLogs.length,
      logs: auditLogs,
    });

    return;
  }

  /*
  =========================================================
   RATE TRIP
   POST /api/trip/rate
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/trip/rate') {
    const user = authenticateUser(req, res);
    if (!user) return;

    if (!requireVerification(user, res, 'rating a trip')) return;

    try {
      const data = req.body;

      const requiredFields = ['tripId', 'targetUserId', 'rating'];
      const missingFields = requiredFields.filter((field) => !(field in data));

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          error: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Validate rating range (1-5)
      if (data.rating < 1 || data.rating > 5) {
        sendJson(res, 400, {
          success: false,
          message: 'Rating must be between 1 and 5',
        });
        return;
      }

      // Check if trip is completed (ratings only allowed after completion)
      const tripAssignment = tripAssignments.find((t) => String(t.tripId) === String(data.tripId));
      if (!tripAssignment || tripAssignment.status !== 'COMPLETED') {
        sendJson(res, 400, {
          success: false,
          message: 'Ratings allowed only after trip completion',
        });
        return;
      }

      // Check for duplicate rating (user already rated this trip)
      const existingRating = ratings.find(
        (r) => r.tripId === data.tripId && r.fromUserId === user.id
      );

      if (existingRating) {
        sendJson(res, 400, {
          success: false,
          message: 'You have already submitted a rating for this trip',
        });
        return;
      }

      // Mock rating storage (in a real app, this would be saved to database)
      const rating = {
        ratingId: Date.now(), // Simple ID generation
        tripId: data.tripId,
        fromUserId: user.id,
        targetUserId: data.targetUserId,
        rating: data.rating,
        comment: data.comment || '',
        issueReported: data.issueReported || '',
        createdAt: new Date(),
      };

      // Store the rating
      ratings.push(rating);

      console.log('Trip rating submitted:', rating);

      sendJson(res, 201, {
        success: true,
        message: 'Rating submitted successfully',
        ratingId: rating.ratingId,
      });

    } catch (error) {
      sendJson(res, 400, {
        success: false,
        error: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   ADMIN DASHBOARD
   GET /api/admin/dashboard
  =========================================================
  */
  if (req.method === 'GET' && req.url.startsWith('/api/admin/dashboard')) {
    const user = authenticateUser(req, res);
    if (!user) return;

    // Parse query parameters for date filters
    const urlObj = new URL(req.url, 'http://localhost');
    const startDateParam = urlObj.searchParams.get('startDate');
    const endDateParam = urlObj.searchParams.get('endDate');

    // Use provided dates or default to last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().setDate(endDate.getDate() - 30));

    // Calculate metrics
    const activePoolsCount = carpools.filter((c) => c.status === 'ACTIVE').length;
    const matchedTripsCount = tripAssignments.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'IN_PROGRESS'
    ).length;
    const cancelledTripsCount = tripAssignments.filter((t) => t.status === 'CANCELLED').length;

    // Calculate average match time (mock calculation)
    const completedTrips = tripAssignments.filter((t) => t.status === 'COMPLETED');
    const averageMatchTimeMinutes = completedTrips.length > 0
      ? Math.round(completedTrips.reduce((sum, t) => sum + 6, 0) / completedTrips.length)
      : 0;

    // Safety incidents (from ratings with issues)
    const safetyIncidentsCount = ratings.filter((r) => r.issueReported).length;

    // Driver status (mock data)
    const availableDrivers = 14;
    const busyDrivers = 6;

    sendJson(res, 200, {
      success: true,
      filters: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      dashboard: {
        activePoolsCount,
        matchedTripsCount,
        cancelledTripsCount,
        averageMatchTimeMinutes,
        safetyIncidentsCount,
        drivers: {
          available: availableDrivers,
          busy: busyDrivers,
        },
      },
    });

    return;
  }

  /*
  =========================================================
   UPLOAD CNIC
   POST /api/user/upload-cnic
  =========================================================
  */
  if (
    req.method === 'POST' &&
    req.url === '/api/user/upload-cnic'
  ) {
    const user = authenticateUser(req, res);
    if (!user) return;

    console.log('[CNIC Upload] Request received for user:', user.id);
    console.log('[CNIC Upload] Content-Type:', req.headers['content-type']);

    upload.fields([
      { name: 'cnicFront', maxCount: 1 },
      { name: 'cnicBack', maxCount: 1 }
    ])(req, res, (error) => {
      if (error) {
        console.error('[CNIC Upload] Multer error:', error.message);
        sendJson(res, 400, {
          success: false,
          message: error.message || 'File upload error'
        });
        return;
      }

      console.log('[CNIC Upload] Files received:', req.files ? Object.keys(req.files) : 'none');

      if (
        !req.files ||
        !req.files.cnicFront ||
        !req.files.cnicBack
      ) {
        console.error('[CNIC Upload] Missing files - cnicFront or cnicBack');
        sendJson(res, 400, {
          success: false,
          message: 'Both cnicFront and cnicBack are required'
        });
        return;
      }

      try {
        const frontFile = req.files.cnicFront[0];
        const backFile = req.files.cnicBack[0];

        console.log('[CNIC Upload] Front file:', frontFile.filename);
        console.log('[CNIC Upload] Back file:', backFile.filename);

        const uploadRecord = {
          uploadId: cnicUploads.length + 1,
          userId: user.id,
          cnicFront: frontFile.filename,
          cnicBack: backFile.filename,
          uploadedAt: new Date().toISOString(),
          status: 'PENDING_REVIEW'
        };

        cnicUploads.push(uploadRecord);

        console.log('[CNIC Upload] Upload successful, record ID:', uploadRecord.uploadId);

        sendJson(res, 201, {
          success: true,
          message: 'CNIC uploaded successfully',
          upload: uploadRecord
        });
      } catch (err) {
        console.error('[CNIC Upload] Processing error:', err.message);
        sendJson(res, 400, {
          success: false,
          message: 'Error processing uploaded files'
        });
      }
    });

    return;
  }

  /*
  =========================================================
   LIVE SELFIE VERIFICATION
   POST /api/user/verify-selfie
  =========================================================
  */
  if (
    req.method === 'POST' &&
    req.url === '/api/user/verify-selfie'
  ) {
    const user = authenticateUser(req, res);

    if (!user) return;

    console.log('[Selfie Verification] Request received for user:', user.id);

    upload.single('selfie')(req, res, (error) => {
      /*
      =========================================
       Multer Errors
      =========================================
      */
      if (error) {
        console.error('[Selfie Verification] Multer error:', error.message);
        sendJson(res, 400, {
          success: false,
          message: error.message
        });
        return;
      }

      /*
      =========================================
       Selfie Required
      =========================================
      */
      if (!req.file) {
        console.error('[Selfie Verification] No selfie file provided');
        sendJson(res, 400, {
          success: false,
          message: 'Selfie image is required'
        });
        return;
      }

      console.log('[Selfie Verification] Selfie file received:', req.file.filename);

      /*
      =========================================
       Find User CNIC Upload
      =========================================
      */
      const cnicRecord = cnicUploads.find(
        (c) => c.userId === user.id
      );

      if (!cnicRecord) {
        console.error('[Selfie Verification] CNIC not found for user:', user.id);
        sendJson(res, 404, {
          success: false,
          message: 'CNIC images not found. Upload CNIC first.'
        });
        return;
      }

      console.log('[Selfie Verification] CNIC record found:', cnicRecord.uploadId);

      /*
      =========================================
       Mock Face Matching Logic
      =========================================

       In production:
       - AWS Rekognition
       - Azure Face API
       - Face++
       - OpenCV
       - TensorFlow

      =========================================
      */

      let matchResult = 'FAIL';
      let confidenceScore = 45;

      /*
      =========================================
       MOCK AI MATCHING
      =========================================
      */
      if (
        req.file.originalname
          .toLowerCase()
          .includes('match')
      ) {
        matchResult = 'PASS';
        confidenceScore = 92;
      }

      console.log('[Selfie Verification] Match result:', matchResult, '- Confidence:', confidenceScore);

      /*
      =========================================
       Store Verification Result
      =========================================
      */
      const verificationResult = {
        verificationId: selfieVerifications.length + 1,
        userId: user.id,
        selfieImage: req.file.filename,
        cnicFrontImage: cnicRecord.cnicFront,
        matchResult,
        confidenceScore,
        verified: matchResult === 'PASS',
        createdAt: new Date().toISOString()
      };

      selfieVerifications.push(verificationResult);

      console.log('[Selfie Verification] Result stored with ID:', verificationResult.verificationId);

      /*
      =========================================
       Update User Verification Status
      =========================================
      */
      const userVerification = verifications.find(
        (v) => v.userId === user.id
      );

      if (
        userVerification &&
        matchResult === 'PASS'
      ) {
        userVerification.cnic = 'verified';
        console.log('[Selfie Verification] User verification status updated to VERIFIED');
      }

      /*
      =========================================
       Return Response
      =========================================
      */
      sendJson(res, 200, {
        success: matchResult === 'PASS',
        message:
          matchResult === 'PASS'
            ? 'Face matched successfully'
            : 'Face match failed',
        verification: {
          verificationId: verificationResult.verificationId,
          matchResult,
          confidenceScore,
          verified: verificationResult.verified
        }
      });
    });

    return;
  }

  /*
  =========================================================
   POLICE DOCUMENT UPLOAD
   POST /api/user/upload-police-document
  =========================================================
  */

  if (req.method === 'POST' && req.url === '/api/user/upload-police-document') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      // Required fields
      const requiredFields = ['fileName', 'fileType', 'fileSize'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Allowed file types
      const allowedTypes = ['pdf', 'jpg', 'png'];

      if (!allowedTypes.includes(data.fileType.toLowerCase())) {
        sendJson(res, 400, {
          success: false,
          message: 'Only PDF, JPG, PNG files are allowed',
        });
        return;
      }

      // File size validation (5MB max)
      const maxSize = 5 * 1024 * 1024;

      if (data.fileSize > maxSize) {
        sendJson(res, 400, {
          success: false,
          message: 'File size exceeds 5MB limit',
        });
        return;
      }

      // Issue date required validation
      if (!data.issueDate) {
        sendJson(res, 400, {
          success: false,
          message: 'issueDate is required',
        });
        return;
      }

      // Validate date format (YYYY-MM-DD)
      const issueDate = new Date(data.issueDate);

      if (isNaN(issueDate.getTime())) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid issueDate format. Use YYYY-MM-DD',
        });
        return;
      }

      // Check if issue date is within last 1 year
      const today = new Date();

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      if (issueDate < oneYearAgo) {
        sendJson(res, 400, {
          success: false,
          message: 'Police verification document must be issued within the last 1 year',
        });
        return;
      }

      // Future date validation
      if (issueDate > today) {
        sendJson(res, 400, {
          success: false,
          message: 'Issue date cannot be in the future',
        });
        return;
      }

      // Save document
      const document = {
        documentId: policeDocuments.length + 1,
        userId: user.id,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        issueDate: data.issueDate,
        status: 'PENDING_REVIEW',
        uploadedAt: new Date().toISOString(),
        reviewDeadline: new Date(
          Date.now() + 48 * 60 * 60 * 1000
        ).toISOString(),
      };

      policeDocuments.push(document);

      sendJson(res, 201, {
        success: true,
        message: 'Police verification document uploaded successfully',
        document,
      });

    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   ADMIN REVIEW POLICE VERIFICATION
   POST /api/admin/review-police-document
  =========================================================
  */

  if (req.method === 'POST' && req.url === '/api/admin/review-police-document') {

    const user = authenticateUser(req, res);
    if (!user) return;

    // Admin check
    if (user.role !== 'admin') {
      sendJson(res, 403, {
        success: false,
        message: 'Admin access only',
      });
      return;
    }

    try {
      const data = req.body;

      const requiredFields = ['documentId', 'action'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      const document = policeDocuments.find(
        (d) => d.documentId === data.documentId
      );

      if (!document) {
        sendJson(res, 404, {
          success: false,
          message: 'Document not found',
        });
        return;
      }

      // Validate action
      if (!['APPROVED', 'REJECTED'].includes(data.action)) {
        sendJson(res, 400, {
          success: false,
          message: 'Action must be APPROVED or REJECTED',
        });
        return;
      }

      // Update status
      document.status = data.action;
      document.reviewedAt = new Date().toISOString();
      document.reviewedBy = user.id;

      // Mock notification
      const notification = {
        userId: document.userId,
        message:
          data.action === 'APPROVED'
            ? 'Your police verification has been approved'
            : 'Your police verification has been rejected',
        createdAt: new Date().toISOString(),
      };

      sendJson(res, 200, {
        success: true,
        message: `Police verification ${data.action.toLowerCase()} successfully`,
        document,
        notification,
      });

    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   GET POLICE REVIEW QUEUE
   GET /api/admin/police-review-queue
  =========================================================
  */

  if (
    req.method === 'GET' &&
    req.url === '/api/admin/police-review-queue'
  ) {

    const user = authenticateUser(req, res);
    if (!user) return;

    if (user.role !== 'admin') {
      sendJson(res, 403, {
        success: false,
        message: 'Admin access only',
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      total: policeDocuments.length,
      documents: policeDocuments,
    });

    return;
  }

  /*
  =========================================================
   ADMIN DASHBOARD AGGREGATION
   GET /api/admin/dashboard-aggregation
  =========================================================
  */

  if (
    req.method === 'GET' &&
    req.url === '/api/admin/dashboard-aggregation'
  ) {

    const user = authenticateUser(req, res);
    if (!user) return;

    // Admin-only access
    if (user.role !== 'admin') {
      sendJson(res, 403, {
        success: false,
        message: 'Unauthorized access',
      });
      return;
    }

    // Today's date
    const today = new Date().toISOString().split('T')[0];

    /*
    =========================================
     Active Pools Today
    =========================================
    */
    const activePoolsToday = carpools.filter((pool) => {
      return (
        pool.status === 'ACTIVE' &&
        pool.createdAt.startsWith(today)
      );
    }).length;

    /*
    =========================================
     Matched Trips Today
    =========================================
    */
    const matchedPairsToday = tripAssignments.filter((trip) => {
      return (
        ['IN_PROGRESS', 'COMPLETED'].includes(trip.status) &&
        trip.createdAt &&
        new Date(trip.createdAt).toISOString().split('T')[0] === today
      );
    }).length;

    /*
    =========================================
     Match Rate %
    =========================================
    */
    const totalTodayRequests = activePoolsToday || 1;

    const matchRate = (
      (matchedPairsToday / totalTodayRequests) * 100
    ).toFixed(2);

    /*
    =========================================
     Verification Queues
    =========================================
    */

    const cnicPending = cnicUploads
      ? cnicUploads.filter((c) => c.status === 'PENDING_REVIEW').length
      : 0;

    const policePending = policeDocuments
      ? policeDocuments.filter((p) => p.status === 'PENDING_REVIEW').length
      : 0;

    const bankCardsPending = bankCardVerifications.filter(
      (b) => b.status === 'PENDING'
    ).length;

    /*
    =========================================
     Complaints
    =========================================
    */

    const pendingComplaints = complaints.filter(
      (c) => c.status === 'PENDING'
    ).length;

    /*
    =========================================
     Blacklist Count
    =========================================
    */

    const activeBlacklistCount = blacklist.length;

    /*
    =========================================
     Payment Disputes
    =========================================
    */

    const paymentDisputeCount = paymentDisputes.filter(
      (d) => d.status === 'OPEN'
    ).length;

    /*
    =========================================
     Final Response
    =========================================
    */

    sendJson(res, 200, {
      success: true,
      generatedAt: new Date().toISOString(),

      dashboard: {
        activePoolsToday,
        matchedPairsToday,
        matchRate: `${matchRate}%`,

        verificationQueues: {
          cnicPending,
          policePending,
          bankCardsPending,
        },

        complaints: {
          pendingComplaints,
        },

        blacklist: {
          activeBlacklistCount,
        },

        payments: {
          paymentDisputeCount,
        },
      },
    });

    return;
  }

  /*
  =========================================================
   BANK CARD VERIFICATION
   POST /api/user/verify-bank-card
  =========================================================
  */

  if (
    req.method === 'POST' &&
    req.url === '/api/user/verify-bank-card'
  ) {

    const user = authenticateUser(req, res);
    if (!user) return;

    try {

      const data = req.body;

      /*
      =========================================
       Cardholder Name Validation
      =========================================
      */

      if (
        !data.cardholderName ||
        data.cardholderName.trim() === ''
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'cardholderName is required',
        });
        return;
      }

      /*
      =========================================
       Bank Name Validation
      =========================================
      */

      if (
        !data.bankName ||
        data.bankName.trim() === ''
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'bankName is required',
        });
        return;
      }

      /*
      =========================================
       Last 4 Digits Validation
      =========================================
      */

      const last4Regex = /^\d{4}$/;

      if (!last4Regex.test(data.last4Digits)) {
        sendJson(res, 400, {
          success: false,
          message:
            'last4Digits must contain exactly 4 numeric digits',
        });
        return;
      }

      /*
      =========================================
       Issue Date Format Validation
      =========================================
      */

      const issueDateRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;

      if (!issueDateRegex.test(data.issueDate)) {
        sendJson(res, 400, {
          success: false,
          message: 'issueDate must follow MM/YYYY format',
        });
        return;
      }

      /*
      =========================================
       Future Date Validation
      =========================================
      */

      const [month, year] = data.issueDate.split('/');

      const issueDate = new Date(
        parseInt(year),
        parseInt(month) - 1
      );

      const currentDate = new Date();

      if (issueDate > currentDate) {
        sendJson(res, 400, {
          success: false,
          message: 'issueDate cannot be in the future',
        });
        return;
      }

      /*
      =========================================
       Save Verification Data
      =========================================
      */

      const verification = {
        verificationId: bankCardData.length + 1,
        userId: user.id,
        cardType: data.cardType,
        cardholderName: data.cardholderName,
        last4Digits: data.last4Digits,
        issueDate: data.issueDate,
        bankName: data.bankName,
        status: 'PENDING_REVIEW',
        createdAt: new Date().toISOString(),
      };

      bankCardData.push(verification);

      /*
      =========================================
       Success Response
      =========================================
      */

      sendJson(res, 201, {
        success: true,
        message: 'Bank card verification submitted successfully',
        verification,
      });

    } catch (error) {

      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message,
      });

    }

    return;
  }

  /*
  =========================================================
   BANK CARD VERIFICATION
   POST /api/verification/bank-card
  =========================================================
  */
  if (
    req.method === 'POST' &&
    req.url === '/api/verification/bank-card'
  ) {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      const requiredFields = [
        'cardType',
        'cardholderName',
        'last4Digits',
        'issueDate',
        'bankName',
      ];

      const missingFields = validateFields(
        data,
        requiredFields
      );

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      /*
      =========================================
       CARD TYPE VALIDATION
      =========================================
      */
      const allowedTypes = ['debit', 'credit'];

      if (
        !allowedTypes.includes(
          data.cardType.toLowerCase()
        )
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            'cardType must be debit or credit',
        });
        return;
      }

      /*
      =========================================
       CARDHOLDER NAME VALIDATION
      =========================================
      */
      if (
        typeof data.cardholderName !== 'string' ||
        data.cardholderName.trim().length < 3
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            'Valid cardholder name is required',
        });
        return;
      }

      /*
      =========================================
       LAST 4 DIGITS VALIDATION
      =========================================
      */
      const digitsRegex = /^\d{4}$/;

      if (!digitsRegex.test(data.last4Digits)) {
        sendJson(res, 400, {
          success: false,
          message:
            'last4Digits must contain exactly 4 numeric digits',
        });
        return;
      }

      /*
      =========================================
       ISSUE DATE VALIDATION
      =========================================
      */
      const issueRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;

      if (!issueRegex.test(data.issueDate)) {
        sendJson(res, 400, {
          success: false,
          message:
            'issueDate format must be MM/YYYY',
        });
        return;
      }

      const [month, year] =
        data.issueDate.split('/');

      const issueDate = new Date(
        parseInt(year),
        parseInt(month) - 1
      );

      const currentDate = new Date();

      if (issueDate > currentDate) {
        sendJson(res, 400, {
          success: false,
          message:
            'Issue date cannot be in the future',
        });
        return;
      }

      /*
      =========================================
       BANK NAME VALIDATION
      =========================================
      */
      if (
        typeof data.bankName !== 'string' ||
        data.bankName.trim().length < 2
      ) {
        sendJson(res, 400, {
          success: false,
          message: 'Valid bank name is required',
        });
        return;
      }

      /*
      =========================================
       SAVE BANK CARD
      =========================================
      */
      const verificationRecord = {
        verificationId:
          bankCardVerifications.length + 1,
        userId: user.id,
        cardType: data.cardType,
        cardholderName: data.cardholderName,
        last4Digits: data.last4Digits,
        issueDate: data.issueDate,
        bankName: data.bankName,
        status: 'verified',
        createdAt: new Date().toISOString(),
      };

      bankCardVerifications.push(
        verificationRecord
      );

      /*
      =========================================
       UPDATE USER VERIFICATION STATUS
      =========================================
      */
      let userVerification = verifications.find(
        (v) => v.userId === user.id
      );

      if (!userVerification) {
        userVerification = {
          userId: user.id,
          phone: 'not_done',
          email: 'not_done',
          cnic: 'not_done',
          policeVerification: 'not_done',
          linkedIn: 'not_done',
          bankCard: 'not_done',
        };

        verifications.push(userVerification);
      }

      userVerification.bankCard = 'verified';

      /*
      =========================================
       CALCULATE UPDATED SCORE
      =========================================
      */
      const verificationScore =
        calculateVerificationScore(user.id);

      sendJson(res, 201, {
        success: true,
        message:
          'Bank card verification submitted successfully',
        verification: verificationRecord,
        verificationScore,
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   PAYMENT METHOD & SCHEDULE HANDLING
   POST /api/payment/setup
  =========================================================
  */
  if (
    req.method === 'POST' &&
    req.url === '/api/payment/setup'
  ) {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      /*
      =========================================
       REQUIRED FIELDS
      =========================================
      */
      const requiredFields = [
        'booking_id',
        'payment_method',
        'base_fare',
        'payment_schedule',
      ];

      const missingFields = validateFields(
        data,
        requiredFields
      );

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      /*
      =========================================
       PAYMENT METHOD VALIDATION
      =========================================
      */
      const allowedMethods = [
        'CASH',
        'EASYPAISA',
        'JAZZCASH',
        'BANK_TRANSFER',
      ];

      if (
        !allowedMethods.includes(data.payment_method)
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            'Invalid payment_method',
        });
        return;
      }

      /*
      =========================================
       PAYMENT DETAILS VALIDATION
      =========================================
      */
      if (
        data.payment_method !== 'CASH'
      ) {
        if (
          !data.payment_details ||
          typeof data.payment_details !== 'string'
        ) {
          sendJson(res, 400, {
            success: false,
            message:
              'payment_details required for non-cash methods',
          });
          return;
        }
      }

      /*
      =========================================
       PAYMENT SCHEDULE VALIDATION
      =========================================
      */
      const allowedSchedules = [
        'PER_RIDE',
        'WEEKLY',
        'MONTHLY',
      ];

      if (
        !allowedSchedules.includes(
          data.payment_schedule
        )
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            'Invalid payment_schedule',
        });
        return;
      }

      /*
      =========================================
       FARE VALIDATION
      =========================================
      */
      const baseFare =
        parseFloat(data.base_fare) || 0;

      const luggageCharge =
        parseFloat(data.luggage_charge) || 0;

      if (baseFare <= 0) {
        sendJson(res, 400, {
          success: false,
          message:
            'base_fare must be greater than 0',
        });
        return;
      }

      /*
      =========================================
       TOTAL CALCULATION
      =========================================
      */
      const perRideTotal =
        baseFare + luggageCharge;

      let recurringTotal = perRideTotal;

      if (
        data.payment_schedule === 'WEEKLY'
      ) {
        recurringTotal = perRideTotal * 7;
      }

      if (
        data.payment_schedule === 'MONTHLY'
      ) {
        recurringTotal = perRideTotal * 30;
      }

      /*
      =========================================
       STORE PAYMENT PREFERENCE
      =========================================
      */
      const paymentRecord = {
        paymentId:
          paymentPreferences.length + 1,

        booking_id: data.booking_id,

        userId: user.id,

        payment_method:
          data.payment_method,

        payment_details:
          data.payment_details || null,

        payment_schedule:
          data.payment_schedule,

        base_fare: baseFare,

        luggage_charge: luggageCharge,

        per_ride_total: perRideTotal,

        recurring_total: recurringTotal,

        createdAt:
          new Date().toISOString(),
      };

      paymentPreferences.push(
        paymentRecord
      );

      /*
      =========================================
       REMINDER SCHEDULING
      =========================================
      */
      let reminder = null;

      if (
        data.payment_method !== 'CASH'
      ) {
        reminder = {
          reminderId:
            paymentReminders.length + 1,

          paymentId:
            paymentRecord.paymentId,

          booking_id:
            data.booking_id,

          schedule:
            data.payment_schedule,

          reminderTime:
            new Date(
              Date.now() +
                24 * 60 * 60 * 1000
            ).toISOString(),

          status: 'SCHEDULED',
        };

        paymentReminders.push(
          reminder
        );
      }

      /*
      =========================================
       SUCCESS RESPONSE
      =========================================
      */
      sendJson(res, 201, {
        success: true,

        message:
          'Payment preference saved successfully',

        paymentSummary: {
          booking_id:
            data.booking_id,

          payment_method:
            data.payment_method,

          payment_schedule:
            data.payment_schedule,

          base_fare: baseFare,

          luggage_charge:
            luggageCharge,

          per_ride_total:
            perRideTotal,

          recurring_total:
            recurringTotal,
        },

        reminder,
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message:
          'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   CREATE BOOKING
   POST /api/booking/create
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/booking/create') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      // Validate required fields
      const requiredFields = ['carpoolId', 'selectedSeat'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Find carpool
      const carpool = carpools.find((c) => c.offerId === data.carpoolId);

      if (!carpool) {
        sendJson(res, 404, {
          success: false,
          message: 'Carpool not found',
        });
        return;
      }

      // Check if seat is available
      if (carpool.bookedSeats && carpool.bookedSeats.includes(data.selectedSeat)) {
        sendJson(res, 400, {
          success: false,
          message: 'Selected seat is already booked',
          selectedSeat: data.selectedSeat,
        });
        return;
      }

      // Check if user already has a booking for this carpool
      const existingBooking = bookings.find(
        (b) => b.carpoolId === data.carpoolId && b.userId === user.id && b.status !== 'CANCELLED'
      );

      if (existingBooking) {
        sendJson(res, 400, {
          success: false,
          message: 'You already have a booking for this carpool',
          existingBookingId: existingBooking.bookingId,
        });
        return;
      }

      // Calculate fare
      let baseFare = carpool.fare || 0;
      let luggageCharge = data.hasLuggage ? (baseFare * 0.1) : 0;
      let totalFare = baseFare + luggageCharge;

      // Create booking record
      const booking = {
        bookingId: bookings.length + 1,
        userId: user.id,
        carpoolId: data.carpoolId,
        driverId: carpool.userId,
        selectedSeat: data.selectedSeat,
        hasLuggage: data.hasLuggage || false,
        baseFare: baseFare,
        luggageCharge: luggageCharge,
        totalFare: totalFare,
        status: 'PENDING',
        paymentStatus: 'NOT_INITIATED',
        createdAt: new Date().toISOString(),
        pickupLocation: carpool.departurePoint || '',
        dropoffLocation: carpool.destinationPoint || '',
        travelDate: carpool.travelDate || '',
        travelTime: carpool.travelTime || '',
        notes: data.notes || '',
      };

      // Add to bookings array
      bookings.push(booking);

      // Mark seat as booked
      if (!carpool.bookedSeats) {
        carpool.bookedSeats = [];
      }
      carpool.bookedSeats.push(data.selectedSeat);

      // Log booking creation
      auditLogs.push({
        logId: auditLogs.length + 1,
        userId: user.id,
        action: 'BOOKING_CREATED',
        targetEntityId: booking.bookingId,
        timestamp: new Date().toISOString(),
        details: `Booking created for carpool ${data.carpoolId}, seat ${data.selectedSeat}`,
      });

      // Send success response
      sendJson(res, 201, {
        success: true,
        message: 'Booking created successfully',
        bookingId: booking.bookingId,
        booking: {
          bookingId: booking.bookingId,
          carpoolId: booking.carpoolId,
          userId: booking.userId,
          selectedSeat: booking.selectedSeat,
          hasLuggage: booking.hasLuggage,
          baseFare: booking.baseFare,
          luggageCharge: booking.luggageCharge,
          totalFare: booking.totalFare,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          createdAt: booking.createdAt,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          travelDate: booking.travelDate,
          travelTime: booking.travelTime,
        },
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   CONFIRM BOOKING
   POST /api/booking/confirm
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/booking/confirm') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = req.body;

      // Validate required fields
      const requiredFields = ['bookingId', 'paymentMethod'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Validate payment method
      const validPaymentMethods = ['EASYPAISA', 'JAZZ_CASH', 'CARD', 'BANK_TRANSFER', 'WALLET'];
      if (!validPaymentMethods.includes(data.paymentMethod)) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid payment method',
          validMethods: validPaymentMethods,
        });
        return;
      }

      // Find join request (booking reference)
      const joinRequest = joinRequests.find(
        (jr) => jr.requestId === data.bookingId || jr.joinRequestId === data.bookingId
      );

      if (!joinRequest) {
        sendJson(res, 404, {
          success: false,
          message: 'Booking/Join request not found',
        });
        return;
      }

      // Check if already confirmed
      if (joinRequest.status === 'CONFIRMED' || joinRequest.status === 'COMPLETED') {
        sendJson(res, 400, {
          success: false,
          message: 'Booking already confirmed or completed',
          currentStatus: joinRequest.status,
        });
        return;
      }

      // Create booking record
      const booking = {
        bookingId: bookings.length + 1,
        joinRequestId: joinRequest.requestId || joinRequest.joinRequestId,
        userId: user.id,
        riderId: joinRequest.riderId,
        carpoolId: joinRequest.carpoolId,
        paymentMethod: data.paymentMethod,
        amount: data.amount || joinRequest.price || 0,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        confirmationCode: `BK${Date.now()}`,
        confirmedAt: new Date().toISOString(),
        scheduledDate: joinRequest.travelDate,
        pickupTime: joinRequest.travelTime,
        notes: data.notes || '',
      };

      // Add booking to array
      bookings.push(booking);

      // Update join request status
      joinRequest.status = 'CONFIRMED';
      joinRequest.confirmedAt = new Date().toISOString();
      joinRequest.paymentMethod = data.paymentMethod;

      // Log booking confirmation
      auditLogs.push({
        logId: auditLogs.length + 1,
        userId: user.id,
        action: 'BOOKING_CONFIRMED',
        targetEntityId: booking.bookingId,
        timestamp: new Date().toISOString(),
        details: `Booking confirmed with payment method: ${data.paymentMethod}`,
      });

      // Send success response
      sendJson(res, 201, {
        success: true,
        message: 'Booking confirmed successfully',
        bookingId: booking.bookingId,
        confirmationCode: booking.confirmationCode,
        booking: {
          bookingId: booking.bookingId,
          joinRequestId: booking.joinRequestId,
          paymentMethod: booking.paymentMethod,
          amount: booking.amount,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          confirmedAt: booking.confirmedAt,
          scheduledDate: booking.scheduledDate,
          pickupTime: booking.pickupTime,
        },
        nextSteps: [
          'Complete payment using ' + data.paymentMethod,
          'Wait for payment confirmation',
          'Driver will contact you with trip details',
        ],
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Error confirming booking',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   DRIVER LOCATION UPDATE
   POST /api/ride/location/update
  =========================================================
  */
  if (
    req.method === 'POST' &&
    req.url === '/api/ride/location/update'
  ) {

    const user = authenticateUser(req, res);
    if (!user) return;

    try {

      const data = req.body;

      const requiredFields = [
        'ride_id',
        'latitude',
        'longitude'
      ];

      const missingFields =
        validateFields(data, requiredFields);

      if (missingFields.length > 0) {

        sendJson(res, 400, {
          success: false,
          missingFields
        });

        return;
      }

      /*
      =========================================
       Participant Validation
      =========================================
      */
      const isParticipant =
        validateRideParticipant(
          data.ride_id,
          user.userId
        );

      if (!isParticipant) {

        sendJson(res, 403, {
          success: false,
          message:
            'Access denied for this ride'
        });

        return;
      }

      /*
      =========================================
       Save Tracking Data
      =========================================
      */
      const trackingData = {

        rideId: data.ride_id,

        driverId: user.userId,

        latitude: data.latitude,

        longitude: data.longitude,

        updatedAt:
          new Date().toISOString()
      };

      liveRideTracking.push(
        trackingData
      );

      /*
      =========================================
       Calculate ETA
      =========================================
      */
      const eta =
        calculateETA();

      sendJson(res, 200, {
        success: true,
        message:
          'Location updated successfully',
        tracking: {
          rideId: data.ride_id,
          latitude: data.latitude,
          longitude: data.longitude,
          nextStopETA: eta.nextStopETA,
          destinationETA: eta.destinationETA,
          timestamp: trackingData.updatedAt
        }
      });

    } catch (error) {

      sendJson(res, 400, {
        success: false,
        error: error.message
      });
    }

    return;
  }

  /*
  =========================================================
   GET LIVE TRACKING
   GET /api/ride/:rideId/tracking
  =========================================================
  */
  const trackingMatch =
    req.url.match(
      /^\/api\/ride\/(\d+)\/tracking$/
    );

  if (
    req.method === 'GET' &&
    trackingMatch
  ) {

    const user =
      authenticateUser(req, res);

    if (!user) return;

    const rideId =
      trackingMatch[1];

    /*
    =========================================
     Participant Validation
    =========================================
    */
    const isParticipant =
      validateRideParticipant(
        rideId,
        user.userId
      );

    if (!isParticipant) {

      sendJson(res, 403, {
        success: false,
        message:
          'Access denied for this ride'
      });

      return;
    }

    /*
    =========================================
     Latest Tracking Data
    =========================================
    */
    const latestLocation =
      [...liveRideTracking]
        .reverse()
        .find(
          (t) =>
            t.rideId == rideId
        );

    if (!latestLocation) {

      sendJson(res, 404, {
        success: false,
        message:
          'No tracking data found'
      });

      return;
    }

    const eta =
      calculateETA();

    sendJson(res, 200, {

      success: true,

      tracking: {

        rideId,

        driverLocation: {
          latitude:
            latestLocation.latitude,
          longitude:
            latestLocation.longitude
        },

        etaToNextStop:
          eta.nextStopETA,

        etaToDestination:
          eta.destinationETA,

        coRiderStatus:
          'PICKED',

        updatedAt:
          latestLocation.updatedAt
      }
    });

    return;
  }

  /*
  =========================================================
   GENERATE LOCATION SHARING LINK
   GET /api/ride/:rideId/share
  =========================================================
  */
  const shareMatch =
    req.url.match(
      /^\/api\/ride\/(\d+)\/share$/
    );

  if (
    req.method === 'GET' &&
    shareMatch
  ) {

    const user =
      authenticateUser(req, res);

    if (!user) return;

    const rideId =
      shareMatch[1];

    const shareLink =
      `https://carpool.app/live/${rideId}`;

    sendJson(res, 200, {
      success: true,
      shareLink
    });

    return;
  }

  /*
  =========================================================
   SOS EMERGENCY ALERT
   POST /api/ride/sos
  =========================================================
  */
  if (
    req.method === 'POST' &&
    req.url === '/api/ride/sos'
  ) {

    const user =
      authenticateUser(req, res);

    if (!user) return;

    try {

      const data = req.body;

      const requiredFields = [
        'ride_id',
        'latitude',
        'longitude'
      ];

      const missingFields =
        validateFields(
          data,
          requiredFields
        );

      if (
        missingFields.length > 0
      ) {

        sendJson(res, 400, {
          success: false,
          missingFields
        });

        return;
      }

      const sos = {

        alertId:
          sosAlerts.length + 1,

        rideId:
          data.ride_id,

        userId:
          user.userId,

        latitude:
          data.latitude,

        longitude:
          data.longitude,

        status:
          'ACTIVE',

        createdAt:
          new Date().toISOString()
      };

      sosAlerts.push(sos);

      sendJson(res, 201, {
        success: true,
        message:
          'SOS alert triggered successfully',
        alertId:
          sos.alertId,
        alert: sos
      });

    } catch (error) {

      sendJson(res, 400, {
        success: false,
        error:
          error.message
      });
    }

    return;
  }

  /*
  =========================================================
   GET ALL CNIC REVIEWS (ADMIN)
   GET /api/admin/cnic-reviews
  =========================================================
  */
  if (req.method === 'GET' && req.url === '/api/admin/cnic-reviews') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      // Check if user is admin (id === 1 or role === 'admin')
      if (user.id !== 1 && user.role !== 'admin') {
        sendJson(res, 403, {
          success: false,
          message: 'Access denied. Admin privileges required.',
        });
        return;
      }

      // Filter CNIC uploads by status
      const pendingReviews = cnicUploads.filter(
        (upload) => upload.status === 'PENDING_REVIEW'
      );

      // Enrich with user details
      const reviews = pendingReviews.map((upload) => {
        const user = users.find((u) => u.id === upload.userId);
        return {
          uploadId: upload.uploadId,
          userId: upload.userId,
          userName: user ? user.fullName : 'Unknown',
          userEmail: user ? user.email : 'N/A',
          cnicFront: upload.cnicFront,
          cnicBack: upload.cnicBack,
          uploadedAt: upload.uploadedAt,
          status: upload.status,
        };
      });

      sendJson(res, 200, {
        success: true,
        message: 'Pending CNIC reviews retrieved',
        totalPending: reviews.length,
        reviews: reviews,
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Error retrieving CNIC reviews',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   ADMIN RESPOND TO CNIC REVIEW
   POST /api/admin/cnic-review/respond
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/admin/cnic-review/respond') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      // Check if user is admin
      if (user.id !== 1 && user.role !== 'admin') {
        sendJson(res, 403, {
          success: false,
          message: 'Access denied. Admin privileges required.',
        });
        return;
      }

      const data = req.body;

      // Validate required fields
      const requiredFields = ['uploadId', 'status', 'comment'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          message: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Validate status value
      if (!['APPROVED', 'REJECTED'].includes(data.status)) {
        sendJson(res, 400, {
          success: false,
          message: 'Invalid status. Must be APPROVED or REJECTED.',
        });
        return;
      }

      // Find the CNIC upload record
      const upload = cnicUploads.find((u) => u.uploadId === data.uploadId);

      if (!upload) {
        sendJson(res, 404, {
          success: false,
          message: 'CNIC upload record not found',
        });
        return;
      }

      if (upload.status !== 'PENDING_REVIEW') {
        sendJson(res, 400, {
          success: false,
          message: 'CNIC upload has already been reviewed',
          currentStatus: upload.status,
        });
        return;
      }

      // Update the upload record
      upload.status = data.status;
      upload.reviewedBy = user.id;
      upload.reviewedAt = new Date().toISOString();
      upload.adminComment = data.comment;

      // If approved, update user's CNIC verification status
      if (data.status === 'APPROVED') {
        const targetUser = users.find((u) => u.id === upload.userId);
        if (targetUser) {
          targetUser.cnic = 'verified';
        }
      }

      // Log the action
      auditLogs.push({
        logId: auditLogs.length + 1,
        adminId: user.id,
        action: `CNIC_REVIEW_${data.status}`,
        targetUserId: upload.userId,
        uploadId: upload.uploadId,
        timestamp: new Date().toISOString(),
        comment: data.comment,
      });

      sendJson(res, 200, {
        success: true,
        message: `CNIC verification ${data.status.toLowerCase()} successfully`,
        uploadId: upload.uploadId,
        status: upload.status,
        reviewedAt: upload.reviewedAt,
        comment: upload.adminComment,
      });
    } catch (error) {
      sendJson(res, 400, {
        success: false,
        message: 'Error processing CNIC review',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   404 — Route Not Found
  =========================================================
  */
  sendJson(res, 404, {
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET  /',
      'POST /api/user/signup',
      'GET  /api/institutions/search',
      'GET  /api/carpool/list',
      'GET  /api/carpool/search',
      'GET  /api/carpool/:offerId',
      'POST /api/carpool/draft',
      'POST /api/carpool/create',
      'POST /api/carpool/preferences',
      'GET  /api/carpool/results',
      'POST /api/carpool/vehicle',
      'POST /api/carpool/join-request',
      'POST /api/carpool/join-request/:requestId/respond',
      'POST /api/match/route',
      'POST /api/match/time',
      'POST /api/driver/assign-trip',
      'POST /api/trip/start',
      'POST /api/trip/end',
      'GET  /api/trip/:tripId/status',
      'GET  /api/admin/audit-logs',
      'GET  /api/admin/dashboard',
      'POST /api/user/upload-cnic',
      'POST /api/user/verify-selfie',
      'POST /api/verification/bank-card',
      'POST /api/payment/setup',
      'GET  /api/user/linkedin-profile/:userId',
      'GET  /api/admin/linkedin-profiles',
      'GET  /api/recurring-carpools',
      'POST /api/recurring-carpools',
      'PATCH /api/recurring-carpools/:recurringId/action',
      'GET  /api/recurring-carpools/:recurringId/trips',
      'POST /api/complaints',
      'GET  /api/complaints',
      'GET  /api/complaints/:complaintId',
      'PATCH /api/complaints/:complaintId/status',
      'GET  /api/admin/complaints',
      'POST /api/admin/resolve-complaint',
      'GET  /api/admin/moderation-logs',
      'GET  /api/admin/blacklist',
      'GET  /api/user/moderation-status/:userId',
      'POST /api/admin/blacklist-user',
      'POST /api/admin/suspend-user',
      'GET  /api/admin/blocked-logs',
      'GET  /api/admin/blacklist-records',
      'POST /api/trip/review',
      'POST /api/booking/create',
      'POST /api/booking/confirm',
      'POST /api/ride/location/update',
      'GET  /api/ride/:rideId/tracking',
      'GET  /api/ride/:rideId/share',
      'POST /api/ride/sos',
      'GET  /api/admin/cnic-reviews',
      'POST /api/admin/cnic-review/respond',
    ],
  });
};

/*
=========================================================
 CREATE HTTP SERVER
=========================================================
*/
const server = http.createServer(app);

/*
=========================================================
 BACKWARD COMPATIBILITY - FALLBACK HANDLER
=========================================================
*/
app.use((req, res, next) => {
  // Call the requestListener for all unhandled routes
  return requestListener(req, res);
});

/*
=========================================================
 SOCKET.IO SERVER
=========================================================
*/
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

/*
=========================================================
 SOCKET CONNECTIONS
=========================================================
*/
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  /*
  ========================================
   Driver joins their own room
  ========================================
  */
  socket.on('driver:join', (data) => {
    if (data?.driverId) {
      socket.join(`driver:${data.driverId}`);
      console.log(`[Socket] Driver ${data.driverId} joined their room`);
    }
  });

  /*
  ========================================
   Passenger joins trip room
  ========================================
  */
  socket.on('trip:join', (data) => {
    if (data?.tripId) {
      socket.join(`trip:${data.tripId}`);
      console.log(`[Socket] User joined trip room: ${data.tripId}`);
    }
  });

  /*
  ========================================
   User joins ride room
  ========================================
  */
  socket.on(
    'ride:join',
    (data) => {

      if (data?.rideId) {

        socket.join(
          `ride:${data.rideId}`
        );

        console.log(
          `User joined ride room ${data.rideId}`
        );
      }
    }
  );

  /*
  ========================================
   Driver Location Update
  ========================================
  */
  socket.on('driver:location:update', (data) => {
    if (!data?.tripId || data?.latitude == null || data?.longitude == null) {
      socket.emit('error', { message: 'tripId, latitude, and longitude are required' });
      return;
    }

    console.log(`[Socket] Driver location update for trip ${data.tripId}:`, data.latitude, data.longitude);

    // Broadcast to all passengers in the trip room
    io.to(`trip:${data.tripId}`).emit('trip:location:update', {
      tripId: data.tripId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  });

  /*
  ========================================
   Trip Status Update
  ========================================
  */
  socket.on('trip:status:update', (data) => {
    if (!data?.tripId || !data?.status) {
      socket.emit('error', { message: 'tripId and status are required' });
      return;
    }

    console.log(`[Socket] Trip ${data.tripId} status changed to: ${data.status}`);

    io.to(`trip:${data.tripId}`).emit('trip:status:changed', {
      tripId: data.tripId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  });

  /*
  ========================================
   Send Chat Message in Trip
  ========================================
  */
  socket.on('trip:message', (data) => {
    if (!data?.tripId || !data?.message) {
      socket.emit('error', { message: 'tripId and message are required' });
      return;
    }

    io.to(`trip:${data.tripId}`).emit('trip:message:received', {
      tripId: data.tripId,
      senderId: data.senderId || null,
      senderName: data.senderName || 'Anonymous',
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  });

  /*
  ========================================
   Disconnect
  ========================================
  */
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

/*
=========================================================
 START SERVER
=========================================================
*/
server.listen(port, () => {
  console.log(`DEBUG: Server.listen called with port=${port}`);
  console.log(`\n🚗 Carpool API Server running at http://localhost:${port}`);
  console.log(`📡 Socket.IO ready for real-time connections\n`);
});
