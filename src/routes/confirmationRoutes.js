/*
========================================
 Confirmation Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { confirmBooking } = require('../controllers/confirmationController');

const router = express.Router();

/*
========================================
 POST /api/booking/confirm
========================================
Confirm a booking and finalize trip
*/
router.post(
  '/confirm',
  authenticateUser,
  confirmBooking
);

module.exports = router;
