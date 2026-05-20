/*
========================================
 Booking Controller
========================================

Handles seat booking and fare calculation.
*/

const {
  created,
  badRequest,
  notFound,
  ok,
  conflict,
  forbidden
} = require('../utils/responseHelper');
const {
  validateFields
} = require('../utils/validationHelper');
const db = require('../database/mockDB');

/*
========================================
 CREATE BOOKING
========================================

POST /api/booking/create

Creates a new seat booking with:
- Verification checks
- Blacklist/Suspension checks
- Real-time seat validation
- Active hold management
- Fare calculation
- Soft-lock seat for 5 minutes
*/
const createBooking = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    /*
    =========================================
     VERIFICATION CHECK
    =========================================
    */
    const userRecord = db.users.find((u) => u.userId === user.id);

    if (!userRecord) {
      return notFound(res, 'User not found');
    }

    if (userRecord.verificationScore < 1) {
      return forbidden(res, 'At least one verification is required before booking a ride');
    }

    /*
    =========================================
     BLACKLIST/SUSPENSION CHECK
    =========================================
    */
    if (userRecord.status === 'BLACKLISTED') {
      return forbidden(res, 'Your account is blacklisted');
    }

    if (userRecord.status === 'SUSPENDED') {
      return forbidden(res, 'Your account is suspended');
    }

    /*
    =========================================
     REQUIRED FIELD VALIDATION
    =========================================
    */
    const requiredFields = ['carpoolId', 'selectedSeat'];
    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    /*
    =========================================
     FIND CARPOOL
    =========================================
    */
    const carpool = db.carpools.find(
      (c) =>
        c.offerId === data.carpoolId &&
        c.status === 'ACTIVE'
    );

    if (!carpool) {
      return notFound(res, 'Active carpool not found');
    }

    /*
    =========================================
     CHECK EXPIRED CARPOOL
    =========================================
    */
    const now = new Date();
    const tripDateTime = new Date(
      `${carpool.travelDate}T${carpool.departureTime}:00`
    );

    if (tripDateTime < now) {
      return badRequest(res, 'This carpool has expired');
    }

    /*
    =========================================
     GENDER RESTRICTION VALIDATION
    =========================================
    */
    if (
      carpool.genderPreference === 'FEMALE_ONLY' &&
      user.gender !== 'female'
    ) {
      return forbidden(res, 'This carpool is restricted to female users only');
    }

    if (
      carpool.genderPreference === 'MALE_ONLY' &&
      user.gender !== 'male'
    ) {
      return forbidden(res, 'This carpool is restricted to male users only');
    }

    /*
    =========================================
     REAL-TIME SEAT VALIDATION
    =========================================
    */

    // Check if seat is already booked
    const alreadyBooked = db.bookings.find(
      (b) =>
        b.carpoolId === data.carpoolId &&
        b.selectedSeat === data.selectedSeat &&
        ['CONFIRMED', 'PENDING'].includes(b.status)
    );

    if (alreadyBooked) {
      return conflict(res, 'Selected seat is already booked');
    }

    /*
    =========================================
     ACTIVE HOLD CHECK
    =========================================
    */

    const activeSeatHold = db.seatHolds.find(
      (h) =>
        h.carpoolId === data.carpoolId &&
        h.selectedSeat === data.selectedSeat &&
        h.expiresAt > Date.now()
    );

    if (activeSeatHold) {
      return conflict(res, 'Seat is temporarily locked by another user');
    }

    /*
    =========================================
     PREVENT MULTIPLE ACTIVE HOLDS
    =========================================
    */

    const userExistingHold = db.seatHolds.find(
      (h) =>
        h.userId === user.id &&
        h.expiresAt > Date.now()
    );

    if (userExistingHold) {
      return badRequest(res, 'You already have an active seat hold');
    }

    /*
    =========================================
     CHECK AVAILABLE SEATS
    =========================================
    */
    if (carpool.availableSeats <= 0) {
      return badRequest(res, 'No seats available');
    }

    /*
    =========================================
     SOFT LOCK SEAT (5 MINUTES)
    =========================================
    */

    const holdDurationMinutes = 5;

    const seatHold = {
      holdId: db.seatHolds.length + 1,
      userId: user.id,
      carpoolId: data.carpoolId,
      selectedSeat: data.selectedSeat,
      createdAt: Date.now(),
      expiresAt: Date.now() + holdDurationMinutes * 60 * 1000,
    };

    db.seatHolds.push(seatHold);

    /*
    =========================================
     FARE CALCULATION
    =========================================
    */

    const baseFare = carpool.fare || 500;

    const luggageCharge =
      data.hasLuggage === true
        ? 100
        : 0;

    const totalFare = baseFare + luggageCharge;

    /*
    =========================================
     CREATE BOOKING
    =========================================
    */

    const booking = {
      bookingId: db.bookings.length + 1,
      carpoolId: data.carpoolId,
      userId: user.id,
      selectedSeat: data.selectedSeat,
      hasLuggage: data.hasLuggage || false,
      fare: {
        baseFare,
        luggageCharge,
        totalFare,
      },
      status: 'PENDING',
      holdId: seatHold.holdId,
      createdAt: new Date().toISOString(),
    };

    db.bookings.push(booking);

    /*
    =========================================
     UPDATE AVAILABLE SEATS
    =========================================
    */

    carpool.availableSeats -= 1;

    /*
    =========================================
     SUCCESS RESPONSE
    =========================================
    */

    return created(res, {
      message: 'Seat booking created successfully',
      booking: {
        bookingId: booking.bookingId,
        carpoolId: booking.carpoolId,
        selectedSeat: booking.selectedSeat,
        bookingStatus: booking.status,
        fare: booking.fare,
        seatHoldExpiresInMinutes: holdDurationMinutes,
      },
    });

  } catch (error) {
    return badRequest(res, 'Invalid request body', { error: error.message });
  }
};

