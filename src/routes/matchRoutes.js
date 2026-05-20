/*
========================================
 Match Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { matchRoute, matchTime } = require('../controllers/matchController');

const router = express.Router();

/*
========================================
 POST /api/match/route
========================================
*/
router.post('/route', authenticateUser, matchRoute);

/*
========================================
 POST /api/match/time
========================================
*/
router.post('/time', authenticateUser, matchTime);

module.exports = router;
