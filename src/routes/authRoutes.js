/*
========================================
 Auth Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { getUserVerifications } = require('../controllers/authController');

const router = express.Router();

/*
========================================
 GET /api/user/verifications/:userId
========================================
*/
router.get('/verifications/:userId', authenticateUser, getUserVerifications);

module.exports = router;
