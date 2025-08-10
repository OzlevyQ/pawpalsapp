const https = require('https');
const fs = require('fs');
const { ObjectId } = require('mongodb');

// Configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'YOUR_API_KEY_HERE';
const DEFAULT_MANAGER_ID = "6854605ea8b274171ff776b6"; // Default manager ID from template

// Broader search terms for dog parks
const SEARCH_TERMS = [
  // Hebrew terms
  'גינת כלבים',
  'פארק כלבים', 
  'פינת כלבים',
  'גינה לכלבים',
  'פארק לכלבים',
  'כלבים',
  'גינת כלבים תל אביב',
  'פארק כלבים ירושלים',
  'פארק כלבים חיפה',
  
  // English terms
  'dog park',
  'dog garden',
  'dog run',
  'dog park israel',
  'dog park tel aviv',
  'dog park jerusalem',
  'dog park haifa',
  'pet park',
  'dog area',
  'dog playground',
  
  // Mixed and broader terms
  'כלבים israel',
  'park dogs',
  'pet area',
  'dog friendly park',
  'canine park'
];

// Israel regions for comprehensive search with bounding rectangles
const ISRAEL_REGIONS = [
  { 
    name: 'צפון', 
    bounds: {
      low: { latitude: 32.5, longitude: 34.9 },
      high: { latitude: 33.3, longitude: 35.7 }
    }
  },
  { 
    name: 'מרכז', 
    bounds: {
      low: { latitude: 31.8, longitude: 34.6 },
      high: { latitude: 32.5, longitude: 35.1 }
    }
  },
  { 
    name: 'ירושלים', 
    bounds: {
      low: { latitude: 31.6, longitude: 35.0 },
      high: { latitude: 32.0, longitude: 35.4 }
    }
  },
  { 
    name: 'דרום', 
    bounds: {
      low: { latitude: 31.0, longitude: 34.5 },
      high: { latitude: 31.8, longitude: 35.2 }
    }
  },
  { 
    name: 'אילת', 
    bounds: {
      low: { latitude: 29.3, longitude: 34.7 },
      high: { latitude: 30.0, longitude: 35.2 }
    }
  }
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

// Function to search for places using New Places API Text Search
async function searchPlaces(query, region = null) {
  const regionName = region ? ` (${region.name})` : '';
  console.log(`🔍 Searching for: ${query}${regionName}`);
  
  const url = 'https://places.googleapis.com/v1/places:searchText';
  
  // Build request body for new API
  const requestBody = {
    textQuery: query,
    maxResultCount: 20,
    locationRestriction: {
      rectangle: region?.bounds || {
        low: { latitude: 29.3, longitude: 34.5 },
        high: { latitude: 33.3, longitude: 35.7 }
      }
    },
    includedType: 'park',
    languageCode: 'he',
    regionCode: 'IL'
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.priceLevel'
    },
    body: JSON.stringify(requestBody)
  };
  
  try {
    const response = await makeRequest(url, options);
    
    // Add debugging information
    console.log(`🔍 API Response for "${query}":`, JSON.stringify(response, null, 2));
    
    if (response.places && response.places.length > 0) {
      console.log(`✅ Found ${response.places.length} places for "${query}"`);
      
      // Convert new API format to old format for compatibility
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
        types: place.types || [],
        price_level: place.priceLevel
      }));
    } else {
      console.log(`ℹ️ No places found for "${query}"`);
      if (response.error) {
        console.error(`❌ API Error for "${query}":`, response.error);
      }
      return [];
    }
  } catch (error) {
    console.error(`❌ Request failed for "${query}":`, error.message);
    console.error(`❌ Full error:`, error);
    return [];
  }
}

// Function to get detailed place information using New Places API
async function getPlaceDetails(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  
  const options = {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,types,regularOpeningHours,photos,priceLevel'
    }
  };
  
  try {
    const response = await makeRequest(url, options);
    
    if (response.id) {
      // Convert new API format to old format for compatibility
      return {
        place_id: response.id,
        name: response.displayName?.text || response.displayName,
        formatted_address: response.formattedAddress,
        geometry: {
          location: {
            lat: response.location?.latitude,
            lng: response.location?.longitude
          }
        },
        rating: response.rating,
        user_ratings_total: response.userRatingCount,
        types: response.types || [],
        opening_hours: response.regularOpeningHours ? {
          periods: response.regularOpeningHours.periods?.map(period => ({
            open: {
              day: period.open?.day,
              time: period.open?.time?.replace(':', '')
            },
            close: {
              day: period.close?.day,
              time: period.close?.time?.replace(':', '')
            }
          })) || []
        } : null,
        photos: response.photos || [],
        price_level: response.priceLevel
      };
    } else {
      console.error(`❌ No details found for place ${placeId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Request failed for place details ${placeId}:`, error.message);
    return null;
  }
}

