const mongoose = require('mongoose');
const Garden = require('../models/Garden');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pawpals', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for garden data fix');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Enhanced park data with realistic information
const enhancedParkData = [
  {
    name: "פארק יד לבנים",
    description: "גן כלבים מודרני ומרווח בלב פתח תקווה. כולל אזורים נפרדים לכלבים קטנים וגדולים, ציוד אילוף, ושפע של צל ומקומות ישיבה נוחים. הגן מתאים לכלבים בכל הגילאים ומציע חוויה בטוחה ומהנה.",
    location: {
      address: "רחוב ארלוזרוב 30, פתח תקווה",
      city: "פתח תקווה"
    },
    amenities: ["מים", "צל", "ספסלים", "שקיות פסולת", "חניה", "תאורה"],
    rules: [
      "חובת חיסונים עדכניים",
      "פיקוח על הכלב בכל עת",
      "ניקוי אחרי הכלב",
      "סגירת שערים",
      "כבוד הדדי בין בעלי הכלבים"
    ]
  },
  {
    name: "פארק פיפי",
    description: "גן כלבים חוף ימי באילת עם נוף מדהים לים האדום. מושלם למשחקי מים וחוויות ייחודיות. הגן כולל אזור חוף מיוחד לכלבים, מתקני שתייה קרה ואזורי צל טבעיים.",
    location: {
      address: "טיילת אילת, מול חוף אלמוג",
      city: "אילת"
    },
    amenities: ["מים", "צל", "מתקני חוף", "שקיות פסולת", "חניה"],
    rules: [
      "שמירה על ניקיון החוף",
      "פיקוח צמוד על כלבים ליד המים",
      "חובת חיסונים",
      "כבוד לבעלי חיים ימיים"
    ]
  },
  {
    name: "פארק טללים",
    description: "גן כלבים שקט ונעים בכרמיאל, מוקף בצמחייה עשירה ואוויר צח. מציע שבילי הליכה, אזורים לפעילות חופשית ומתקני אילוף מתקדמים. אידיאלי לכלבים הזקוקים לסביבה רגועה.",
    location: {
      address: "שכונת נווה יושע, כרמיאל",
      city: "כרמיאל"
    },
    amenities: ["מים", "צל", "שבילי הליכה", "ספסלים", "שקיות פסולת", "מתקני אילוף"],
    rules: [
      "שמירה על שקט",
      "הליכה בשבילים המיועדים",
      "חובת חיסונים",
      "שמירה על הצמחייה"
    ]
  },
  {
    name: "Dog park K. Bialik",
    description: "גן כלבים מרכזי וגדול בקרית ביאליק עם מתקנים מתקדמים ואזורים מגוונים. כולל אזור אילוף מקצועי, מתקני כושר לכלבים ואזור מיוחד לגורים. הגן מתוחזק בצורה מקצועית ומציע פעילויות קהילתיות.",
    location: {
      address: "רחוב דן 37, קרית ביאליק",
      city: "קרית ביאליק"
    },
    amenities: ["מים", "מתקני אילוף", "מתקני כושר", "ספסלים", "שקיות פסולת", "חניה", "תאורה"],
    rules: [
      "רישום מראש לפעילויות מיוחדות",
      "פיקוח על כלבים באזור הגורים",
      "שימוש נכון במתקני האילוף",
      "חובת חיסונים מעודכנים"
    ]
  },
  {
    name: "גינת כלבים הכובשים",
    description: "גן כלבים מודרני בלב תל אביב עם נוף עירוני מרהיב. מציע חוויה אורבנית ייחודית עם מתקנים טכנולוגיים מתקדמים, תחנות מים אוטומטיות ואזורי משחק אינטראקטיביים. פופולרי במיוחד בקרב צעירים ומקצוענים.",
    location: {
      address: "רחוב הכובשים 15, תל אביב",
      city: "תל אביב-יפו"
    },
    amenities: ["מים", "מתקנים טכנולוגיים", "אזורי משחק", "ספסלים מודרניים", "שקיות פסולת", "Wi-Fi"],
    rules: [
      "שימוש אחראי בטכנולוגיה",
      "כבוד לסביבה העירונית",
      "חובת חיסונים",
      "שמירה על רמת רעש מתאימה"
    ]
  }
];

