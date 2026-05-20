/*
========================================
 Authentication Middleware
========================================

Authenticates user from Authorization header.
In production: decode and verify JWT token here.
*/

const { unauthorized } = require('../utils/responseHelper');

/*
========================================
 Authenticate User Middleware
========================================
*/
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return unauthorized(res, 'Missing Authorization header');
  }

  /*
  =========================================
   Mock Authentication
  =========================================

   In production:
   - Extract token from "Bearer <token>"
   - Verify JWT signature
   - Decode user data
   - Attach to req.user

   For testing: Use headers to customize user:
   - X-User-Role: admin or user (default: admin)
   - X-User-Id: 1 or 2 (default: 1)
   Example:
   - X-User-Id: 2 (switch to Ayesha)
   - X-User-Role: user (set role to user)
  =========================================
  */
  const userRole = req.headers['x-user-role'] || 'admin';
  const userId = parseInt(req.headers['x-user-id']) || 1;

  // Get user details from mock database
  const db = require('../database/mockDB');
  const userRecord = db.users.find((u) => u.userId === userId);

  if (!userRecord) {
    return unauthorized(res, `User with ID ${userId} not found`);
  }

  req.user = {
    id: userId,
    name: userRecord.name,
    gender: userRecord.gender,
    role: userRole,
    verificationScore: userRecord.verificationScore || 0,
    status: userRecord.status || 'ACTIVE'
  };

  next();
};

module.exports = {
  authenticateUser
};
