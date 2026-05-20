/*
========================================
 Trip Controller
========================================

Handles trip operations: assign, start, end, status.
*/

const {
  ok,
  badRequest,
  notFound
} = require('../utils/responseHelper');
const { validateFields } = require('../utils/validationHelper');
const db = require('../database/mockDB');

/*
========================================
 Assign Trip to Driver
========================================
*/
const assignTrip = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    const requiredFields = ['tripId', 'pickupLocation', 'destination', 'estimatedEarnings', 'route', 'requiredSeats'];
    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    if (!Array.isArray(data.route) || data.route.length === 0) {
      return badRequest(res, 'route must be a non-empty array');
    }

    const existingAssignment = db.tripAssignments.find(
      (t) => t.tripId === data.tripId
    );

    if (existingAssignment) {
      return badRequest(res, 'This trip has already been assigned');
    }

    const assignment = {
      assignmentId: db.tripAssignments.length + 1,
      tripId: data.tripId,
      driverId: user.id,
      driverName: user.name,
      pickupLocation: data.pickupLocation,
      destination: data.destination,
      estimatedEarnings: data.estimatedEarnings,
      route: data.route,
      requiredSeats: data.requiredSeats,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    db.tripAssignments.push(assignment);

    return ok(res, {
      message: 'Trip assigned to driver successfully',
      assignment
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Start Trip
========================================
*/
const startTrip = (req, res) => {
  try {
    const data = req.body;

    if (!data.tripId) {
      return badRequest(res, 'tripId is required');
    }

    const assignment = db.tripAssignments.find((t) => t.tripId === data.tripId);

    if (!assignment) {
      return notFound(res, 'Trip assignment not found');
    }

    if (assignment.status === 'IN_PROGRESS') {
      return badRequest(res, 'Trip is already in progress');
    }

    if (assignment.status === 'COMPLETED') {
      return badRequest(res, 'Trip has already been completed');
    }

    assignment.status = 'IN_PROGRESS';
    assignment.startedAt = new Date().toISOString();

    return ok(res, {
      message: 'Trip started successfully',
      tripId: data.tripId,
      startedAt: assignment.startedAt
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 End Trip
========================================
*/
const endTrip = (req, res) => {
  try {
    const data = req.body;

    if (!data.tripId) {
      return badRequest(res, 'tripId is required');
    }

    const assignment = db.tripAssignments.find((t) => t.tripId === data.tripId);

    if (!assignment) {
      return notFound(res, 'Trip assignment not found');
    }

    if (assignment.status !== 'IN_PROGRESS') {
      return badRequest(res, 'Trip is not currently in progress');
    }

    assignment.status = 'COMPLETED';
    assignment.completedAt = new Date().toISOString();

    return ok(res, {
      message: 'Trip ended successfully',
      tripId: data.tripId,
      completedAt: assignment.completedAt
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get Trip Status
========================================
*/
const getTripStatus = (req, res) => {
  try {
    const tripId = req.params.tripId;
    const assignment = db.tripAssignments.find(
      (t) => String(t.tripId) === tripId
    );

    if (!assignment) {
      return notFound(res, 'Trip not found');
    }

    return ok(res, {
      message: 'Trip status retrieved',
      tripId,
      status: assignment.status,
      driverName: assignment.driverName,
      pickupLocation: assignment.pickupLocation,
      destination: assignment.destination,
      route: assignment.route,
      requiredSeats: assignment.requiredSeats,
      startedAt: assignment.startedAt || null,
      completedAt: assignment.completedAt || null,
      etaMinutes: assignment.status === 'IN_PROGRESS' ? 10 : null,
      driverLocation:
        assignment.status === 'IN_PROGRESS'
          ? { latitude: 33.6844, longitude: 73.0479 }
          : null
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

/*
========================================
 Get Trip Contact Info
========================================
*/
const getTripContactInfo = (req, res) => {
  try {
    const tripId = req.params.tripId;

    return ok(res, {
      message: 'Trip contact info retrieved',
      releaseWindowMinutes: 30,
      minutesRemaining: 120,
      riderPhone: '*******4567',
      driverPhone: '*******4567'
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
};

module.exports = {
  assignTrip,
  startTrip,
  endTrip,
  getTripStatus,
  getTripContactInfo
};
