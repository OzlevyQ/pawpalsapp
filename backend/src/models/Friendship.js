const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'blocked'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 500
  },
  acceptedAt: Date,
  declinedAt: Date,
  blockedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// אינדקסים
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ recipient: 1, status: 1 });

// מתודות
friendshipSchema.methods.accept = function() {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
};

friendshipSchema.methods.decline = function() {
  this.status = 'declined';
  this.declinedAt = new Date();
  return this.save();
};

friendshipSchema.methods.block = function() {
  this.status = 'blocked';
  this.blockedAt = new Date();
  return this.save();
};

// מתודות סטטיות
friendshipSchema.statics.areFriends = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { requester: userId1, recipient: userId2, status: 'accepted' },
      { requester: userId2, recipient: userId1, status: 'accepted' }
    ]
  });
  return !!friendship;
};

friendshipSchema.statics.getFriends = async function(userId) {
  const friendships = await this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  }).populate('requester recipient', 'firstName lastName profileImage');

  return friendships.map(f => {
    return f.requester._id.toString() === userId.toString() 
      ? f.recipient 
      : f.requester;
  });
};

module.exports = mongoose.model('Friendship', friendshipSchema);
