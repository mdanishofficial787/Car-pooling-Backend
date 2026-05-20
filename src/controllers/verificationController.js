/*
========================================
 Verification Controller
========================================

Handles verification-related operations.
*/

const { ok, created, notFound, badRequest } = require('../utils/responseHelper');
const { calculateVerificationScore } = require('../utils/scoreCalculator');
const db = require('../database/mockDB');

/*
========================================
 Get User Verifications
========================================
*/
const getUserVerifications = (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    const verification = db.verifications.find((v) => v.userId === userIdNum);

    if (!verification) {
      return notFound(res, 'User verification not found');
    }

    const verificationScore = calculateVerificationScore(verification);

    return ok(res, {
      message: 'User verification retrieved',
      userId: userIdNum,
      verificationScore,
      verifications: {
        phone: verification.phone,
        email: verification.email,
        cnic: verification.cnic,
        policeVerification: verification.policeVerification,
        linkedIn: verification.linkedIn,
        bankCard: verification.bankCard
      }
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Submit Trip Rating
========================================
*/
const rateTrip = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const requiredFields = ['tripId', 'targetUserId', 'rating'];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    if (data.rating < 1 || data.rating > 5) {
      return badRequest(res, 'Rating must be between 1 and 5');
    }

    const tripAssignment = db.tripAssignments.find(
      (t) => String(t.tripId) === String(data.tripId)
    );

    if (!tripAssignment || tripAssignment.status !== 'COMPLETED') {
      return badRequest(res, 'Ratings allowed only after trip completion');
    }

    const existingRating = db.ratings.find(
      (r) => r.tripId === data.tripId && r.fromUserId === user.id
    );

    if (existingRating) {
      return badRequest(res, 'You have already submitted a rating for this trip');
    }

    const rating = {
      ratingId: Date.now(),
      tripId: data.tripId,
      fromUserId: user.id,
      targetUserId: data.targetUserId,
      rating: data.rating,
      comment: data.comment || '',
      issueReported: data.issueReported || '',
      createdAt: new Date().toISOString()
    };

    db.ratings.push(rating);

    return created(res, {
      message: 'Rating submitted successfully',
      ratingId: rating.ratingId
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Submit CNIC Verification
========================================
*/
const submitCNICVerification = (req, res) => {
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
      return badRequest(res, 'Invalid CNIC format. Use XXXXX-XXXXXXX-X');
    }

    // Check for duplicate CNIC
    const existingCnic = db.cnicVerifications.find(
      (c) => c.cnicNumber === cnicNumber
    );
    if (existingCnic) {
      return badRequest(res, 'CNIC already exists');
    }

    // Create verification record
    const verification = {
      verificationId: db.cnicVerifications.length + 1,
      userId: user.id,
      cnicNumber,
      cnicFront,
      cnicBack,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString()
    };

    db.cnicVerifications.push(verification);

    return created(res, {
      success: true,
      message: 'CNIC submitted successfully and pending review',
      verification
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

module.exports = {
  getUserVerifications,
  rateTrip,
  submitCNICVerification
};
