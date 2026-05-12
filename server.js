const http = require('http');
const socketIo = require('socket.io');

const port = process.env.PORT || 5000;

/*
========================================
 In-Memory Mock Database
========================================
*/
const users = [
  {
    userId: 1,
    name: "Muhammad Bilal",
    gender: "male"
  },
  {
    userId: 2,
    name: "Ayesha",
    gender: "female"
  }
];

const carpools = [];
const joinRequests = [];
const tripAssignments = [];
const auditLogs = [];
const ratings = []; // Store submitted trip ratings

// Initialize with a completed trip for testing
tripAssignments.push({
  assignmentId: 1,
  tripId: 101,
  driverId: 2,
  pickupLocation: "NUML Islamabad",
  destination: "Rawalpindi Saddar",
  estimatedEarnings: 1500,
  route: "Main GT Road",
  requiredSeats: 3,
  status: 'COMPLETED',
  createdAt: new Date(),
  completedAt: new Date(),
});

// Add another completed trip for testing
tripAssignments.push({
  assignmentId: 2,
  tripId: 202,
  driverId: 3,
  pickupLocation: "Lahore Airport",
  destination: "Islamabad F-10",
  estimatedEarnings: 2000,
  route: "M-2 Motorway",
  requiredSeats: 2,
  status: 'COMPLETED',
  createdAt: new Date(),
  completedAt: new Date(),
});

/*
========================================
 JSON Body Parser
========================================
*/
const parseJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });

/*
========================================
 Authentication Middleware
========================================
*/
const authenticateUser = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, message: 'Unauthorized: Missing Authorization header' }));
    return null;
  }

  /*
    Mock authenticated user.
    In production: decode & verify JWT token here.
  */
  return {
    id: 1,
    name: 'Muhammad Bilal',
    gender: 'male',
    role: 'user',
  };
};

/*
========================================
 Send JSON Response Helper
========================================
*/
const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

/*
========================================
 Validate Required Fields Helper
========================================
*/
const validateFields = (data, requiredFields) => {
  return requiredFields.filter((field) => !(field in data) || data[field] === '' || data[field] === null);
};

