/*
========================================
 Socket.IO Configuration
========================================

Initialize and configure Socket.IO for real-time features.
*/

const { initializeSocket } = require('../services/socketService');

/*
========================================
 Setup Socket Events
========================================
*/
const setupSocket = (server) => {
  const io = initializeSocket(server);
  return io;
};

module.exports = {
  setupSocket
};
