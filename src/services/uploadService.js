/*
========================================
 Upload Service
========================================

Business logic for file uploads.
*/

const db = require('../database/mockDB');

/*
========================================
 Store CNIC Upload
========================================
*/
const storeCNICUpload = (userId, cnicFrontFilename, cnicBackFilename, cnicNumber) => {
  const uploadRecord = {
    uploadId: db.cnicUploads.length + 1,
    userId,
    cnicNumber,
    cnicFront: cnicFrontFilename,
    cnicBack: cnicBackFilename,
    uploadedAt: new Date().toISOString(),
    status: 'PENDING_REVIEW'
  };

  db.cnicUploads.push(uploadRecord);
  return uploadRecord;
};

/*
========================================
 Get User CNIC Upload
========================================
*/
const getUserCNICUpload = (userId) => {
  return db.cnicUploads.find((c) => c.userId === userId);
};

/*
========================================
 Store Selfie Verification
========================================

Mock face matching: Pass if filename includes "match"
*/
const storeSelfieVerification = (userId, selfieFilename, cnicRecord) => {
  let matchResult = 'FAIL';
  let confidenceScore = 45;

  // Mock AI: Check filename for "match" keyword
  if (selfieFilename.toLowerCase().includes('match')) {
    matchResult = 'PASS';
    confidenceScore = 92;
  }

  const verificationResult = {
    verificationId: db.selfieVerifications.length + 1,
    userId,
    selfieImage: selfieFilename,
    cnicFrontImage: cnicRecord.cnicFront,
    matchResult,
    confidenceScore,
    verified: matchResult === 'PASS',
    createdAt: new Date().toISOString()
  };

  db.selfieVerifications.push(verificationResult);

  // Update user verification status if passed
  if (matchResult === 'PASS') {
    const userVerification = db.verifications.find((v) => v.userId === userId);
    if (userVerification) {
      userVerification.cnic = 'verified';
    }
  }

  return verificationResult;
};

module.exports = {
  storeCNICUpload,
  getUserCNICUpload,
  storeSelfieVerification
};
