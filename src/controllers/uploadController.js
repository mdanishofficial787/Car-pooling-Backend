/*
========================================
 Upload Controller
========================================

Handles CNIC and selfie file uploads.
*/

const { created, badRequest, notFound } = require('../utils/responseHelper');
const { storeCNICUpload, getUserCNICUpload, storeSelfieVerification } = require('../services/uploadService');
const db = require('../database/mockDB');

/*
========================================
 Upload CNIC (Front & Back)
========================================
*/
const uploadCNIC = (req, res) => {
  try {
    const user = req.user;
    const { cnicNumber } = req.body;

    console.log('[Upload CNIC] Request for user:', user.id);
    console.log('[Upload CNIC] CNIC Number:', cnicNumber);
    console.log('[Upload CNIC] Files received:', req.files ? Object.keys(req.files) : 'none');

    // Validate CNIC number is provided
    if (!cnicNumber) {
      return badRequest(res, 'CNIC number is required');
    }

    // Validate CNIC format (XXXXX-XXXXXXX-X)
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(cnicNumber)) {
      return badRequest(
        res,
        'Invalid CNIC format. Expected format: XXXXX-XXXXXXX-X (e.g., 35201-1234567-1)'
      );
    }

    // Check for duplicate CNIC
    const existingCnic = db.cnicVerifications.find(
      (c) => c.cnicNumber === cnicNumber
    );
    if (existingCnic) {
      return badRequest(res, 'This CNIC number has already been registered');
    }

    // Validate files are provided
    if (!req.files || !req.files.cnicFront || !req.files.cnicBack) {
      return badRequest(res, 'Both cnicFront and cnicBack files are required');
    }

    const frontFile = req.files.cnicFront[0];
    const backFile = req.files.cnicBack[0];

    console.log('[Upload CNIC] Front:', frontFile.filename);
    console.log('[Upload CNIC] Back:', backFile.filename);

    const uploadRecord = storeCNICUpload(user.id, frontFile.filename, backFile.filename, cnicNumber);

    console.log('[Upload CNIC] Stored with ID:', uploadRecord.uploadId);

    // Create verification record in database
    const verification = {
      verificationId: db.cnicVerifications.length + 1,
      userId: user.id,
      cnicNumber,
      cnicFront: frontFile.filename,
      cnicBack: backFile.filename,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString()
    };

    db.cnicVerifications.push(verification);

    console.log('[Upload CNIC] Verification record created:', verification.verificationId);

    return created(res, {
      message: 'CNIC uploaded and submitted for verification',
      upload: uploadRecord,
      verification: {
        verificationId: verification.verificationId,
        status: verification.status,
        submittedAt: verification.submittedAt
      }
    });
  } catch (error) {
    console.error('[Upload CNIC] Error:', error.message);
    return badRequest(res, error.message);
  }
};

/*
========================================
 Upload Selfie & Verify Face
========================================
*/
const verifySelfie = (req, res) => {
  try {
    const user = req.user;

    console.log('[Selfie Verification] Request for user:', user.id);

    if (!req.file) {
      return badRequest(res, 'Selfie image is required');
    }

    console.log('[Selfie Verification] Selfie file:', req.file.filename);

    const cnicRecord = getUserCNICUpload(user.id);

    if (!cnicRecord) {
      return notFound(res, 'CNIC images not found. Upload CNIC first.');
    }

    console.log('[Selfie Verification] CNIC record found:', cnicRecord.uploadId);

    const verificationResult = storeSelfieVerification(
      user.id,
      req.file.filename,
      cnicRecord
    );

    console.log('[Selfie Verification] Result:', verificationResult.matchResult);

    return created(res, {
      success: verificationResult.matchResult === 'PASS',
      message:
        verificationResult.matchResult === 'PASS'
          ? 'Face matched successfully'
          : 'Face match failed',
      verification: {
        verificationId: verificationResult.verificationId,
        matchResult: verificationResult.matchResult,
        confidenceScore: verificationResult.confidenceScore,
        verified: verificationResult.verified
      }
    });
  } catch (error) {
    console.error('[Selfie Verification] Error:', error.message);
    return badRequest(res, error.message);
  }
};

module.exports = {
  uploadCNIC,
  verifySelfie
};
