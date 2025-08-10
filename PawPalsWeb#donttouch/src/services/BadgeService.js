const User = require('../models/User');
const LevelService = require('./LevelService');

class BadgeService {
  static BADGE_DEFINITIONS = {
    // Visit badges
    first_visit: {
      badgeId: 'first_visit',
      name: 'First Steps',
      icon: '🐾',
      description: 'Completed your first park visit',
      rarity: 'common',
      category: 'visits'
    },
    visit_10: {
      badgeId: 'visit_10',
      name: 'Regular Walker',
      icon: '🚶',
      description: 'Completed 10 park visits',
      rarity: 'common',
      category: 'visits'
    },
    visit_50: {
      badgeId: 'visit_50',
      name: 'Park Enthusiast',
      icon: '🌳',
      description: 'Completed 50 park visits',
      rarity: 'rare',
      category: 'visits'
    },
    visit_100: {
      badgeId: 'visit_100',
      name: 'Park Master',
      icon: '🏆',
      description: 'Completed 100 park visits',
      rarity: 'epic',
      category: 'visits'
    },
    
    // Streak badges
    streak_3: {
      badgeId: 'streak_3',
      name: 'Consistent Walker',
      icon: '⚡',
      description: 'Visited parks 3 days in a row',
      rarity: 'common',
      category: 'streaks'
    },
    streak_7: {
      badgeId: 'streak_7',
      name: 'Week Warrior',
      icon: '🔥',
      description: 'Visited parks 7 days in a row',
      rarity: 'rare',
      category: 'streaks'
    },
    streak_30: {
      badgeId: 'streak_30',
      name: 'Monthly Master',
      icon: '💪',
      description: 'Visited parks 30 days in a row',
      rarity: 'epic',
      category: 'streaks'
    },
    streak_100: {
      badgeId: 'streak_100',
      name: 'Streak Legend',
      icon: '👑',
      description: 'Visited parks 100 days in a row',
      rarity: 'legendary',
      category: 'streaks'
    },
    
    // Social badges
    social_1: {
      badgeId: 'social_1',
      name: 'Friendly Pup',
      icon: '😊',
      description: 'Made your first social connection',
      rarity: 'common',
      category: 'social'
    },
    social_5: {
      badgeId: 'social_5',
      name: 'Social Butterfly',
      icon: '🦋',
      description: 'Connected with 5 dog owners',
      rarity: 'rare',
      category: 'social'
    },
    social_20: {
      badgeId: 'social_20',
      name: 'Community Builder',
      icon: '🤝',
      description: 'Connected with 20 dog owners',
      rarity: 'epic',
      category: 'social'
    },
    
    // Level badges
    level_5: {
      badgeId: 'level_5',
      name: 'Rising Star',
      icon: '🌟',
      description: 'Reached level 5',
      rarity: 'rare',
      category: 'levels'
    },
    level_10: {
      badgeId: 'level_10',
      name: 'Elite Walker',
      icon: '💎',
      description: 'Reached level 10',
      rarity: 'legendary',
      category: 'levels'
    },
    
    // Special badges
    early_bird: {
      badgeId: 'early_bird',
      name: 'Early Bird',
      icon: '🌅',
      description: 'Visited a park before 7 AM',
      rarity: 'rare',
      category: 'special'
    },
    night_owl: {
      badgeId: 'night_owl',
      name: 'Night Owl',
      icon: '🌙',
      description: 'Visited a park after 10 PM',
      rarity: 'rare',
      category: 'special'
    },
    explorer: {
      badgeId: 'explorer',
      name: 'Park Explorer',
      icon: '🗺️',
      description: 'Visited 10 different parks',
      rarity: 'epic',
      category: 'exploration'
    }
  };

  static async awardBadge(userId, badgeId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const badgeDefinition = this.BADGE_DEFINITIONS[badgeId];
      if (!badgeDefinition) {
        throw new Error('Badge definition not found');
      }

      // Check if user already has this badge
      const existingBadge = user.gamification.badges.find(
        b => b.badgeId === badgeId
      );

      if (existingBadge) {
        return { alreadyHas: true, badge: existingBadge };
      }

      // Award the badge
      const newBadge = {
        badgeId: badgeDefinition.badgeId,
        name: badgeDefinition.name,
        icon: badgeDefinition.icon,
        description: badgeDefinition.description,
        rarity: badgeDefinition.rarity,
        earnedAt: new Date()
      };

      user.gamification.badges.push(newBadge);
      await user.save();

      return { awarded: true, badge: newBadge };
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  }

