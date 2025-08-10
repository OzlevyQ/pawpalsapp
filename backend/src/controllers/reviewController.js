const Review = require('../models/Review');
const Visit = require('../models/Visit');
const { validationResult } = require('express-validator');

const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gardenId, visitId, rating, review, photos } = req.body;

    // Verify visit exists and belongs to user
    const visit = await Visit.findOne({
      _id: visitId,
      user: req.userId,
      garden: gardenId,
      status: 'completed'
    });

    if (!visit) {
      return res.status(400).json({ 
        error: 'Invalid visit or you can only review completed visits' 
      });
    }

    // Check if user already reviewed this visit
    const existingReview = await Review.findOne({
      user: req.userId,
      visit: visitId
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: 'You have already reviewed this visit' 
      });
    }

    const newReview = new Review({
      user: req.userId,
      garden: gardenId,
      visit: visitId,
      rating,
      review,
      photos: photos || []
    });

    await newReview.save();

    await newReview.populate([
      { path: 'user', select: 'firstName lastName' },
      { path: 'garden', select: 'name' }
    ]);

    res.status(201).json({
      message: 'Review created successfully',
      review: newReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Error creating review' });
  }
};

const getGardenReviews = async (req, res) => {
  try {
    const { gardenId } = req.params;
    const { limit = 10, skip = 0, sort = '-createdAt' } = req.query;

    const reviews = await Review.find({
      garden: gardenId,
      moderationStatus: 'approved'
    })
      .populate('user', 'firstName lastName profileImage')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Review.countDocuments({
      garden: gardenId,
      moderationStatus: 'approved'
    });

    res.json({
      total,
      reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Error fetching reviews' });
  }
};

const updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const { rating, review: reviewText, photos } = req.body;

    if (rating) review.rating = rating;
    if (reviewText) review.review = reviewText;
    if (photos) review.photos = photos;

    review.updatedAt = new Date();
    await review.save();

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Error updating review' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await review.remove();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Error deleting review' });
  }
};

const markReviewHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const userIndex = review.helpful.indexOf(req.userId);
    
    if (userIndex > -1) {
      // Remove from helpful
      review.helpful.splice(userIndex, 1);
    } else {
      // Add to helpful
      review.helpful.push(req.userId);
    }

    await review.save();

    res.json({
      message: 'Review helpful status updated',
      helpfulCount: review.helpful.length
    });
  } catch (error) {
    console.error('Error updating helpful status:', error);
    res.status(500).json({ error: 'Error updating helpful status' });
  }
};

module.exports = {
  createReview,
  getGardenReviews,
  updateReview,
  deleteReview,
  markReviewHelpful
};
