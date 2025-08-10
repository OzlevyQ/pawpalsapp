const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  caption: {
    type: String,
    maxlength: 500
  },
  entityType: {
    type: String,
    enum: ['user', 'dog', 'garden', 'event', 'visit'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  tags: [String],
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [Number]
  },
  metadata: {
    width: Number,
    height: Number,
    size: Number,
    format: String,
    takenAt: Date
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  privacy: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// אינדקסים
photoSchema.index({ uploadedBy: 1, createdAt: -1 });
photoSchema.index({ entityType: 1, entityId: 1 });
photoSchema.index({ 'location.coordinates': '2dsphere' });

// וירטואלים
photoSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

photoSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// מתודות
photoSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => 
    like.user.toString() === userId.toString()
  );
  
  if (existingLike) {
    this.likes = this.likes.filter(like => 
      like.user.toString() !== userId.toString()
    );
  } else {
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

photoSchema.methods.addComment = function(userId, text) {
  this.comments.push({ user: userId, text });
  return this.save();
};

photoSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => 
    comment._id.toString() !== commentId.toString()
  );
  return this.save();
};

module.exports = mongoose.model('Photo', photoSchema);
