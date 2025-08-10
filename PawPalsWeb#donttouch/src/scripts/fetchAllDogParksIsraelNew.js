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

// פונקציה לחיפוש עם Places API החדש
async function searchDogParksNew(lat, lng, radius, cityName) {
  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!API_KEY) {
      console.error('❌ חסר GOOGLE_PLACES_API_KEY ב-.env');
      return [];
    }

    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    
    // נתוני הבקשה
    const requestData = {
      includedTypes: ["park", "tourist_attraction"],
      maxResultCount: 20,
      languageCode: "he",
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radius
        }
      }
    };

    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.openingHours,places.photos'
      }
    });
    
    if (response.data.places) {
      // סינון לגינות כלבים בלבד
      const dogParks = response.data.places.filter(place => {
        const name = (place.displayName?.text || '').toLowerCase();
        const address = (place.formattedAddress || '').toLowerCase();
        
        // מילות מפתח לגינות כלבים
        const dogKeywords = [
          'dog', 'dogs', 'canine', 'pet',
          'כלב', 'כלבים', 'גינת כלבים', 'גן כלבים', 'פארק כלבים',
          'מתחם כלבים', 'פינת כלבים', 'אזור כלבים'
        ];
        
        // בדיקה אם זו גינת כלבים
        const isDogPark = dogKeywords.some(keyword => 
          name.includes(keyword) || address.includes(keyword)
        );
        
        // החרגת מקומות מסחריים
        const commercialKeywords = [
          'vet', 'clinic', 'hospital', 'store', 'shop',
          'וטרינר', 'קליניקה', 'חנות', 'בית חולים'
        ];
        
        const isCommercial = commercialKeywords.some(keyword => 
          name.includes(keyword)
        );
        
        return isDogPark && !isCommercial;
      });
      
      return dogParks;
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ שגיאה בחיפוש:', error.response?.data || error.message);
    return [];
  }
}

// פונקציה לחיפוש טקסט עם Places API החדש
async function searchDogParksText(query, cityName) {
  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const requestData = {
      textQuery: query,
      languageCode: "he",
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: {
            latitude: 31.7683,  // מרכז ישראל
            longitude: 35.2137
          },
          radius: 200000.0  // 200 ק"מ
        }
      }
    };

    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.openingHours,places.photos'
      }
    });
    
    return response.data.places || [];
    
  } catch (error) {
    console.error('❌ שגיאה בחיפוש טקסט:', error.response?.data || error.message);
    return [];
  }
}

