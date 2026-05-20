/*
========================================
 User Routes
========================================
*/

const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { signup, searchInstitutions } = require('../controllers/userController');

const router = express.Router();

/*
========================================
 POST /api/user/signup
========================================
*/
router.post('/signup', signup);

/*
========================================
 GET /api/institutions/search
========================================
*/
router.get('/institutions/search', searchInstitutions);

module.exports = router;
