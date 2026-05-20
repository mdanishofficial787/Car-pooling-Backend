/*
========================================
 Server Entry Point
========================================

Starts the Express server with Socket.IO.
*/

require('dotenv').config();

const http = require('http');
const app = require('./app');
const { setupSocket } = require('./config/socket');

/*
========================================
 Server Configuration
========================================
*/
const PORT = process.env.PORT || 5000;

/*
========================================
 Create HTTP Server
========================================
*/
const server = http.createServer(app);

/*
========================================
 Setup Socket.IO
========================================
*/
const io = setupSocket(server);

/*
========================================
 Start Server
========================================
*/
server.listen(PORT, () => {
  console.log(`\n🚗 Carpool API Server running at http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for real-time connections\n`);
});

/*
========================================
 Graceful Shutdown
========================================
*/
process.on('SIGTERM', () => {
  console.log('\nSIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
