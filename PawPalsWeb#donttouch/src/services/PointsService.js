const User = require('../models/User');
const Achievement = require('../models/Achievement');

class PointsService {
  static POINT_VALUES = {
    VISIT: 5,              // Reduced from 10 (50% harder)
    CHECKIN: 2,            // Reduced from 5 (60% harder)
    CHECKOUT: 3,           // Reduced from 5 (40% harder)
    FIRST_VISIT_DAY: 8,    // Reduced from 15 (47% harder)
    STREAK_BONUS: 3,       // Reduced from 5 (40% harder)
    SOCIAL_INTERACTION: 2, // Reduced from 3 (33% harder)
    ACHIEVEMENT_UNLOCK: 25, // Reduced from 50 (50% harder)
    BADGE_EARNED: 15,      // Reduced from 25 (40% harder)
    DOG_RATING: 1,         // NEW: Points for rating dogs
    MISSION_COMPLETE: 10,  // NEW: Points for completing missions
    GUILD_PARTICIPATION: 5, // NEW: Points for guild activities
    QUALITY_VISIT_BONUS: 2, // NEW: Bonus for longer visits
    MENTOR_HELP: 5,        // NEW: Points for helping new users
    FRIENDSHIP_MADE: 3     // NEW: Points for making friends
  };

  static async awardPoints(userId, pointType, amount = null, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const pointsToAward = amount || this.POINT_VALUES[pointType] || 0;
      
      // Update user points
      user.gamification.points += pointsToAward;
      
      // Check for level up
      const newLevel = this.calculateLevel(user.gamification.points);
      const leveledUp = newLevel > user.gamification.level;
      
      if (leveledUp) {
        user.gamification.level = newLevel;
        // Award bonus points for level up
        user.gamification.points += this.POINT_VALUES.ACHIEVEMENT_UNLOCK;
      }

      await user.save();

      // Check for achievement progress
      await this.checkAchievementProgress(userId, pointType, metadata);

      return {
        pointsAwarded: pointsToAward,
        totalPoints: user.gamification.points,
        level: user.gamification.level,
        leveledUp,
        bonusPoints: leveledUp ? this.POINT_VALUES.ACHIEVEMENT_UNLOCK : 0
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  static calculateLevel(points) {
    // Level formula: level = floor(sqrt(points / 100)) + 1
    // Level 1: 0-99 points
    // Level 2: 100-399 points
    // Level 3: 400-899 points
    // Level 4: 900-1599 points
    // etc.
    return Math.floor(Math.sqrt(points / 100)) + 1;
  }

  static getPointsForNextLevel(currentLevel) {
    // Calculate points needed for next level
    const nextLevel = currentLevel + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
  }

  static async recordVisit(userId, gardenId, visitType = 'VISIT') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const lastVisitStr = user.gamification.lastVisitDate 
        ? user.gamification.lastVisitDate.toISOString().split('T')[0]
        : null;

      let pointsAwarded = 0;
      let streakBonus = 0;
      let firstVisitBonus = 0;

      // Award visit points
      const visitResult = await this.awardPoints(userId, visitType, null, {
        gardenId,
        visitDate: today
      });
      pointsAwarded += visitResult.pointsAwarded;

      // Check for first visit of the day bonus
      if (lastVisitStr !== todayStr) {
        const firstVisitResult = await this.awardPoints(userId, 'FIRST_VISIT_DAY');
        firstVisitBonus = firstVisitResult.pointsAwarded;
        pointsAwarded += firstVisitBonus;

        // Update streak
        await this.updateStreak(userId, today);
      }

      // Get updated user data
      const updatedUser = await User.findById(userId);
      
      // Award streak bonus if applicable
      if (updatedUser.gamification.currentStreak > 1) {
        const streakBonusResult = await this.awardPoints(userId, 'STREAK_BONUS');
        streakBonus = streakBonusResult.pointsAwarded;
        pointsAwarded += streakBonus;
      }

      return {
        totalPointsAwarded: pointsAwarded,
        visitPoints: visitResult.pointsAwarded,
        firstVisitBonus,
        streakBonus,
        level: updatedUser.gamification.level,
        totalPoints: updatedUser.gamification.points,
        currentStreak: updatedUser.gamification.currentStreak
      };
    } catch (error) {
      console.error('Error recording visit:', error);
      throw error;
    }
  }

