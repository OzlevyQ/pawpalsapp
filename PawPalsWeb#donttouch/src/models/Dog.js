const mongoose = require('mongoose');

const dogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  breed: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 0
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large'],
    required: true
  },
  weight: {
    type: Number,
    min: 0
  },
  description: {
    type: String,
    maxlength: 500
  },
  image: {
    type: String // Profile image
  },
  images: [{
    type: String
  }],
  gallery: [{
    type: String
  }],
  medicalInfo: {
    vaccinated: {
      type: Boolean,
      default: false
    },
    lastVaccination: Date,
    healthIssues: [String],
    medications: [String]
  },
  personality: {
    friendly: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    energetic: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    social: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    aggressive: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    }
  },
  specialNeeds: [String],
  customProfile: {
    enabled: {
      type: Boolean,
      default: false
    },
    html: {
      type: String,
      default: ''
    },
    css: {
      type: String,
      default: ''
    }
  },
  profileVisibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  // Rating system
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    breakdown: {
      friendliness: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      playfulness: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      obedience: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      energy: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      }
    }
  },
  // Popularity system
  popularity: {
    friendsCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['new', 'popular', 'well-known', 'beloved', 'community-favorite'],
      default: 'new'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Social stats
  socialStats: {
    totalMeetings: {
      type: Number,
      default: 0
    },
    totalPlaymates: {
      type: Number,
      default: 0
    },
    favoritePark: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garden',
      default: null
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
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

// Update the updatedAt timestamp and popularity status
dogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update popularity status based on friends count
  if (this.isModified('popularity.friendsCount')) {
    this.popularity.status = this.calculatePopularityStatus();
    this.popularity.lastUpdated = Date.now();
  }
  
  next();
});

// Method to calculate popularity status
dogSchema.methods.calculatePopularityStatus = function() {
  const friendsCount = this.popularity.friendsCount;
  
  if (friendsCount >= 50) return 'community-favorite';
  if (friendsCount >= 20) return 'beloved';
  if (friendsCount >= 10) return 'well-known';
  if (friendsCount >= 5) return 'popular';
  return 'new';
};

// Method to update ratings
dogSchema.methods.updateRatings = async function(newRatingData) {
  const DogRating = require('./DogRating');
  const averageRatings = await DogRating.getAverageRatings(this._id);
  
  this.ratings.average = averageRatings.averageOverall;
  this.ratings.count = averageRatings.totalRatings;
  this.ratings.breakdown.friendliness = averageRatings.averageFriendliness;
  this.ratings.breakdown.playfulness = averageRatings.averagePlayfulness;
  this.ratings.breakdown.obedience = averageRatings.averageObedience;
  this.ratings.breakdown.energy = averageRatings.averageEnergy;
  
  return this.save();
};

// Static method to get top-rated dogs
dogSchema.statics.getTopRated = function(limit = 10) {
  return this.find({ 'ratings.count': { $gt: 0 } })
    .sort({ 'ratings.average': -1, 'ratings.count': -1 })
    .limit(limit)
    .populate('owner', 'firstName lastName profileImage');
};

// Static method to get most popular dogs
dogSchema.statics.getMostPopular = function(limit = 10) {
  return this.find({ 'popularity.friendsCount': { $gt: 0 } })
    .sort({ 'popularity.friendsCount': -1 })
    .limit(limit)
    .populate('owner', 'firstName lastName profileImage');
};

// Performance indexes - CRITICAL for query speed
dogSchema.index({ owner: 1 }); // Most important - queries by owner
dogSchema.index({ owner: 1, isActive: 1 }); // Compound index for active dogs by owner
dogSchema.index({ breed: 1 }); // Search by breed
dogSchema.index({ size: 1 }); // Filter by size
dogSchema.index({ isActive: 1, createdAt: -1 }); // Active dogs, newest first

module.exports = mongoose.model('Dog', dogSchema);
