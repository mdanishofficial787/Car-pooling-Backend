/*
========================================
 User Controller
========================================

Handles user signup and profile operations.
*/

const { created, badRequest, conflict, ok } = require('../utils/responseHelper');
const {
  validateFields,
  isValidEmail,
  isValidPakistaniPhone
} = require('../utils/validationHelper');
const db = require('../database/mockDB');

/*
========================================
 User Signup
========================================
*/
const signup = (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    const requiredFields = ['fullName', 'mobileNumber', 'email'];
    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', {
        missingFields
      });
    }

    // Check for duplicate mobile number
    const existingUser = db.userProfiles.find(
      (u) => u.mobileNumber === data.mobileNumber
    );

    if (existingUser) {
      return conflict(res, 'Mobile number already registered');
    }

    // Validate email
    if (!isValidEmail(data.email)) {
      return badRequest(res, 'Invalid email format');
    }

    // Validate mobile
    if (!isValidPakistaniPhone(data.mobileNumber)) {
      return badRequest(res, 'Invalid mobile number. Use Pakistan format: 03XXXXXXXXX');
    }

    // Create user profile
    const newUser = {
      userId: db.userProfiles.length + 1,
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
      email: data.email,
      location: data.location || '',
      weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
      institution: data.institution || '',
      createdAt: new Date().toISOString()
    };

    db.userProfiles.push(newUser);

    return created(res, {
      message: 'User profile created successfully',
      user: newUser
    });
  } catch (error) {
    return badRequest(res, 'Invalid request body', {
      details: error.message
    });
  }
};

/*
========================================
 Search Institutions
========================================
*/
const searchInstitutions = (req, res) => {
  try {
    const searchQuery = req.query.q || '';

    if (!searchQuery || searchQuery.trim() === '') {
      return ok(res, {
        message: 'Institutions search',
        query: searchQuery,
        totalResults: 0,
        suggestions: []
      });
    }

    // Partial matching (case-insensitive)
    const suggestions = db.institutions.filter((institution) =>
      institution.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return ok(res, {
      message: 'Institutions found',
      query: searchQuery,
      totalResults: suggestions.length,
      suggestions
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

module.exports = {
  signup,
  searchInstitutions
};
