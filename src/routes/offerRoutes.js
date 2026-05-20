/*
========================================
 Offer Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const {
  createDraftOffer,
  getDraftOffer,
  deleteDraftOffer
} = require('../controllers/offerController');

const router = express.Router();

/*
========================================
 POST /api/carpool/draft
========================================
Create or update draft carpool offer
*/
router.post(
  '/draft',
  authenticateUser,
  createDraftOffer
);

/*
========================================
 GET /api/carpool/draft
========================================
Retrieve current draft offer
*/
router.get(
  '/draft',
  authenticateUser,
  getDraftOffer
);

/*
========================================
 DELETE /api/carpool/draft
========================================
Delete draft offer
*/
router.delete(
  '/draft',
  authenticateUser,
  deleteDraftOffer
);

module.exports = router;
