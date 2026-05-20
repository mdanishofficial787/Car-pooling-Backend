/*
========================================
 Admin Controller
========================================

Handles admin operations and dashboard.
*/

const { ok, badRequest, notFound, created, conflict } = require('../utils/responseHelper');
const db = require('../database/mockDB');
const { getDateFromDaysAgo, formatDate } = require('../utils/dateHelper');

/*
========================================
 Get Audit Logs
========================================
*/
const getAuditLogs = (req, res) => {
  try {
    return ok(res, {
      message: 'Audit logs retrieved',
      total: db.auditLogs.length,
      logs: db.auditLogs
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get Admin Dashboard
========================================
*/
const getDashboard = (req, res) => {
  try {
    // Parse query parameters for date filters
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    // Use provided dates or default to last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : getDateFromDaysAgo(30);

    // Calculate metrics
    const activePoolsCount = db.carpools.filter(
      (c) => c.status === 'ACTIVE'
    ).length;

    const matchedTripsCount = db.tripAssignments.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'IN_PROGRESS'
    ).length;

    const cancelledTripsCount = db.tripAssignments.filter(
      (t) => t.status === 'CANCELLED'
    ).length;

    const completedTrips = db.tripAssignments.filter(
      (t) => t.status === 'COMPLETED'
    );

    const averageMatchTimeMinutes =
      completedTrips.length > 0
        ? Math.round(completedTrips.reduce((sum, t) => sum + 6, 0) / completedTrips.length)
        : 0;

    const safetyIncidentsCount = db.ratings.filter(
      (r) => r.issueReported
    ).length;

    const availableDrivers = 14;
    const busyDrivers = 6;

    return ok(res, {
      message: 'Admin dashboard retrieved',
      filters: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      },
      dashboard: {
        activePoolsCount,
        matchedTripsCount,
        cancelledTripsCount,
        averageMatchTimeMinutes,
        safetyIncidentsCount,
        drivers: {
          available: availableDrivers,
          busy: busyDrivers
        }
      }
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get CNIC Review Queue
========================================
*/
const getCNICReviewQueue = (req, res) => {
  try {
    const filterStatus = req.query.status; // PENDING_REVIEW, APPROVED, REJECTED
    
    let reviews = db.cnicReviewQueue;
    
    if (filterStatus) {
      reviews = reviews.filter((r) => r.status === filterStatus);
    }

    return ok(res, {
      message: 'CNIC review queue retrieved',
      total: reviews.length,
      reviews: reviews.map((r) => ({
        reviewId: r.reviewId,
        userId: r.userId,
        userName: r.userName,
        cnicNumber: r.cnicNumber,
        cnicFront: r.cnicFront,
        cnicBack: r.cnicBack,
        status: r.status,
        submittedAt: r.submittedAt,
        reviewDeadline: r.reviewDeadline,
        reviewedAt: r.reviewedAt,
        reviewMessage: r.reviewMessage,
        daysRemaining: Math.ceil(
          (new Date(r.reviewDeadline) - new Date()) / (1000 * 60 * 60 * 24)
        )
      }))
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Submit CNIC for Review
========================================
*/
const submitCNICForReview = (req, res) => {
  try {
    const user = req.user;
    const { cnicNumber, cnicFront, cnicBack } = req.body;

    // Validate required fields
    if (!cnicNumber || !cnicFront || !cnicBack) {
      return badRequest(res, 'cnicNumber, cnicFront and cnicBack are required');
    }

    // Validate CNIC format (XXXXX-XXXXXXX-X)
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(cnicNumber)) {
      return badRequest(
        res,
        'Invalid CNIC format. Expected format: XXXXX-XXXXXXX-X (e.g., 35201-1234567-1)'
      );
    }

    // Check for duplicate CNIC in review queue
    const existingReview = db.cnicReviewQueue.find(
      (r) => r.cnicNumber === cnicNumber
    );
    if (existingReview) {
      if (existingReview.status === 'PENDING_REVIEW') {
        return conflict(res, 'CNIC already submitted and pending review');
      } else if (existingReview.status === 'APPROVED') {
        return conflict(res, 'This CNIC has already been approved');
      }
    }

    // Create review request
    const reviewDeadline = new Date();
    reviewDeadline.setHours(reviewDeadline.getHours() + 24);

    const reviewRequest = {
      reviewId: db.cnicReviewQueue.length + 1,
      userId: user.id,
      userName: user.name,
      userGender: user.gender,
      cnicNumber,
      cnicFront,
      cnicBack,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString(),
      reviewDeadline: reviewDeadline.toISOString(),
      reviewedAt: null,
      reviewMessage: null,
      adminId: null,
      adminName: null
    };

    db.cnicReviewQueue.push(reviewRequest);

    console.log(
      `[CNIC Review] Submitted for review - ID: ${reviewRequest.reviewId}, User: ${user.id}`
    );

    return created(res, {
      message: 'CNIC submitted successfully and added to admin review queue',
      reviewRequest
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Respond to CNIC Review (Approve/Reject)
========================================
*/
const respondToCNICReview = (req, res) => {
  try {
    const admin = req.user;
    const { reviewId, action, reviewMessage } = req.body;

    // Validate required fields
    if (!reviewId || !action) {
      return badRequest(res, 'reviewId and action are required');
    }

    // Validate action
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return badRequest(res, 'action must be APPROVE or REJECT');
    }

    // Find review request
    const review = db.cnicReviewQueue.find((r) => r.reviewId === reviewId);
    if (!review) {
      return notFound(res, 'Review request not found');
    }

    // Check if already reviewed
    if (review.status !== 'PENDING_REVIEW') {
      return badRequest(
        res,
        `Review already completed with status: ${review.status}`
      );
    }

    // Update review status
    review.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    review.reviewedAt = new Date().toISOString();
    review.reviewMessage = reviewMessage || '';
    review.adminId = admin.id;
    review.adminName = admin.name;

    // If approved, update user verification status
    if (review.status === 'APPROVED') {
      const userVerification = db.verifications.find(
        (v) => v.userId === review.userId
      );
      if (userVerification) {
        userVerification.cnic = 'verified';
      }
    }

    // Create notification for user
    const notification = {
      notificationId: db.userNotifications.length + 1,
      userId: review.userId,
      type: 'CNIC_VERIFICATION',
      title: 'CNIC Verification Update',
      message:
        review.status === 'APPROVED'
          ? 'Your CNIC verification has been approved'
          : 'Your CNIC verification has been rejected',
      status: review.status,
      details: review.reviewMessage,
      createdAt: new Date().toISOString(),
      read: false
    };

    db.userNotifications.push(notification);

    console.log(
      `[CNIC Review] ${review.status} - Review ID: ${reviewId}, Admin: ${admin.id}`
    );

    return ok(res, {
      message: `CNIC verification ${review.status.toLowerCase()} successfully`,
      review: {
        reviewId: review.reviewId,
        userId: review.userId,
        cnicNumber: review.cnicNumber,
        status: review.status,
        reviewedAt: review.reviewedAt,
        reviewMessage: review.reviewMessage,
        adminName: review.adminName
      },
      notification
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get User CNIC Review Status
========================================
*/
const getUserCNICStatus = (req, res) => {
  try {
    const user = req.user;

    const reviews = db.cnicReviewQueue.filter((r) => r.userId === user.id);

    if (reviews.length === 0) {
      return ok(res, {
        message: 'No CNIC submissions found',
        reviews: []
      });
    }

    return ok(res, {
      message: 'User CNIC reviews retrieved',
      reviews: reviews.map((r) => ({
        reviewId: r.reviewId,
        cnicNumber: r.cnicNumber,
        status: r.status,
        submittedAt: r.submittedAt,
        reviewDeadline: r.reviewDeadline,
        reviewedAt: r.reviewedAt,
        reviewMessage: r.reviewMessage,
        daysRemaining:
          r.status === 'PENDING_REVIEW'
            ? Math.ceil(
                (new Date(r.reviewDeadline) - new Date()) / (1000 * 60 * 60 * 24)
              )
            : null
      }))
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

module.exports = {
  getAuditLogs,
  getDashboard,
  getCNICReviewQueue,
  submitCNICForReview,
  respondToCNICReview,
  getUserCNICStatus
};
