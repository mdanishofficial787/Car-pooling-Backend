/*
========================================
 Preferences Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { publishCarpool } = require('../controllers/preferencesController');

const router = express.Router();

/*
========================================
 POST /api/carpool/preferences
========================================
Publish a draft carpool with preferences
and convert to active carpool
*/
router.post(
  '/preferences',
  authenticateUser,
  publishCarpool
);

module.exports = router;
