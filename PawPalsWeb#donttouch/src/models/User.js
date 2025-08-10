const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google auth users
    },
    minlength: 6
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allow null values, but ensure uniqueness when set
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'garden_manager', 'dog_owner'],
    default: 'dog_owner'
  },
  eventPermissions: {
    canCreateEvents: {
      type: Boolean,
      default: false
    },
    canManageAllEvents: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    }
  },
  profileImage: {
    type: String,
    default: null
  },
  location: {
    address: String,
    coordinates: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active'
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden'
  }],
  lastActive: {
    type: Date,
    default: Date.now
  },
  // Gamification fields
  gamification: {
    points: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastVisitDate: {
      type: Date,
      default: null
    },
    badges: [{
      badgeId: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      icon: {
        type: String,
        required: true
      },
      description: String,
      rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common'
      },
      earnedAt: {
        type: Date,
        default: Date.now
      }
    }],
    achievements: [{
      achievementId: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      description: String,
      progress: {
        type: Number,
        default: 0
      },
      target: {
        type: Number,
        required: true
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date,
        default: null
      }
    }]
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

// Index for geospatial queries
userSchema.index({ 'location.coordinates': '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Performance indexes - CRITICAL for query speed
userSchema.index({ email: 1 }); // Login and user search
userSchema.index({ role: 1 }); // Admin queries by role
userSchema.index({ status: 1 }); // Active/inactive users
userSchema.index({ role: 1, status: 1 }); // Compound index for admin user management  
userSchema.index({ lastActive: -1 }); // Recent active users
userSchema.index({ username: 1 }); // Username searches

module.exports = mongoose.model('User', userSchema);