// Function to convert Google Places data to our template format
function convertToTemplate(place, placeDetails) {
  const now = new Date();
  
  // Extract coordinates
  const coordinates = placeDetails?.geometry?.location 
    ? [placeDetails.geometry.location.lng, placeDetails.geometry.location.lat]
    : [34.7818, 32.0853]; // Default to Tel Aviv coordinates
  
  // Extract address parts
  const fullAddress = placeDetails?.formatted_address || place.formatted_address || '';
  const addressParts = fullAddress.split(',');
  const address = addressParts[0]?.trim() || '';
  let city = 'ישראל'; // Default city
  
  // Try to extract city from address
  if (addressParts.length > 1) {
    const potentialCity = addressParts[addressParts.length - 2]?.trim();
    if (potentialCity && !potentialCity.includes('Israel')) {
      city = potentialCity;
    }
  }
  
  // Convert opening hours
  const openingHours = {};
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  days.forEach(day => {
    openingHours[day] = {
      open: "06:00",
      close: "22:00",
      closed: false
    };
  });
  
  // If we have actual opening hours, use them
  if (placeDetails?.opening_hours?.periods) {
    const periods = placeDetails.opening_hours.periods;
    
    // Reset all days to closed first
    days.forEach(day => {
      openingHours[day] = {
        open: "06:00",
        close: "22:00",
        closed: true
      };
    });
    
    periods.forEach(period => {
      if (period.open && period.close) {
        const dayIndex = period.open.day;
        const dayName = days[dayIndex];
        
        if (dayName) {
          openingHours[dayName] = {
            open: period.open.time ? `${period.open.time.substring(0, 2)}:${period.open.time.substring(2, 4)}` : "06:00",
            close: period.close.time ? `${period.close.time.substring(0, 2)}:${period.close.time.substring(2, 4)}` : "22:00",
            closed: false
          };
        }
      }
    });
  }
  
  // Generate description based on place types and rating
  let description = 'גינה נעימה לכלבים';
  if (placeDetails?.types?.includes('park')) {
    description = 'פארק מקסים לכלבים ולבעליהם';
  }
  if (placeDetails?.rating && placeDetails.rating >= 4) {
    description += ' עם דירוג גבוה';
  }
  
  return {
    name: place.name,
    description: description,
    type: "public",
    manager: {
      $oid: DEFAULT_MANAGER_ID
    },
    location: {
      address: address,
      city: city,
      coordinates: {
        type: "Point",
        coordinates: coordinates
      }
    },
    images: [],
    capacity: {
      maxDogs: Math.floor(Math.random() * 15) + 5 // Random capacity between 5-20
    },
    openingHours: openingHours,
    amenities: [],
    rules: [],
    requirements: {
      vaccinationRequired: true,
      minAge: 4,
      sizeRestrictions: []
    },
    pricing: {
      type: "free",
      price: 0,
      currency: "ILS"
    },
    statistics: {
      totalVisits: 0,
      averageRating: placeDetails?.rating || 0,
      totalReviews: placeDetails?.user_ratings_total || 0
    },
    currentOccupancy: 0,
    isActive: true,
    createdAt: {
      $date: now.toISOString()
    },
    updatedAt: {
      $date: now.toISOString()
    },
    __v: 0,
    customProfile: {
      enabled: true,
      html: `
<div class="garden-profile">
  <div class="header">
    <h1>{name}</h1>
    <p class="location">{location.address}, {location.city}</p>
  </div>
  
  <div class="section">
    <h2>About This Park</h2>
    <p>{description}</p>
  </div>
  
  <div class="section">
    <h2>Amenities</h2>
    <ul class="amenities-list">
      {amenities.map(amenity => '<li>' + amenity + '</li>').join('')}
    </ul>
  </div>
  
  <div class="section">
    <h2>Park Rules</h2>
    <ul class="rules-list">
      {rules.map(rule => '<li>' + rule + '</li>').join('')}
    </ul>
  </div>
  
  <div class="info-grid">
    <div class="info-item">
      <span class="label">Type:</span>
      <span class="value">{type}</span>
    </div>
    <div class="info-item">
      <span class="label">Capacity:</span>
      <span class="value">{capacity.maxDogs} dogs</span>
    </div>
    <div class="info-item">
      <span class="label">Rating:</span>
      <span class="value">{statistics.averageRating}/5 ({statistics.totalReviews} reviews)</span>
    </div>
  </div>
</div>
  `,
      css: `
:root {
  /* Typography */
  --gp-font-heading: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --gp-font-body: var(--gp-font-heading);

  /* Design Tokens – Colors */
  --gp-color-primary: #2563eb;   /* Indigo-600 */
  --gp-color-accent: #10b981;    /* Emerald-500 */
  --gp-color-text:   #1f2937;    /* Gray-800  */
  --gp-color-muted:  #6b7280;    /* Gray-500  */
  --gp-color-border: #e5e7eb;    /* Gray-200  */
  --gp-color-bg:     #ffffff;    /* White     */
  --gp-color-surface:#f9fafb;    /* Gray-50   */

  /* Other Tokens */
  --gp-radius: 0.75rem;          /* 12px rounded */
  --gp-ease:  cubic-bezier(0.4, 0, 0.2, 1);
}

/* Container */
.garden-profile {
  max-width: 960px;
  margin-inline: auto;
  padding: 3rem 1.5rem;
  background: var(--gp-color-bg);
  border-radius: var(--gp-radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-family: var(--gp-font-heading);
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 700;
  color: var(--gp-color-text);
  margin-bottom: 0.5rem;
}

.location {
  font-size: 1.125rem;
  color: var(--gp-color-muted);
}

/* Section Headings */
.section {
  margin-bottom: 3rem;
  animation: fade-up 0.6s var(--gp-ease) both;
  animation-delay: 0.15s;
}

.section h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  font-family: var(--gp-font-heading);
  color: var(--gp-color-text);
  position: relative;
}

.section h2::before {
  content: "";
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, var(--gp-color-primary), var(--gp-color-accent));
  border-radius: 6px;
}

/* List Styling */
.amenities-list,
.rules-list {
  list-style: none;
  padding: 0;
  margin-top: 1rem;
}

.amenities-list li,
.rules-list li {
  position: relative;
  padding: 0.65rem 0 0.65rem 2rem;
  line-height: 1.45;
  color: var(--gp-color-text);
  font-size: 1rem;
  transition: background 0.3s var(--gp-ease);
}

.amenities-list li:hover,
.rules-list li:hover {
  background: rgba(59, 130, 246, 0.05);
}

/* Amenity bullet – circle */
.amenities-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.9rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: var(--gp-color-accent);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}

/* Rule bullet – triangle */
.rules-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.9rem;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--gp-color-primary);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.75rem;
  margin-top: 2rem;
  padding: 2rem;
  background: var(--gp-color-surface);
  border-radius: var(--gp-radius);
}

.info-item {
  text-align: center;
}

.info-item .label {
  font-size: 0.875rem;
  color: var(--gp-color-muted);
  margin-bottom: 0.25rem;
}

.info-item .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gp-color-text);
  transition: color 0.3s var(--gp-ease);
}

.info-item:hover .value {
  color: var(--gp-color-primary);
}

/* Fade‑Up Animation */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark‑Mode Support */
@media (prefers-color-scheme: dark) {
  :root {
    --gp-color-text:   #f3f4f6; /* Gray‑100 */
    --gp-color-muted:  #9ca3af; /* Gray‑400 */
    --gp-color-bg:     #1f2937; /* Gray‑800 */
    --gp-color-surface:#374151; /* Gray‑700 */
    --gp-color-border: #4b5563; /* Gray‑600 */
  }

  .garden-profile {
    box-shadow: none;
  }
}

/* Small Screens */
@media (max-width: 480px) {
  .header h1 {
    font-size: 2rem;
  }

  .section h2 {
    font-size: 1.25rem;
  }
}
`
    },
    features: {
      allowsPhotoSharing: true,
      hasEvents: false,
      requiresReservation: false
    }
  };
}

