/*
========================================
 Admin Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const {
  getAuditLogs,
  getDashboard,
  getCNICReviewQueue,
  submitCNICForReview,
  respondToCNICReview,
  getUserCNICStatus
} = require('../controllers/adminController');

const router = express.Router();

/*
========================================
 GET /api/admin/audit-logs
========================================
*/
router.get('/audit-logs', authenticateUser, requireAdmin, getAuditLogs);

/*
========================================
 GET /api/admin/dashboard
========================================
*/
router.get('/dashboard', authenticateUser, requireAdmin, getDashboard);

/*
========================================
 GET /api/admin/cnic-reviews
========================================
Admin view all CNIC reviews in queue
*/
router.get('/cnic-reviews', authenticateUser, requireAdmin, getCNICReviewQueue);

/*
========================================
 POST /api/admin/cnic-review/submit
========================================
Submit CNIC for admin review
*/
router.post('/cnic-review/submit', authenticateUser, submitCNICForReview);

/*
========================================
 POST /api/admin/cnic-review/respond
========================================
Admin approve or reject CNIC
*/
router.post('/cnic-review/respond', authenticateUser, requireAdmin, respondToCNICReview);

/*
========================================
 GET /api/admin/my-cnic-status
========================================
User check their own CNIC review status
*/
router.get('/my-cnic-status', authenticateUser, getUserCNICStatus);

module.exports = router;
