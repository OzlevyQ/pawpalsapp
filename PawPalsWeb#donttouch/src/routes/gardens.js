const express = require('express');
const router = express.Router();
const {
  getAllGardens,
  getGardenById,
  createGarden,
  updateGarden,
  deleteGarden,
  getCurrentVisitors,
  updateGardenCustomProfile
} = require('../controllers/gardenController');
const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getSubscriptionStatus,
  getSubscribers,
  getNewsletterStats,
  sendNewsletter,
  unsubscribeViaToken
} = require('../controllers/newsletterController');
const { auth, authorize } = require('../middleware/auth');
const { gardenValidation } = require('../utils/validation');

// Import fetch for Node.js
console.log('🔍 Loading fetch...');
const fetch = require('node-fetch');
console.log('🔍 fetch loaded successfully:', typeof fetch);

// Create a wrapper function to ensure fetch is available
async function makeFetchRequest(url, options) {
  console.log('🔍 Making fetch request to:', url);
  console.log('🔍 fetch type at runtime:', typeof fetch);
  
  if (typeof fetch !== 'function') {
    console.error('🔍 fetch is not a function, attempting to reload...');
    const nodeFetch = require('node-fetch');
    return nodeFetch(url, options);
  }
  
  try {
    const response = await fetch(url, options);
    console.log('🔍 Fetch response status:', response.status);
    console.log('🔍 Fetch response ok:', response.ok);
    return response;
  } catch (error) {
    console.error('🔍 Fetch error:', error);
    throw error;
  }
}

// Public routes
router.get('/', getAllGardens);

// Add the missing nearby route
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }
    
    // Use the existing getAllGardens function with location parameters
    req.query.maxDistance = radius;
    await getAllGardens(req, res);
  } catch (error) {
    console.error('Error fetching nearby gardens:', error);
    res.status(500).json({ error: 'Error fetching nearby gardens' });
  }
});

// Protected routes that must come BEFORE /:id
// Get gardens that the user can create events in
router.get('/my-gardens', auth, async (req, res) => {
  try {
    const Garden = require('../models/Garden');
    let gardens;

    if (req.user.role === 'admin') {
      // Admin can create events in all gardens
      gardens = await Garden.find({}).populate('manager', 'firstName lastName email');
    } else if (req.user.role === 'garden_manager') {
      // Garden manager can create events in their gardens
      gardens = await Garden.find({ manager: req.user.id }).populate('manager', 'firstName lastName email');
    } else {
      // Regular users can create events in all public gardens for now
      // TODO: Implement proper permission system
      gardens = await Garden.find({}).populate('manager', 'firstName lastName email');
    }

    res.json(gardens);
  } catch (error) {
    console.error('Error fetching user gardens:', error);
    res.status(500).json({ error: 'Failed to fetch gardens' });
  }
});