// Function to delay execution (to respect rate limits)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to fetch all dog parks
async function fetchAllDogParks() {
  console.log('🚀 Starting Google Places API fetch for dog parks in Israel...');
  
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Please set your Google Places API key in the GOOGLE_PLACES_API_KEY environment variable');
    console.log('💡 You can get an API key from: https://console.cloud.google.com/apis/credentials');
    return;
  }
  
  let allPlaces = [];
  const processedPlaceIds = new Set();
  
  // Search for each term in each region
  for (const region of ISRAEL_REGIONS) {
    console.log(`\n🌍 Searching in region: ${region.name}`);
    
    for (const term of SEARCH_TERMS) {
      try {
        const places = await searchPlaces(term, region);
        
        // Filter out duplicates and add to results
        for (const place of places) {
          if (!processedPlaceIds.has(place.place_id)) {
            processedPlaceIds.add(place.place_id);
            allPlaces.push(place);
          }
        }
        
        // Rate limiting - wait 1 second between requests
        await delay(1000);
        
      } catch (error) {
        console.error(`❌ Error searching for "${term}" in ${region.name}:`, error.message);
      }
    }
  }
  
  console.log(`📊 Found ${allPlaces.length} unique places total`);
  
  // Get detailed information for each place
  const detailedPlaces = [];
  
  for (let i = 0; i < allPlaces.length; i++) {
    const place = allPlaces[i];
    console.log(`📍 Processing ${i + 1}/${allPlaces.length}: ${place.name}`);
    
    try {
      const placeDetails = await getPlaceDetails(place.place_id);
      
      if (placeDetails) {
        const formattedPlace = convertToTemplate(place, placeDetails);
        detailedPlaces.push(formattedPlace);
        console.log(`✅ Added: ${formattedPlace.name}`);
      }
      
      // Rate limiting - wait 1 second between requests
      await delay(1000);
      
    } catch (error) {
      console.error(`❌ Error getting details for ${place.name}:`, error.message);
    }
  }
  
  // Save to file
  const filename = 'google-dog-parks-israel.json';
  fs.writeFileSync(filename, JSON.stringify(detailedPlaces, null, 2));
  
  console.log(`🎉 Successfully exported ${detailedPlaces.length} dog parks to ${filename}`);
  console.log(`📁 File saved at: ${process.cwd()}/${filename}`);
  
  return detailedPlaces;
}

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  fetchAllDogParks().catch(console.error);
}

module.exports = { fetchAllDogParks, convertToTemplate };