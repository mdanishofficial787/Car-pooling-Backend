/*
========================================
 Preferences Controller
========================================

Handles publishing draft carpools with preferences
and converting them to active carpools.
*/

const {
  created,
  badRequest,
  notFound
} = require('../utils/responseHelper');
const db = require('../database/mockDB');

/*
========================================
 PUBLISH CARPOOL WITH PREFERENCES
 POST /api/carpool/preferences

Converts a draft offer into an active carpool
with preferences, pricing, and policies.
========================================
*/
const publishCarpool = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    /*
    =========================================
     REQUIRED FIELD VALIDATION
    =========================================
    */
    const requiredFields = [
      'draftId',
      'genderPreference',
      'luggagePolicy',
      'smokingPreference',
      'paymentMethods',
      'paymentSchedule',
      'baseFare'
    ];

    const missingFields = requiredFields.filter(
      (field) => data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    /*
    =========================================
     FIND DRAFT
    =========================================
    */
    const draft = db.draftOffers.find(
      (d) =>
        d.draftId === data.draftId &&
        d.userId === user.id
    );

    if (!draft) {
      return notFound(res, 'Draft carpool not found');
    }

    /*
    =========================================
     PREVENT REPUBLISH
    =========================================
    */
    if (draft.status === 'ACTIVE') {
      return badRequest(res, 'Carpool already published');
    }

    /*
    =========================================
     GENDER PREFERENCE VALIDATION
    =========================================
    */
    const allowedGenderPrefs = [
      'ANY',
      'MALE_ONLY',
      'FEMALE_ONLY'
    ];

    if (!allowedGenderPrefs.includes(data.genderPreference)) {
      return badRequest(res, 'Invalid genderPreference. Must be: ANY, MALE_ONLY, or FEMALE_ONLY');
    }

    /*
    =========================================
     LUGGAGE POLICY VALIDATION
    =========================================
    */
    const allowedLuggagePolicies = [
      'NONE',
      'SMALL',
      'LARGE'
    ];

    if (!allowedLuggagePolicies.includes(data.luggagePolicy)) {
      return badRequest(res, 'Invalid luggagePolicy. Must be: NONE, SMALL, or LARGE');
    }

    /*
    =========================================
     LARGE LUGGAGE VALIDATION
    =========================================
    */
    if (data.luggagePolicy === 'LARGE') {
      if (
        !data.extraLuggageCharge ||
        Number(data.extraLuggageCharge) <= 0
      ) {
        return badRequest(
          res,
          'extraLuggageCharge is required and must be greater than 0 when LARGE luggage policy is selected'
        );
      }
    }

    /*
    =========================================
     SMOKING PREFERENCE VALIDATION
    =========================================
    */
    const allowedSmokingPrefs = [
      'NO_SMOKING',
      'SMOKING_ALLOWED'
    ];

    if (!allowedSmokingPrefs.includes(data.smokingPreference)) {
      return badRequest(res, 'Invalid smokingPreference. Must be: NO_SMOKING or SMOKING_ALLOWED');
    }

    /*
    =========================================
     PAYMENT METHODS VALIDATION
    =========================================
    */
    const allowedPaymentMethods = [
      'CASH',
      'EASYPAISA',
      'JAZZCASH',
      'BANK_TRANSFER'
    ];

    if (
      !Array.isArray(data.paymentMethods) ||
      data.paymentMethods.length === 0
    ) {
      return badRequest(res, 'At least one payment method is required');
    }

    const invalidPaymentMethod = data.paymentMethods.find(
      (method) => !allowedPaymentMethods.includes(method)
    );

    if (invalidPaymentMethod) {
      return badRequest(
        res,
        `Invalid payment method: ${invalidPaymentMethod}. Allowed: CASH, EASYPAISA, JAZZCASH, BANK_TRANSFER`
      );
    }

    /*
    =========================================
     PAYMENT SCHEDULE VALIDATION
    =========================================
    */
    const allowedSchedules = [
      'PER_RIDE',
      'WEEKLY',
      'MONTHLY'
    ];

    if (!allowedSchedules.includes(data.paymentSchedule)) {
      return badRequest(res, 'Invalid paymentSchedule. Must be: PER_RIDE, WEEKLY, or MONTHLY');
    }

    /*
    =========================================
     BASE FARE VALIDATION
    =========================================
    */
    if (
      isNaN(data.baseFare) ||
      Number(data.baseFare) <= 0
    ) {
      return badRequest(res, 'baseFare must be greater than 0');
    }

    /*
    =========================================
     GET DRIVER PROFILE
    =========================================
    */
    const driver = db.users.find(
      (u) => u.userId === user.id
    );

    /*
    =========================================
     CONVERT DRAFT → ACTIVE CARPOOL
    =========================================
    */
    const publishedCarpool = {
      offerId: db.carpools.length + 1,
      draftId: draft.draftId,
      userId: user.id,
      driverName: driver ? driver.name : user.name,
      pickupLocation: draft.pickupLocation.area,
      pickupCoordinates: {
        latitude: draft.pickupLocation.latitude,
        longitude: draft.pickupLocation.longitude
      },
      destinationStation: draft.dropoffLocation.area,
      dropoffCoordinates: {
        latitude: draft.dropoffLocation.latitude,
        longitude: draft.dropoffLocation.longitude
      },
      travelDate: draft.travelDate,
      departureTime: draft.preferredTime,
      flexibilityMinutes: draft.flexibilityMinutes,
      recurrenceType: draft.recurrenceType,
      weekdays: draft.weekdays || [],
      dayOfMonth: draft.dayOfMonth || null,

      /*
      =====================================
       PREFERENCES
      =====================================
      */
      genderPreference: data.genderPreference,
      organizationName: data.organizationName || '',
      luggagePolicy: data.luggagePolicy,
      extraLuggageCharge: Number(data.extraLuggageCharge) || 0,
      smokingPreference: data.smokingPreference,
      paymentMethods: data.paymentMethods,
      paymentSchedule: data.paymentSchedule,

      /*
      =====================================
       PRICING
      =====================================
      */
      baseFare: Number(data.baseFare),
      fareBreakdown: {
        baseFare: Number(data.baseFare),
        luggageCharge: Number(data.extraLuggageCharge) || 0
      },

      /*
      =====================================
       OPTIONAL NOTE
      =====================================
      */
      note: data.note || '',

      /*
      =====================================
       DEFAULTS
      =====================================
      */
      availableSeats: 4,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    /*
    =========================================
     SAVE CARPOOL
    =========================================
    */
    db.carpools.push(publishedCarpool);

    /*
    =========================================
     UPDATE DRAFT STATUS
    =========================================
    */
    draft.status = 'ACTIVE';
    draft.publishedAt = new Date().toISOString();

    /*
    =========================================
     SUCCESS RESPONSE
    =========================================
    */
    return created(res, {
      message: 'Carpool published successfully',
      publishedCarpoolId: publishedCarpool.offerId,
      carpool: {
        offerId: publishedCarpool.offerId,
        draftId: publishedCarpool.draftId,
        pickupLocation: publishedCarpool.pickupLocation,
        destinationStation: publishedCarpool.destinationStation,
        travelDate: publishedCarpool.travelDate,
        departureTime: publishedCarpool.departureTime,
        genderPreference: publishedCarpool.genderPreference,
        luggagePolicy: publishedCarpool.luggagePolicy,
        smokingPreference: publishedCarpool.smokingPreference,
        paymentMethods: publishedCarpool.paymentMethods,
        paymentSchedule: publishedCarpool.paymentSchedule,
        fareBreakdown: publishedCarpool.fareBreakdown,
        status: publishedCarpool.status
      }
    });
  } catch (error) {
    return badRequest(res, 'Error publishing carpool', {
      error: error.message
    });
  }
};

module.exports = {
  publishCarpool
};