// Search dog parks using Google Places API (public route) - MUST come before /:id
router.get('/search-dog-parks', async (req, res) => {
  const ApiUsage = require('../models/ApiUsage');
  let startTime = Date.now();
  
  try {
    const { lat, lng, radius, query } = req.query;
    
    if (!lat || !lng || !radius) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lng, radius' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const requestedRadius = parseFloat(radius);
    const radiusInMeters = requestedRadius * 1000;
    
    console.log('🔍 User location:', userLat, userLng);
    console.log('🔍 Requested radius (km):', requestedRadius);
    console.log('🔍 Radius in meters for Google API:', radiusInMeters);

    // Function to calculate distance between two points
    function calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // Distance in kilometers
    }

    const searchQueries = [
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

    const specificQuery = query || 'dog park';
    let allParks = [];

    // Search with multiple queries using Places API (New)
    for (const searchQuery of searchQueries) {
      try {
        const requestBody = {
          textQuery: `${searchQuery} near me`,
          locationBias: {
            circle: {
              center: {
                latitude: userLat,
                longitude: userLng
              },
              radius: radiusInMeters
            }
          },
          maxResultCount: 20
        };

        const apiCallStart = Date.now();
        const response = await makeFetchRequest('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.formattedAddress,places.types,places.photos'
          },
          body: JSON.stringify(requestBody)
        });

        const responseTime = Date.now() - apiCallStart;
        const data = await response.json();
        
        // Log API usage
        await ApiUsage.logUsage(
          'places_text_search',
          'places:searchText',
          response.ok,
          response.ok ? null : `HTTP ${response.status}: ${JSON.stringify(data)}`,
          responseTime,
          req.user?.id || null
        );
        
        console.log('🔍 API Response data for', searchQuery, ':', JSON.stringify(data, null, 2));

        if (data.places) {
          console.log('🔍 Found places before filtering:', data.places.length);
          
          // Convert new API format to our expected format and filter for dog-related places
          const convertedPlaces = data.places
            .filter(place => {
              const name = (place.displayName?.text || '').toLowerCase();
              const types = place.types || [];
              
              // Exclude commercial establishments
              const commercialTypes = [
                'veterinary_care', 'pet_store', 'store', 'establishment', 
                'point_of_interest', 'shopping_mall', 'hospital', 'clinic',
                'school', 'university', 'restaurant', 'cafe', 'hotel'
              ];
              const isCommercial = commercialTypes.some(type => types.includes(type));
              
              // Exclude commercial keywords in name
              const commercialKeywords = [
                'vet', 'clinic', 'hospital', 'store', 'shop', 'mall', 'hotel',
                'restaurant', 'cafe', 'school', 'university', 'וטרינר', 'קליניקה',
                'בית חולים', 'חנות', 'קניון', 'מלון', 'מסעדה', 'בית ספר'
              ];
              const hasCommercialKeyword = commercialKeywords.some(keyword => name.includes(keyword));
              
              // Must contain dog-related keywords in name
              const dogKeywords = ['dog', 'canine', 'pet', 'כלב', 'כלבים'];
              const hasDogKeyword = dogKeywords.some(keyword => name.includes(keyword));
              
              // Allow only park types
              const allowedTypes = ['park', 'tourist_attraction', 'premise', 'dog_park'];
              const hasAllowedType = allowedTypes.some(type => types.includes(type)) || types.length === 0;
              
              // Must be relevant to dogs and not commercial
              const isDogRelated = hasDogKeyword || name.includes('dog') || 
                                  name.includes('canine') || name.includes('pet') ||
                                  name.includes('כלב') || name.includes('כלבים');
                                  
              return isDogRelated && !isCommercial && !hasCommercialKeyword && hasAllowedType;
            })
            .map(place => {
              const distance = calculateDistance(
                userLat, userLng,
                place.location.latitude, place.location.longitude
              );
              
              return {
                id: place.id,
                name: place.displayName?.text || 'Unknown',
                address: place.formattedAddress || 'Address not available',
                location: {
                  lat: place.location.latitude,
                  lng: place.location.longitude
                },
                rating: place.rating || 0,
                userRatingCount: place.userRatingCount || 0,
                types: place.types || [],
                distance: distance,
                photos: place.photos || [],
                amenities: determineAmenitiesFromPlace(place)
              };
            })
            .filter(place => place.distance <= requestedRadius); // Filter by requested radius
          
          // Log filtered results
          const filteredCount = convertedPlaces.length;
          const beforeFilterCount = data.places.length;
          const filteredOutCount = beforeFilterCount - filteredCount;
          
          convertedPlaces.forEach(place => {
            if (place.distance > requestedRadius) {
              console.log(`🔍 Filtered out by distance: ${place.name} (${place.distance.toFixed(2)} km > ${requestedRadius} km)`);
            }
          });
          
          console.log(`🔍 Places after filtering for ${searchQuery} : ${filteredCount}`);
          
          allParks = allParks.concat(convertedPlaces);
        }
      } catch (error) {
        console.error(`Error searching for "${searchQuery}":`, error);
        
        // Log failed API usage
        await ApiUsage.logUsage(
          'places_text_search',
          'places:searchText',
          false,
          error.message,
          0,
          req.user?.id || null
        );
      }
    }

    // Hebrew search queries
    const hebrewSearchQueries = [
      'גן כלבים',
      'כלבים פארק',
      'אזור כלבים',
      'גן כלבים מגודר',
      'פארק כלבים',
      'שטח כלבים'
    ];

    // Search with Hebrew queries
    for (const searchQuery of hebrewSearchQueries) {
      try {
        const requestBody = {
          textQuery: `${searchQuery}`,
          locationBias: {
            circle: {
              center: {
                latitude: userLat,
                longitude: userLng
              },
              radius: radiusInMeters
            }
          },
          maxResultCount: 20,
          languageCode: 'he'
        };

        const apiCallStart = Date.now();
        const response = await makeFetchRequest('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.formattedAddress,places.types,places.photos'
          },
          body: JSON.stringify(requestBody)
        });

        const responseTime = Date.now() - apiCallStart;
        const data = await response.json();
        
        // Log API usage
        await ApiUsage.logUsage(
          'places_text_search',
          'places:searchText',
          response.ok,
          response.ok ? null : `HTTP ${response.status}: ${JSON.stringify(data)}`,
          responseTime,
          req.user?.id || null
        );

        if (data.places) {
          const convertedPlaces = data.places
            .filter(place => {
              const name = (place.displayName?.text || '').toLowerCase();
              const types = place.types || [];
              
              // Same filtering logic as English
              const commercialTypes = [
                'veterinary_care', 'pet_store', 'store', 'establishment', 
                'point_of_interest', 'shopping_mall', 'hospital', 'clinic',
                'school', 'university', 'restaurant', 'cafe', 'hotel'
              ];
              const isCommercial = commercialTypes.some(type => types.includes(type));
              
              const commercialKeywords = [
                'vet', 'clinic', 'hospital', 'store', 'shop', 'mall', 'hotel',
                'restaurant', 'cafe', 'school', 'university', 'וטרינר', 'קליניקה',
                'בית חולים', 'חנות', 'קניון', 'מלון', 'מסעדה', 'בית ספר'
              ];
              const hasCommercialKeyword = commercialKeywords.some(keyword => name.includes(keyword));
              
              const dogKeywords = ['dog', 'canine', 'pet', 'כלב', 'כלבים'];
              const hasDogKeyword = dogKeywords.some(keyword => name.includes(keyword));
              
              const allowedTypes = ['park', 'tourist_attraction', 'premise', 'dog_park'];
              const hasAllowedType = allowedTypes.some(type => types.includes(type)) || types.length === 0;
              
              const isDogRelated = hasDogKeyword || name.includes('dog') || 
                                  name.includes('canine') || name.includes('pet') ||
                                  name.includes('כלב') || name.includes('כלבים');
                                  
              return isDogRelated && !isCommercial && !hasCommercialKeyword && hasAllowedType;
            })
            .map(place => {
              const distance = calculateDistance(
                userLat, userLng,
                place.location.latitude, place.location.longitude
              );
              
              return {
                id: place.id,
                name: place.displayName?.text || 'Unknown',
                address: place.formattedAddress || 'Address not available',
                location: {
                  lat: place.location.latitude,
                  lng: place.location.longitude
                },
                rating: place.rating || 0,
                userRatingCount: place.userRatingCount || 0,
                types: place.types || [],
                distance: distance,
                photos: place.photos || [],
                amenities: determineAmenitiesFromPlace(place)
              };
            })
            .filter(place => place.distance <= requestedRadius);
          
          convertedPlaces.forEach(place => {
            if (place.distance > requestedRadius) {
              console.log(`🔍 Filtered out by distance: ${place.name} (${place.distance.toFixed(2)} km > ${requestedRadius} km)`);
            }
          });
          
          console.log(`🔍 Places after filtering for ${searchQuery} : ${convertedPlaces.length}`);
          
          allParks = allParks.concat(convertedPlaces);
        }
      } catch (error) {
        console.error(`Error searching for "${searchQuery}":`, error);
        
        // Log failed API usage
        await ApiUsage.logUsage(
          'places_text_search',
          'places:searchText',
          false,
          error.message,
          0,
          req.user?.id || null
        );
      }
    }

    // Remove duplicates based on place ID
    const uniqueParks = allParks.filter((park, index, self) => 
      index === self.findIndex(p => p.id === park.id)
    );

    // Sort by distance
    uniqueParks.sort((a, b) => a.distance - b.distance);

    // Add distance to display name for user
    const parksWithDistance = uniqueParks.map(park => ({
      ...park,
      displayName: `${park.name} (Rating: ${park.rating.toFixed(1)}) - ${park.distance.toFixed(1)} ק״מ`
    }));

    console.log('🔍 Total parks found:', allParks.length);
    console.log('🔍 Unique parks after deduplication:', uniqueParks.length);
    console.log('🔍 Final response - parks count:', parksWithDistance.length);
    
    res.json({
      parks: parksWithDistance,
      totalFound: allParks.length,
      uniqueCount: uniqueParks.length,
      searchRadius: requestedRadius,
      userLocation: { lat: userLat, lng: userLng }
    });

  } catch (error) {
    console.error('Error searching for dog parks:', error);
    
    // Log failed API usage
    const ApiUsage = require('../models/ApiUsage');
    await ApiUsage.logUsage(
      'places_text_search',
      'places:searchText',
      false,
      error.message,
      0,
      req.user?.id || null
    );
    
    res.status(500).json({ error: 'Failed to search for dog parks' });
  }
});

