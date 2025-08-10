const User = require('../models/User');

class LevelService {
  static LEVEL_THRESHOLDS = [
    { level: 1, minPoints: 0, maxPoints: 199, title: 'Rookie Walker', icon: '🐕' },
    { level: 2, minPoints: 200, maxPoints: 599, title: 'Park Explorer', icon: '🌳' },
    { level: 3, minPoints: 600, maxPoints: 1299, title: 'Social Pup', icon: '👥' },
    { level: 4, minPoints: 1300, maxPoints: 2399, title: 'Streak Master', icon: '⚡' },
    { level: 5, minPoints: 2400, maxPoints: 3999, title: 'Pack Leader', icon: '🏆' },
    { level: 6, minPoints: 4000, maxPoints: 6299, title: 'Park Veteran', icon: '⭐' },
    { level: 7, minPoints: 6300, maxPoints: 9499, title: 'Champion Walker', icon: '🏅' },
    { level: 8, minPoints: 9500, maxPoints: 14999, title: 'Elite Trainer', icon: '💎' },
    { level: 9, minPoints: 15000, maxPoints: 24999, title: 'Legendary Walker', icon: '👑' },
    { level: 10, minPoints: 25000, maxPoints: Infinity, title: 'Grand Master', icon: '🌟' }
  ];

  static calculateLevel(points) {
    for (const threshold of this.LEVEL_THRESHOLDS) {
      if (points >= threshold.minPoints && points <= threshold.maxPoints) {
        return threshold.level;
      }
    }
    return 1; // Default to level 1
  }

  static getLevelInfo(level) {
    return this.LEVEL_THRESHOLDS.find(threshold => threshold.level === level) || this.LEVEL_THRESHOLDS[0];
  }

  static getProgressToNextLevel(currentPoints, currentLevel) {
    const currentLevelInfo = this.getLevelInfo(currentLevel);
    const nextLevelInfo = this.getLevelInfo(currentLevel + 1);
    
    if (!nextLevelInfo || nextLevelInfo.minPoints === Infinity) {
      return {
        current: currentPoints - currentLevelInfo.minPoints,
        needed: currentLevelInfo.maxPoints - currentLevelInfo.minPoints + 1,
        percentage: 100,
        isMaxLevel: true
      };
    }

    const pointsInCurrentLevel = currentPoints - currentLevelInfo.minPoints;
    const pointsNeededForLevel = nextLevelInfo.minPoints - currentLevelInfo.minPoints;
    
    return {
      current: pointsInCurrentLevel,
      needed: pointsNeededForLevel,
      percentage: Math.min(Math.round((pointsInCurrentLevel / pointsNeededForLevel) * 100), 100),
      isMaxLevel: false,
      nextLevel: nextLevelInfo
    };
  }

  static async updateUserLevel(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentPoints = user.gamification.points || 0;
      const newLevel = this.calculateLevel(currentPoints);
      const oldLevel = user.gamification.level || 1;

      if (newLevel !== oldLevel) {
        user.gamification.level = newLevel;
        await user.save();

        return {
          leveledUp: newLevel > oldLevel,
          oldLevel,
          newLevel,
          levelInfo: this.getLevelInfo(newLevel)
        };
      }

      return {
        leveledUp: false,
        oldLevel,
        newLevel: oldLevel,
        levelInfo: this.getLevelInfo(oldLevel)
      };
    } catch (error) {
      console.error('Error updating user level:', error);
      throw error;
    }
  }

  static async getUserLevelStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentPoints = user.gamification.points || 0;
      const currentLevel = user.gamification.level || 1;
      const levelInfo = this.getLevelInfo(currentLevel);
      const progress = this.getProgressToNextLevel(currentPoints, currentLevel);

      return {
        currentLevel,
        currentPoints,
        levelInfo,
        progress,
        totalLevels: this.LEVEL_THRESHOLDS.length
      };
    } catch (error) {
      console.error('Error getting user level stats:', error);
      throw error;
    }
  }

  static getAllLevels() {
    return this.LEVEL_THRESHOLDS;
  }

  static getLevelRewards(level) {
    const rewards = {
      1: { badge: 'first_steps', points: 0 },
      2: { badge: 'explorer', points: 50 },
      3: { badge: 'social_butterfly', points: 75 },
      4: { badge: 'streak_warrior', points: 100 },
      5: { badge: 'pack_leader', points: 150 },
      6: { badge: 'veteran', points: 200 },
      7: { badge: 'champion', points: 250 },
      8: { badge: 'elite', points: 300 },
      9: { badge: 'legendary', points: 400 },
      10: { badge: 'grand_master', points: 500 }
    };

    return rewards[level] || { badge: null, points: 0 };
  }
}

module.exports = LevelService;