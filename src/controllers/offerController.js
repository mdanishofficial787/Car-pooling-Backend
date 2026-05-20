/*
========================================
 Offer Controller
========================================

Handles draft carpool offers and recurrence patterns.
*/

const {
  created,
  badRequest,
  notFound,
  ok
} = require('../utils/responseHelper');
const {
  validateFields
} = require('../utils/validationHelper');
const db = require('../database/mockDB');

/*
========================================
 LOCATION VALIDATION HELPER
========================================
*/
const validateLocation = (location, fieldName) => {
  if (!location || typeof location !== 'object') {
    return `${fieldName} is required and must be an object`;
  }

  const requiredFields = ['latitude', 'longitude', 'area', 'street'];
  const missingFields = requiredFields.filter(field => location[field] === undefined || location[field] === null);

  if (missingFields.length > 0) {
    return `${fieldName} must include: ${missingFields.join(', ')}`;
  }

  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return `${fieldName} latitude and longitude must be numbers`;
  }

  return null;
};

/*
========================================
 TIME VALIDATION HELPER
========================================
*/
const validateTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

/*
========================================
 CREATE / UPDATE DRAFT CARPOOL OFFER
========================================

POST /api/carpool/draft

Creates a new draft or updates existing draft for user.
Supports ONE_TIME, WEEKLY, and MONTHLY recurrence.
*/
const createDraftOffer = (req, res) => {
  try {
    const user = req.user;
    const data = req.body;

    /*
    =========================================
     REQUIRED FIELD VALIDATION
    =========================================
    */
    const requiredFields = [
      'pickupLocation',
      'dropoffLocation',
      'preferredTime',
      'recurrenceType'
    ];
    const missingFields = validateFields(data, requiredFields);

    if (missingFields.length > 0) {
      return badRequest(res, 'Missing required fields', { missingFields });
    }

    /*
    =========================================
     PICKUP LOCATION VALIDATION
    =========================================
    */
    const pickupError = validateLocation(data.pickupLocation, 'pickupLocation');
    if (pickupError) {
      return badRequest(res, pickupError);
    }

    /*
    =========================================
     DROPOFF LOCATION VALIDATION
    =========================================
    */
    const dropoffError = validateLocation(data.dropoffLocation, 'dropoffLocation');
    if (dropoffError) {
      return badRequest(res, dropoffError);
    }

    /*
    =========================================
     DATE VALIDATION
    =========================================
    */
    let travelDate;

    if (!data.travelDate) {
      travelDate = new Date().toISOString().split('T')[0];
    } else {
      const parsedDate = new Date(data.travelDate);

      if (isNaN(parsedDate.getTime())) {
        return badRequest(res, 'Invalid travelDate format. Use YYYY-MM-DD');
      }

      travelDate = data.travelDate;
    }

    /*
    =========================================
     TIME VALIDATION
    =========================================
    */
    if (!validateTimeFormat(data.preferredTime)) {
      return badRequest(res, 'preferredTime must be in 24-hour HH:MM format');
    }

    /*
    =========================================
     FLEXIBILITY VALIDATION
    =========================================
    */
    const allowedFlexibility = [15, 30, 60];
    const flexibilityMinutes = data.flexibilityMinutes || 15;

    if (!allowedFlexibility.includes(flexibilityMinutes)) {
      return badRequest(res, 'flexibilityMinutes must be 15, 30, or 60');
    }

    /*
    =========================================
     RECURRENCE TYPE VALIDATION
    =========================================
    */
    const allowedRecurrence = ['ONE_TIME', 'WEEKLY', 'MONTHLY'];

    if (!allowedRecurrence.includes(data.recurrenceType)) {
      return badRequest(res, 'Invalid recurrenceType. Must be ONE_TIME, WEEKLY, or MONTHLY');
    }

    /*
    =========================================
     WEEKLY VALIDATION
    =========================================
    */
    if (data.recurrenceType === 'WEEKLY') {
      if (
        !Array.isArray(data.weekdays) ||
        data.weekdays.length === 0
      ) {
        return badRequest(res, 'weekdays array is required for WEEKLY recurrence and must not be empty');
      }

      const validWeekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const invalidDays = data.weekdays.filter(day => !validWeekdays.includes(day));

      if (invalidDays.length > 0) {
        return badRequest(res, `Invalid weekdays: ${invalidDays.join(', ')}`);
      }
    }

    /*
    =========================================
     MONTHLY VALIDATION
    =========================================
    */
    if (data.recurrenceType === 'MONTHLY') {
      if (!data.dayOfMonth || data.dayOfMonth < 1 || data.dayOfMonth > 31) {
        return badRequest(res, 'Valid dayOfMonth (1-31) is required for MONTHLY recurrence');
      }
    }

    /*
    =========================================
     FIND EXISTING DRAFT
    =========================================
    */
    let existingDraft = db.draftOffers.find(
      (d) =>
        d.userId === user.id &&
        d.status === 'DRAFT'
    );

    /*
    =========================================
     UPDATE EXISTING DRAFT
    =========================================
    */
    if (existingDraft) {
      existingDraft.pickupLocation = data.pickupLocation;
      existingDraft.dropoffLocation = data.dropoffLocation;
      existingDraft.travelDate = travelDate;
      existingDraft.preferredTime = data.preferredTime;
      existingDraft.flexibilityMinutes = flexibilityMinutes;
      existingDraft.recurrenceType = data.recurrenceType;
      existingDraft.weekdays = data.weekdays || [];
      existingDraft.dayOfMonth = data.dayOfMonth || null;
      existingDraft.updatedAt = new Date().toISOString();

      return ok(res, {
        message: 'Draft updated successfully',
        draftId: existingDraft.draftId,
        draft: {
          draftId: existingDraft.draftId,
          userId: existingDraft.userId,
          pickupLocation: existingDraft.pickupLocation,
          dropoffLocation: existingDraft.dropoffLocation,
          travelDate: existingDraft.travelDate,
          preferredTime: existingDraft.preferredTime,
          flexibilityMinutes: existingDraft.flexibilityMinutes,
          recurrenceType: existingDraft.recurrenceType,
          weekdays: existingDraft.weekdays,
          dayOfMonth: existingDraft.dayOfMonth,
          status: existingDraft.status,
          createdAt: existingDraft.createdAt,
          updatedAt: existingDraft.updatedAt
        }
      });
    }

    /*
    =========================================
     CREATE NEW DRAFT
    =========================================
    */
    const newDraft = {
      draftId: db.draftOffers.length + 1,
      userId: user.id,
      pickupLocation: {
        latitude: data.pickupLocation.latitude,
        longitude: data.pickupLocation.longitude,
        area: data.pickupLocation.area,
        street: data.pickupLocation.street
      },
      dropoffLocation: {
        latitude: data.dropoffLocation.latitude,
        longitude: data.dropoffLocation.longitude,
        area: data.dropoffLocation.area,
        street: data.dropoffLocation.street
      },
      travelDate,
      preferredTime: data.preferredTime,
      flexibilityMinutes,
      recurrenceType: data.recurrenceType,
      weekdays: data.weekdays || [],
      dayOfMonth: data.dayOfMonth || null,
      status: 'DRAFT',
      createdAt: new Date().toISOString()
    };

    db.draftOffers.push(newDraft);

    /*
    =========================================
     SUCCESS RESPONSE
    =========================================
    */
    return created(res, {
      message: 'Draft carpool offer created successfully',
      draftId: newDraft.draftId,
      draft: {
        draftId: newDraft.draftId,
        userId: newDraft.userId,
        pickupLocation: newDraft.pickupLocation,
        dropoffLocation: newDraft.dropoffLocation,
        travelDate: newDraft.travelDate,
        preferredTime: newDraft.preferredTime,
        flexibilityMinutes: newDraft.flexibilityMinutes,
        recurrenceType: newDraft.recurrenceType,
        weekdays: newDraft.weekdays,
        dayOfMonth: newDraft.dayOfMonth,
        status: newDraft.status,
        createdAt: newDraft.createdAt
      }
    });

  } catch (error) {
    return badRequest(res, 'Invalid request body', { error: error.message });
  }
};

