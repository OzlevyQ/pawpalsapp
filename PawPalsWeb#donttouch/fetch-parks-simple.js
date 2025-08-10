const https = require('https');
const fs = require('fs');

// Configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'YOUR_API_KEY_HERE';
const DEFAULT_MANAGER_ID = "6854605ea8b274171ff776b6";

// Simple search terms - start with just "park" to get all parks
const SIMPLE_SEARCH_TERMS = [
  'park israel',
  'park tel aviv',
  'park jerusalem',
  'park haifa',
  'פארק ישראל',
  'פארק תל אביב',
  'פארק ירושלים',
  'גינה ציבורית',
  'dog park israel'
];

// Function to make HTTPS requests with POST support
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body = null } = options;
    
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

// Function to search for parks using simple approach
async function searchParks(query) {
  console.log(`🔍 Searching for: ${query}`);
  
  const url = 'https://places.googleapis.com/v1/places:searchText';
  
  const requestBody = {
    textQuery: query,
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: {
          latitude: 31.0461,
          longitude: 34.8516
        },
        radius: 50000
      }
    },
    languageCode: 'en',
    regionCode: 'IL'
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types'
    },
    body: JSON.stringify(requestBody)
  };
  
  try {
    const response = await makeRequest(url, options);
    
    console.log(`🔍 Raw API Response:`, JSON.stringify(response, null, 2));
    
    if (response.places && response.places.length > 0) {
      console.log(`✅ Found ${response.places.length} places for "${query}"`);
      
      // Log each place for debugging
      response.places.forEach((place, index) => {
        console.log(`${index + 1}. ${place.displayName?.text || place.displayName} - ${place.formattedAddress}`);
        console.log(`   Types: ${place.types ? place.types.join(', ') : 'none'}`);
      });
      
      return response.places.map(place => ({
        place_id: place.id,
        name: place.displayName?.text || place.displayName,
        formatted_address: place.formattedAddress,
        geometry: {
          location: {
            lat: place.location?.latitude,
            lng: place.location?.longitude
          }
        },
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        types: place.types || []
      }));
    } else {
      console.log(`ℹ️ No places found for "${query}"`);
      if (response.error) {
        console.error(`❌ API Error:`, response.error);
      }
      return [];
    }
  } catch (error) {
    console.error(`❌ Request failed for "${query}":`, error.message);
    console.error(`❌ Full error:`, error);
    return [];
  }
}

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function testSearch() {
  console.log('🚀 Testing Google Places API search...');
  
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Please set your Google Places API key in the GOOGLE_PLACES_API_KEY environment variable');
    return;
  }
  
  let allPlaces = [];
  
  // Try just the first search term to test
  const testTerm = SIMPLE_SEARCH_TERMS[0];
  
  try {
    const places = await searchParks(testTerm);
    allPlaces = places;
    console.log(`📊 Total found: ${allPlaces.length}`);
    
    // Save results for inspection
    const filename = 'test-search-results.json';
    fs.writeFileSync(filename, JSON.stringify(allPlaces, null, 2));
    console.log(`📁 Results saved to ${filename}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testSearch().catch(console.error);
}

module.exports = { searchParks };