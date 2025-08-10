require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// רשימת ערים בישראל עם קואורדינטות
const israelCities = [
  { name: 'תל אביב', lat: 32.0853, lng: 34.7818, radius: 50 },
  { name: 'ירושלים', lat: 31.7683, lng: 35.2137, radius: 50 },
  { name: 'חיפה', lat: 32.7940, lng: 34.9896, radius: 50 },
  { name: 'ראשון לציון', lat: 31.9642, lng: 34.8047, radius: 30 },
  { name: 'פתח תקווה', lat: 32.0917, lng: 34.8873, radius: 30 },
  { name: 'אשדוד', lat: 31.8044, lng: 34.6553, radius: 30 },
  { name: 'נתניה', lat: 32.3215, lng: 34.8532, radius: 30 },
  { name: 'באר שבע', lat: 31.2530, lng: 34.7915, radius: 30 },
  { name: 'בני ברק', lat: 32.0807, lng: 34.8338, radius: 20 },
  { name: 'חולון', lat: 32.0167, lng: 34.7722, radius: 20 },
  { name: 'רמת גן', lat: 32.0700, lng: 34.8235, radius: 20 },
  { name: 'אשקלון', lat: 31.6688, lng: 34.5718, radius: 25 },
  { name: 'רחובות', lat: 31.8928, lng: 34.8113, radius: 25 },
  { name: 'בת ים', lat: 32.0167, lng: 34.7500, radius: 20 },
  { name: 'הרצליה', lat: 32.1589, lng: 34.8424, radius: 25 },
  { name: 'כפר סבא', lat: 32.1858, lng: 34.9077, radius: 25 },
  { name: 'מודיעין', lat: 31.8928, lng: 35.0124, radius: 25 },
  { name: 'רמלה', lat: 31.9288, lng: 34.8663, radius: 20 },
  { name: 'רעננה', lat: 32.1808, lng: 34.8707, radius: 20 },
  { name: 'לוד', lat: 31.9467, lng: 34.8903, radius: 20 },
  { name: 'נס ציונה', lat: 31.9305, lng: 34.7948, radius: 20 },
  { name: 'גבעתיים', lat: 32.0720, lng: 34.8100, radius: 15 },
  { name: 'הוד השרון', lat: 32.1556, lng: 34.8885, radius: 20 },
  { name: 'עכו', lat: 32.9281, lng: 35.0818, radius: 20 },
  { name: 'אילת', lat: 29.5581, lng: 34.9482, radius: 25 },
  { name: 'נהריה', lat: 33.0110, lng: 35.0989, radius: 20 },
  { name: 'קריית גת', lat: 31.6060, lng: 34.7717, radius: 20 },
  { name: 'טבריה', lat: 32.7922, lng: 35.5312, radius: 20 },
  { name: 'כרמיאל', lat: 32.9192, lng: 35.2950, radius: 20 },
  { name: 'עפולה', lat: 32.6057, lng: 35.2914, radius: 20 },
  { name: 'בית שמש', lat: 31.7514, lng: 34.9886, radius: 20 },
  { name: 'קריית אתא', lat: 32.8064, lng: 35.1052, radius: 15 },
  { name: 'נצרת', lat: 32.7036, lng: 35.2978, radius: 20 },
  { name: 'דימונה', lat: 31.0632, lng: 35.0269, radius: 20 },
  { name: 'חדרה', lat: 32.4435, lng: 34.9196, radius: 20 },
  { name: 'ראש העין', lat: 32.0956, lng: 34.9561, radius: 20 },
  { name: 'קריית אונו', lat: 32.0631, lng: 34.8592, radius: 15 },
  { name: 'יהוד', lat: 32.0342, lng: 34.8917, radius: 15 }
];

// מונחי חיפוש כמו באפליקציה
const englishSearchQueries = [
  'dog park',
  'dog run', 
  'off leash dog area',
  'dog playground', 
  'pet park',
  'canine park',
  'dog exercise area',
  'dog training park',
  'leash-free dog park',
  'fenced dog park'
];

const hebrewSearchQueries = [
  'גן כלבים',
  'כלבים פארק',
  'אזור כלבים',
  'גן כלבים מגודר',
  'פארק כלבים',
  'שטח כלבים',
  'גינת כלבים',
  'מתחם כלבים',
  'פינת כלבים'
];