/*
========================================
 GET DRAFT OFFER
========================================

GET /api/carpool/draft

Retrieve the current DRAFT for authenticated user.
*/
const getDraftOffer = (req, res) => {
  try {
    const user = req.user;

    const draft = db.draftOffers.find(
      (d) =>
        d.userId === user.id &&
        d.status === 'DRAFT'
    );

    if (!draft) {
      return notFound(res, 'No draft offer found');
    }

    return ok(res, {
      draft: {
        draftId: draft.draftId,
        userId: draft.userId,
        pickupLocation: draft.pickupLocation,
        dropoffLocation: draft.dropoffLocation,
        travelDate: draft.travelDate,
        preferredTime: draft.preferredTime,
        flexibilityMinutes: draft.flexibilityMinutes,
        recurrenceType: draft.recurrenceType,
        weekdays: draft.weekdays,
        dayOfMonth: draft.dayOfMonth,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      }
    });
  } catch (error) {
    return badRequest(res, 'Error fetching draft', { error: error.message });
  }
};

/*
========================================
 DELETE DRAFT OFFER
========================================

DELETE /api/carpool/draft

Delete the current DRAFT for authenticated user.
*/
const deleteDraftOffer = (req, res) => {
  try {
    const user = req.user;

    const draftIndex = db.draftOffers.findIndex(
      (d) =>
        d.userId === user.id &&
        d.status === 'DRAFT'
    );

    if (draftIndex === -1) {
      return notFound(res, 'No draft offer found');
    }

    const deletedDraft = db.draftOffers.splice(draftIndex, 1)[0];

    return ok(res, {
      message: 'Draft offer deleted successfully',
      draftId: deletedDraft.draftId
    });
  } catch (error) {
    return badRequest(res, 'Error deleting draft', { error: error.message });
  }
};

module.exports = {
  createDraftOffer,
  getDraftOffer,
  deleteDraftOffer
};
