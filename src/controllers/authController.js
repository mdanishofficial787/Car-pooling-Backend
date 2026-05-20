/*
========================================
 Auth Controller
========================================

Handles authentication operations.
*/

const { ok, notFound } = require('../utils/responseHelper');
const db = require('../database/mockDB');

/*
========================================
 Get User Verification Status
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

    return ok(res, {
      message: 'User verification status retrieved',
      userId: userIdNum,
      verification: {
        phone: verification.phone,
        email: verification.email,
        cnic: verification.cnic,
        policeVerification: verification.policeVerification,
        linkedIn: verification.linkedIn,
        bankCard: verification.bankCard
      }
    });
  } catch (error) {
    return notFound(res, error.message);
  }
};

module.exports = {
  getUserVerifications
};
