const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  garden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  visit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    safety: {
      type: Number,
      min: 1,
      max: 5
    },
    amenities: {
      type: Number,
      min: 1,
      max: 5
    },
    accessibility: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  review: {
    type: String,
    required: true,
    maxlength: 1000
  },
  photos: [{
    type: String
  }],
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVerified: {
    type: Boolean,
    default: true
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update garden statistics after review
reviewSchema.post('save', async function() {
  const Garden = mongoose.model('Garden');
  const reviews = await this.constructor.find({ 
    garden: this.garden,
    moderationStatus: 'approved'
  });
  
  const totalReviews = reviews.length;
  const avgRating = reviews.reduce((acc, rev) => acc + rev.rating.overall, 0) / totalReviews;
  
  await Garden.findByIdAndUpdate(this.garden, {
    'statistics.totalReviews': totalReviews,
    'statistics.averageRating': avgRating
  });
});

module.exports = mongoose.model('Review', reviewSchema);