/*
========================================
 GET BOOKING
========================================
*/
const getBooking = (req, res) => {
  try {
    const user = req.user;
    const bookingId = parseInt(req.params.bookingId);

    const booking = db.bookings.find(
      (b) => b.bookingId === bookingId && b.userId === user.id
    );

    if (!booking) {
      return notFound(res, 'Booking not found');
    }

    const carpool = db.carpools.find((c) => c.offerId === booking.carpoolId);

    return ok(res, {
      booking: {
        bookingId: booking.bookingId,
        carpoolId: booking.carpoolId,
        selectedSeat: booking.selectedSeat,
        fare: booking.fare,
        status: booking.status,
        createdAt: booking.createdAt,
        carpool: {
          driverName: carpool.driverName,
          pickupLocation: carpool.pickupLocation,
          destinationStation: carpool.destinationStation,
          travelDate: carpool.travelDate,
          departureTime: carpool.departureTime,
        },
      },
    });
  } catch (error) {
    return badRequest(res, 'Error fetching booking', { error: error.message });
  }
};

/*
========================================
 GET USER BOOKINGS
========================================
*/
const getUserBookings = (req, res) => {
  try {
    const user = req.user;

    const userBookings = db.bookings.filter((b) => b.userId === user.id);

    const bookingsWithDetails = userBookings.map((booking) => {
      const carpool = db.carpools.find((c) => c.offerId === booking.carpoolId);

      return {
        bookingId: booking.bookingId,
        carpoolId: booking.carpoolId,
        selectedSeat: booking.selectedSeat,
        fare: booking.fare,
        status: booking.status,
        createdAt: booking.createdAt,
        carpool: carpool ? {
          driverName: carpool.driverName,
          pickupLocation: carpool.pickupLocation,
          destinationStation: carpool.destinationStation,
          travelDate: carpool.travelDate,
          departureTime: carpool.departureTime,
        } : null,
      };
    });

    return ok(res, {
      bookings: bookingsWithDetails,
      totalBookings: bookingsWithDetails.length,
    });
  } catch (error) {
    return badRequest(res, 'Error fetching bookings', { error: error.message });
  }
};

module.exports = {
  createBooking,
  getBooking,
  getUserBookings,
};
