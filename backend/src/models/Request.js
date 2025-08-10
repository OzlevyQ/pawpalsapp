const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['garden_manager', 'event_organizer'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  details: {
    // Common fields
    reason: {
      type: String,
      required: true,
      maxlength: 1000
    },
    experience: {
      type: String,
      maxlength: 1000
    },
    
    // Garden manager specific fields
    preferredGardens: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garden'
    }],
    managementExperience: String,
    availability: String,
    
    // Event organizer specific fields
    eventTypes: [String],
    organizationExperience: String,
    plannedEvents: String,
    
    // Contact details
    contactPhone: String,
    contactEmail: String,
  },
  
  // Admin review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,
  
  // Automatic approval settings
  autoApproved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
requestSchema.index({ user: 1, type: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ createdAt: -1 });

// Prevent duplicate pending requests
requestSchema.index(
  { user: 1, type: 1, status: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { status: 'pending' }
  }
);

// Virtual for request age
requestSchema.virtual('requestAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Methods
requestSchema.methods.approve = async function(reviewerId, notes = '') {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  
  await this.save();
  
  // Update user permissions based on request type
  const user = await mongoose.model('User').findById(this.user);
  
  if (this.type === 'garden_manager') {
    user.role = 'garden_manager';
    // Additional garden manager permissions can be set here
  } else if (this.type === 'event_organizer') {
    if (!user.eventPermissions) {
      user.eventPermissions = {};
    }
    user.eventPermissions.canCreateEvents = true;
    user.eventPermissions.approvedBy = reviewerId;
    user.eventPermissions.approvedAt = new Date();
  }
  
  await user.save();
  return this;
};

requestSchema.methods.reject = async function(reviewerId, notes = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  
  await this.save();
  return this;
};

// Static methods
requestSchema.statics.findPendingRequests = function() {
  return this.find({ status: 'pending' })
    .populate('user', 'firstName lastName email')
    .populate('details.preferredGardens', 'name location')
    .sort({ createdAt: -1 });
};

requestSchema.statics.findUserRequests = function(userId) {
  return this.find({ user: userId })
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Request', requestSchema); 