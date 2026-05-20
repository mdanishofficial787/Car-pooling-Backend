/*
========================================
 Carpool Controller
========================================

Handles carpool creation, listing, and management.
*/

const {
  created,
  badRequest,
  notFound,
  ok,
  conflict
} = require('../utils/responseHelper');
const {
  validateFields,
  isValidTimeFormat,
  isValidDateFormat,
  isPastDate,
  isValidSeatCount,
  isValidGenderPreference
} = require('../utils/validationHelper');
const { enrichCarpoolsWithScores, sortByVerificationScore } = require('../services/verificationService');
const db = require('../database/mockDB');

/*
========================================
 Create Carpool
========================================
*/
const createCarpool = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const requiredFields = ['pickupLocation', 'destinationStation', 'travelDate', 'departureTime', 'availableSeats'];
    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    // Validate date
    if (!isValidDateFormat(data.travelDate)) {
      return badRequest(res, 'Invalid travelDate format. Use YYYY-MM-DD');
    }

    if (isPastDate(data.travelDate)) {
      return badRequest(res, 'Past travel dates are not allowed');
    }

    // Validate time
    if (!isValidTimeFormat(data.departureTime)) {
      return badRequest(res, 'Invalid departureTime format. Use HH:MM');
    }

    // Validate seats
    if (!isValidSeatCount(data.availableSeats)) {
      return badRequest(res, 'availableSeats must be between 1 and 10');
    }

    // Validate gender preference
    const genderPreference = data.genderPreference || 'OPEN';
    if (!isValidGenderPreference(genderPreference)) {
      return badRequest(res, 'Invalid genderPreference');
    }

    // Create carpool
    const newCarpool = {
      offerId: db.carpools.length + 1,
      userId: user.id,
      driverName: user.name,
      pickupLocation: data.pickupLocation,
      destinationStation: data.destinationStation,
      travelDate: data.travelDate,
      departureTime: data.departureTime,
      availableSeats: parseInt(data.availableSeats),
      travelPreferences: data.travelPreferences || '',
      genderPreference,
      vehicleType: data.vehicleType || 'CAR',
      fare: data.fare || 0,
      luggageAllowed: data.luggageAllowed || false,
      verificationLevel: data.verificationLevel || 0,
      expiryTime: new Date(
        `${data.travelDate}T${data.departureTime}:00`
      ).toISOString(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    db.carpools.push(newCarpool);

    return created(res, {
      message: 'Carpool created successfully',
      offerId: newCarpool.offerId,
      carpool: newCarpool
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get All Carpools
========================================
*/
const getAllCarpools = (req, res) => {
  try {
    const activeCarpools = db.carpools.filter((c) => c.status === 'ACTIVE');
    const enrichedCarpools = enrichCarpoolsWithScores(activeCarpools);
    const sortedCarpools = sortByVerificationScore(enrichedCarpools);

    return ok(res, {
      message: 'All active carpools retrieved',
      total: sortedCarpools.length,
      carpools: sortedCarpools
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Search Carpools with Filters
========================================
*/
const searchCarpools = (req, res) => {
  try {
    const user = req.user;

    // Extract query parameters
    const pickupLocation = req.query.pickupLocation || '';
    const destinationStation = req.query.destinationStation || '';
    const travelDate = req.query.travelDate || '';
    const genderPreference = req.query.genderPreference || '';
    const vehicleType = req.query.vehicleType || '';
    const luggageAllowed = req.query.luggageAllowed || '';
    const minFare = Number(req.query.minFare) || 0;
    const maxFare = Number(req.query.maxFare) || 999999;
    const minVerificationLevel = Number(req.query.verificationLevel) || 0;

    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'fare';
    const sortOrder = req.query.sortOrder || 'asc';

    // Filter carpools
    let filteredCarpools = db.carpools.filter((carpool) => {
      // ACTIVE ONLY
      if (carpool.status !== 'ACTIVE') {
        return false;
      }

      // Expired carpools
      if (new Date(carpool.expiryTime) < new Date()) {
        return false;
      }

      // Real-time seats
      if (carpool.availableSeats <= 0) {
        return false;
      }

      // Pickup filter
      if (pickupLocation && !carpool.pickupLocation.toLowerCase().includes(pickupLocation.toLowerCase())) {
        return false;
      }

      // Destination filter
      if (destinationStation && !carpool.destinationStation.toLowerCase().includes(destinationStation.toLowerCase())) {
        return false;
      }

      // Travel date filter
      if (travelDate && carpool.travelDate !== travelDate) {
        return false;
      }

      // Gender preference filter
      if (genderPreference && carpool.genderPreference !== genderPreference) {
        return false;
      }

      // Vehicle type filter
      if (vehicleType && carpool.vehicleType !== vehicleType) {
        return false;
      }

      // Luggage filter
      if (luggageAllowed === 'true' && !carpool.luggageAllowed) {
        return false;
      }

      // Fare filter
      if (carpool.fare < minFare || carpool.fare > maxFare) {
        return false;
      }

      // Verification filter
      if (carpool.verificationLevel < minVerificationLevel) {
        return false;
      }

      // Server-side gender restriction
      if (carpool.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
        return false;
      }

      if (carpool.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
        return false;
      }

      return true;
    });

    // Sorting
    filteredCarpools.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (sortOrder === 'desc') {
        return valueA > valueB ? -1 : 1;
      }

      return valueA > valueB ? 1 : -1;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedResults = filteredCarpools.slice(startIndex, startIndex + limit);

    return ok(res, {
      success: true,
      pagination: {
        currentPage: page,
        limit,
        totalResults: filteredCarpools.length,
        totalPages: Math.ceil(filteredCarpools.length / limit)
      },
      filters: {
        pickupLocation: pickupLocation || undefined,
        destinationStation: destinationStation || undefined,
        travelDate: travelDate || undefined,
        genderPreference: genderPreference || undefined,
        vehicleType: vehicleType || undefined,
        minFare,
        maxFare
      },
      carpools: paginatedResults.map((carpool) => ({
        offerId: carpool.offerId,
        driverName: carpool.driverName,
        pickupLocation: carpool.pickupLocation,
        destinationStation: carpool.destinationStation,
        travelDate: carpool.travelDate,
        departureTime: carpool.departureTime,
        availableSeats: carpool.availableSeats,
        fare: carpool.fare,
        vehicleType: carpool.vehicleType,
        luggageAllowed: carpool.luggageAllowed,
        verificationLevel: carpool.verificationLevel,
        genderPreference: carpool.genderPreference,
        travelPreferences: carpool.travelPreferences
      }))
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get Single Carpool
========================================
*/
const getSingleCarpool = (req, res) => {
  try {
    const offerId = parseInt(req.params.offerId);
    const carpool = db.carpools.find((c) => c.offerId === offerId);

    if (!carpool) {
      return notFound(res, 'Carpool not found');
    }

    return ok(res, {
      message: 'Carpool details retrieved',
      carpool
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Submit Join Request
========================================
*/
const submitJoinRequest = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const missingFields = validateFields(data, ['carpoolId', 'message']);
    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    const carpool = db.carpools.find((c) => c.offerId === data.carpoolId);
    if (!carpool) {
      return notFound(res, 'Carpool not found');
    }

    if (carpool.status !== 'ACTIVE') {
      return badRequest(res, 'This carpool is no longer active');
    }

    if (carpool.userId === user.id) {
      return badRequest(res, 'You cannot join your own carpool');
    }

    const existingRequest = db.joinRequests.find(
      (r) => r.userId === user.id && r.carpoolId === data.carpoolId
    );

    if (existingRequest) {
      return badRequest(res, 'You have already requested to join this carpool');
    }

    if (carpool.availableSeats <= 0) {
      return badRequest(res, 'No seats available in this carpool');
    }

    if (carpool.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
      return badRequest(res, 'This carpool is restricted to female users only');
    }

    if (carpool.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
      return badRequest(res, 'This carpool is restricted to male users only');
    }

    const joinRequest = {
      requestId: db.joinRequests.length + 1,
      carpoolId: data.carpoolId,
      userId: user.id,
      userName: user.name,
      message: data.message,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    db.joinRequests.push(joinRequest);

    return created(res, {
      message: 'Join request submitted successfully',
      requestId: joinRequest.requestId
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Respond to Join Request
========================================
*/
const respondJoinRequest = (req, res) => {
  try {
    const user = req.user;
    const { requestId } = req.params;
    const { action } = req.body;
    const requestIdNum = parseInt(requestId);

    if (!action || !['ACCEPT', 'REJECT'].includes(action)) {
      return badRequest(res, 'action must be ACCEPT or REJECT');
    }

    const joinRequest = db.joinRequests.find((r) => r.requestId === requestIdNum);
    if (!joinRequest) {
      return notFound(res, 'Join request not found');
    }

    if (joinRequest.status !== 'PENDING') {
      return badRequest(res, `Request already ${joinRequest.status.toLowerCase()}`);
    }

    const carpool = db.carpools.find((c) => c.offerId === joinRequest.carpoolId);

    if (!carpool || carpool.userId !== user.id) {
      return badRequest(res, 'You are not authorized to respond to this request');
    }

    joinRequest.status = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    joinRequest.respondedAt = new Date().toISOString();

    if (action === 'ACCEPT') {
      carpool.availableSeats -= 1;
      if (carpool.availableSeats === 0) {
        carpool.status = 'FULL';
      }
    }

    return ok(res, {
      message: `Join request ${joinRequest.status.toLowerCase()} successfully`,
      requestId: requestIdNum,
      newStatus: joinRequest.status
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

module.exports = {
  createCarpool,
  getAllCarpools,
  searchCarpools,
  getSingleCarpool,
  submitJoinRequest,
  respondJoinRequest
};
