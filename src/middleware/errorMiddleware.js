/*
========================================
 Error Handling Middleware
========================================

Centralized error handler for all routes.
Must be the last middleware in the chain.
*/

const { serverError, badRequest } = require('../utils/responseHelper');

/*
========================================
 Global Error Handler
========================================

Catches all errors from routes and middleware.
*/
const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err.message);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return badRequest(res, 'File too large. Maximum 5MB allowed.');
  }

  // Multer file upload errors
  if (err.message && err.message.includes('Only JPG')) {
    return badRequest(res, err.message);
  }

  // JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return badRequest(res, 'Invalid JSON body');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return badRequest(res, err.message);
  }

  // Default server error
  return serverError(res, err.message || 'Internal Server Error');
};

module.exports = {
  errorHandler
};