// Public unsubscribe route (no auth required) - must be before other routes
router.get('/newsletter/unsubscribe/:token', unsubscribeViaToken);

// Newsletter routes (must be before /:id route to avoid conflicts)
router.post('/:id/newsletter/subscribe', auth, subscribeToNewsletter);
router.delete('/:id/newsletter/unsubscribe', auth, unsubscribeFromNewsletter);
router.get('/:id/newsletter/status', auth, getSubscriptionStatus);
router.get('/:id/newsletter/subscribers', auth, getSubscribers);
router.get('/:id/newsletter/stats', auth, getNewsletterStats);
router.post('/:id/newsletter/send', auth, sendNewsletter);

// Public route for getting garden by ID (must come after specific routes)
router.get('/:id', getGardenById);
router.get('/:id/visitors', getCurrentVisitors);

// Protected routes
router.use(auth);

// Create garden (admin and garden_manager only)
router.post(
  '/',
  authorize('admin', 'garden_manager'),
  gardenValidation.create,
  createGarden
);

// Update garden (admin and garden manager who owns it)
router.put('/:id', gardenValidation.update, updateGarden);

// Update garden custom profile
router.put('/:id/custom-profile', updateGardenCustomProfile);

// Delete garden (admin only)
router.delete('/:id', authorize('admin'), deleteGarden);

// Helper function to determine amenities from Google Places data
function determineAmenitiesFromPlace(place) {
  const amenities = [];
  
  // Base amenities for parks
  amenities.push('seating');
  
  // Infer amenities from rating and types
  if (place.rating && place.rating > 4.0) {
    amenities.push('water', 'parking');
  }
  if (place.rating && place.rating > 4.3) {
    amenities.push('toys');
  }
  if (place.types && place.types.includes('establishment')) {
    amenities.push('parking');
  }
  if (Math.random() > 0.7) {
    amenities.push('training');
  }
  
  return amenities;
}

// Get detailed place information
router.get('/place-details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    
    const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${placeId}&` +
      `fields=name,rating,user_ratings_total,vicinity,formatted_address,opening_hours,formatted_phone_number,website,photos,geometry&` +
      `key=${GOOGLE_API_KEY}`;

    const response = await fetch(detailsUrl);
    const data = await response.json();

    if (data.result) {
      res.json({ 
        success: true, 
        place: data.result
      });
    } else {
      res.status(404).json({ error: 'Place not found' });
    }

  } catch (error) {
    console.error('Error getting place details:', error);
    res.status(500).json({ error: 'Failed to get place details' });
  }
});



module.exports = router;
