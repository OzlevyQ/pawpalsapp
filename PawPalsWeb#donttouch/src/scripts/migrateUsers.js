const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users without gamification field
    const usersWithoutGamification = await User.find({
      $or: [
        { gamification: { $exists: false } },
        { gamification: null }
      ]
    });

    console.log(`Found ${usersWithoutGamification.length} users without gamification data`);

    // Update each user
    for (const user of usersWithoutGamification) {
      user.gamification = {
        points: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastVisitDate: null,
        badges: [],
        achievements: []
      };
      
      await user.save();
      console.log(`Updated user: ${user.email}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateUsers();