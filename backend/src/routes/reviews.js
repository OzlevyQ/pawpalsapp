const express = require('express');
const router = express.Router();
const {
  createReview,
  getGardenReviews,
  updateReview,
  deleteReview,
  markReviewHelpful
} = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Validation rules
const reviewValidation = {
  create: [
    body('gardenId').isMongoId(),
    body('visitId').isMongoId(),
    body('rating.overall').isInt({ min: 1, max: 5 }),
    body('review').notEmpty().isLength({ max: 1000 })
  ],
  update: [
    param('id').isMongoId(),
    body('rating.overall').optional().isInt({ min: 1, max: 5 }),
    body('review').optional().isLength({ max: 1000 })
  ]
};

// Public routes
router.get('/garden/:gardenId', getGardenReviews);

// Protected routes
router.use(auth);

router.post('/', reviewValidation.create, createReview);
router.put('/:id', reviewValidation.update, updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', markReviewHelpful);

module.exports = router;
