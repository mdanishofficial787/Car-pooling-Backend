/*
========================================
 Confirmation Controller
========================================

Handles booking confirmation and trip finalization.
*/

const {
  ok,
  badRequest,
  notFound
} = require('../utils/responseHelper');
const db = require('../database/mockDB');

/*
========================================
 CONFIRM BOOKING
 POST /api/booking/confirm

Confirms a booking, locks seat, removes hold,
and creates final trip record.
========================================
*/
const confirmBooking = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    /*
    =========================================
     REQUIRED FIELD VALIDATION
    =========================================
    */
    const requiredFields = ['bookingId', 'paymentMethod'];
    const missingFields = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    /*
    =========================================
     VALIDATE PAYMENT METHOD
    =========================================
    */
    const allowedMethods = [
      'CASH',
      'EASYPAISA',
      'JAZZCASH',
      'BANK_TRANSFER'
    ];

    if (!allowedMethods.includes(data.paymentMethod)) {
      return badRequest(res, 'Invalid payment method. Allowed: CASH, EASYPAISA, JAZZCASH, BANK_TRANSFER');
    }

    /*
    =========================================
     FIND BOOKING
    =========================================
    */
    const booking = db.bookings.find(
      (b) => b.bookingId === data.bookingId
    );

    if (!booking) {
      return notFound(res, 'Booking not found');
    }

    /*
    =========================================
     VERIFY USER OWNERSHIP
    =========================================
    */
    if (booking.userId !== user.id) {
      return badRequest(res, 'You can only confirm your own bookings');
    }

    /*
    =========================================
     PREVENT DUPLICATE CONFIRMATION
    =========================================
    */
    if (booking.status === 'CONFIRMED') {
      return badRequest(res, 'Booking already confirmed');
    }

    /*
    =========================================
     CHECK BOOKING STATUS
    =========================================
    */
    if (booking.status !== 'PENDING') {
      return badRequest(res, `Cannot confirm booking with status: ${booking.status}`);
    }

    /*
    =========================================
     FIND CARPOOL
    =========================================
    */
    const carpool = db.carpools.find(
      (c) => c.offerId === booking.carpoolId
    );

    if (!carpool) {
      return notFound(res, 'Carpool not found');
    }

    /*
    =========================================
     FIND DRIVER USER
    =========================================
    */
    const driver = db.users.find(
      (u) => u.userId === carpool.userId
    );

    if (!driver) {
      return notFound(res, 'Driver profile not found');
    }

    /*
    =========================================
     LOCK SEAT PERMANENTLY
    =========================================
    */
    booking.status = 'CONFIRMED';
    booking.confirmedAt = new Date().toISOString();
    booking.seatLocked = true;
    booking.paymentMethod = data.paymentMethod;

    /*
    =========================================
     REMOVE ACTIVE HOLD
    =========================================
    */
    if (booking.holdId) {
      const holdIndex = db.seatHolds.findIndex(
        (h) => h.holdId === booking.holdId
      );

      if (holdIndex !== -1) {
        db.seatHolds.splice(holdIndex, 1);
      }
    }

    /*
    =========================================
     GENERATE UNIQUE TRIP ID
    =========================================
    */
    const tripId = `TRIP-${Date.now()}`;

    /*
    =========================================
     GET FARE DETAILS
    =========================================
    */
    const baseFare = booking.fare.baseFare;
    const luggageCharge = booking.fare.luggageCharge;
    const totalFare = booking.fare.totalFare;

    /*
    =========================================
     CALCULATE DRIVER VERIFICATION SCORE
    =========================================
    */
    let verificationScore = 0;

    if (driver.verificationScore !== undefined) {
      verificationScore = driver.verificationScore;
    }

    /*
    =========================================
     CREATE FINAL TRIP RECORD
    =========================================
    */
    const finalTrip = {
      tripId,
      bookingId: booking.bookingId,
      riderId: booking.userId,
      driverId: carpool.userId,
      carpoolId: carpool.offerId,
      seatNumber: booking.selectedSeat,
      tripStatus: 'CONFIRMED',
      pickupLocation: carpool.pickupLocation,
      dropoffLocation: carpool.destinationStation,
      travelDate: carpool.travelDate,
      departureTime: carpool.departureTime,
      vehicleDetails: {
        vehicleType: carpool.vehicleType || 'Car',
        vehicleName: carpool.vehicleName || 'Unknown',
        vehicleNumber: carpool.vehicleNumber || 'Unknown'
      },
      coRiderDetails: {
        profileInfo: {
          userId: driver.userId,
          name: driver.name
        },
        verificationStatus:
          verificationScore > 0 ? 'VERIFIED' : 'NOT_VERIFIED',
        verificationScore
      },
      fare: {
        baseFare,
        luggageCharge,
        totalFare
      },
      payment: {
        paymentMethod: data.paymentMethod,
        paymentSchedule: carpool.paymentSchedule || 'PER_RIDE'
      },
      recurringSchedule: {
        recurrenceType: carpool.recurrenceType || 'ONE_TIME',
        weekdays: carpool.weekdays || [],
        dayOfMonth: carpool.dayOfMonth || null
      },
      createdAt: new Date().toISOString()
    };

    /*
    =========================================
     SAVE TRIP
    =========================================
    */
    db.confirmedTrips.push(finalTrip);

    /*
    =========================================
     SUCCESS RESPONSE
    =========================================
    */
    return ok(res, {
      message: 'Booking confirmed successfully',
      trip: {
        tripId: finalTrip.tripId,
        bookingStatus: booking.status,
        seatLocked: booking.seatLocked,
        coRiderDetails: finalTrip.coRiderDetails,
        pickupLocation: finalTrip.pickupLocation,
        dropoffLocation: finalTrip.dropoffLocation,
        travelDate: finalTrip.travelDate,
        departureTime: finalTrip.departureTime,
        vehicleDetails: finalTrip.vehicleDetails,
        fare: finalTrip.fare,
        payment: finalTrip.payment,
        recurringSchedule: finalTrip.recurringSchedule,
        createdAt: finalTrip.createdAt
      }
    });
  } catch (error) {
    return badRequest(res, 'Error confirming booking', {
      error: error.message
    });
  }
};

module.exports = {
  confirmBooking
};
