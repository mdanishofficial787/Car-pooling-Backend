/*
========================================
 Match Service
========================================

Business logic for matching routes and times.
*/

const db = require('../database/mockDB');

/*
========================================
 Match Carpools by Route
========================================

Find carpools matching pickup and destination.
*/
const matchByRoute = (pickupLocation, destinationStation, userGender) => {
  const matchedRoutes = db.carpools.filter((carpool) => {
    const pickupMatch = carpool.pickupLocation
      .toLowerCase()
      .includes(pickupLocation.toLowerCase());

    const destinationMatch = carpool.destinationStation
      .toLowerCase()
      .includes(destinationStation.toLowerCase());

    return pickupMatch && destinationMatch && carpool.status === 'ACTIVE';
  });

  // Filter by gender preference
  return matchedRoutes.filter((route) => {
    if (route.genderPreference === 'FEMALE_ONLY' && userGender !== 'female') {
      return false;
    }
    if (route.genderPreference === 'MALE_ONLY' && userGender !== 'male') {
      return false;
    }
    return true;
  });
};

/*
========================================
 Match Carpools by Time
========================================

Find carpools matching date and time.
*/
const matchByTime = (travelDate, departureTime, userGender) => {
  const matchedByTime = db.carpools.filter((carpool) => {
    const dateMatch = carpool.travelDate === travelDate;
    const timeMatch = carpool.departureTime === departureTime;

    return dateMatch && timeMatch && carpool.status === 'ACTIVE';
  });

  // Filter by gender preference
  return matchedByTime.filter((route) => {
    if (route.genderPreference === 'FEMALE_ONLY' && userGender !== 'female') {
      return false;
    }
    if (route.genderPreference === 'MALE_ONLY' && userGender !== 'male') {
      return false;
    }
    return true;
  });
};

module.exports = {
  matchByRoute,
  matchByTime
};
