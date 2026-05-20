/*
========================================
 Date Helper Functions
========================================

Utility functions for date/time operations.
*/

/*
========================================
 Get Current ISO String
========================================
*/
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/*
========================================
 Format Date as YYYY-MM-DD
========================================
*/
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/*
========================================
 Get Date from Days Ago
========================================
*/
const getDateFromDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

/*
========================================
 Parse Date String
========================================
*/
const parseDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  return date;
};

module.exports = {
  getCurrentTimestamp,
  formatDate,
  getDateFromDaysAgo,
  parseDate
};
