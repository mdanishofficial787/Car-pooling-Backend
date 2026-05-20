/*
========================================
 Express App Configuration
========================================

Main Express app setup with all middleware and routes.
*/

const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const carpoolRoutes = require('./routes/carpoolRoutes');
const matchRoutes = require('./routes/matchRoutes');
const tripRoutes = require('./routes/tripRoutes');
const adminRoutes = require('./routes/adminRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const rideRoutes = require('./routes/rideRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const confirmationRoutes = require('./routes/confirmationRoutes');
const offerRoutes = require('./routes/offerRoutes');
const preferencesRoutes = require('./routes/preferencesRoutes');

// Middleware
const { errorHandler } = require('./middleware/errorMiddleware');

// Create Express app
const app = express();

/*
========================================
 Middleware Setup
========================================
*/

// CORS
app.use(cors());

// JSON body parser
app.use(express.json());

// URL encoded parser
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

/*
========================================
 Health Check Route
========================================
*/
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Carpool API Server Running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/*
========================================
 API Routes
========================================
*/

// Auth & User
app.use('/api/user', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user', uploadRoutes);

// Carpool Offers (Drafts) - MUST be before carpoolRoutes to avoid /:offerId catch-all
app.use('/api/carpool', offerRoutes);

// Carpool Preferences (Publish Drafts)
app.use('/api/carpool', preferencesRoutes);

// Carpool
app.use('/api/carpool', carpoolRoutes);

// Matching
app.use('/api/match', matchRoutes);

// Trips
app.use('/api/driver', tripRoutes);
app.use('/api/trip', tripRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// Verification
app.use('/api/verification', verificationRoutes);

// Ride Tracking & Location
app.use('/api/ride', rideRoutes);

// Bookings
app.use('/api/booking', bookingRoutes);

// Booking Confirmation & Trip Finalization
app.use('/api/booking', confirmationRoutes);

/*
========================================
 404 - Not Found
========================================
*/
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET  /',
      'POST /api/user/signup',
      'GET  /api/user/verifications/:userId',
      'GET  /api/institutions/search',
      'GET  /api/carpool/list',
      'GET  /api/carpool/search',
      'GET  /api/carpool/:offerId',
      'POST /api/carpool/create',
      'POST /api/carpool/join-request',
      'POST /api/carpool/join-request/:requestId/respond',
      'POST /api/match/route',
      'POST /api/match/time',
      'POST /api/driver/assign-trip',
      'POST /api/trip/start',
      'POST /api/trip/end',
      'GET  /api/trip/:tripId/status',
      'GET  /api/trip/contact/:tripId',
      'POST /api/verification/cnic',
      'POST /api/trip/rate',
      'GET  /api/admin/audit-logs',
      'GET  /api/admin/dashboard',
      'POST /api/user/upload-cnic',
      'POST /api/user/verify-selfie',
      'POST /api/ride/location/update',
      'GET  /api/ride/:rideId/tracking',
      'GET  /api/ride/:rideId/share',
      'POST /api/ride/sos',
      'GET  /api/carpool/search',
      'POST /api/booking/create',
      'GET  /api/booking/:bookingId',
      'GET  /api/booking/user/list',
      'POST /api/booking/confirm',
      'POST /api/carpool/draft',
      'GET  /api/carpool/draft',
      'DELETE /api/carpool/draft',
      'POST /api/carpool/preferences'
    ]
  });
});

/*
========================================
 Error Handler (Must be last)
========================================
*/
app.use(errorHandler);

module.exports = app;
