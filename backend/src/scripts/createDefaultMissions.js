const mongoose = require('mongoose');
const { Mission } = require('../models/Mission');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pawpals');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Get admin user ID for missions (placeholder - you should replace with actual admin user ID)
const ADMIN_USER_ID = '507f1f77bcf86cd799439011'; // placeholder

// Default daily missions
const defaultDailyMissions = [
  {
    missionId: 'daily_visit_park',
    title: 'בקר בגן כלבים',
    description: 'בקר בגן כלבים פעם אחת היום',
    type: 'daily',
    category: 'visits',
    requirements: [{
      type: 'visit_parks',
      target: 1,
      description: 'בקר בגן כלבים'
    }],
    rewards: {
      points: 10
    },
    isActive: true,
    isRecurring: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    createdBy: ADMIN_USER_ID
  },
  {
    missionId: 'daily_time_with_dog',
    title: 'בלה זמן עם הכלב',
    description: 'בלה לפחות 30 דקות עם הכלב שלך בגן',
    type: 'daily',
    category: 'visits',
    requirements: [{
      type: 'time_in_park',
      target: 30,
      description: 'בלה 30 דקות בגן'
    }],
    rewards: {
      points: 15
    },
    isActive: true,
    isRecurring: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: ADMIN_USER_ID
  },
  {
    missionId: 'daily_meet_new_dog',
    title: 'הכר כלב חדש',
    description: 'הכר כלב חדש בגן הכלבים',
    type: 'daily',
    category: 'social',
    requirements: [{
      type: 'meet_dogs',
      target: 1,
      description: 'הכר כלב חדש'
    }],
    rewards: {
      points: 20
    },
    isActive: true,
    isRecurring: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: ADMIN_USER_ID
  },
  {
    missionId: 'daily_take_photo',
    title: 'צלם תמונה',
    description: 'צלם תמונה של הכלב שלך בגן',
    type: 'daily',
    category: 'community',
    requirements: [{
      type: 'take_photos',
      target: 1,
      description: 'צלם תמונה בגן'
    }],
    rewards: {
      points: 5
    },
    isActive: true,
    isRecurring: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: ADMIN_USER_ID
  },
  {
    missionId: 'daily_join_event',
    title: 'השתתף באירוע',
    description: 'הירשם לאירוע קהילתי',
    type: 'daily',
    category: 'community',
    requirements: [{
      type: 'join_events',
      target: 1,
      description: 'הירשם לאירוע'
    }],
    rewards: {
      points: 25
    },
    isActive: true,
    isRecurring: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: ADMIN_USER_ID
  }
];

const createDefaultMissions = async () => {
  try {
    console.log('Creating default daily missions...');
    
    for (const missionData of defaultDailyMissions) {
      // Check if mission already exists
      const existingMission = await Mission.findOne({
        title: missionData.title,
        type: missionData.type
      });
      
      if (existingMission) {
        console.log(`Mission "${missionData.title}" already exists, skipping...`);
        continue;
      }
      
      // Create new mission
      const mission = new Mission(missionData);
      await mission.save();
      console.log(`✅ Created mission: "${missionData.title}" (${missionData.pointsReward} points)`);
    }
    
    console.log('\n📊 Mission creation complete!');
    
    // Display all daily missions
    const allDailyMissions = await Mission.find({ type: 'daily', isActive: true });
    console.log(`\nTotal daily missions in database: ${allDailyMissions.length}`);
    
    allDailyMissions.forEach(mission => {
      console.log(`- ${mission.title}: ${mission.pointsReward} points (${mission.description})`);
    });
    
  } catch (error) {
    console.error('Error creating default missions:', error);
  }
};

const main = async () => {
  await connectDB();
  await createDefaultMissions();
  
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run the script
main();