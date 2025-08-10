const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  officers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'officer', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    contribution: {
      type: Number,
      default: 0
    },
    weeklyContribution: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    totalPoints: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    memberCount: {
      type: Number,
      default: 0
    },
    weeklyActivity: {
      type: Number,
      default: 0
    },
    monthlyActivity: {
      type: Number,
      default: 0
    },
    totalVisits: {
      type: Number,
      default: 0
    },
    totalEvents: {
      type: Number,
      default: 0
    }
  },
  settings: {
    isPublic: {
      type: Boolean,
      default: true
    },
    requiresApproval: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 50,
      min: 5,
      max: 200
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    region: {
      type: String,
      default: 'global'
    }
  },
  perks: {
    bonusPointsMultiplier: {
      type: Number,
      default: 1.0
    },
    exclusiveBadges: [{
      type: String
    }],
    specialEvents: {
      type: Boolean,
      default: false
    },
    customRoles: {
      type: Boolean,
      default: false
    }
  },
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
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
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

// Guild membership requests
const guildRequestSchema = new mongoose.Schema({
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    maxlength: 500,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
guildSchema.index({ name: 1 });
guildSchema.index({ leader: 1 });
guildSchema.index({ 'members.user': 1 });
guildSchema.index({ 'stats.level': -1 });
guildSchema.index({ 'stats.totalPoints': -1 });
guildSchema.index({ 'settings.isPublic': 1, isActive: 1 });

guildRequestSchema.index({ guild: 1, status: 1 });
guildRequestSchema.index({ user: 1, status: 1 });

// Update timestamp on save
guildSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update member count
  this.stats.memberCount = this.members.length;
  
  // Calculate guild level based on total points
  this.stats.level = Math.floor(this.stats.totalPoints / 1000) + 1;
  
  next();
});

// Method to add member
guildSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  
  if (existingMember) {
    return false; // Already a member
  }
  
  if (this.members.length >= this.settings.maxMembers) {
    return false; // Guild is full
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    contribution: 0,
    weeklyContribution: 0,
    lastActive: new Date()
  });
  
  return true;
};

// Method to remove member
guildSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(m => m.user.toString() === userId.toString());
  
  if (memberIndex === -1) {
    return false; // Not a member
  }
  
  const member = this.members[memberIndex];
  
  // Can't remove the leader
  if (member.role === 'leader') {
    return false;
  }
  
  this.members.splice(memberIndex, 1);
  
  // Remove from officers if needed
  this.officers = this.officers.filter(o => o.toString() !== userId.toString());
  
  return true;
};

// Method to promote member
guildSchema.methods.promoteMember = function(userId, newRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  
  if (!member) {
    return false; // Not a member
  }
  
  member.role = newRole;
  
  if (newRole === 'officer' && !this.officers.includes(userId)) {
    this.officers.push(userId);
  } else if (newRole === 'member') {
    this.officers = this.officers.filter(o => o.toString() !== userId.toString());
  }
  
  return true;
};

// Method to check if user is member
guildSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// Method to get member role
guildSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to add points to guild
guildSchema.methods.addPoints = function(points, userId) {
  this.stats.totalPoints += points;
  this.stats.weeklyActivity += points;
  this.stats.monthlyActivity += points;
  
  // Update member contribution
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.contribution += points;
    member.weeklyContribution += points;
    member.lastActive = new Date();
  }
  
  return this.save();
};

// Method to unlock achievement
guildSchema.methods.unlockAchievement = function(achievementId, name, description, participants = []) {
  const existingAchievement = this.achievements.find(a => a.achievementId === achievementId);
  
  if (existingAchievement) {
    return false; // Already unlocked
  }
  
  this.achievements.push({
    achievementId,
    name,
    description,
    participants,
    unlockedAt: new Date()
  });
  
  return true;
};

// Static method to get leaderboard
guildSchema.statics.getLeaderboard = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'stats.totalPoints': -1 })
    .limit(limit)
    .populate('leader', 'firstName lastName profileImage')
    .populate('members.user', 'firstName lastName profileImage');
};

// Static method to search guilds
guildSchema.statics.searchGuilds = function(query, options = {}) {
  const searchQuery = {
    isActive: true,
    'settings.isPublic': true
  };
  
  if (query) {
    searchQuery.$or = [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ];
  }
  
  if (options.region && options.region !== 'global') {
    searchQuery['settings.region'] = options.region;
  }
  
  return this.find(searchQuery)
    .sort({ 'stats.totalPoints': -1 })
    .limit(options.limit || 20)
    .populate('leader', 'firstName lastName profileImage');
};

// Static method to get guild recommendations for user
guildSchema.statics.getRecommendations = async function(userId, limit = 5) {
  const User = require('./User');
  const user = await User.findById(userId);
  
  if (!user) return [];
  
  // Find guilds with similar interests/activity patterns
  const recommendations = await this.find({
    isActive: true,
    'settings.isPublic': true,
    'stats.memberCount': { $lt: this.settings?.maxMembers || 50 },
    'members.user': { $ne: userId }
  })
  .sort({ 'stats.weeklyActivity': -1 })
  .limit(limit)
  .populate('leader', 'firstName lastName profileImage');
  
  return recommendations;
};

const Guild = mongoose.model('Guild', guildSchema);
const GuildRequest = mongoose.model('GuildRequest', guildRequestSchema);

module.exports = { Guild, GuildRequest };