// Sample additional parks to enrich the database
const additionalParks = [
  {
    name: "גן הכלבים גבעתיים",
    description: "גן כלבים משפחתי וידידותי בגבעתיים, מציע אוירה חמה וקהילתית. כולל אזור מיוחד למפגשים חברתיים, פינת קפה לבעלי הכלבים ומתקני משחק מגוונים. מושלם למשפחות עם ילדים וכלבים.",
    type: "public",
    location: {
      address: "רחוב קרית ספר 45, גבעתיים",
      city: "גבעתיים",
      coordinates: {
        type: "Point",
        coordinates: [34.8103, 32.0676]
      }
    },
    capacity: { maxDogs: 18, maxSmallDogs: 8, maxLargeDogs: 10 },
    openingHours: {
      sunday: { open: "06:30", close: "21:30", closed: false },
      monday: { open: "06:30", close: "21:30", closed: false },
      tuesday: { open: "06:30", close: "21:30", closed: false },
      wednesday: { open: "06:30", close: "21:30", closed: false },
      thursday: { open: "06:30", close: "21:30", closed: false },
      friday: { open: "06:30", close: "20:00", closed: false },
      saturday: { open: "08:00", close: "21:30", closed: false }
    },
    amenities: ["מים", "צל", "ספסלים", "שקיות פסולת", "חניה", "פינת קפה"],
    rules: [
      "משפחות עם ילדים - פיקוח מיוחד",
      "שמירה על רמת רעש נמוכה",
      "שיתוף פעולה בין בעלי הכלבים",
      "חובת חיסונים מעודכנים"
    ],
    statistics: { averageRating: 4.6, totalReviews: 89, totalVisits: 1247 },
    pricing: { type: "free", price: 0, currency: "ILS" }
  },
  {
    name: "פארק הכלבים רמת גן",
    description: "גן כלבים עירוני מתקדם ברמת גן עם מתקנים חדשניים ואזורים מתמחים. כולל מסלול אג'יליטי מקצועי, אזור שחייה קטן לכלבים ומרפאה וטרינרית חירום. הגן מיועד לכלבים פעילים ובעליהם המתקדמים.",
    type: "public",
    location: {
      address: "פארק לאומי רמת גן, יציאה מזרחית",
      city: "רמת גן",
      coordinates: {
        type: "Point",
        coordinates: [34.8242, 32.0853]
      }
    },
    capacity: { maxDogs: 25, maxSmallDogs: 10, maxLargeDogs: 15 },
    openingHours: {
      sunday: { open: "06:00", close: "22:00", closed: false },
      monday: { open: "06:00", close: "22:00", closed: false },
      tuesday: { open: "06:00", close: "22:00", closed: false },
      wednesday: { open: "06:00", close: "22:00", closed: false },
      thursday: { open: "06:00", close: "22:00", closed: false },
      friday: { open: "06:00", close: "20:30", closed: false },
      saturday: { open: "07:30", close: "22:00", closed: false }
    },
    amenities: ["מים", "מסלול אג'יליטי", "אזור שחייה", "מרפאה וטרינרית", "שקיות פסולת", "חניה", "תאורה מתקדמת"],
    rules: [
      "הכשרה בבטיחות לפני שימוש במתקני אג'יליטי",
      "פיקוח צמוד באזור השחייה",
      "רישום מראש לשירותים וטרינריים",
      "חובת ביטוח לכלבים גדולים"
    ],
    statistics: { averageRating: 4.8, totalReviews: 156, totalVisits: 2034 },
    pricing: { type: "free", price: 0, currency: "ILS" }
  },
  {
    name: "גן כלבים בטבע חיפה",
    description: "גן כלבים בסביבה טבעית מדהימה בהרי חיפה, מוקף ביער אורנים וצמחייה מקומית. מציע חוויית טבע אותנטית עם שבילים, נחלים קטנים ואזורי חקירה. אידיאלי לכלבי ציד וכלבים הנהנים מסביבה טבעית.",
    type: "public",
    location: {
      address: "יער הכרמל, מעלה חיפה",
      city: "חיפה",
      coordinates: {
        type: "Point",
        coordinates: [35.0052, 32.7940]
      }
    },
    capacity: { maxDogs: 15, maxSmallDogs: 6, maxLargeDogs: 12 },
    openingHours: {
      sunday: { open: "06:00", close: "19:00", closed: false },
      monday: { open: "06:00", close: "19:00", closed: false },
      tuesday: { open: "06:00", close: "19:00", closed: false },
      wednesday: { open: "06:00", close: "19:00", closed: false },
      thursday: { open: "06:00", close: "19:00", closed: false },
      friday: { open: "06:00", close: "17:00", closed: false },
      saturday: { open: "07:00", close: "19:00", closed: false }
    },
    amenities: ["מעיינות טבעיים", "שבילי הליכה", "אזורי צל טבעי", "שקיות פסולת אקולוגיות", "חניה"],
    rules: [
      "שמירה על הטבע והחיות הבר",
      "הליכה רק בשבילים המסומנים",
      "איסור על הזנת חיות בר",
      "חובת רצועה באזורים מסומנים",
      "שמירה על שקט לבעלי החיים"
    ],
    statistics: { averageRating: 4.7, totalReviews: 73, totalVisits: 892 },
    pricing: { type: "free", price: 0, currency: "ILS" }
  }
];

