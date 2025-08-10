const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const {
  rateDog,
  getDogRatings,
  getUserRating,
  getUserRatings,
  deleteRating,
  getTopRatedDogs,
  getMostPopularDogs,
  getRatingStats
} = require('../controllers/dogRatingController');

// Validation middleware
const validateRating = [
  body('dogId').notEmpty().isMongoId().withMessage('Valid dog ID is required'),
  body('ratings.friendliness').isInt({ min: 1, max: 5 }).withMessage('Friendliness must be between 1 and 5'),
  body('ratings.playfulness').isInt({ min: 1, max: 5 }).withMessage('Playfulness must be between 1 and 5'),
  body('ratings.obedience').isInt({ min: 1, max: 5 }).withMessage('Obedience must be between 1 and 5'),
  body('ratings.energy').isInt({ min: 1, max: 5 }).withMessage('Energy must be between 1 and 5'),
  body('ratings.cuteness').isInt({ min: 1, max: 5 }).withMessage('Cuteness must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment must be less than 500 characters')
];

// Create or update a dog rating
router.post('/', auth, validateRating, rateDog);

// Get ratings for a specific dog
router.get('/dog/:dogId', getDogRatings);

// Get user's rating for a specific dog
router.get('/dog/:dogId/user', auth, getUserRating);

// Get all ratings by the authenticated user
router.get('/user', auth, getUserRatings);

// Delete a rating
router.delete('/:ratingId', auth, deleteRating);

// Get top-rated dogs
router.get('/top-rated', getTopRatedDogs);

// Get most popular dogs (by friends count)
router.get('/most-popular', getMostPopularDogs);

// Get rating statistics for a dog
router.get('/dog/:dogId/stats', getRatingStats);

module.exports = router;