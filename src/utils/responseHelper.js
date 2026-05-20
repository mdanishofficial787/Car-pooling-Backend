/*
========================================
 Response Helper Functions
========================================

Centralized response formatting for all endpoints.
Ensures consistent API response structure.
*/

/*
========================================
 Success Response
========================================
*/
const sendSuccess = (res, statusCode, data) => {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
};

/*
========================================
 Error Response
========================================
*/
const sendError = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    message
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/*
========================================
 Standardized Success (200)
========================================
*/
const ok = (res, data) => sendSuccess(res, 200, data);

/*
========================================
 Standardized Created (201)
========================================
*/
const created = (res, data) => sendSuccess(res, 201, data);

/*
========================================
 Standardized Bad Request (400)
========================================
*/
const badRequest = (res, message, details) =>
  sendError(res, 400, message, details);

/*
========================================
 Standardized Unauthorized (401)
========================================
*/
const unauthorized = (res, message = 'Unauthorized') =>
  sendError(res, 401, message);

/*
========================================
 Standardized Forbidden (403)
========================================
*/
const forbidden = (res, message = 'Forbidden') =>
  sendError(res, 403, message);

/*
========================================
 Standardized Not Found (404)
========================================
*/
const notFound = (res, message = 'Resource not found') =>
  sendError(res, 404, message);

/*
========================================
 Standardized Conflict (409)
========================================
*/
const conflict = (res, message) =>
  sendError(res, 409, message);

/*
========================================
 Standardized Server Error (500)
========================================
*/
const serverError = (res, message = 'Internal Server Error') =>
  sendError(res, 500, message);

module.exports = {
  sendSuccess,
  sendError,
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError
};
