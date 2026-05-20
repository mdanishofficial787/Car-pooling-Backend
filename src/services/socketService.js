/*
========================================
 Socket Service
========================================

Configures and handles Socket.IO connections.
*/

const socketIo = require('socket.io');

/*
========================================
 Initialize Socket.IO
========================================
*/
const initializeSocket = (server) => {
  const io = new socketIo.Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // User connections tracking
  const userConnections = new Map();

  /*
  ========================================
   Socket Connection Event
  ========================================
  */
  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    /*
    ========================================
     Track User Connection
    ========================================
    */
    socket.on('user:connect', (data) => {
      if (data?.userId) {
        userConnections.set(socket.id, data.userId);
        console.log(`[Socket] User ${data.userId} connected with socket ${socket.id}`);
      }
    });

    /*
    ========================================
     Join Trip Room
    ========================================
    */
    socket.on('trip:join', (data) => {
      if (data?.tripId) {
        socket.join(`trip:${data.tripId}`);
        console.log(`[Socket] User joined trip room: trip:${data.tripId}`);
      }
    });

    /*
    ========================================
     Leave Trip Room
    ========================================
    */
    socket.on('trip:leave', (data) => {
      if (data?.tripId) {
        socket.leave(`trip:${data.tripId}`);
        console.log(`[Socket] User left trip room: trip:${data.tripId}`);
      }
    });

    /*
    ========================================
     Join Ride Room
    ========================================
    */
    socket.on('ride:join', (data) => {
      if (data?.rideId) {
        socket.join(`ride:${data.rideId}`);
        console.log(`[Socket] User joined ride room: ride:${data.rideId}`);
      }
    });

    /*
    ========================================
     Driver Location Update
    ========================================
    */
    socket.on('driver:location:update', (data) => {
      if (!data?.tripId || !data?.latitude || !data?.longitude) {
        socket.emit('error', {
          message: 'tripId, latitude, longitude required'
        });
        return;
      }

      console.log(
        `[Socket] Driver location update for trip ${data.tripId}:`,
        data.latitude,
        data.longitude
      );

      // Broadcast to all passengers in the trip room
      io.to(`trip:${data.tripId}`).emit('trip:location:update', {
        tripId: data.tripId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date().toISOString()
      });
    });

    /*
    ========================================
     Trip Status Update
    ========================================
    */
    socket.on('trip:status:update', (data) => {
      if (!data?.tripId || !data?.status) {
        socket.emit('error', {
          message: 'tripId and status required'
        });
        return;
      }

      console.log(
        `[Socket] Trip ${data.tripId} status changed to: ${data.status}`
      );

      io.to(`trip:${data.tripId}`).emit('trip:status:changed', {
        tripId: data.tripId,
        status: data.status,
        timestamp: new Date().toISOString()
      });
    });

    /*
    ========================================
     Trip Chat Message
    ========================================
    */
    socket.on('trip:message', (data) => {
      if (!data?.tripId || !data?.message) {
        socket.emit('error', {
          message: 'tripId and message required'
        });
        return;
      }

      io.to(`trip:${data.tripId}`).emit('trip:message:received', {
        tripId: data.tripId,
        senderId: data.senderId || null,
        senderName: data.senderName || 'Anonymous',
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    /*
    ========================================
     Disconnect Event
    ========================================
    */
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
      userConnections.delete(socket.id);
    });
  });

  return io;
};

module.exports = {
  initializeSocket
};
