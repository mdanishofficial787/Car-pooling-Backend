/*
========================================
 Verification Service
========================================

Business logic for verification operations.
*/

const db = require('../database/mockDB');
const { calculateVerificationScore } = require('../utils/scoreCalculator');

/*
========================================
 Get User Verification Status
========================================
*/
const getUserVerification = (userId) => {
  return db.verifications.find((v) => v.userId === userId);
};

/*
========================================
 Add Verification Score to Carpools
========================================

Enriches carpool list with verification scores.
*/
const enrichCarpoolsWithScores = (carpools) => {
  return carpools.map((carpool) => {
    const verification = db.verifications.find(
      (v) => v.userId === carpool.userId
    );

    const verificationScore = verification
      ? calculateVerificationScore(verification)
      : 0;

    return {
      ...carpool,
      verificationScore
    };
  });
};

/*
========================================
 Sort Carpools by Verification Score
========================================
*/
const sortByVerificationScore = (carpools) => {
  return [...carpools].sort(
    (a, b) => (b.verificationScore || 0) - (a.verificationScore || 0)
  );
};

module.exports = {
  getUserVerification,
  enrichCarpoolsWithScores,
  sortByVerificationScore
};