// Function to fix corrupted data
const fixCorruptedData = async () => {
  try {
    console.log('🔧 Starting to fix corrupted garden data...');
    
    // Find and update gardens with problematic data
    const corruptedGardens = await Garden.find({
      $or: [
        { description: { $regex: 'dasew', $options: 'i' } },
        { 'location.address': { $in: ['1', '2', '3', '4', '5'] } },
        { 'location.coordinates.coordinates': [0, 0] }
      ]
    });
    
    console.log(`Found ${corruptedGardens.length} corrupted gardens to fix`);
    
    // Delete completely corrupted entries
    const result = await Garden.deleteMany({
      $or: [
        { description: { $regex: 'dasew', $options: 'i' } },
        { 'location.coordinates.coordinates': [0, 0] }
      ]
    });
    
    console.log(`Deleted ${result.deletedCount} completely corrupted gardens`);
    
    return true;
  } catch (error) {
    console.error('Error fixing corrupted data:', error);
    return false;
  }
};

// Function to enhance existing parks with better data
const enhanceExistingParks = async () => {
  try {
    console.log('✨ Enhancing existing parks with better data...');
    
    const existingParks = await Garden.find({ isActive: true }).limit(5);
    
    for (let i = 0; i < existingParks.length && i < enhancedParkData.length; i++) {
      const park = existingParks[i];
      const enhancedData = enhancedParkData[i];
      
      // Update only if current data is incomplete
      const updates = {};
      
      if (!park.description || park.description.length < 50) {
        updates.description = enhancedData.description;
      }
      
      if (!park.amenities || park.amenities.length === 0) {
        updates.amenities = enhancedData.amenities;
      }
      
      if (!park.rules || park.rules.length === 0) {
        updates.rules = enhancedData.rules;
      }
      
      if (park.location?.address && park.location.address.length < 10) {
        updates['location.address'] = enhancedData.location.address;
      }
      
      if (Object.keys(updates).length > 0) {
        await Garden.findByIdAndUpdate(park._id, updates);
        console.log(`Enhanced park: ${park.name}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error enhancing existing parks:', error);
    return false;
  }
};

// Function to add sample parks
const addSampleParks = async () => {
  try {
    console.log('🌳 Adding additional sample parks...');
    
    // Get a manager ID from existing users
    const User = require('../models/User');
    const managers = await User.find({ role: { $in: ['admin', 'garden_manager'] } }).limit(3);
    
    if (managers.length === 0) {
      console.log('No managers found, creating default manager...');
      // You would need to create a default manager user here if needed
      return false;
    }
    
    for (const parkData of additionalParks) {
      const randomManager = managers[Math.floor(Math.random() * managers.length)];
      
      const existingPark = await Garden.findOne({ name: parkData.name });
      if (existingPark) {
        console.log(`Park ${parkData.name} already exists, skipping...`);
        continue;
      }
      
      const newPark = new Garden({
        ...parkData,
        manager: randomManager._id,
        requirements: {
          vaccinationRequired: true,
          minAge: 4,
          sizeRestrictions: []
        },
        features: {
          allowsPhotoSharing: true,
          requiresReservation: false,
          hasEvents: Math.random() > 0.5
        },
        eventSettings: {
          allowEvents: true,
          requireApprovalForEvents: false,
          maxEventsPerMonth: 10,
          defaultEventDuration: 120,
          eventCategories: ['meetup', 'training', 'social'],
          autoApproveEvents: true
        },
        newsletter: {
          enabled: true,
          allowPublicSubscriptions: true,
          autoWelcomeEmail: true,
          welcomeEmailSubject: 'Welcome to our newsletter!',
          welcomeEmailContent: 'Thank you for subscribing to our newsletter. We\'ll keep you updated with the latest news and events.',
          fromName: '',
          fromEmail: '',
          replyToEmail: ''
        },
        isActive: true
      });
      
      await newPark.save();
      console.log(`Added new park: ${parkData.name}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding sample parks:', error);
    return false;
  }
};

// Main function to run all fixes
const main = async () => {
  await connectDB();
  
  console.log('🚀 Starting PawPals Garden Data Fix...\n');
  
  // Step 1: Fix corrupted data
  const step1 = await fixCorruptedData();
  if (step1) {
    console.log('✅ Step 1: Corrupted data fixed successfully\n');
  } else {
    console.log('❌ Step 1: Failed to fix corrupted data\n');
  }
  
  // Step 2: Enhance existing parks
  const step2 = await enhanceExistingParks();
  if (step2) {
    console.log('✅ Step 2: Existing parks enhanced successfully\n');
  } else {
    console.log('❌ Step 2: Failed to enhance existing parks\n');
  }
  
  // Step 3: Add sample parks
  const step3 = await addSampleParks();
  if (step3) {
    console.log('✅ Step 3: Sample parks added successfully\n');
  } else {
    console.log('❌ Step 3: Failed to add sample parks\n');
  }
  
  // Final report
  const totalParks = await Garden.countDocuments({ isActive: true });
  console.log(`🎉 Garden data fix complete! Total active parks: ${totalParks}`);
  
  mongoose.connection.close();
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixCorruptedData, enhanceExistingParks, addSampleParks };