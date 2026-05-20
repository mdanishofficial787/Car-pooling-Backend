/*
========================================
 Trip Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requireVerification } = require('../middleware/verificationMiddleware');
const {
  assignTrip,
  startTrip,
  endTrip,
  getTripStatus,
  getTripContactInfo
} = require('../controllers/tripController');

const router = express.Router();

/*
========================================
 POST /api/driver/assign-trip
========================================
*/
router.post(
  '/assign-trip',
  authenticateUser,
  requireVerification,
  assignTrip
);

/*
========================================
 POST /api/trip/start
========================================
*/
router.post('/start', authenticateUser, requireVerification, startTrip);

/*
========================================
 POST /api/trip/end
========================================
*/
router.post('/end', authenticateUser, requireVerification, endTrip);

/*
========================================
 GET /api/trip/:tripId/status
========================================
*/
router.get('/:tripId/status', authenticateUser, getTripStatus);

/*
========================================
 GET /api/trip/contact/:tripId
========================================
*/
router.get('/contact/:tripId', authenticateUser, getTripContactInfo);

module.exports = router;
