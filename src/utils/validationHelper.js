/*
========================================
 Validation Helper Functions
========================================

Reusable validation logic for all controllers.
*/

/*
========================================
 Validate Required Fields
========================================
*/
const validateFields = (data, requiredFields) => {
  return requiredFields.filter(
    (field) => !(field in data) || data[field] === '' || data[field] === null
  );
};

/*
========================================
 Validate Email Format
========================================
*/
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/*
========================================
 Validate Pakistan Phone Number
========================================
*/
const isValidPakistaniPhone = (phone) => {
  const phoneRegex = /^03\d{9}$/;
  return phoneRegex.test(phone);
};

/*
========================================
 Validate Time Format (HH:MM)
========================================
*/
const isValidTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

/*
========================================
 Validate Date Format (YYYY-MM-DD)
========================================
*/
const isValidDateFormat = (date) => {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/*
========================================
 Check if Date is in Past
========================================
*/
const isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripDate = new Date(date);
  return tripDate < today;
};

/*
========================================
 Validate Seat Count
========================================
*/
const isValidSeatCount = (seats) => {
  const seatNum = parseInt(seats);
  return !isNaN(seatNum) && seatNum > 0 && seatNum <= 10;
};

/*
========================================
 Validate Rating (1-5)
========================================
*/
const isValidRating = (rating) => {
  const ratingNum = parseInt(rating);
  return ratingNum >= 1 && ratingNum <= 5;
};

/*
========================================
 Validate Gender Preference
========================================
*/
const isValidGenderPreference = (pref) => {
  const allowedPrefs = ['OPEN', 'FEMALE_ONLY', 'MALE_ONLY'];
  return allowedPrefs.includes(pref);
};

module.exports = {
  validateFields,
  isValidEmail,
  isValidPakistaniPhone,
  isValidTimeFormat,
  isValidDateFormat,
  isPastDate,
  isValidSeatCount,
  isValidRating,
  isValidGenderPreference
};
