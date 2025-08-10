const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  content: {
    type: {
      type: String,
      enum: ['text', 'image', 'location', 'file'],
      default: 'text'
    },
    text: {
      type: String,
      trim: true
    },
    mediaUrl: {
      type: String
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    fileName: String,
    fileSize: Number,
    mimeType: String
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ recipients: 1 });
messageSchema.index({ 'readBy.user': 1 });

// Virtual for checking if message is read by a specific user
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.user.equals(userId));
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipients: userId,
    'readBy.user': { $ne: userId },
    isDeleted: false
  });
};

module.exports = mongoose.model('Message', messageSchema); 