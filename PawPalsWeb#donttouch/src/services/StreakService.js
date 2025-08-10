const User = require('../models/User');
const BadgeService = require('./BadgeService');

class StreakService {
  static async updateStreak(userId, visitDate = new Date()) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date(visitDate);
      today.setHours(0, 0, 0, 0); // Reset to start of day

      const lastVisitDate = user.gamification.lastVisitDate;
      let streakUpdated = false;

      if (!lastVisitDate) {
        // First visit ever
        user.gamification.currentStreak = 1;
        user.gamification.longestStreak = 1;
        user.gamification.lastVisitDate = today;
        streakUpdated = true;
      } else {
        const lastVisit = new Date(lastVisitDate);
        lastVisit.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const daysDiff = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Same day, no streak change
          streakUpdated = false;
        } else if (daysDiff === 1) {
          // Consecutive day
          user.gamification.currentStreak += 1;
          user.gamification.longestStreak = Math.max(
            user.gamification.longestStreak,
            user.gamification.currentStreak
          );
          user.gamification.lastVisitDate = today;
          streakUpdated = true;
        } else {
          // Streak broken
          user.gamification.currentStreak = 1;
          user.gamification.lastVisitDate = today;
          streakUpdated = true;
        }
      }

      if (streakUpdated) {
        await user.save();
        
        // Check for streak badges
        await BadgeService.checkAndAwardBadges(userId, 'streak');
      }

      return {
        currentStreak: user.gamification.currentStreak,
        longestStreak: user.gamification.longestStreak,
        streakUpdated,
        lastVisitDate: user.gamification.lastVisitDate
      };
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  static async getStreakStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastVisitDate = user.gamification.lastVisitDate;
      let streakStatus = 'active';
      let daysUntilBreak = 0;

      if (lastVisitDate) {
        const lastVisit = new Date(lastVisitDate);
        lastVisit.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - lastVisit) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          streakStatus = 'current'; // Visited today
          daysUntilBreak = 1;
        } else if (daysDiff === 1) {
          streakStatus = 'at_risk'; // Need to visit today to maintain streak
          daysUntilBreak = 0;
        } else {
          streakStatus = 'broken'; // Streak is broken
          daysUntilBreak = 0;
        }
      } else {
        streakStatus = 'none'; // No visits yet
      }

      return {
        currentStreak: user.gamification.currentStreak || 0,
        longestStreak: user.gamification.longestStreak || 0,
        lastVisitDate: user.gamification.lastVisitDate,
        streakStatus,
        daysUntilBreak,
        nextMilestone: this.getNextStreakMilestone(user.gamification.currentStreak || 0)
      };
    } catch (error) {
      console.error('Error getting streak stats:', error);
      throw error;
    }
  }

  static getNextStreakMilestone(currentStreak) {
    const milestones = [3, 7, 14, 30, 60, 100, 365];
    
    for (const milestone of milestones) {
      if (currentStreak < milestone) {
        return {
          target: milestone,
          remaining: milestone - currentStreak,
          reward: this.getStreakReward(milestone)
        };
      }
    }
    
    return null; // No more milestones
  }

  static getStreakReward(streak) {
    const rewards = {
      3: { points: 25, badge: 'streak_3' },
      7: { points: 50, badge: 'streak_7' },
      14: { points: 100, badge: 'streak_14' },
      30: { points: 200, badge: 'streak_30' },
      60: { points: 400, badge: 'streak_60' },
      100: { points: 750, badge: 'streak_100' },
      365: { points: 2000, badge: 'streak_365' }
    };

    return rewards[streak] || { points: 0, badge: null };
  }

  static async resetStreak(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.gamification.currentStreak = 0;
      user.gamification.lastVisitDate = null;
      await user.save();

      return {
        currentStreak: 0,
        longestStreak: user.gamification.longestStreak,
        reset: true
      };
    } catch (error) {
      console.error('Error resetting streak:', error);
      throw error;
    }
  }

  static async getStreakLeaderboard(limit = 10) {
    try {
      const users = await User.find({
        'gamification.currentStreak': { $gt: 0 }
      })
      .sort({ 'gamification.currentStreak': -1 })
      .limit(limit)
      .select('username firstName lastName gamification.currentStreak gamification.longestStreak profileImage');

      return users.map((user, index) => ({
        position: index + 1,
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage
        },
        currentStreak: user.gamification.currentStreak,
        longestStreak: user.gamification.longestStreak
      }));
    } catch (error) {
      console.error('Error getting streak leaderboard:', error);
      throw error;
    }
  }

  static async getLongestStreakLeaderboard(limit = 10) {
    try {
      const users = await User.find({
        'gamification.longestStreak': { $gt: 0 }
      })
      .sort({ 'gamification.longestStreak': -1 })
      .limit(limit)
      .select('username firstName lastName gamification.longestStreak gamification.currentStreak profileImage');

      return users.map((user, index) => ({
        position: index + 1,
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage
        },
        longestStreak: user.gamification.longestStreak,
        currentStreak: user.gamification.currentStreak
      }));
    } catch (error) {
      console.error('Error getting longest streak leaderboard:', error);
      throw error;
    }
  }

  static async checkStreakMaintenance() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      // Find users whose streaks should be broken
      const usersToUpdate = await User.find({
        'gamification.currentStreak': { $gt: 0 },
        'gamification.lastVisitDate': { $lt: yesterday }
      });

      let updatedCount = 0;

      for (const user of usersToUpdate) {
        const lastVisit = new Date(user.gamification.lastVisitDate);
        lastVisit.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((yesterday - lastVisit) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 1) {
          // Streak should be broken
          user.gamification.currentStreak = 0;
          await user.save();
          updatedCount++;
        }
      }

      return {
        checkedUsers: usersToUpdate.length,
        updatedUsers: updatedCount,
        checkDate: yesterday
      };
    } catch (error) {
      console.error('Error checking streak maintenance:', error);
      throw error;
    }
  }
}

module.exports = StreakService;