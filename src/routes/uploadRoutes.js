/*
========================================
 Upload Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const { uploadCNIC, verifySelfie } = require('../controllers/uploadController');

const router = express.Router();

/*
========================================
 POST /api/user/upload-cnic
========================================
*/
router.post(
  '/upload-cnic',
  authenticateUser,
  upload.fields([
    { name: 'cnicFront', maxCount: 1 },
    { name: 'cnicBack', maxCount: 1 }
  ]),
  uploadCNIC
);

/*
========================================
 POST /api/user/verify-selfie
========================================
*/
router.post(
  '/verify-selfie',
  authenticateUser,
  upload.single('selfie'),
  verifySelfie
);

module.exports = router;