// פונקציה לחישוב מרחק
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// פונקציה לחיפוש עם searchText API כמו באפליקציה
async function searchDogParksInCity(city, searchQuery) {
  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!API_KEY) {
      console.error('❌ חסר GOOGLE_PLACES_API_KEY ב-.env');
      return [];
    }

    const radiusInMeters = city.radius * 1000;
    
    const requestBody = {
      textQuery: `${searchQuery} ${city.name} Israel`,
      locationBias: {
        circle: {
          center: {
            latitude: city.lat,
            longitude: city.lng
          },
          radius: radiusInMeters
        }
      },
      maxResultCount: 20
    };

    const response = await axios.post('https://places.googleapis.com/v1/places:searchText', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.formattedAddress,places.types,places.photos,places.nationalPhoneNumber,places.websiteUri'
      }
    });
    
    if (response.data.places) {
      // סינון כמו באפליקציה
      const filteredPlaces = response.data.places.filter(place => {
        const name = (place.displayName?.text || '').toLowerCase();
        const types = place.types || [];
        
        // החרגת מוסדות מסחריים
        const commercialTypes = [
          'veterinary_care', 'pet_store', 'store', 'establishment', 
          'point_of_interest', 'shopping_mall', 'hospital', 'clinic',
          'school', 'university', 'restaurant', 'cafe', 'hotel'
        ];
        const isCommercial = commercialTypes.some(type => types.includes(type));
        
        // החרגת מילות מפתח מסחריות
        const commercialKeywords = [
          'vet', 'clinic', 'hospital', 'store', 'shop', 'mall', 'hotel',
          'restaurant', 'cafe', 'school', 'university', 'וטרינר', 'קליניקה',
          'בית חולים', 'חנות', 'קניון', 'מלון', 'מסעדה', 'בית ספר'
        ];
        const hasCommercialKeyword = commercialKeywords.some(keyword => name.includes(keyword));
        
        // חייב להכיל מילות מפתח של כלבים
        const dogKeywords = ['dog', 'canine', 'pet', 'כלב', 'כלבים'];
        const hasDogKeyword = dogKeywords.some(keyword => name.includes(keyword));
        
        // רק טיפוסי פארק
        const allowedTypes = ['park', 'tourist_attraction', 'premise', 'dog_park'];
        const hasAllowedType = allowedTypes.some(type => types.includes(type)) || types.length === 0;
        
        // חייב להיות רלוונטי לכלבים ולא מסחרי
        const isDogRelated = hasDogKeyword || name.includes('dog') || 
                            name.includes('canine') || name.includes('pet') ||
                            name.includes('כלב') || name.includes('כלבים');
                            
        return isDogRelated && !isCommercial && !hasCommercialKeyword && hasAllowedType;
      });
      
      return filteredPlaces.map(place => ({
        ...place,
        distance: calculateDistance(
          city.lat, city.lng,
          place.location.latitude, place.location.longitude
        ),
        searchCity: city.name,
        searchQuery: searchQuery
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error(`❌ שגיאה בחיפוש "${searchQuery}" ב${city.name}:`, error.response?.data?.error?.message || error.message);
    return [];
  }
}

// פונקציה להמרה לפורמט הסטנדרטי
function convertToStandardFormat(place) {
  const name = place.displayName?.text || 'גינת כלבים ללא שם';
  const address = place.formattedAddress || 'כתובת לא זמינה';
  
  return {
    name: name,
    description: `גינת כלבים ב${place.searchCity}`,
    type: 'public',
    manager: null,
    images: place.photos?.map(photo => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx
    })) || [],
    location: {
      address: address.split(',')[0] || address,
      city: place.searchCity,
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
    openingHours: {
      sunday: { open: '06:00', close: '22:00', closed: false },
      monday: { open: '06:00', close: '22:00', closed: false },
      tuesday: { open: '06:00', close: '22:00', closed: false },
      wednesday: { open: '06:00', close: '22:00', closed: false },
      thursday: { open: '06:00', close: '22:00', closed: false },
      friday: { open: '06:00', close: '16:00', closed: false },
      saturday: { open: '19:00', close: '22:00', closed: false }
    },
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
      distance: place.distance,
      searchQuery: place.searchQuery,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.id}`
    }
  };
}

// פונקציה ראשית
async function fetchAllDogParksInIsrael() {
  console.log('🚀 מתחיל חיפוש מקיף של גינות כלבים בישראל...\n');
  console.log(`🏙️ ${israelCities.length} ערים`);
  console.log(`🔍 ${englishSearchQueries.length + hebrewSearchQueries.length} מונחי חיפוש`);
  
  const allParks = new Map();
  const statistics = {
    totalSearches: 0,
    totalFound: 0,
    byCity: {},
    bySearchTerm: {},
    withRating: 0,
    withPhotos: 0
  };

  // חיפוש בכל עיר
  for (let i = 0; i < israelCities.length; i++) {
    const city = israelCities[i];
    console.log(`\n[${i + 1}/${israelCities.length}] 🏙️ ${city.name} (רדיוס: ${city.radius} ק"מ)`);
    
    let cityParks = 0;
    
    // חיפוש באנגלית
    console.log('   🔍 חיפוש באנגלית...');
    for (const query of englishSearchQueries) {
      statistics.totalSearches++;
      const results = await searchDogParksInCity(city, query);
      
      let newParks = 0;
      for (const park of results) {
        if (!allParks.has(park.id)) {
          allParks.set(park.id, park);
          newParks++;
          cityParks++;
          
          if (park.rating > 0) statistics.withRating++;
          if (park.photos && park.photos.length > 0) statistics.withPhotos++;
        }
      }
      
      if (newParks > 0) {
        console.log(`      "${query}": ${newParks} חדשות`);
        statistics.bySearchTerm[query] = (statistics.bySearchTerm[query] || 0) + newParks;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // חיפוש בעברית
    console.log('   🔍 חיפוש בעברית...');
    for (const query of hebrewSearchQueries) {
      statistics.totalSearches++;
      const results = await searchDogParksInCity(city, query);
      
      let newParks = 0;
      for (const park of results) {
        if (!allParks.has(park.id)) {
          allParks.set(park.id, park);
          newParks++;
          cityParks++;
          
          if (park.rating > 0) statistics.withRating++;
          if (park.photos && park.photos.length > 0) statistics.withPhotos++;
        }
      }
      
      if (newParks > 0) {
        console.log(`      "${query}": ${newParks} חדשות`);
        statistics.bySearchTerm[query] = (statistics.bySearchTerm[query] || 0) + newParks;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    statistics.byCity[city.name] = cityParks;
    console.log(`   📊 סה"כ בעיר: ${cityParks} גינות`);
    
    // השהייה בין ערים
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  statistics.totalFound = allParks.size;

  // הצגת סטטיסטיקות
  console.log('\n📊 סיכום סופי:');
  console.log(`   🔍 סה"כ חיפושים: ${statistics.totalSearches}`);
  console.log(`   🏞️ סה"כ גינות ייחודיות: ${statistics.totalFound}`);
  console.log(`   ⭐ עם דירוג: ${statistics.withRating}`);
  console.log(`   📸 עם תמונות: ${statistics.withPhotos}`);
  
  console.log('\n🏙️ הערים עם הכי הרבה גינות:');
  Object.entries(statistics.byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([city, count]) => {
      console.log(`   ${city}: ${count} גינות`);
    });

  console.log('\n🔍 המונחים הכי מוצלחים:');
  Object.entries(statistics.bySearchTerm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([term, count]) => {
      console.log(`   "${term}": ${count} תוצאות`);
    });

  return {
    parks: Array.from(allParks.values()),
    statistics
  };
}

// שמירת התוצאות
async function saveResults(data) {
  const outputDir = path.join(__dirname, '../../../exports');
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `israel-dog-parks-complete-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  // המרה לפורמט הסטנדרטי
  const standardParks = data.parks.map(park => convertToStandardFormat(park));
  
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalParks: standardParks.length,
      totalCities: israelCities.length,
      description: 'גינות כלבים בישראל - חיפוש מקיף עם Google Places API',
      dataSource: 'Google Places API (searchText)',
      statistics: data.statistics
    },
    parks: standardParks
  };
  
  await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');
  
  console.log(`\n✅ הנתונים נשמרו ב: ${filepath}`);
  console.log(`📁 גודל הקובץ: ${(await fs.stat(filepath)).size / 1024 / 1024} MB`);
  
  return filepath;
}

// הפעלה
async function main() {
  try {
    console.log('🐕 Israel Dog Parks - Complete Search Tool\n');
    
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('❌ חסר GOOGLE_PLACES_API_KEY ב-.env');
      return;
    }
    
    console.log('⚠️  החיפוש עלול לקחת 20-30 דקות ולעלות כ-$20-30');
    console.log('מתחיל בעוד 5 שניות... (Ctrl+C לביטול)\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const results = await fetchAllDogParksInIsrael();
    const savedFile = await saveResults(results);
    
    console.log('\n🎉 החיפוש הושלם בהצלחה!');
    console.log(`📁 קובץ התוצאות: ${savedFile}`);
    
  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fetchAllDogParksInIsrael,
  israelCities,
  convertToStandardFormat
};