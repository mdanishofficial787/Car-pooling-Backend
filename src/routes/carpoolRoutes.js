/*
========================================
 Carpool Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requireVerification } = require('../middleware/verificationMiddleware');
const {
  createCarpool,
  getAllCarpools,
  searchCarpools,
  getSingleCarpool,
  submitJoinRequest,
  respondJoinRequest
} = require('../controllers/carpoolController');

const router = express.Router();

/*
========================================
 POST /api/carpool/create
========================================
*/
router.post(
  '/create',
  authenticateUser,
  requireVerification,
  createCarpool
);

/*
========================================
 GET /api/carpool/list
========================================
*/
router.get('/list', authenticateUser, getAllCarpools);

/*
========================================
 GET /api/carpool/search
========================================
*/
router.get('/search', authenticateUser, searchCarpools);

/*
========================================
 GET /api/carpool/:offerId
========================================
*/
router.get('/:offerId', authenticateUser, getSingleCarpool);

/*
========================================
 POST /api/carpool/join-request
========================================
*/
router.post(
  '/join-request',
  authenticateUser,
  requireVerification,
  submitJoinRequest
);

/*
========================================
 POST /api/carpool/join-request/:requestId/respond
========================================
*/
router.post(
  '/join-request/:requestId/respond',
  authenticateUser,
  respondJoinRequest
);

module.exports = router;
