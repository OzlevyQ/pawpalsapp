const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
  missionId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'special'],
    required: true
  },
  category: {
    type: String,
    enum: ['visits', 'social', 'rating', 'exploration', 'streaks', 'community'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  requirements: [{
    type: {
      type: String,
      required: true
    }, // 'visit_parks', 'rate_dogs', 'make_friends', 'maintain_streak', etc.
    target: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }],
  rewards: {
    points: {
      type: Number,
      required: true
    },
    badges: [{
      type: String
    }],
    specialReward: {
      type: String
    },
    bonusMultiplier: {
      type: Number,
      default: 1
    }
  },
  prerequisites: [{
    type: {
      type: String,
      enum: ['level', 'badge', 'mission', 'streak']
    },
    value: mongoose.Schema.Types.Mixed
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: null // null means unlimited
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// User mission progress tracking
const userMissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mission',
    required: true
  },
  progress: [{
    requirementIndex: {
      type: Number,
      required: true
    },
    current: {
      type: Number,
      default: 0
    },
    target: {
      type: Number,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'expired'],
    default: 'active'
  },
  completedAt: {
    type: Date,
    default: null
  },
  rewardsClaimed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
missionSchema.index({ type: 1, isActive: 1 });
missionSchema.index({ startDate: 1, endDate: 1 });
missionSchema.index({ category: 1, difficulty: 1 });

userMissionSchema.index({ user: 1, status: 1 });
userMissionSchema.index({ mission: 1, status: 1 });
userMissionSchema.index({ user: 1, mission: 1 }, { unique: true });

// Update timestamp on save
missionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

userMissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if mission is currently active
missionSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

// Method to check if user meets prerequisites
missionSchema.methods.checkPrerequisites = async function(userId) {
  if (!this.prerequisites || this.prerequisites.length === 0) {
    return true;
  }

  const User = require('./User');
  const user = await User.findById(userId);
  
  if (!user) return false;

  for (const prereq of this.prerequisites) {
    switch (prereq.type) {
      case 'level':
        if (user.gamification.level < prereq.value) {
          return false;
        }
        break;
      case 'badge':
        const hasBadge = user.gamification.badges.some(b => b.badgeId === prereq.value);
        if (!hasBadge) {
          return false;
        }
        break;
      case 'streak':
        if (user.gamification.currentStreak < prereq.value) {
          return false;
        }
        break;
      case 'mission':
        const UserMission = mongoose.model('UserMission');
        const completedMission = await UserMission.findOne({
          user: userId,
          mission: prereq.value,
          status: 'completed'
        });
        if (!completedMission) {
          return false;
        }
        break;
    }
  }
  return true;
};

// Method to calculate completion percentage
userMissionSchema.methods.getCompletionPercentage = function() {
  if (!this.progress || this.progress.length === 0) return 0;
  
  const totalWeight = this.progress.length;
  const completedWeight = this.progress.reduce((sum, prog) => {
    return sum + (prog.current / prog.target);
  }, 0);
  
  return Math.min(Math.round((completedWeight / totalWeight) * 100), 100);
};

// Method to update progress
userMissionSchema.methods.updateProgress = function(requirementIndex, incrementBy = 1) {
  if (!this.progress[requirementIndex]) return false;
  
  const progress = this.progress[requirementIndex];
  progress.current = Math.min(progress.current + incrementBy, progress.target);
  
  if (progress.current >= progress.target && !progress.completed) {
    progress.completed = true;
    progress.completedAt = new Date();
  }
  
  // Check if all requirements are completed
  const allCompleted = this.progress.every(p => p.completed);
  if (allCompleted && this.status === 'active') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Static method to get available missions for user
missionSchema.statics.getAvailableMissions = async function(userId, type = null) {
  const now = new Date();
  let query = {
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  };
  
  if (type) {
    query.type = type;
  }
  
  const missions = await this.find(query);
  const availableMissions = [];
  
  for (const mission of missions) {
    const meetsPrereqs = await mission.checkPrerequisites(userId);
    if (meetsPrereqs) {
      availableMissions.push(mission);
    }
  }
  
  return availableMissions;
};

// Static method to create default missions
missionSchema.statics.createDefaultMissions = async function() {
  const defaultMissions = [
    {
      missionId: 'daily_visit_3',
      title: 'Daily Park Explorer',
      description: 'Visit 3 different parks today',
      type: 'daily',
      category: 'visits',
      difficulty: 'medium',
      requirements: [
        { type: 'visit_unique_parks', target: 3, description: 'Visit 3 different parks' }
      ],
      rewards: { points: 15, badges: ['daily_explorer'] },
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: null
    },
    {
      missionId: 'weekly_social_5',
      title: 'Social Butterfly',
      description: 'Rate 5 dogs you meet this week',
      type: 'weekly',
      category: 'social',
      difficulty: 'easy',
      requirements: [
        { type: 'rate_dogs', target: 5, description: 'Rate 5 different dogs' }
      ],
      rewards: { points: 25, badges: ['social_butterfly'] },
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: null
    },
    {
      missionId: 'weekly_streak_7',
      title: 'Streak Master',
      description: 'Maintain a 7-day visit streak',
      type: 'weekly',
      category: 'streaks',
      difficulty: 'hard',
      requirements: [
        { type: 'maintain_streak', target: 7, description: 'Visit parks for 7 consecutive days' }
      ],
      rewards: { points: 50, badges: ['streak_master'], bonusMultiplier: 2 },
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: null
    }
  ];
  
  for (const mission of defaultMissions) {
    await this.findOneAndUpdate(
      { missionId: mission.missionId },
      mission,
      { upsert: true, new: true }
    );
  }
};

const Mission = mongoose.model('Mission', missionSchema);
const UserMission = mongoose.model('UserMission', userMissionSchema);

module.exports = { Mission, UserMission };