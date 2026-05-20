/*
========================================
 Match Controller
========================================

Handles route and time-based matching.
*/

const { ok, badRequest } = require('../utils/responseHelper');
const {
  validateFields,
  isValidTimeFormat,
  isValidDateFormat
} = require('../utils/validationHelper');
const { matchByRoute, matchByTime } = require('../services/matchService');
const db = require('../database/mockDB');

/*
========================================
 Match by Route
========================================
*/
const matchRoute = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const missingFields = validateFields(data, ['pickupLocation', 'destinationStation']);
    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    const matchedRoutes = matchByRoute(
      data.pickupLocation,
      data.destinationStation,
      user.gender
    );

    return ok(res, {
      message: 'Route matching completed',
      pickupLocation: data.pickupLocation,
      destinationStation: data.destinationStation,
      matchedCount: matchedRoutes.length,
      routes: matchedRoutes.map((route) => ({
        offerId: route.offerId,
        driverName: route.driverName,
        pickupLocation: route.pickupLocation,
        destinationStation: route.destinationStation,
        travelDate: route.travelDate,
        departureTime: route.departureTime,
        availableSeats: route.availableSeats,
        genderPreference: route.genderPreference,
        travelPreferences: route.travelPreferences
      }))
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Match by Time
========================================
*/
const matchTime = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const missingFields = validateFields(data, ['travelDate', 'departureTime']);
    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    if (!isValidDateFormat(data.travelDate)) {
      return badRequest(res, 'Invalid travelDate format. Use YYYY-MM-DD');
    }

    if (!isValidTimeFormat(data.departureTime)) {
      return badRequest(res, 'Invalid departureTime format. Use HH:MM');
    }

    const matchedRoutes = matchByTime(
      data.travelDate,
      data.departureTime,
      user.gender
    );

    return ok(res, {
      message: 'Time matching completed',
      travelDate: data.travelDate,
      departureTime: data.departureTime,
      matchedCount: matchedRoutes.length,
      routes: matchedRoutes.map((route) => ({
        offerId: route.offerId,
        driverName: route.driverName,
        pickupLocation: route.pickupLocation,
        destinationStation: route.destinationStation,
        travelDate: route.travelDate,
        departureTime: route.departureTime,
        availableSeats: route.availableSeats,
        genderPreference: route.genderPreference,
        travelPreferences: route.travelPreferences
      }))
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

module.exports = {
  matchRoute,
  matchTime
};
