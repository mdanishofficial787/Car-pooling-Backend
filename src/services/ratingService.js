/*
========================================
 Rating Service
========================================

Business logic for trip ratings and feedback.
*/

const db = require('../database/mockDB');

/*
========================================
 Submit Trip Rating
========================================
*/
const submitRating = (tripId, fromUserId, targetUserId, rating, comment = '', issueReported = '') => {
  // Check if already rated
  const existingRating = db.ratings.find(
    (r) => r.tripId === tripId && r.fromUserId === fromUserId
  );

  if (existingRating) {
    throw new Error('Already rated this trip');
  }

  const ratingRecord = {
    ratingId: Date.now(),
    tripId,
    fromUserId,
    targetUserId,
    rating,
    comment,
    issueReported,
    createdAt: new Date().toISOString()
  };

  db.ratings.push(ratingRecord);
  return ratingRecord;
};

/*
========================================
 Get Trip Ratings
========================================
*/
const getTripRatings = (tripId) => {
  return db.ratings.filter((r) => r.tripId === tripId);
};

/*
========================================
 Get User Rating Average
========================================
*/
const getUserAverageRating = (userId) => {
  const userRatings = db.ratings.filter((r) => r.targetUserId === userId);

  if (userRatings.length === 0) return 0;

  const average =
    userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length;

  return Math.round(average * 10) / 10; // Round to 1 decimal
};

module.exports = {
  submitRating,
  getTripRatings,
  getUserAverageRating
};