  static async checkAndAwardBadges(userId, eventType, eventData = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const badgesToCheck = [];

      switch (eventType) {
        case 'visit':
          badgesToCheck.push(
            { badgeId: 'first_visit', condition: () => this.getVisitCount(user) >= 1 },
            { badgeId: 'visit_10', condition: () => this.getVisitCount(user) >= 10 },
            { badgeId: 'visit_50', condition: () => this.getVisitCount(user) >= 50 },
            { badgeId: 'visit_100', condition: () => this.getVisitCount(user) >= 100 }
          );
          break;

        case 'streak':
          const currentStreak = user.gamification.currentStreak;
          badgesToCheck.push(
            { badgeId: 'streak_3', condition: () => currentStreak >= 3 },
            { badgeId: 'streak_7', condition: () => currentStreak >= 7 },
            { badgeId: 'streak_30', condition: () => currentStreak >= 30 },
            { badgeId: 'streak_100', condition: () => currentStreak >= 100 }
          );
          break;

        case 'level_up':
          const currentLevel = user.gamification.level;
          badgesToCheck.push(
            { badgeId: 'level_5', condition: () => currentLevel >= 5 },
            { badgeId: 'level_10', condition: () => currentLevel >= 10 }
          );
          break;

        case 'social':
          badgesToCheck.push(
            { badgeId: 'social_1', condition: () => this.getSocialCount(user) >= 1 },
            { badgeId: 'social_5', condition: () => this.getSocialCount(user) >= 5 },
            { badgeId: 'social_20', condition: () => this.getSocialCount(user) >= 20 }
          );
          break;

        case 'time_based':
          const visitTime = eventData.visitTime;
          if (visitTime) {
            const hour = visitTime.getHours();
            badgesToCheck.push(
              { badgeId: 'early_bird', condition: () => hour < 7 },
              { badgeId: 'night_owl', condition: () => hour >= 22 }
            );
          }
          break;

        case 'exploration':
          badgesToCheck.push(
            { badgeId: 'explorer', condition: () => this.getUniqueParksCount(user) >= 10 }
          );
          break;
      }

      const awardedBadges = [];
      
      for (const badgeCheck of badgesToCheck) {
        if (badgeCheck.condition()) {
          const result = await this.awardBadge(userId, badgeCheck.badgeId);
          if (result.awarded) {
            awardedBadges.push(result.badge);
          }
        }
      }

      return awardedBadges;
    } catch (error) {
      console.error('Error checking and awarding badges:', error);
      return [];
    }
  }

  static getVisitCount(user) {
    // This would typically come from visit records
    // For now, estimate based on points (assuming 10 points per visit)
    return Math.floor(user.gamification.points / 10);
  }

  static getSocialCount(user) {
    // This would come from social interaction records
    // For now, return 0 - implement when social features are added
    return 0;
  }

  static getUniqueParksCount(user) {
    // This would come from visit records showing unique parks
    // For now, return 0 - implement when park visit tracking is enhanced
    return 0;
  }

  static async getUserBadges(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user.gamification.badges || [];
    } catch (error) {
      console.error('Error getting user badges:', error);
      throw error;
    }
  }

  static async getAllBadges() {
    return Object.values(this.BADGE_DEFINITIONS);
  }

  static getBadgesByCategory(category) {
    return Object.values(this.BADGE_DEFINITIONS).filter(
      badge => badge.category === category
    );
  }

  static getBadgesByRarity(rarity) {
    return Object.values(this.BADGE_DEFINITIONS).filter(
      badge => badge.rarity === rarity
    );
  }

  static async getBadgeStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const userBadges = user.gamification.badges || [];
      const allBadges = Object.values(this.BADGE_DEFINITIONS);

      const stats = {
        total: userBadges.length,
        totalAvailable: allBadges.length,
        percentage: Math.round((userBadges.length / allBadges.length) * 100),
        byRarity: {
          common: userBadges.filter(b => b.rarity === 'common').length,
          rare: userBadges.filter(b => b.rarity === 'rare').length,
          epic: userBadges.filter(b => b.rarity === 'epic').length,
          legendary: userBadges.filter(b => b.rarity === 'legendary').length
        },
        byCategory: {
          visits: userBadges.filter(b => this.BADGE_DEFINITIONS[b.badgeId]?.category === 'visits').length,
          streaks: userBadges.filter(b => this.BADGE_DEFINITIONS[b.badgeId]?.category === 'streaks').length,
          social: userBadges.filter(b => this.BADGE_DEFINITIONS[b.badgeId]?.category === 'social').length,
          levels: userBadges.filter(b => this.BADGE_DEFINITIONS[b.badgeId]?.category === 'levels').length,
          special: userBadges.filter(b => this.BADGE_DEFINITIONS[b.badgeId]?.category === 'special').length,
          exploration: userBadges.filter(b => this.BADGE_DEFINITIONS[b.badgeId]?.category === 'exploration').length
        }
      };

      return stats;
    } catch (error) {
      console.error('Error getting badge stats:', error);
      throw error;
    }
  }
}

module.exports = BadgeService;