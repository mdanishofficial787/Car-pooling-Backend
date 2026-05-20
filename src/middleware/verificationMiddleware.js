/*
========================================
 Verification Middleware
========================================

Checks if user has minimum verification level
before allowing sensitive operations.
*/

const { forbidden } = require('../utils/responseHelper');
const { hasMinimumVerification } = require('../utils/scoreCalculator');
const db = require('../database/mockDB');

/*
========================================
 Require Minimum Verification
========================================
*/
const requireVerification = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return forbidden(res, 'User not authenticated');
  }

  const verification = db.verifications.find(
    (v) => v.userId === user.id
  );

  if (!verification || !hasMinimumVerification(verification)) {
    return forbidden(
      res,
      'Complete at least one verification before this action'
    );
  }

  // Attach verification to request
  req.verification = verification;
  next();
};

module.exports = {
  requireVerification
};