/*
========================================
 Main Request Listener
========================================
*/
const requestListener = async (req, res) => {

  /*
  ================================
   CORS Headers
  ================================
  */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  /*
  ================================
   Home / Health Check Route
  ================================
  */
  if (req.method === 'GET' && req.url === '/') {
    sendJson(res, 200, {
      success: true,
      message: 'Carpool API Server Running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  /*
  =========================================================
   CREATE CARPOOL OFFER
   POST /api/carpool/create
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/carpool/create') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      // Required field check
      const requiredFields = ['pickupLocation', 'destinationStation', 'travelDate', 'departureTime', 'availableSeats'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Past date validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tripDate = new Date(data.travelDate);

      if (isNaN(tripDate.getTime())) {
        sendJson(res, 400, { success: false, message: 'Invalid travelDate format. Use YYYY-MM-DD' });
        return;
      }

      if (tripDate < today) {
        sendJson(res, 400, { success: false, message: 'Past travel dates are not allowed' });
        return;
      }

      // Departure time format validation (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(data.departureTime)) {
        sendJson(res, 400, { success: false, message: 'Invalid departureTime format. Use HH:MM (24-hour)' });
        return;
      }

      // Seat count validation
      const seats = parseInt(data.availableSeats);
      if (isNaN(seats) || seats <= 0) {
        sendJson(res, 400, { success: false, message: 'availableSeats must be a positive integer' });
        return;
      }

      if (seats > 10) {
        sendJson(res, 400, { success: false, message: 'availableSeats cannot exceed 10' });
        return;
      }

      // Gender preference validation
      const allowedGenderPrefs = ['OPEN', 'FEMALE_ONLY', 'MALE_ONLY'];
      const genderPreference = data.genderPreference || 'OPEN';

      if (!allowedGenderPrefs.includes(genderPreference)) {
        sendJson(res, 400, {
          success: false,
          message: `Invalid genderPreference. Allowed values: ${allowedGenderPrefs.join(', ')}`,
        });
        return;
      }

      // Create carpool
      const newCarpool = {
        offerId: carpools.length + 1,
        userId: user.id,
        driverName: user.name,
        pickupLocation: data.pickupLocation,
        destinationStation: data.destinationStation,
        travelDate: data.travelDate,
        departureTime: data.departureTime,
        availableSeats: seats,
        travelPreferences: data.travelPreferences || '',
        genderPreference,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      carpools.push(newCarpool);

      sendJson(res, 201, {
        success: true,
        message: 'Carpool created successfully',
        offerId: newCarpool.offerId,
        carpool: newCarpool,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   GET ALL CARPOOLS
   GET /api/carpool/list
  =========================================================
  */
  if (req.method === 'GET' && req.url === '/api/carpool/list') {
    const user = authenticateUser(req, res);
    if (!user) return;

    const activeCarpools = carpools.filter((c) => c.status === 'ACTIVE');

    sendJson(res, 200, {
      success: true,
      total: activeCarpools.length,
      carpools: activeCarpools,
    });

    return;
  }

  /*
  =========================================================
   SEARCH CARPOOLS WITH GENDER FILTERING
   GET /api/carpool/search
  =========================================================
  */
  if (req.method === 'GET' && req.url.startsWith('/api/carpool/search')) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const visibleCarpools = carpools.filter((carpool) => {
      // Hide female-only carpools from non-female users
      if (
        carpool.genderPreference === 'FEMALE_ONLY' &&
        user.gender !== 'female'
      ) {
        return false;
      }

      // Hide male-only carpools from non-male users
      if (
        carpool.genderPreference === 'MALE_ONLY' &&
        user.gender !== 'male'
      ) {
        return false;
      }

      return true;
    });

    sendJson(res, 200, {
      success: true,
      totalResults: visibleCarpools.length,
      carpools: visibleCarpools,
    });

    return;
  }

  /*
  =========================================================
   MATCH ROUTES
   POST /api/match/route
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/match/route') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      const missingFields = validateFields(data, ['pickupLocation', 'destinationStation']);
      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Find matching carpools based on pickup and destination
      const matchedRoutes = carpools.filter((carpool) => {
        const pickupMatch = carpool.pickupLocation.toLowerCase().includes(data.pickupLocation.toLowerCase());
        const destinationMatch = carpool.destinationStation.toLowerCase().includes(data.destinationStation.toLowerCase());
        
        return pickupMatch && destinationMatch && carpool.status === 'ACTIVE';
      });

      // Filter by gender preference for current user
      const visibleRoutes = matchedRoutes.filter((route) => {
        if (route.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
          return false;
        }
        if (route.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
          return false;
        }
        return true;
      });

      sendJson(res, 200, {
        success: true,
        pickupLocation: data.pickupLocation,
        destinationStation: data.destinationStation,
        matchedCount: visibleRoutes.length,
        routes: visibleRoutes.map((route) => ({
          offerId: route.offerId,
          driverName: route.driverName,
          pickupLocation: route.pickupLocation,
          destinationStation: route.destinationStation,
          travelDate: route.travelDate,
          departureTime: route.departureTime,
          availableSeats: route.availableSeats,
          genderPreference: route.genderPreference,
          travelPreferences: route.travelPreferences,
        })),
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   MATCH CARPOOLS BY TIME
   POST /api/match/time
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/match/time') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      const missingFields = validateFields(data, ['travelDate', 'departureTime']);
      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Validate date format
      const travelDate = new Date(data.travelDate);
      if (isNaN(travelDate.getTime())) {
        sendJson(res, 400, { success: false, message: 'Invalid travelDate format. Use YYYY-MM-DD' });
        return;
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(data.departureTime)) {
        sendJson(res, 400, { success: false, message: 'Invalid departureTime format. Use HH:MM (24-hour)' });
        return;
      }

      // Find matching carpools by date and time
      const matchedByTime = carpools.filter((carpool) => {
        const dateMatch = carpool.travelDate === data.travelDate;
        const timeMatch = carpool.departureTime === data.departureTime;
        
        return dateMatch && timeMatch && carpool.status === 'ACTIVE';
      });

      // Filter by gender preference for current user
      const visibleTimeRoutes = matchedByTime.filter((route) => {
        if (route.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
          return false;
        }
        if (route.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
          return false;
        }
        return true;
      });

      sendJson(res, 200, {
        success: true,
        travelDate: data.travelDate,
        departureTime: data.departureTime,
        matchedCount: visibleTimeRoutes.length,
        routes: visibleTimeRoutes.map((route) => ({
          offerId: route.offerId,
          driverName: route.driverName,
          pickupLocation: route.pickupLocation,
          destinationStation: route.destinationStation,
          travelDate: route.travelDate,
          departureTime: route.departureTime,
          availableSeats: route.availableSeats,
          genderPreference: route.genderPreference,
          travelPreferences: route.travelPreferences,
        })),
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   GET SINGLE CARPOOL
   GET /api/carpool/:offerId
  =========================================================
  */
  const carpoolDetailMatch = req.url.match(/^\/api\/carpool\/(\d+)$/);
  if (req.method === 'GET' && carpoolDetailMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const offerId = parseInt(carpoolDetailMatch[1]);
    const carpool = carpools.find((c) => c.offerId === offerId);

    if (!carpool) {
      sendJson(res, 404, { success: false, message: 'Carpool not found' });
      return;
    }

    sendJson(res, 200, { success: true, carpool });
    return;
  }

  /*
  =========================================================
   JOIN REQUEST
   POST /api/carpool/join-request
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/carpool/join-request') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      const missingFields = validateFields(data, ['carpoolId', 'message']);
      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Find carpool
      const carpool = carpools.find((c) => c.offerId === data.carpoolId);
      if (!carpool) {
        sendJson(res, 404, { success: false, message: 'Carpool not found' });
        return;
      }

      // Carpool must be active
      if (carpool.status !== 'ACTIVE') {
        sendJson(res, 400, { success: false, message: 'This carpool is no longer active' });
        return;
      }

      // Prevent joining own carpool
      if (carpool.userId === user.id) {
        sendJson(res, 400, { success: false, message: 'You cannot join your own carpool' });
        return;
      }

      // Duplicate request check
      const existingRequest = joinRequests.find(
        (r) => r.userId === user.id && r.carpoolId === data.carpoolId
      );
      if (existingRequest) {
        sendJson(res, 400, { success: false, message: 'You have already requested to join this carpool' });
        return;
      }

      // Seat availability
      if (carpool.availableSeats <= 0) {
        sendJson(res, 400, { success: false, message: 'No seats available in this carpool' });
        return;
      }

      // Gender restriction check
      if (carpool.genderPreference === 'FEMALE_ONLY' && user.gender !== 'female') {
        auditLogs.push({
          userId: user.id,
          action: 'JOIN_BLOCKED',
          reason: 'Female only restriction',
          carpoolId: data.carpoolId,
          createdAt: new Date().toISOString(),
        });
        sendJson(res, 403, { success: false, message: 'This carpool is restricted to female users only' });
        return;
      }

      if (carpool.genderPreference === 'MALE_ONLY' && user.gender !== 'male') {
        auditLogs.push({
          userId: user.id,
          action: 'JOIN_BLOCKED',
          reason: 'Male only restriction',
          carpoolId: data.carpoolId,
          createdAt: new Date().toISOString(),
        });
        sendJson(res, 403, { success: false, message: 'This carpool is restricted to male users only' });
        return;
      }

      // Create join request
      const joinRequest = {
        requestId: joinRequests.length + 1,
        carpoolId: data.carpoolId,
        userId: user.id,
        userName: user.name,
        message: data.message,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      joinRequests.push(joinRequest);

      sendJson(res, 201, {
        success: true,
        message: 'Join request submitted successfully',
        requestId: joinRequest.requestId,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   ACCEPT / REJECT JOIN REQUEST
   POST /api/carpool/join-request/:requestId/respond
  =========================================================
  */
  const respondMatch = req.url.match(/^\/api\/carpool\/join-request\/(\d+)\/respond$/);
  if (req.method === 'POST' && respondMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);
      const requestId = parseInt(respondMatch[1]);

      if (!data.action || !['ACCEPT', 'REJECT'].includes(data.action)) {
        sendJson(res, 400, { success: false, message: 'action must be either ACCEPT or REJECT' });
        return;
      }

      const joinRequest = joinRequests.find((r) => r.requestId === requestId);
      if (!joinRequest) {
        sendJson(res, 404, { success: false, message: 'Join request not found' });
        return;
      }

      if (joinRequest.status !== 'PENDING') {
        sendJson(res, 400, { success: false, message: `Request already ${joinRequest.status.toLowerCase()}` });
        return;
      }

      const carpool = carpools.find((c) => c.offerId === joinRequest.carpoolId);

      // Only carpool owner can respond
      if (!carpool || carpool.userId !== user.id) {
        sendJson(res, 403, { success: false, message: 'You are not authorized to respond to this request' });
        return;
      }

      joinRequest.status = data.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
      joinRequest.respondedAt = new Date().toISOString();

      if (data.action === 'ACCEPT') {
        carpool.availableSeats -= 1;
        if (carpool.availableSeats === 0) {
          carpool.status = 'FULL';
        }
      }

      sendJson(res, 200, {
        success: true,
        message: `Join request ${joinRequest.status.toLowerCase()} successfully`,
        requestId,
        newStatus: joinRequest.status,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   ASSIGN DRIVER TO TRIP
   POST /api/driver/assign-trip
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/driver/assign-trip') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      const requiredFields = ['tripId', 'pickupLocation', 'destination', 'estimatedEarnings', 'route', 'requiredSeats'];
      const missingFields = validateFields(data, requiredFields);

      if (missingFields.length > 0) {
        sendJson(res, 400, { success: false, error: 'Missing required fields', missingFields });
        return;
      }

      // Validate route is an array
      if (!Array.isArray(data.route) || data.route.length === 0) {
        sendJson(res, 400, { success: false, message: 'route must be a non-empty array of stops' });
        return;
      }

      // Duplicate assignment check
      const existingAssignment = tripAssignments.find((t) => t.tripId === data.tripId);
      if (existingAssignment) {
        sendJson(res, 400, { success: false, message: 'This trip has already been assigned to a driver' });
        return;
      }

      const assignment = {
        assignmentId: tripAssignments.length + 1,
        tripId: data.tripId,
        driverId: user.id,
        driverName: user.name,
        pickupLocation: data.pickupLocation,
        destination: data.destination,
        estimatedEarnings: data.estimatedEarnings,
        route: data.route,
        requiredSeats: data.requiredSeats,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      tripAssignments.push(assignment);

      sendJson(res, 200, {
        success: true,
        message: 'Trip assigned to driver successfully',
        assignment,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body', details: error.message });
    }

    return;
  }

  /*
  =========================================================
   START TRIP
   POST /api/trip/start
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/trip/start') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      if (!data.tripId) {
        sendJson(res, 400, { success: false, message: 'tripId is required' });
        return;
      }

      // Find assignment and update status
      const assignment = tripAssignments.find((t) => t.tripId === data.tripId);

      if (!assignment) {
        sendJson(res, 404, { success: false, message: 'Trip assignment not found' });
        return;
      }

      if (assignment.status === 'IN_PROGRESS') {
        sendJson(res, 400, { success: false, message: 'Trip is already in progress' });
        return;
      }

      if (assignment.status === 'COMPLETED') {
        sendJson(res, 400, { success: false, message: 'Trip has already been completed' });
        return;
      }

      assignment.status = 'IN_PROGRESS';
      assignment.startedAt = new Date().toISOString();

      sendJson(res, 200, {
        success: true,
        message: 'Trip started successfully',
        tripId: data.tripId,
        startedAt: assignment.startedAt,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    return;
  }

  /*
  =========================================================
   END TRIP
   POST /api/trip/end
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/trip/end') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      if (!data.tripId) {
        sendJson(res, 400, { success: false, message: 'tripId is required' });
        return;
      }

      const assignment = tripAssignments.find((t) => t.tripId === data.tripId);

      if (!assignment) {
        sendJson(res, 404, { success: false, message: 'Trip assignment not found' });
        return;
      }

      if (assignment.status !== 'IN_PROGRESS') {
        sendJson(res, 400, { success: false, message: 'Trip is not currently in progress' });
        return;
      }

      assignment.status = 'COMPLETED';
      assignment.completedAt = new Date().toISOString();

      sendJson(res, 200, {
        success: true,
        message: 'Trip ended successfully',
        tripId: data.tripId,
        completedAt: assignment.completedAt,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    }

    return;
  }

  /*
  =========================================================
   GET TRIP STATUS
   GET /api/trip/:tripId/status
  =========================================================
  */
  const tripStatusMatch = req.url.match(/^\/api\/trip\/([^/]+)\/status$/);
  if (req.method === 'GET' && tripStatusMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const tripId = tripStatusMatch[1];
    const assignment = tripAssignments.find((t) => String(t.tripId) === tripId);

    if (!assignment) {
      sendJson(res, 404, { success: false, message: 'Trip not found' });
      return;
    }

    sendJson(res, 200, {
      success: true,
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
      driverLocation: assignment.status === 'IN_PROGRESS'
        ? { latitude: 33.6844, longitude: 73.0479 }
        : null,
    });

    return;
  }

  /*
  =========================================================
   GET TRIP CONTACT INFO
   GET /api/trip/contact/:tripId
  =========================================================
  */
  const tripContactMatch = req.url.match(/^\/api\/trip\/contact\/([^/]+)$/);
  if (req.method === 'GET' && tripContactMatch) {
    const user = authenticateUser(req, res);
    if (!user) return;

    const tripId = tripContactMatch[1];

    // Mock contact information with privacy protection
    // Note: In a real app, this would check trip status and timing
    sendJson(res, 200, {
      success: true,
      releaseWindowMinutes: 30,
      minutesRemaining: 120,
      riderPhone: "*******4567",
      driverPhone: "*******4567"
    });

    return;
  }

  /*
  =========================================================
   GET AUDIT LOGS (Admin)
   GET /api/admin/audit-logs
  =========================================================
  */
  if (req.method === 'GET' && req.url === '/api/admin/audit-logs') {
    const user = authenticateUser(req, res);
    if (!user) return;

    sendJson(res, 200, {
      success: true,
      total: auditLogs.length,
      logs: auditLogs,
    });

    return;
  }

  /*
  =========================================================
   RATE TRIP
   POST /api/trip/rate
  =========================================================
  */
  if (req.method === 'POST' && req.url === '/api/trip/rate') {
    const user = authenticateUser(req, res);
    if (!user) return;

    try {
      const data = await parseJsonBody(req);

      const requiredFields = ['tripId', 'targetUserId', 'rating'];
      const missingFields = requiredFields.filter((field) => !(field in data));

      if (missingFields.length > 0) {
        sendJson(res, 400, {
          success: false,
          error: 'Missing required fields',
          missingFields,
        });
        return;
      }

      // Validate rating range (1-5)
      if (data.rating < 1 || data.rating > 5) {
        sendJson(res, 400, {
          success: false,
          message: 'Rating must be between 1 and 5',
        });
        return;
      }

      // Check if trip is completed (ratings only allowed after completion)
      const tripAssignment = tripAssignments.find((t) => String(t.tripId) === String(data.tripId));
      if (!tripAssignment || tripAssignment.status !== 'COMPLETED') {
        sendJson(res, 400, {
          success: false,
          message: 'Ratings allowed only after trip completion',
        });
        return;
      }

      // Check for duplicate rating (user already rated this trip)
      const existingRating = ratings.find(
        (r) => r.tripId === data.tripId && r.fromUserId === user.id
      );

      if (existingRating) {
        sendJson(res, 400, {
          success: false,
          message: 'You have already submitted a rating for this trip',
        });
        return;
      }

      // Mock rating storage (in a real app, this would be saved to database)
      const rating = {
        ratingId: Date.now(), // Simple ID generation
        tripId: data.tripId,
        fromUserId: user.id,
        targetUserId: data.targetUserId,
        rating: data.rating,
        comment: data.comment || '',
        issueReported: data.issueReported || '',
        createdAt: new Date(),
      };

      // Store the rating
      ratings.push(rating);

      console.log('Trip rating submitted:', rating);

      sendJson(res, 201, {
        success: true,
        message: 'Rating submitted successfully',
        ratingId: rating.ratingId,
      });

    } catch (error) {
      sendJson(res, 400, {
        success: false,
        error: 'Invalid JSON body',
        details: error.message,
      });
    }

    return;
  }

  /*
  =========================================================
   ADMIN DASHBOARD
   GET /api/admin/dashboard
  =========================================================
  */
  if (req.method === 'GET' && req.url.startsWith('/api/admin/dashboard')) {
    const user = authenticateUser(req, res);
    if (!user) return;

    // Parse query parameters for date filters
    const urlObj = new URL(req.url, 'http://localhost');
    const startDateParam = urlObj.searchParams.get('startDate');
    const endDateParam = urlObj.searchParams.get('endDate');

    // Use provided dates or default to last 30 days
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().setDate(endDate.getDate() - 30));

    // Calculate metrics
    const activePoolsCount = carpools.filter((c) => c.status === 'ACTIVE').length;
    const matchedTripsCount = tripAssignments.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'IN_PROGRESS'
    ).length;
    const cancelledTripsCount = tripAssignments.filter((t) => t.status === 'CANCELLED').length;

    // Calculate average match time (mock calculation)
    const completedTrips = tripAssignments.filter((t) => t.status === 'COMPLETED');
    const averageMatchTimeMinutes = completedTrips.length > 0
      ? Math.round(completedTrips.reduce((sum, t) => sum + 6, 0) / completedTrips.length)
      : 0;

    // Safety incidents (from ratings with issues)
    const safetyIncidentsCount = ratings.filter((r) => r.issueReported).length;

    // Driver status (mock data)
    const availableDrivers = 14;
    const busyDrivers = 6;

    sendJson(res, 200, {
      success: true,
      filters: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      dashboard: {
        activePoolsCount,
        matchedTripsCount,
        cancelledTripsCount,
        averageMatchTimeMinutes,
        safetyIncidentsCount,
        drivers: {
          available: availableDrivers,
          busy: busyDrivers,
        },
      },
    });

    return;
  }

  /*
  =========================================================
   404 — Route Not Found
  =========================================================
  */
  sendJson(res, 404, {
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET  /',
      'GET  /api/carpool/list',
      'GET  /api/carpool/search',
      'GET  /api/carpool/:offerId',
      'POST /api/carpool/create',
      'POST /api/carpool/join-request',
      'POST /api/carpool/join-request/:requestId/respond',
      'POST /api/match/route',
      'POST /api/match/time',
      'POST /api/driver/assign-trip',
      'POST /api/trip/start',
      'POST /api/trip/end',
      'GET  /api/trip/:tripId/status',
      'GET  /api/admin/audit-logs',
      'GET  /api/admin/dashboard',
    ],
  });
};

/*
=========================================================
 CREATE HTTP SERVER
=========================================================
*/
const server = http.createServer(requestListener);

/*
=========================================================
 SOCKET.IO SERVER
=========================================================
*/
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

/*
=========================================================
 SOCKET CONNECTIONS
=========================================================
*/
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  /*
  ========================================
   Driver joins their own room
  ========================================
  */
  socket.on('driver:join', (data) => {
    if (data?.driverId) {
      socket.join(`driver:${data.driverId}`);
      console.log(`[Socket] Driver ${data.driverId} joined their room`);
    }
  });

  /*
  ========================================
   Passenger joins trip room
  ========================================
  */
  socket.on('trip:join', (data) => {
    if (data?.tripId) {
      socket.join(`trip:${data.tripId}`);
      console.log(`[Socket] User joined trip room: ${data.tripId}`);
    }
  });

  /*
  ========================================
   Driver Location Update
  ========================================
  */
  socket.on('driver:location:update', (data) => {
    if (!data?.tripId || data?.latitude == null || data?.longitude == null) {
      socket.emit('error', { message: 'tripId, latitude, and longitude are required' });
      return;
    }

    console.log(`[Socket] Driver location update for trip ${data.tripId}:`, data.latitude, data.longitude);

    // Broadcast to all passengers in the trip room
    io.to(`trip:${data.tripId}`).emit('trip:location:update', {
      tripId: data.tripId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  });

  /*
  ========================================
   Trip Status Update
  ========================================
  */
  socket.on('trip:status:update', (data) => {
    if (!data?.tripId || !data?.status) {
      socket.emit('error', { message: 'tripId and status are required' });
      return;
    }

    console.log(`[Socket] Trip ${data.tripId} status changed to: ${data.status}`);

    io.to(`trip:${data.tripId}`).emit('trip:status:changed', {
      tripId: data.tripId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  });

  /*
  ========================================
   Send Chat Message in Trip
  ========================================
  */
  socket.on('trip:message', (data) => {
    if (!data?.tripId || !data?.message) {
      socket.emit('error', { message: 'tripId and message are required' });
      return;
    }

    io.to(`trip:${data.tripId}`).emit('trip:message:received', {
      tripId: data.tripId,
      senderId: data.senderId || null,
      senderName: data.senderName || 'Anonymous',
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  });

  /*
  ========================================
   Disconnect
  ========================================
  */
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

/*
=========================================================
 START SERVER
=========================================================
*/
server.listen(port, () => {
  console.log(`\n🚗 Carpool API Server running at http://localhost:${port}`);
  console.log(`📡 Socket.IO ready for real-time connections\n`);
});