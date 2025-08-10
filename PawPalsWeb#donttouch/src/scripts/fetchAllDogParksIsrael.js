require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// רשימת ערים בישראל עם קואורדינטות
const israelCities = [
  // ערים גדולות
  { name: 'תל אביב', lat: 32.0853, lng: 34.7818, radius: 15000 },
  { name: 'ירושלים', lat: 31.7683, lng: 35.2137, radius: 15000 },
  { name: 'חיפה', lat: 32.7940, lng: 34.9896, radius: 15000 },
  { name: 'ראשון לציון', lat: 31.9642, lng: 34.8047, radius: 10000 },
  { name: 'פתח תקווה', lat: 32.0917, lng: 34.8873, radius: 10000 },
  { name: 'אשדוד', lat: 31.8044, lng: 34.6553, radius: 10000 },
  { name: 'נתניה', lat: 32.3215, lng: 34.8532, radius: 10000 },
  { name: 'באר שבע', lat: 31.2530, lng: 34.7915, radius: 10000 },
  { name: 'בני ברק', lat: 32.0807, lng: 34.8338, radius: 5000 },
  { name: 'חולון', lat: 32.0167, lng: 34.7722, radius: 5000 },
  { name: 'רמת גן', lat: 32.0700, lng: 34.8235, radius: 5000 },
  { name: 'אשקלון', lat: 31.6688, lng: 34.5718, radius: 8000 },
  { name: 'רחובות', lat: 31.8928, lng: 34.8113, radius: 8000 },
  { name: 'בת ים', lat: 32.0167, lng: 34.7500, radius: 5000 },
  { name: 'הרצליה', lat: 32.1589, lng: 34.8424, radius: 8000 },
  { name: 'כפר סבא', lat: 32.1858, lng: 34.9077, radius: 8000 },
  { name: 'מודיעין', lat: 31.8928, lng: 35.0124, radius: 8000 },
  { name: 'רמלה', lat: 31.9288, lng: 34.8663, radius: 7000 },
  { name: 'רעננה', lat: 32.1808, lng: 34.8707, radius: 7000 },
  { name: 'לוד', lat: 31.9467, lng: 34.8903, radius: 6000 },
  { name: 'נס ציונה', lat: 31.9305, lng: 34.7948, radius: 6000 },
  { name: 'גבעתיים', lat: 32.0720, lng: 34.8100, radius: 5000 },
  { name: 'הוד השרון', lat: 32.1556, lng: 34.8885, radius: 7000 },
  { name: 'עכו', lat: 32.9281, lng: 35.0818, radius: 7000 },
  { name: 'אילת', lat: 29.5581, lng: 34.9482, radius: 8000 },
  { name: 'נהריה', lat: 33.0110, lng: 35.0989, radius: 7000 },
  { name: 'קריית גת', lat: 31.6060, lng: 34.7717, radius: 6000 },
  { name: 'טבריה', lat: 32.7922, lng: 35.5312, radius: 6000 },
  { name: 'כרמיאל', lat: 32.9192, lng: 35.2950, radius: 6000 },
  { name: 'עפולה', lat: 32.6057, lng: 35.2914, radius: 6000 },
  { name: 'בית שמש', lat: 31.7514, lng: 34.9886, radius: 7000 },
  { name: 'קריית אתא', lat: 32.8064, lng: 35.1052, radius: 5000 },
  { name: 'נצרת', lat: 32.7036, lng: 35.2978, radius: 6000 },
  { name: 'דימונה', lat: 31.0632, lng: 35.0269, radius: 6000 },
  { name: 'חדרה', lat: 32.4435, lng: 34.9196, radius: 7000 },
  { name: 'ראש העין', lat: 32.0956, lng: 34.9561, radius: 6000 },
  { name: 'קריית אונו', lat: 32.0631, lng: 34.8592, radius: 5000 },
  { name: 'יהוד', lat: 32.0342, lng: 34.8917, radius: 5000 }
];

// מונחי חיפוש
const searchQueries = [
  'dog park',
  'גן כלבים',
  'גינת כלבים',
  'פארק כלבים',
  'dog garden',
  'פינת כלבים',
  'מתחם כלבים'
];

