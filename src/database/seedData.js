/*
========================================
 Seed Initial Data
========================================

Optional: Pre-populate database with test data.
Currently not used, but available for initialization.
*/

const { tripAssignments } = require('./mockDB');

const seedTrips = () => {
  tripAssignments.push({
    assignmentId: 1,
    tripId: 101,
    driverId: 2,
    driverName: "Ayesha",
    pickupLocation: "NUML Islamabad",
    destination: "Rawalpindi Saddar",
    estimatedEarnings: 1500,
    route: ["Main GT Road"],
    requiredSeats: 3,
    status: 'COMPLETED',
    createdAt: new Date(),
    completedAt: new Date(),
  });

  tripAssignments.push({
    assignmentId: 2,
    tripId: 202,
    driverId: 3,
    driverName: "Ali",
    pickupLocation: "Lahore Airport",
    destination: "Islamabad F-10",
    estimatedEarnings: 2000,
    route: ["M-2 Motorway"],
    requiredSeats: 2,
    status: 'COMPLETED',
    createdAt: new Date(),
    completedAt: new Date(),
  });
};

module.exports = {
  seedTrips
};