  static async updateStreak(userId, visitDate) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date(visitDate);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastVisitDate = user.gamification.lastVisitDate;
      const lastVisitStr = lastVisitDate ? lastVisitDate.toISOString().split('T')[0] : null;
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      if (lastVisitStr === yesterdayStr) {
        // Consecutive day visit - increment streak
        user.gamification.currentStreak += 1;
        user.gamification.longestStreak = Math.max(
          user.gamification.longestStreak,
          user.gamification.currentStreak
        );
      } else if (lastVisitStr !== todayStr) {
        // Not consecutive or first visit - reset streak
        user.gamification.currentStreak = 1;
      }

      user.gamification.lastVisitDate = today;
      await user.save();

      return user.gamification.currentStreak;
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  static async checkAchievementProgress(userId, actionType, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const achievements = await Achievement.find({ isActive: true });
      let progressUpdated = false;

      for (const achievement of achievements) {
        const userAchievement = user.gamification.achievements.find(
          ua => ua.achievementId === achievement.achievementId
        );

        if (userAchievement && userAchievement.completed) {
          continue; // Already completed
        }

        let progress = userAchievement ? userAchievement.progress : 0;
        let shouldUpdate = false;

        // Update progress based on achievement type and action
        switch (achievement.type) {
          case 'count':
            if (this.actionMatchesAchievement(actionType, achievement.category)) {
              progress += 1;
              shouldUpdate = true;
            }
            break;
          case 'streak':
            if (achievement.category === 'streaks' && actionType === 'FIRST_VISIT_DAY') {
              progress = user.gamification.currentStreak;
              shouldUpdate = true;
            }
            break;
          case 'milestone':
            if (achievement.category === 'visits' && actionType === 'VISIT') {
              progress += 1;
              shouldUpdate = true;
            }
            break;
        }

        if (shouldUpdate) {
          if (userAchievement) {
            userAchievement.progress = progress;
            if (progress >= achievement.target && !userAchievement.completed) {
              userAchievement.completed = true;
              userAchievement.completedAt = new Date();
              await this.awardAchievement(userId, achievement);
            }
          } else {
            const newAchievement = {
              achievementId: achievement.achievementId,
              name: achievement.name,
              description: achievement.description,
              progress,
              target: achievement.target,
              completed: progress >= achievement.target,
              completedAt: progress >= achievement.target ? new Date() : null
            };
            user.gamification.achievements.push(newAchievement);
            
            if (newAchievement.completed) {
              await this.awardAchievement(userId, achievement);
            }
          }
          progressUpdated = true;
        }
      }

      if (progressUpdated) {
        await user.save();
      }
    } catch (error) {
      console.error('Error checking achievement progress:', error);
    }
  }

  static actionMatchesAchievement(actionType, category) {
    const actionCategoryMap = {
      'VISIT': 'visits',
      'CHECKIN': 'visits',
      'CHECKOUT': 'visits',
      'SOCIAL_INTERACTION': 'social',
      'FIRST_VISIT_DAY': 'visits'
    };

    return actionCategoryMap[actionType] === category;
  }

  static async awardAchievement(userId, achievement) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Award achievement points
      await this.awardPoints(userId, 'ACHIEVEMENT_UNLOCK', achievement.points);

      // Award badge if specified
      if (achievement.badge && achievement.badge.badgeId) {
        const existingBadge = user.gamification.badges.find(
          b => b.badgeId === achievement.badge.badgeId
        );

        if (!existingBadge) {
          user.gamification.badges.push({
            badgeId: achievement.badge.badgeId,
            name: achievement.badge.name,
            icon: achievement.badge.icon,
            description: achievement.badge.description || achievement.description,
            rarity: achievement.badge.rarity,
            earnedAt: new Date()
          });
          
          await user.save();
          await this.awardPoints(userId, 'BADGE_EARNED');
        }
      }
    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  }

  static async getUserGamificationStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentLevel = user.gamification.level;
      const currentPoints = user.gamification.points;
      const pointsForNextLevel = this.getPointsForNextLevel(currentLevel);
      const pointsForCurrentLevel = currentLevel > 1 ? this.getPointsForNextLevel(currentLevel - 1) : 0;
      const progressToNextLevel = currentPoints - pointsForCurrentLevel;
      const pointsNeededForNext = pointsForNextLevel - pointsForCurrentLevel;

      return {
        points: currentPoints,
        level: currentLevel,
        currentStreak: user.gamification.currentStreak,
        longestStreak: user.gamification.longestStreak,
        badges: user.gamification.badges,
        achievements: user.gamification.achievements,
        levelProgress: {
          current: progressToNextLevel,
          needed: pointsNeededForNext,
          percentage: Math.round((progressToNextLevel / pointsNeededForNext) * 100)
        }
      };
    } catch (error) {
      console.error('Error getting user gamification stats:', error);
      throw error;
    }
  }
}

module.exports = PointsService;