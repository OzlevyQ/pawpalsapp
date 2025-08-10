const mongoose = require('mongoose');

const gardenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    coordinates: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  images: [{
    type: String
  }],
  capacity: {
    maxDogs: {
      type: Number,
      default: 20
    },
    maxSmallDogs: {
      type: Number,
      default: 10
    },
    maxLargeDogs: {
      type: Number,
      default: 10
    }
  },
  openingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  amenities: [{
    type: String,
    enum: [
      'water', 'shade', 'toys', 'parking', 'lighting', 'benches', 'waste_bags',
      'ספסלים', 'ברזיה', 'צל', 'מים', 'חניה', 'תאורה', 'שקיות פסולת', 'צעצועים'
    ]
  }],
  rules: [String],
  requirements: {
    vaccinationRequired: {
      type: Boolean,
      default: true
    },
    minAge: {
      type: Number,
      default: 4
    },
    maxAge: Number,
    sizeRestrictions: [String]
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid', 'membership'],
      default: 'free'
    },
    price: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  statistics: {
    totalVisits: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  currentOccupancy: {
    type: Number,
    default: 0
  },
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
  features: {
    allowsPhotoSharing: {
      type: Boolean,
      default: true
    },
    requiresReservation: {
      type: Boolean,
      default: false
    },
    hasEvents: {
      type: Boolean,
      default: false
    }
  },
  
  // Event settings for garden owners
  eventSettings: {
    allowEvents: {
      type: Boolean,
      default: true
    },
    requireApprovalForEvents: {
      type: Boolean,
      default: false
    },
    maxEventsPerMonth: {
      type: Number,
      default: 10
    },
    defaultEventDuration: {
      type: Number,
      default: 120 // minutes
    },
    eventCategories: [{
      type: String,
      default: ['meetup', 'training', 'social']
    }],
    autoApproveEvents: {
      type: Boolean,
      default: true
    }
  },
  
  // Newsletter settings for garden owners
  newsletter: {
    enabled: {
      type: Boolean,
      default: true
    },
    allowPublicSubscriptions: {
      type: Boolean,
      default: true
    },
    autoWelcomeEmail: {
      type: Boolean,
      default: true
    },
    welcomeEmailSubject: {
      type: String,
      default: 'Welcome to our newsletter!'
    },
    welcomeEmailContent: {
      type: String,
      default: 'Thank you for subscribing to our newsletter. We\'ll keep you updated with the latest news and events.'
    },
    fromName: {
      type: String,
      default: ''
    },
    fromEmail: {
      type: String,
      default: ''
    },
    replyToEmail: {
      type: String,
      default: ''
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

// Index for geospatial queries
gardenSchema.index({ 'location.coordinates': '2dsphere' });

// Update the updatedAt timestamp
gardenSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Garden', gardenSchema);