// פונקציה לחיפוש גינות כלבים דרך Google Places API
async function searchDogParks(lat, lng, radius, query) {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!GOOGLE_API_KEY) {
      console.error('❌ חסר GOOGLE_PLACES_API_KEY ב-.env');
      return [];
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const params = {
      location: `${lat},${lng}`,
      radius: radius,
      keyword: query,
      key: GOOGLE_API_KEY,
      language: 'he'
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status === 'OK') {
      return response.data.results;
    } else {
      console.warn(`⚠️ Google API returned status: ${response.data.status}`);
      return [];
    }
  } catch (error) {
    console.error('❌ שגיאה בחיפוש:', error.message);
    return [];
  }
}

// פונקציה לקבלת פרטים נוספים על מקום
async function getPlaceDetails(placeId) {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json`;
    const params = {
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,opening_hours,website,rating,user_ratings_total,photos,geometry',
      key: GOOGLE_API_KEY,
      language: 'he'
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status === 'OK') {
      return response.data.result;
    }
    
    return null;
  } catch (error) {
    console.error('❌ שגיאה בקבלת פרטים:', error.message);
    return null;
  }
}

// פונקציה להמרה לפורמט הסטנדרטי
function convertToStandardFormat(place, cityName, details) {
  const name = place.name || 'גינת כלבים ללא שם';
  const address = details?.formatted_address || place.vicinity || 'כתובת לא זמינה';
  
  return {
    name: name,
    description: `גינת כלבים ב${cityName}`,
    type: 'public',
    manager: null,
    images: details?.photos?.map(photo => 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
    ) || [],
    location: {
      address: address,
      city: cityName,
      coordinates: {
        type: 'Point',
        coordinates: [
          place.geometry.location.lng,
          place.geometry.location.lat
        ]
      }
    },
    capacity: {
      maxDogs: 25
    },
    openingHours: parseOpeningHours(details?.opening_hours),
    features: {
      fenced: true,
      lighting: true,
      waterStation: true,
      wasteDisposal: true,
      seatingArea: true,
      separateSmallDogArea: false,
      agility: false,
      shade: true,
      parking: true
    },
    size: {
      area: 600,
      unit: 'sqm'
    },
    surface: 'grass',
    rules: [
      'כלבים מעל גיל 4 חודשים חייבים להיות מחוסנים',
      'אסור להכניס כלבות בחום',
      'בעלי כלבים חייבים לנקות אחרי כלביהם',
      'חובה לשמור על פיקוח על הכלב',
      'מותר עד 3 כלבים למטפל אחד'
    ],
    contact: {
      phone: details?.formatted_phone_number || null,
      email: null,
      website: details?.website || null
    },
    googleData: {
      placeId: place.place_id,
      rating: place.rating || details?.rating,
      userRatingsTotal: place.user_ratings_total || details?.user_ratings_total,
      types: place.types,
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
    }
  };
}

// פונקציה לפרסור שעות פתיחה
function parseOpeningHours(openingHours) {
  const defaultHours = {
    sunday: { open: '06:00', close: '22:00', closed: false },
    monday: { open: '06:00', close: '22:00', closed: false },
    tuesday: { open: '06:00', close: '22:00', closed: false },
    wednesday: { open: '06:00', close: '22:00', closed: false },
    thursday: { open: '06:00', close: '22:00', closed: false },
    friday: { open: '06:00', close: '16:00', closed: false },
    saturday: { open: '19:00', close: '22:00', closed: false }
  };

  if (!openingHours || !openingHours.periods) {
    return defaultHours;
  }

  // פרסור שעות מ-Google
  // TODO: לממש פרסור מלא של שעות פתיחה מ-Google
  
  return defaultHours;
}

// פונקציה ראשית
async function fetchAllDogParksInIsrael() {
  console.log('🚀 מתחיל חיפוש מקיף של גינות כלבים בישראל...\n');
  
  const allParks = new Map(); // שימוש ב-Map למניעת כפילויות
  const statistics = {
    totalSearches: 0,
    totalFound: 0,
    byCity: {},
    duplicates: 0
  };

  // חיפוש בכל עיר
  for (const city of israelCities) {
    console.log(`\n🏙️  ${city.name}:`);
    const cityParks = new Map();
    
    // חיפוש עם כל מונח חיפוש
    for (const query of searchQueries) {
      console.log(`   🔍 מחפש "${query}"...`);
      statistics.totalSearches++;
      
      const results = await searchDogParks(city.lat, city.lng, city.radius, query);
      console.log(`      ✓ נמצאו ${results.length} תוצאות`);
      
      // עיבוד התוצאות
      for (const place of results) {
        const placeKey = place.place_id;
        
        if (!allParks.has(placeKey) && !cityParks.has(placeKey)) {
          // קבלת פרטים נוספים (אופציונלי - גוזל קרדיטים)
          // const details = await getPlaceDetails(place.place_id);
          const details = null; // כרגע לא מבקשים פרטים נוספים
          
          const standardPark = convertToStandardFormat(place, city.name, details);
          cityParks.set(placeKey, standardPark);
          
          // השהייה קצרה בין בקשות
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          statistics.duplicates++;
        }
      }
      
      // השהייה בין חיפושים
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // הוספת הגינות של העיר לרשימה הכללית
    cityParks.forEach((park, key) => {
      allParks.set(key, park);
    });
    
    statistics.byCity[city.name] = cityParks.size;
    statistics.totalFound += cityParks.size;
    console.log(`   📊 סה"כ בעיר: ${cityParks.size} גינות ייחודיות`);
  }

  // הצגת סטטיסטיקות
  console.log('\n📊 סיכום כללי:');
  console.log(`   🔍 סה"כ חיפושים: ${statistics.totalSearches}`);
  console.log(`   🏞️ סה"כ גינות ייחודיות: ${statistics.totalFound}`);
  console.log(`   🔄 כפילויות שסוננו: ${statistics.duplicates}`);
  console.log('\n🏙️ פירוט לפי עיר:');
  
  Object.entries(statistics.byCity)
    .sort((a, b) => b[1] - a[1])
    .forEach(([city, count]) => {
      console.log(`   ${city}: ${count} גינות`);
    });

  return {
    parks: Array.from(allParks.values()),
    statistics
  };
}

