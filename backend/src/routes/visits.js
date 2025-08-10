const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyVisits,
  getActiveVisit
} = require('../controllers/visitController');
const { auth } = require('../middleware/auth');
const { visitValidation } = require('../utils/validation');

// All routes require authentication
router.use(auth);

// Check in to garden
router.post('/checkin', visitValidation.checkIn, checkIn);

// Check out from garden
router.post('/checkout', visitValidation.checkOut, checkOut);

// Get user's visits
router.get('/my-visits', getMyVisits);

// Get active visit
router.get('/active', getActiveVisit);

module.exports = router;
