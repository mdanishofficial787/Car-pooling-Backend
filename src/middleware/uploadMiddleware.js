/*
========================================
 Upload Middleware
========================================

Configures Multer for file uploads.
Handles JPG/PNG validation and 5MB size limit.
*/

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/*
========================================
 Create Uploads Directory
========================================
*/
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/*
========================================
 Multer Storage Configuration
========================================
*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

/*
========================================
 File Filter - Only JPG/PNG
========================================
*/
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;

  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }

  cb(new Error('Only JPG, JPEG, and PNG files are allowed'));
};

/*
========================================
 Multer Configuration
========================================

- Max file size: 5MB
- Only accepts JPG/PNG
- Stores in /uploads directory
*/
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
});

module.exports = {
  upload,
  uploadDir
};
