const mongoose = require('mongoose');

const gardenNewsletterSchema = new mongoose.Schema({
  garden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  dogName: {
    type: String,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  subscriptionDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferences: {
    events: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    announcements: {
      type: Boolean,
      default: true
    },
    maintenance: {
      type: Boolean,
      default: true
    }
  },
  unsubscribeToken: {
    type: String,
    required: true
  },
  lastEmailSent: {
    type: Date
  },
  emailsSent: {
    type: Number,
    default: 0
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

// Create compound index to prevent duplicate subscriptions
gardenNewsletterSchema.index({ garden: 1, user: 1 }, { unique: true });

// Index for efficient queries
gardenNewsletterSchema.index({ garden: 1, isActive: 1 });
gardenNewsletterSchema.index({ userEmail: 1 });
gardenNewsletterSchema.index({ unsubscribeToken: 1 });

// Update the updatedAt timestamp
gardenNewsletterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate unsubscribe token
gardenNewsletterSchema.methods.generateUnsubscribeToken = function() {
  const crypto = require('crypto');
  this.unsubscribeToken = crypto.randomBytes(32).toString('hex');
  return this.unsubscribeToken;
};

// Check if user can receive specific type of email
gardenNewsletterSchema.methods.canReceiveEmail = function(emailType) {
  if (!this.isActive) return false;
  return this.preferences[emailType] !== false;
};

// Mark email as sent
gardenNewsletterSchema.methods.markEmailSent = function() {
  this.lastEmailSent = new Date();
  this.emailsSent += 1;
  return this.save();
};

// Static method to get active subscribers for a garden
gardenNewsletterSchema.statics.getActiveSubscribers = function(gardenId, emailType = null) {
  const query = { garden: gardenId, isActive: true };
  
  if (emailType) {
    query[`preferences.${emailType}`] = true;
  }
  
  return this.find(query).populate('user', 'firstName lastName email');
};

// Static method to get subscriber count for a garden
gardenNewsletterSchema.statics.getSubscriberCount = function(gardenId) {
  return this.countDocuments({ garden: gardenId, isActive: true });
};

module.exports = mongoose.model('GardenNewsletter', gardenNewsletterSchema);