const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dog',
    required: true
  }],
  garden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  photos: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate duration when checking out
visitSchema.methods.checkout = function() {
  this.checkOutTime = new Date();
  this.status = 'completed';
  this.duration = Math.round((this.checkOutTime - this.checkInTime) / 60000); // Duration in minutes
  return this.save();
};

// Performance indexes - CRITICAL for query speed  
visitSchema.index({ user: 1, garden: 1 }); // Most critical - queries by user and garden
visitSchema.index({ garden: 1, checkInTime: -1 }); // Garden visits, newest first
visitSchema.index({ garden: 1, status: 1 }); // Active visits by garden
visitSchema.index({ user: 1, checkInTime: -1 }); // User's visits, newest first
visitSchema.index({ status: 1 }); // Filter by status (active/completed)
visitSchema.index({ checkInTime: -1 }); // Recent visits

module.exports = mongoose.model('Visit', visitSchema);