// פונקציה להמרה לפורמט הסטנדרטי
function convertToStandardFormat(place, cityName) {
  const name = place.displayName?.text || 'גינת כלבים ללא שם';
  const address = place.formattedAddress || 'כתובת לא זמינה';
  
  // חילוץ כתובת מקוצרת
  const shortAddress = address.split(',')[0] || address;
  
  return {
    name: name,
    description: `גינת כלבים ב${cityName}`,
    type: 'public',
    manager: null,
    images: place.photos?.map(photo => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx
    })) || [],
    location: {
      address: shortAddress,
      city: cityName,
      coordinates: {
        type: 'Point',
        coordinates: [
          place.location.longitude,
          place.location.latitude
        ]
      }
    },
    capacity: {
      maxDogs: 25
    },
    openingHours: parseOpeningHours(place.openingHours),
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
      phone: place.nationalPhoneNumber || null,
      email: null,
      website: place.websiteUri || null
    },
    googleData: {
      placeId: place.id,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      types: place.types,
      primaryType: place.primaryType,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.id}`
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

  if (!openingHours || !openingHours.weekdayDescriptions) {
    return defaultHours;
  }

  // TODO: פרסור מלא של שעות הפתיחה מהפורמט של Google
  
  return defaultHours;
}

// פונקציה ראשית
async function fetchAllDogParksInIsrael() {
  console.log('🚀 מתחיל חיפוש מקיף של גינות כלבים בישראל (Places API New)...\n');
  
  const allParks = new Map(); // מניעת כפילויות
  const statistics = {
    totalSearches: 0,
    totalFound: 0,
    byCity: {},
    withRating: 0,
    withPhotos: 0
  };

  // חיפוש בכל עיר
  for (let i = 0; i < israelCities.length; i++) {
    const city = israelCities[i];
    console.log(`\n[${i + 1}/${israelCities.length}] 🏙️  ${city.name}:`);
    
    // חיפוש Nearby
    console.log(`   🔍 מחפש פארקים ברדיוס ${city.radius/1000} ק"מ...`);
    statistics.totalSearches++;
    
    const nearbyResults = await searchDogParksNew(city.lat, city.lng, city.radius, city.name);
    console.log(`      ✓ נמצאו ${nearbyResults.length} גינות כלבים`);
    
    // חיפוש טקסט נוסף
    const textQueries = [
      `גינת כלבים ${city.name}`,
      `dog park ${city.name}`,
      `פארק כלבים ${city.name}`
    ];
    
    for (const query of textQueries) {
      console.log(`   🔍 מחפש: "${query}"...`);
      statistics.totalSearches++;
      
      const textResults = await searchDogParksText(query, city.name);
      const dogParks = textResults.filter(place => {
        const name = (place.displayName?.text || '').toLowerCase();
        return name.includes('כלב') || name.includes('dog') || 
               name.includes('גינ') || name.includes('park');
      });
      
      console.log(`      ✓ נמצאו ${dogParks.length} תוצאות רלוונטיות`);
      nearbyResults.push(...dogParks);
      
      // השהייה בין בקשות
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // עיבוד התוצאות
    let cityCount = 0;
    for (const place of nearbyResults) {
      const placeKey = place.id;
      
      if (!allParks.has(placeKey)) {
        const standardPark = convertToStandardFormat(place, city.name);
        allParks.set(placeKey, standardPark);
        cityCount++;
        
        if (place.rating > 0) statistics.withRating++;
        if (place.photos && place.photos.length > 0) statistics.withPhotos++;
      }
    }
    
    statistics.byCity[city.name] = cityCount;
    statistics.totalFound = allParks.size;
    
    console.log(`   📊 סה"כ ייחודיות בעיר: ${cityCount}`);
    
    // השהייה בין ערים
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // הצגת סטטיסטיקות
  console.log('\n📊 סיכום סופי:');
  console.log(`   🔍 סה"כ חיפושים: ${statistics.totalSearches}`);
  console.log(`   🏞️ סה"כ גינות ייחודיות: ${statistics.totalFound}`);
  console.log(`   ⭐ עם דירוג: ${statistics.withRating}`);
  console.log(`   📸 עם תמונות: ${statistics.withPhotos}`);
  console.log('\n🏙️ פירוט לפי עיר:');
  
  Object.entries(statistics.byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
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
  const filename = `dog-parks-israel-complete-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalParks: data.parks.length,
      totalCities: israelCities.length,
      description: 'גינות כלבים בישראל - נתונים מ-Google Places API (New)',
      dataSource: 'Google Places API (New)',
      apiVersion: 'v1',
      statistics: data.statistics
    },
    parks: data.parks
  };
  
  await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');
  
  console.log(`\n✅ הנתונים נשמרו ב: ${filepath}`);
  
  // יצירת קובץ סיכום
  const summaryFile = path.join(outputDir, `dog-parks-summary-${timestamp}.txt`);
  const summary = `
סיכום ייצוא גינות כלבים בישראל
================================
תאריך: ${new Date().toLocaleString('he-IL')}
סה"כ גינות: ${data.parks.length}
סה"כ ערים: ${Object.keys(data.statistics.byCity).length}

פירוט לפי עיר:
${Object.entries(data.statistics.byCity)
  .sort((a, b) => b[1] - a[1])
  .map(([city, count]) => `${city}: ${count}`)
  .join('\n')}
`;
  
  await fs.writeFile(summaryFile, summary, 'utf8');
  
  return filepath;
}

// הפעלת הסקריפט
async function main() {
  try {
    console.log('🐕 Dog Parks Israel - Comprehensive Fetcher (New API)\n');
    
    // בדיקת API Key
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('❌ שגיאה: חסר GOOGLE_PLACES_API_KEY בקובץ .env');
      return;
    }
    
    // אזהרה על עלויות
    console.log('⚠️  אזהרה: סקריפט זה משתמש ב-Google Places API (New)');
    console.log(`   - צפויות כ-${israelCities.length * 4} בקשות`);
    console.log('   - Places API (New) יעיל יותר ונותן תוצאות טובות יותר');
    console.log('\nמתחיל בעוד 3 שניות... (Ctrl+C לביטול)\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // ביצוע החיפוש
    const results = await fetchAllDogParksInIsrael();
    
    // שמירת התוצאות
    const savedFile = await saveResults(results);
    
    console.log('\n🎉 החיפוש הושלם בהצלחה!');
    console.log(`📁 קובץ התוצאות: ${savedFile}`);
    console.log('\n💡 טיפ: תוכל למצוא את הקבצים בתיקיית exports');
    
  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
    console.error(error.stack);
  }
}

// הפעלה
if (require.main === module) {
  main();
}

module.exports = {
  fetchAllDogParksInIsrael,
  searchDogParksNew,
  israelCities
};