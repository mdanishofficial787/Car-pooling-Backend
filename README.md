# 🚗 Carpool Backend API

A production-ready, scalable backend for a carpool/ride-sharing application built with **Express.js**, **Socket.IO**, and modern backend architecture patterns.

---

## 📋 Features

✅ **User Management**
- User signup and authentication
- Institution search
- User verification tracking

✅ **Carpool Operations**
- Create carpool offers
- List and search carpools
- Join requests and acceptance
- Gender-based filtering

✅ **Trip Management**
- Assign trips to drivers
- Start/end trips
- Real-time trip status tracking
- Trip contact information

✅ **Matching Engine**
- Route-based matching
- Time-based matching
- Verification score sorting

✅ **File Uploads**
- CNIC image upload (front + back)
- Selfie face verification
- JPG/PNG validation
- 5MB file size limit

✅ **Real-Time Features**
- Socket.IO live tracking
- Driver location updates
- Trip status notifications
- In-trip chat messaging

✅ **Admin Dashboard**
- Audit logs
- Performance metrics
- Trip analytics

✅ **Ratings & Feedback**
- Post-trip ratings
- User rating averaging
- Issue reporting

---

## 🏗️ Project Structure

```
src/
├── config/              # Configuration files
│   └── socket.js       # Socket.IO setup
├── controllers/         # Business logic
│   ├── authController.js
│   ├── userController.js
│   ├── carpoolController.js
│   ├── matchController.js
│   ├── tripController.js
│   ├── adminController.js
│   ├── verificationController.js
│   └── uploadController.js
├── routes/             # Express routes
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── carpoolRoutes.js
│   ├── matchRoutes.js
│   ├── tripRoutes.js
│   ├── adminRoutes.js
│   ├── verificationRoutes.js
│   └── uploadRoutes.js
├── middleware/         # Custom middleware
│   ├── authMiddleware.js
│   ├── adminMiddleware.js
│   ├── verificationMiddleware.js
│   ├── errorMiddleware.js
│   └── uploadMiddleware.js
├── services/          # Business logic services
│   ├── matchService.js
│   ├── verificationService.js
│   ├── ratingService.js
│   ├── socketService.js
│   └── uploadService.js
├── utils/            # Helper functions
│   ├── responseHelper.js
│   ├── validationHelper.js
│   ├── scoreCalculator.js
│   └── dateHelper.js
├── database/         # Mock database
│   ├── mockDB.js
│   └── seedData.js
├── uploads/          # Uploaded files directory
├── app.js           # Express app configuration
└── server.js        # Server entry point
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14.x or higher
- npm or yarn

### Installation

1. **Navigate to project directory**
```bash
cd carpool-project
```

2. **Install dependencies**
```bash
npm install
```

3. **Update `.env` if needed**
```bash
PORT=5000
NODE_ENV=development
```

4. **Start the server**

**Development mode (with hot reload)**
```bash
npm run dev
```

**Production mode**
```bash
npm start
```

Server will start at: `http://localhost:5000`

---

## 📡 API Endpoints

### Authentication & Verification
```
GET  /api/user/verifications/:userId          - Get user verification status
POST /api/trip/rate                           - Submit trip rating
```

### User Management
```
POST /api/user/signup                         - User registration
GET  /api/institutions/search?q=<query>       - Search institutions
```

### Carpools
```
POST /api/carpool/create                      - Create new carpool
GET  /api/carpool/list                        - Get all active carpools
GET  /api/carpool/search                      - Search carpools
GET  /api/carpool/:offerId                    - Get carpool details
POST /api/carpool/join-request                - Submit join request
POST /api/carpool/join-request/:requestId/respond  - Accept/reject request
```

### Matching
```
POST /api/match/route                         - Match by route
POST /api/match/time                          - Match by time
```

### Trips
```
POST /api/driver/assign-trip                  - Assign trip to driver
POST /api/trip/start                          - Start trip
POST /api/trip/end                            - End trip
GET  /api/trip/:tripId/status                 - Get trip status
GET  /api/trip/contact/:tripId                - Get trip contact info
```

### File Uploads
```
POST /api/user/upload-cnic                    - Upload CNIC images
POST /api/user/verify-selfie                  - Upload selfie for verification
```

### Admin
```
GET  /api/admin/audit-logs                    - Get audit logs
GET  /api/admin/dashboard                     - Get admin dashboard
```

---

## 🔐 Authentication

All endpoints (except signup and institution search) require:

**Header:**
```
Authorization: Bearer testtoken
```

---

## 📁 File Uploads

### CNIC Upload
- **Endpoint:** `POST /api/user/upload-cnic`
- **Allowed:** JPG, JPEG, PNG
- **Max Size:** 5MB per file
- **Storage:** `uploads/` directory

### Selfie Verification
- **Endpoint:** `POST /api/user/verify-selfie`
- **Test:** Filename with "match" → PASS, otherwise → FAIL
- **Storage:** `uploads/` directory

---

## 🚀 Deploy & Scale

This architecture is ready for MongoDB migration, caching, and production deployment. See the full README in the project for scalability roadmap.

---

**Happy coding! 🚀**

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
