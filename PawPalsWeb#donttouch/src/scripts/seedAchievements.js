const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
const dotenv = require('dotenv');

dotenv.config();

const achievements = [
  {
    achievementId: 'first_visit',
    name: 'First Steps',
    description: 'Complete your first park visit',
    icon: '🐾',
    category: 'visits',
    type: 'count',
    target: 1,
    points: 50,
    badge: {
      badgeId: 'first_visit',
      name: 'First Steps',
      icon: '🐾',
      rarity: 'common'
    }
  },
  {
    achievementId: 'visit_10',
    name: 'Regular Walker',
    description: 'Complete 10 park visits',
    icon: '🚶',
    category: 'visits',
    type: 'count',
    target: 10,
    points: 100,
    badge: {
      badgeId: 'visit_10',
      name: 'Regular Walker',
      icon: '🚶',
      rarity: 'common'
    }
  },
  {
    achievementId: 'visit_50',
    name: 'Park Enthusiast',
    description: 'Complete 50 park visits',
    icon: '🌳',
    category: 'visits',
    type: 'count',
    target: 50,
    points: 250,
    badge: {
      badgeId: 'visit_50',
      name: 'Park Enthusiast',
      icon: '🌳',
      rarity: 'rare'
    }
  },
  {
    achievementId: 'visit_100',
    name: 'Park Master',
    description: 'Complete 100 park visits',
    icon: '🏆',
    category: 'visits',
    type: 'count',
    target: 100,
    points: 500,
    badge: {
      badgeId: 'visit_100',
      name: 'Park Master',
      icon: '🏆',
      rarity: 'epic'
    }
  },
  {
    achievementId: 'streak_3',
    name: 'Consistent Walker',
    description: 'Visit parks 3 days in a row',
    icon: '⚡',
    category: 'streaks',
    type: 'streak',
    target: 3,
    points: 75,
    badge: {
      badgeId: 'streak_3',
      name: 'Consistent Walker',
      icon: '⚡',
      rarity: 'common'
    }
  },
  {
    achievementId: 'streak_7',
    name: 'Week Warrior',
    description: 'Visit parks 7 days in a row',
    icon: '🔥',
    category: 'streaks',
    type: 'streak',
    target: 7,
    points: 200,
    badge: {
      badgeId: 'streak_7',
      name: 'Week Warrior',
      icon: '🔥',
      rarity: 'rare'
    }
  },
  {
    achievementId: 'streak_30',
    name: 'Monthly Master',
    description: 'Visit parks 30 days in a row',
    icon: '💪',
    category: 'streaks',
    type: 'streak',
    target: 30,
    points: 500,
    badge: {
      badgeId: 'streak_30',
      name: 'Monthly Master',
      icon: '💪',
      rarity: 'epic'
    }
  },
  {
    achievementId: 'streak_100',
    name: 'Streak Legend',
    description: 'Visit parks 100 days in a row',
    icon: '👑',
    category: 'streaks',
    type: 'streak',
    target: 100,
    points: 1000,
    badge: {
      badgeId: 'streak_100',
      name: 'Streak Legend',
      icon: '👑',
      rarity: 'legendary'
    }
  },
  {
    achievementId: 'social_1',
    name: 'Friendly Pup',
    description: 'Make your first social connection',
    icon: '😊',
    category: 'social',
    type: 'count',
    target: 1,
    points: 50,
    badge: {
      badgeId: 'social_1',
      name: 'Friendly Pup',
      icon: '😊',
      rarity: 'common'
    }
  },
  {
    achievementId: 'social_5',
    name: 'Social Butterfly',
    description: 'Connect with 5 dog owners',
    icon: '🦋',
    category: 'social',
    type: 'count',
    target: 5,
    points: 150,
    badge: {
      badgeId: 'social_5',
      name: 'Social Butterfly',
      icon: '🦋',
      rarity: 'rare'
    }
  },
  {
    achievementId: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '🌟',
    category: 'levels',
    type: 'milestone',
    target: 5,
    points: 300,
    badge: {
      badgeId: 'level_5',
      name: 'Rising Star',
      icon: '🌟',
      rarity: 'rare'
    }
  },
  {
    achievementId: 'level_10',
    name: 'Elite Walker',
    description: 'Reach level 10',
    icon: '💎',
    category: 'levels',
    type: 'milestone',
    target: 10,
    points: 500,
    badge: {
      badgeId: 'level_10',
      name: 'Elite Walker',
      icon: '💎',
      rarity: 'legendary'
    }
  },
  {
    achievementId: 'early_bird',
    name: 'Early Bird',
    description: 'Visit a park before 7 AM',
    icon: '🌅',
    category: 'special',
    type: 'unique',
    target: 1,
    points: 100,
    badge: {
      badgeId: 'early_bird',
      name: 'Early Bird',
      icon: '🌅',
      rarity: 'rare'
    }
  },
  {
    achievementId: 'explorer',
    name: 'Park Explorer',
    description: 'Visit 10 different parks',
    icon: '🗺️',
    category: 'exploration',
    type: 'unique',
    target: 10,
    points: 300,
    badge: {
      badgeId: 'explorer',
      name: 'Park Explorer',
      icon: '🗺️',
      rarity: 'epic'
    }
  }
];

async function seedAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('Cleared existing achievements');

    // Insert new achievements
    const result = await Achievement.insertMany(achievements);
    console.log(`Inserted ${result.length} achievements`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding achievements:', error);
    process.exit(1);
  }
}

seedAchievements();