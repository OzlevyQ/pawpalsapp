const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  achievementId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['visits', 'social', 'streaks', 'exploration', 'community', 'special', 'levels'],
    required: true
  },
  type: {
    type: String,
    enum: ['count', 'streak', 'unique', 'milestone'],
    required: true
  },
  target: {
    type: Number,
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  badge: {
    badgeId: String,
    name: String,
    icon: String,
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common'
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

// Update the updatedAt timestamp
achievementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Achievement', achievementSchema);