// פונקציה לשמירת הנתונים
async function saveResults(data) {
  const outputDir = path.join(__dirname, '../../../exports');
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `dog-parks-israel-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalParks: data.parks.length,
      totalCities: israelCities.length,
      searchQueries: searchQueries,
      description: 'גינות כלבים בישראל - נתונים מ-Google Places API',
      dataSource: 'Google Places API',
      statistics: data.statistics
    },
    parks: data.parks
  };
  
  await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');
  
  console.log(`\n✅ הנתונים נשמרו ב: ${filepath}`);
  return filepath;
}

// הפעלת הסקריפט
async function main() {
  try {
    console.log('🐕 Dog Parks Israel - Google Places Fetcher\n');
    
    // בדיקת API Key
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('❌ שגיאה: חסר GOOGLE_PLACES_API_KEY בקובץ .env');
      console.log('\n📋 הוראות:');
      console.log('1. צור קובץ .env בתיקיית backend');
      console.log('2. הוסף: GOOGLE_PLACES_API_KEY=your_api_key_here');
      console.log('3. קבל API Key מ: https://console.cloud.google.com/');
      return;
    }
    
    // הזהרה על עלויות
    console.log('⚠️  אזהרה: סקריפט זה משתמש ב-Google Places API שעלול לגבות תשלום!');
    console.log(`   - צפויות כ-${israelCities.length * searchQueries.length} בקשות`);
    console.log('   - עלות משוערת: $5-10');
    console.log('\nהמתן 5 שניות להמשך או הפסק עם Ctrl+C...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // ביצוע החיפוש
    const results = await fetchAllDogParksInIsrael();
    
    // שמירת התוצאות
    const savedFile = await saveResults(results);
    
    console.log('\n🎉 החיפוש הושלם בהצלחה!');
    console.log(`📁 קובץ התוצאות: ${savedFile}`);
    
  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
    console.error(error.stack);
  }
}

// הפעלה אם רץ ישירות
if (require.main === module) {
  main();
}

module.exports = {
  fetchAllDogParksInIsrael,
  searchDogParks,
  israelCities
};