const express = require('express');
const router = express.Router();
const {
  getMyDogs,
  getDogById,
  createDog,
  updateDog,
  deleteDog,
  getDogPublicProfile,
  updateDogCustomProfile
} = require('../controllers/dogController');
const { auth } = require('../middleware/auth');
const { dogValidation } = require('../utils/validation');

// Public routes
router.get('/profile/:id', getDogPublicProfile);

// Protected routes
router.use(auth);

// Get user's dogs
router.get('/', getMyDogs);

// Get specific dog
router.get('/:id', getDogById);

// Register new dog
router.post('/', dogValidation.create, createDog);

// Update dog
router.put('/:id', dogValidation.update, updateDog);

// Update dog custom profile
router.put('/:id/custom-profile', updateDogCustomProfile);

// Delete dog
router.delete('/:id', deleteDog);

module.exports = router;
