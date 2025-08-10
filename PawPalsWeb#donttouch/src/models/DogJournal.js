const mongoose = require('mongoose');

const dogJournalEntrySchema = new mongoose.Schema({
  // Reference to the user who owns this journal
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Reference to the owner's dog (optional - can be general entry)
  ownerDog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dog',
    required: false
  },
  
  // Information about the dog they met
  metDog: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    breed: {
      type: String,
      trim: true,
      maxLength: 100
    },
    age: {
      type: String,
      trim: true,
      maxLength: 50
    },
    size: {
      type: String,
      enum: ['Small', 'Medium', 'Large', 'Extra Large'],
      default: 'Medium'
    },
    color: {
      type: String,
      trim: true,
      maxLength: 100
    },
    ownerName: {
      type: String,
      trim: true,
      maxLength: 100
    },
    ownerContact: {
      type: String,
      trim: true,
      maxLength: 200
    }
  },
  
  // Journal entry details
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 2000
  },
  
  // Location where they met
  location: {
    name: {
      type: String,
      trim: true,
      maxLength: 200
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    garden: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garden',
      required: false
    }
  },
  
  // Date of the meeting
  meetingDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Album/Category classification
  album: {
    type: String,
    required: true,
    enum: ['Best Friends', 'Enemies', 'Acquaintances', 'Playmates', 'Custom'],
    default: 'Acquaintances'
  },
  
  // Custom album name (if album is 'Custom')
  customAlbumName: {
    type: String,
    trim: true,
    maxLength: 100,
    required: function() {
      return this.album === 'Custom';
    }
  },
  
  // Images
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true,
      maxLength: 500
    },
    isMainImage: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Rating/Relationship quality
  relationshipRating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  // Tags for easy searching
  tags: [{
    type: String,
    trim: true,
    maxLength: 50
  }],
  
  // Privacy settings
  isPrivate: {
    type: Boolean,
    default: true
  },
  
  // Interaction details
  interactionNotes: {
    playStyle: {
      type: String,
      enum: ['Gentle', 'Rough', 'Shy', 'Energetic', 'Calm', 'Mixed'],
      default: 'Mixed'
    },
    compatibility: {
      type: String,
      enum: ['Excellent', 'Good', 'Average', 'Poor', 'Terrible'],
      default: 'Average'
    },
    wouldMeetAgain: {
      type: Boolean,
      default: true
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
dogJournalEntrySchema.index({ owner: 1, createdAt: -1 });
dogJournalEntrySchema.index({ owner: 1, album: 1 });
dogJournalEntrySchema.index({ owner: 1, 'metDog.name': 1 });
dogJournalEntrySchema.index({ owner: 1, meetingDate: -1 });
dogJournalEntrySchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for getting the display album name
dogJournalEntrySchema.virtual('displayAlbumName').get(function() {
  return this.album === 'Custom' ? this.customAlbumName : this.album;
});

// Virtual for main image
dogJournalEntrySchema.virtual('mainImage').get(function() {
  const mainImg = this.images.find(img => img.isMainImage);
  return mainImg || this.images[0] || null;
});

// Pre-save middleware to update the updatedAt field
dogJournalEntrySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get user's albums
dogJournalEntrySchema.statics.getUserAlbums = async function(userId) {
  const albums = await this.aggregate([
    { $match: { owner: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: {
          album: '$album',
          customAlbumName: '$customAlbumName'
        },
        count: { $sum: 1 },
        lastEntry: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        name: {
          $cond: {
            if: { $eq: ['$_id.album', 'Custom'] },
            then: '$_id.customAlbumName',
            else: '$_id.album'
          }
        },
        albumType: '$_id.album',
        count: 1,
        lastEntry: 1
      }
    },
    { $sort: { lastEntry: -1 } }
  ]);
  
  return albums;
};

// Static method to get entries by album
dogJournalEntrySchema.statics.getEntriesByAlbum = async function(userId, albumName, isCustom = false) {
  const query = { owner: userId };
  
  if (isCustom) {
    query.album = 'Custom';
    query.customAlbumName = albumName;
  } else {
    query.album = albumName;
  }
  
  return this.find(query)
    .populate('ownerDog', 'name breed')
    .populate('location.garden', 'name address')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('DogJournal', dogJournalEntrySchema);