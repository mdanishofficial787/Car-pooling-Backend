/*
========================================
 Verification Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requireVerification } = require('../middleware/verificationMiddleware');
const { getUserVerifications, rateTrip, submitCNICVerification } = require('../controllers/verificationController');

const router = express.Router();

/*
========================================
 GET /api/user/verifications/:userId
========================================
*/
router.get('/:userId', authenticateUser, getUserVerifications);

/*
========================================
 POST /api/trip/rate
========================================
*/
router.post('/trip/rate', authenticateUser, requireVerification, rateTrip);

/*
========================================
 POST /api/verification/cnic
========================================
*/
router.post('/cnic', authenticateUser, submitCNICVerification);

module.exports = router;
