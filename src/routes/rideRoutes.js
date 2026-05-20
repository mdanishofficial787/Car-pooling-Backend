/*
========================================
 Ride Tracking & Location Routes
========================================
*/

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');

/*
========================================
 Mock Data & Helpers
========================================
*/

// In-memory storage for tracking
const liveRideTracking = [];
const sosAlerts = [];

const rideParticipants = [
  {
    rideId: 101,
    userId: 1,
    role: 'RIDER'
  },
  {
    rideId: 101,
    userId: 2,
    role: 'DRIVER'
  }
];

/*
========================================
 Helper Functions
========================================
*/

const validateRideParticipant = (rideId, userId) => {
  return rideParticipants.some(
    (participant) =>
      participant.rideId == rideId &&
      participant.userId == userId
  );
};

const calculateETA = () => {
  return {
    nextStopETA: 5,
    destinationETA: 18
  };
};

/*
========================================
 POST /api/ride/location/update
 Driver Location Update
========================================
*/
router.post('/location/update', authenticateUser, (req, res) => {
  try {
    const { ride_id, latitude, longitude } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!ride_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'ride_id, latitude, and longitude are required',
        missingFields: []
          .concat(!ride_id ? ['ride_id'] : [])
          .concat(latitude === undefined ? ['latitude'] : [])
          .concat(longitude === undefined ? ['longitude'] : [])
      });
    }

    // Validate ride participant
    if (!validateRideParticipant(ride_id, userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this ride'
      });
    }

    // Save tracking data
    const trackingData = {
      rideId: ride_id,
      driverId: userId,
      latitude,
      longitude,
      updatedAt: new Date().toISOString()
    };

    liveRideTracking.push(trackingData);

    // Calculate ETA
    const eta = calculateETA();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      tracking: {
        rideId: ride_id,
        latitude,
        longitude,
        nextStopETA: eta.nextStopETA,
        destinationETA: eta.destinationETA,
        timestamp: trackingData.updatedAt
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/*
========================================
 GET /api/ride/:rideId/tracking
 Get Live Tracking Data
========================================
*/
router.get('/:rideId/tracking', authenticateUser, (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user?.id;

    // Validate ride participant
    if (!validateRideParticipant(parseInt(rideId), userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this ride'
      });
    }

    // Get latest tracking data
    const latestLocation = [...liveRideTracking]
      .reverse()
      .find((t) => t.rideId == rideId);

    if (!latestLocation) {
      return res.status(404).json({
        success: false,
        message: 'No tracking data found'
      });
    }

    const eta = calculateETA();

    res.status(200).json({
      success: true,
      tracking: {
        rideId,
        driverLocation: {
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude
        },
        etaToNextStop: eta.nextStopETA,
        etaToDestination: eta.destinationETA,
        coRiderStatus: 'PICKED',
        updatedAt: latestLocation.updatedAt
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/*
========================================
 GET /api/ride/:rideId/share
 Generate Location Sharing Link
========================================
*/
router.get('/:rideId/share', authenticateUser, (req, res) => {
  try {
    const rideId = req.params.rideId;

    const shareLink = `https://carpool.app/live/${rideId}`;

    res.status(200).json({
      success: true,
      shareLink
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/*
========================================
 POST /api/ride/sos
 SOS Emergency Alert
========================================
*/
router.post('/sos', authenticateUser, (req, res) => {
  try {
    const { ride_id, latitude, longitude } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!ride_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'ride_id, latitude, and longitude are required',
        missingFields: []
          .concat(!ride_id ? ['ride_id'] : [])
          .concat(latitude === undefined ? ['latitude'] : [])
          .concat(longitude === undefined ? ['longitude'] : [])
      });
    }

    // Create SOS alert
    const sos = {
      alertId: sosAlerts.length + 1,
      rideId: ride_id,
      userId,
      latitude,
      longitude,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    sosAlerts.push(sos);

    console.log(`🚨 SOS Alert triggered - Ride: ${ride_id}, User: ${userId}, Alert ID: ${sos.alertId}`);

    res.status(201).json({
      success: true,
      message: 'SOS alert triggered successfully',
      alertId: sos.alertId,
      alert: sos
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
