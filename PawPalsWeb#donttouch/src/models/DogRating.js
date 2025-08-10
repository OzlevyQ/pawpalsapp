const mongoose = require('mongoose');

const dogRatingSchema = new mongoose.Schema({
  dog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dog',
    required: true
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: {
    friendliness: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    playfulness: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    obedience: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    energy: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    cuteness: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  },
  overallRating: {
    type: Number,
    min: 1,
    max: 5,
    required: false
  },
  comment: {
    type: String,
    maxlength: 500,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: true
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

// Calculate overall rating from individual ratings
dogRatingSchema.pre('save', function(next) {
  if (this.isModified('ratings') || this.isNew) {
    const { friendliness, playfulness, obedience, energy, cuteness } = this.ratings;
    this.overallRating = (friendliness + playfulness + obedience + energy + cuteness) / 5;
  }
  this.updatedAt = Date.now();
  next();
});

// Prevent duplicate ratings from same user for same dog
dogRatingSchema.index({ dog: 1, rater: 1 }, { unique: true });

// Index for efficient queries
dogRatingSchema.index({ dog: 1, createdAt: -1 });
dogRatingSchema.index({ rater: 1, createdAt: -1 });

// Static method to get average ratings for a dog
dogRatingSchema.statics.getAverageRatings = async function(dogId) {
  const ratings = await this.aggregate([
    { $match: { dog: new mongoose.Types.ObjectId(dogId) } },
    {
      $group: {
        _id: '$dog',
        averageOverall: { $avg: '$overallRating' },
        averageFriendliness: { $avg: '$ratings.friendliness' },
        averagePlayfulness: { $avg: '$ratings.playfulness' },
        averageObedience: { $avg: '$ratings.obedience' },
        averageEnergy: { $avg: '$ratings.energy' },
        averageCuteness: { $avg: '$ratings.cuteness' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  return ratings.length > 0 ? ratings[0] : {
    averageOverall: 0,
    averageFriendliness: 0,
    averagePlayfulness: 0,
    averageObedience: 0,
    averageEnergy: 0,
    averageCuteness: 0,
    totalRatings: 0
  };
};

// Static method to check if user has rated a dog
dogRatingSchema.statics.hasUserRated = async function(userId, dogId) {
  const rating = await this.findOne({ 
    rater: userId, 
    dog: dogId 
  });
  return !!rating;
};

module.exports = mongoose.model('DogRating', dogRatingSchema);