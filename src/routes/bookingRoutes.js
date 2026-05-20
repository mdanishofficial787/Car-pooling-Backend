/*
========================================
 Booking Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const {
  createBooking,
  getBooking,
  getUserBookings
} = require('../controllers/bookingController');

const router = express.Router();

/*
========================================
 POST /api/booking/create
========================================
Creates a new seat booking with fare calculation
*/
router.post(
  '/create',
  authenticateUser,
  createBooking
);

/*
========================================
 GET /api/booking/:bookingId
========================================
Retrieve a specific booking by ID
*/
router.get(
  '/:bookingId',
  authenticateUser,
  getBooking
);

/*
========================================
 GET /api/booking/user/list
========================================
Retrieve all bookings for authenticated user
*/
router.get(
  '/user/list',
  authenticateUser,
  getUserBookings
);

module.exports = router;
