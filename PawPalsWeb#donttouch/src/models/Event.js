const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  garden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Garden',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['meetup', 'training', 'competition', 'adoption', 'social', 'educational', 'other'],
    default: 'meetup'
  },
  maxParticipants: {
    type: Number,
    default: null
  },
  // Registration settings
  registrationDeadline: {
    type: Date,
    default: function() {
      return new Date(this.eventDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    }
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  allowWaitingList: {
    type: Boolean,
    default: true
  },
  
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dogs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dog'
    }],
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'attended', 'no-show'],
      default: function() {
        return this.parent().requiresApproval ? 'pending' : 'approved';
      }
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  
  // Waiting list for when event is full
  waitingList: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dogs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dog'
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  requirements: {
    vaccinationRequired: {
      type: Boolean,
      default: true
    },
    sizeRestrictions: [String],
    ageRestrictions: {
      min: Number,
      max: Number
    },
    other: [String]
  },
  images: [{
    type: String
  }],
  tags: [String],
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
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
  },
  // הודעות מהמארגן
  organizerMessages: {
    welcomeMessage: {
      type: String,
      default: '',
      trim: true
    },
    registrationMessage: {
      type: String,
      default: '',
      trim: true
    },
    approvalMessage: {
      type: String,
      default: '',
      trim: true
    },
    rejectionMessage: {
      type: String,
      default: '',
      trim: true
    },
    reminderMessage: {
      type: String,
      default: '',
      trim: true
    }
  }
});

// Virtual for approved participant count
eventSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.status === 'approved').length;
});

// Virtual for pending participants count
eventSchema.virtual('pendingCount').get(function() {
  return this.participants.filter(p => p.status === 'pending').length;
});

// Virtual to check if event is full
eventSchema.virtual('isFull').get(function() {
  return this.maxParticipants && this.participantCount >= this.maxParticipants;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxParticipants) return null;
  return this.maxParticipants - this.participantCount;
});

// Method to register participant
eventSchema.methods.registerParticipant = function(userId, dogIds = []) {
  // Check if user already registered
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    throw new Error('User already registered for this event');
  }
  
  // Check if registration is still open
  if (new Date() > this.registrationDeadline) {
    throw new Error('Registration deadline has passed');
  }
  
  // If event is full, add to waiting list if allowed
  if (this.isFull) {
    if (this.allowWaitingList) {
      this.waitingList.push({
        user: userId,
        dogs: dogIds
      });
      return { status: 'waiting', message: 'Added to waiting list' };
    } else {
      throw new Error('Event is full and waiting list is not allowed');
    }
  }
  
  // Add participant
  const participantStatus = this.requiresApproval ? 'pending' : 'approved';
  this.participants.push({
    user: userId,
    dogs: dogIds,
    status: participantStatus
  });
  
  return { 
    status: participantStatus,
    message: participantStatus === 'pending' 
      ? 'Registration pending approval' 
      : 'Successfully registered'
  };
};

// Method to update participant status
eventSchema.methods.updateParticipantStatus = function(participantId, status, notes = '') {
  const participant = this.participants.id(participantId);
  if (!participant) {
    throw new Error('Participant not found');
  }
  
  const oldStatus = participant.status;
  participant.status = status;
  participant.notes = notes;
  
  // If participant was approved and there's a waiting list, move next person
  if (status === 'approved' && oldStatus !== 'approved' && this.waitingList.length > 0) {
    const nextInLine = this.waitingList.shift();
    this.participants.push({
      user: nextInLine.user,
      dogs: nextInLine.dogs,
      status: this.requiresApproval ? 'pending' : 'approved'
    });
  }
  
  return participant;
};

// Update status based on date
eventSchema.pre('save', function(next) {
  const now = new Date();
  const eventDateTime = new Date(this.eventDate);
  
  if (this.status !== 'cancelled') {
    if (eventDateTime < now) {
      this.status = 'completed';
    } else if (eventDateTime.toDateString() === now.toDateString()) {
      this.status = 'ongoing';
    } else {
      this.status = 'upcoming';
    }
  }
  
  this.updatedAt = now;
  next();
});

// Include virtuals in JSON output
eventSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Event', eventSchema);
