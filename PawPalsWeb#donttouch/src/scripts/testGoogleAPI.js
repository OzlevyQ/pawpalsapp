require('dotenv').config();
const axios = require('axios');

async function testGooglePlacesAPI() {
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  console.log('🔍 בודק Google Places API...\n');
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'לא נמצא'}`);
  
  if (!API_KEY) {
    console.error('❌ חסר GOOGLE_PLACES_API_KEY ב-.env');
    return;
  }

  try {
    // בדיקה 1: Nearby Search
    console.log('\n1️⃣ בודק Nearby Search API...');
    const nearbyUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const nearbyParams = {
      location: '32.0853,34.7818', // תל אביב
      radius: 5000,
      keyword: 'dog park',
      key: API_KEY
    };
    
    const nearbyResponse = await axios.get(nearbyUrl, { params: nearbyParams });
    console.log(`   סטטוס: ${nearbyResponse.data.status}`);
    
    if (nearbyResponse.data.status === 'OK') {
      console.log(`   ✅ נמצאו ${nearbyResponse.data.results.length} תוצאות`);
    } else {
      console.log(`   ❌ בעיה: ${nearbyResponse.data.status}`);
      if (nearbyResponse.data.error_message) {
        console.log(`   הודעת שגיאה: ${nearbyResponse.data.error_message}`);
      }
    }

    // בדיקה 2: Text Search (חדש)
    console.log('\n2️⃣ בודק Text Search API...');
    const textUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const textParams = {
      query: 'dog parks in Tel Aviv Israel',
      key: API_KEY
    };
    
    const textResponse = await axios.get(textUrl, { params: textParams });
    console.log(`   סטטוס: ${textResponse.data.status}`);
    
    if (textResponse.data.status === 'OK') {
      console.log(`   ✅ נמצאו ${textResponse.data.results.length} תוצאות`);
    } else {
      console.log(`   ❌ בעיה: ${textResponse.data.status}`);
      if (textResponse.data.error_message) {
        console.log(`   הודעת שגיאה: ${textResponse.data.error_message}`);
      }
    }

    // בדיקה 3: Places API (New)
    console.log('\n3️⃣ בודק Places API (New)...');
    const placesNewUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    const placesNewData = {
      includedTypes: ["park"],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: {
            latitude: 32.0853,
            longitude: 34.7818
          },
          radius: 5000.0
        }
      }
    };
    
    try {
      const placesNewResponse = await axios.post(placesNewUrl, placesNewData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
        }
      });
      
      console.log(`   ✅ Places API (New) עובד!`);
      console.log(`   נמצאו ${placesNewResponse.data.places?.length || 0} תוצאות`);
    } catch (error) {
      console.log(`   ❌ בעיה ב-Places API (New): ${error.response?.data?.error?.message || error.message}`);
    }

    // הצעות לפתרון
    console.log('\n📋 אבחון:');
    
    if (nearbyResponse.data.status === 'REQUEST_DENIED') {
      console.log('\n⚠️  נראה שה-API Key לא מוגדר נכון. אפשרויות:');
      console.log('1. ה-API Key לא תקף או פג תוקף');
      console.log('2. Places API לא מופעל בפרויקט');
      console.log('3. הגבלות IP או HTTP referrer');
      console.log('4. חסרה הרשאת billing בחשבון');
      
      console.log('\n🔧 פתרונות:');
      console.log('1. היכנס ל: https://console.cloud.google.com/');
      console.log('2. בחר את הפרויקט הנכון');
      console.log('3. עבור ל: APIs & Services > Library');
      console.log('4. חפש "Places API" והפעל אותו');
      console.log('5. עבור ל: APIs & Services > Credentials');
      console.log('6. ודא שה-API Key מוגדר נכון ואין הגבלות');
      console.log('7. ודא שיש billing account מחובר');
    }

  } catch (error) {
    console.error('\n❌ שגיאה כללית:', error.message);
  }
}

// הרצה
testGooglePlacesAPI();