const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['weekly', 'monthly', 'alltime'],
    required: true
  },
  category: {
    type: String,
    enum: ['points', 'visits', 'streaks', 'social'],
    required: true
  },
  period: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: function() {
        return this.type === 'monthly';
      }
    },
    week: {
      type: Number,
      required: function() {
        return this.type === 'weekly';
      }
    }
  },
  rankings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    previousPosition: {
      type: Number,
      default: null
    },
    change: {
      type: String,
      enum: ['up', 'down', 'same', 'new'],
      default: 'new'
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
leaderboardSchema.index({ 
  type: 1, 
  category: 1, 
  'period.year': 1, 
  'period.month': 1, 
  'period.week': 1 
});

// Index for user lookups
leaderboardSchema.index({ 'rankings.user': 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);