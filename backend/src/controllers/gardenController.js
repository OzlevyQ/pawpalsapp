const Garden = require('../models/Garden');
const { validationResult } = require('express-validator');
const NotificationService = require('../utils/notificationService');
const User = require('../models/User');

const getAllGardens = async (req, res) => {
  try {
    const { 
      type, 
      city, 
      amenities, 
      maxDistance,
      lat,
      lng 
    } = req.query;

    let query = { 
      isActive: true,
      // Filter out gardens with poor data quality
      name: { $exists: true, $ne: '', $not: { $regex: /^(test|biro)$/i } },
      description: { 
        $exists: true, 
        $ne: '', 
        $not: { $regex: /^(dasew|test|1|placeholder)$/i },
        $regex: /.{10,}/ // At least 10 characters
      },
      'location.address': { 
        $exists: true, 
        $ne: '', 
        $not: { $regex: /^(1|test|placeholder)$/i },
        $regex: /.{3,}/ // At least 3 characters
      },
      'location.city': { 
        $exists: true, 
        $ne: '',
        $not: { $regex: /^(1|test)$/i }
      },
      // Filter out gardens with invalid coordinates (0,0)
      'location.coordinates.coordinates': { 
        $not: { $eq: [0, 0] } 
      }
    };

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by city
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    // Filter by amenities
    if (amenities) {
      const amenitiesArray = amenities.split(',');
      query.amenities = { $in: amenitiesArray };
    }

    let gardens;

    // If coordinates provided, search by distance
    if (lat && lng && maxDistance) {
      // Add filter to exclude gardens with invalid coordinates (0, 0)
      query['location.coordinates.coordinates'] = { 
        $not: { $eq: [0, 0] } 
      };
      
      try {
        gardens = await Garden.find({
          ...query,
          'location.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
              },
              $maxDistance: parseInt(maxDistance) * 1000 // Convert km to meters
            }
          }
        }).populate('manager', 'firstName lastName');
      } catch (geoError) {
        console.error('Geospatial query failed, falling back to regular query:', geoError);
        // Fallback to regular query without geospatial filter
        delete query['location.coordinates.coordinates'];
        gardens = await Garden.find(query)
          .populate('manager', 'firstName lastName')
          .sort('-createdAt');
      }
    } else {
      gardens = await Garden.find(query)
        .populate('manager', 'firstName lastName')
        .sort('-createdAt');
    }

    // Add current occupancy data for each garden
    const Visit = require('../models/Visit');
    // PERFORMANCE FIX: Use aggregation to get all data in one query instead of N+1
    const gardenIds = gardens.map(g => g._id);
    
    // Single aggregation query to get all visit data for all gardens
    const visitsData = await Visit.aggregate([
      {
        $match: { 
          garden: { $in: gardenIds }, 
          status: 'active' 
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, profileImage: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'dogs',
          localField: 'dogs',
          foreignField: '_id',
          as: 'dogs',
          pipeline: [
            { 
              $match: { profileVisibility: 'public' } 
            },
            { 
              $project: { 
                name: 1, breed: 1, size: 1, age: 1, 
                profileVisibility: 1, owner: 1, image: 1, gallery: 1 
              } 
            }
          ]
        }
      },
      {
        $group: {
          _id: '$garden',
          count: { $sum: 1 },
          visits: { 
            $push: {
              _id: '$_id',
              user: { $arrayElemAt: ['$user', 0] },
              dogs: '$dogs',
              checkInTime: '$checkInTime'
            }
          }
        }
      },
      {
        $project: {
          count: 1,
          visits: {
            $slice: [
              { $sortArray: { input: '$visits', sortBy: { checkInTime: -1 } } },
              10
            ]
          }
        }
      }
    ]);

    // Map the aggregated data back to gardens
    const visitsMap = new Map(
      visitsData.map(item => [item._id.toString(), item])
    );

    const gardensWithOccupancy = gardens.map(garden => {
      const visitData = visitsMap.get(garden._id.toString());
      
      // Transform visits to currentVisitors format
      const currentVisitors = [];
      if (visitData?.visits) {
        visitData.visits.forEach(visit => {
          if (visit.dogs && visit.dogs.length > 0) {
            visit.dogs.forEach(dog => {
              currentVisitors.push({
                user: visit.user,
                dog: dog,
                checkInTime: visit.checkInTime
              });
            });
          }
        });
      }

      const gardenObj = garden.toObject();
      gardenObj.currentOccupancy = visitData?.count || 0;
      gardenObj.currentVisitors = currentVisitors;
      
      // Add distance calculation if coordinates were provided
      if (lat && lng && garden.location?.coordinates?.coordinates) {
        const [gardenLng, gardenLat] = garden.location.coordinates.coordinates;
        if (gardenLat !== 0 || gardenLng !== 0) { // Skip invalid coordinates
          const R = 6371; // Earth's radius in kilometers
          const dLat = (gardenLat - parseFloat(lat)) * Math.PI / 180;
          const dLng = (gardenLng - parseFloat(lng)) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(parseFloat(lat) * Math.PI / 180) * Math.cos(gardenLat * Math.PI / 180) *
                   Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          gardenObj.distance = R * c; // Distance in kilometers
        }
      }
      
      return gardenObj;
    });

    // If distance was requested, sort by distance and filter by max distance
    if (lat && lng && maxDistance) {
      const maxDistanceKm = parseFloat(maxDistance);
      const filteredGardens = gardensWithOccupancy
        .filter(garden => garden.distance !== undefined && garden.distance <= maxDistanceKm)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999));
      
      return res.json({
        count: filteredGardens.length,
        gardens: filteredGardens
      });
    }

    res.json({
      count: gardensWithOccupancy.length,
      gardens: gardensWithOccupancy
    });
  } catch (error) {
    console.error('Error fetching gardens:', error);
    res.status(500).json({ error: 'Error fetching gardens' });
  }
};

const getGardenById = async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id)
      .populate('manager', 'firstName lastName email phone');

    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check if garden has quality issues
    const hasQualityIssues = (
      !garden.name || garden.name.length < 2 ||
      !garden.description || garden.description.length < 10 ||
      /^(dasew|test|1|placeholder)$/i.test(garden.description) ||
      !garden.location?.address || garden.location.address.length < 3 ||
      /^(1|test|placeholder)$/i.test(garden.location.address) ||
      !garden.location?.city || /^(1|test)$/i.test(garden.location.city) ||
      (garden.location?.coordinates?.coordinates && 
       garden.location.coordinates.coordinates[0] === 0 && 
       garden.location.coordinates.coordinates[1] === 0)
    );

    if (hasQualityIssues) {
      return res.status(404).json({ error: 'Garden not available' });
    }

    // Add current occupancy data
    const Visit = require('../models/Visit');
    const activeVisitsCount = await Visit.countDocuments({
      garden: req.params.id,
      status: 'active'
    });

    // Get current visitors with dog images
    const activeVisits = await Visit.find({
      garden: req.params.id,
      status: 'active'
    })
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage'
      })
      .populate({
        path: 'dogs',
        select: 'name breed size age profileVisibility owner image gallery'
      })
      .sort('-checkInTime');

    // Filter dogs based on visibility settings
    const visibleVisits = activeVisits.map(visit => {
      const visitObj = visit.toObject();
      visitObj.dogs = visitObj.dogs.filter(dog => 
        dog.profileVisibility === 'public' || 
        (req.userId && dog.owner && dog.owner.toString() === req.userId.toString())
      );
      return visitObj;
    }).filter(visit => visit.dogs.length > 0);

    // Transform visits to currentVisitors format
    const currentVisitors = [];
    visibleVisits.forEach(visit => {
      visit.dogs.forEach(dog => {
        currentVisitors.push({
          user: visit.user,
          dog: dog,
          checkInTime: visit.checkInTime
        });
      });
    });

    const gardenObj = garden.toObject();
    gardenObj.currentOccupancy = activeVisitsCount;
    gardenObj.currentVisitors = currentVisitors;

    res.json(gardenObj);
  } catch (error) {
    console.error('Error fetching garden:', error);
    res.status(500).json({ error: 'Error fetching garden' });
  }
};

const createGarden = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only admin or garden_manager can create gardens
    if (!['admin', 'garden_manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized to create gardens' });
    }

    const gardenData = {
      ...req.body,
      manager: req.userId
    };

    const garden = new Garden(gardenData);
    await garden.save();

    await garden.populate('manager', 'firstName lastName');

    // Send notifications to nearby users about the new garden (within 10km)
    try {
      const gardenLat = garden.location?.coordinates?.coordinates[1];
      const gardenLng = garden.location?.coordinates?.coordinates[0];
      
      if (gardenLat && gardenLng && gardenLat !== 0 && gardenLng !== 0) {
        // Find users within 10km of the new garden
        const Visit = require('../models/Visit');
        const recentVisitors = await Visit.find({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }).distinct('user');

        const nearbyUsers = await User.find({
          _id: { $in: recentVisitors },
          'location.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [gardenLng, gardenLat]
              },
              $maxDistance: 10000 // 10km in meters
            }
          }
        }).select('_id').limit(50); // Limit to prevent spam

        console.log(`📢 Sending new garden notifications to ${nearbyUsers.length} nearby users for: ${garden.name}`);

        for (const user of nearbyUsers) {
          await NotificationService.createGardenUpdateNotification(
            user._id,
            garden._id,
            garden.name,
            'new_garden_added',
            `New dog park "${garden.name}" has opened near you! Check it out.`
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to send new garden notifications:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    res.status(201).json({
      message: 'Garden created successfully',
      garden
    });
  } catch (error) {
    console.error('Error creating garden:', error);
    res.status(500).json({ error: 'Error creating garden' });
  }
};

const updateGarden = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const garden = await Garden.findById(req.params.id);

    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check if user is authorized to update
    if (req.user.role !== 'admin' && garden.manager.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to update this garden' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'manager' && key !== '_id') {
        garden[key] = req.body[key];
      }
    });

    await garden.save();
    await garden.populate('manager', 'firstName lastName');

    // Send garden update notifications to users who have this garden in favorites
    try {
      const usersWithFavorite = await User.find({ 
        favorites: garden._id 
      }).select('_id');

      // Determine what type of update was made
      const updateTypes = [];
      const updatedFields = Object.keys(req.body);
      
      if (updatedFields.includes('openingHours')) {
        updateTypes.push('Hours updated');
      }
      if (updatedFields.includes('amenities')) {
        updateTypes.push('New amenities added');
      }
      if (updatedFields.includes('rules')) {
        updateTypes.push('Rules updated');
      }
      if (updatedFields.includes('capacity')) {
        updateTypes.push('Capacity changed');
      }
      if (updatedFields.includes('location')) {
        updateTypes.push('Location information updated');
      }
      if (updatedFields.includes('description')) {
        updateTypes.push('Description updated');
      }
      if (updatedFields.includes('contact')) {
        updateTypes.push('Contact information updated');
      }
      
      const updateMessage = updateTypes.length > 0 
        ? `${garden.name} has been updated: ${updateTypes.join(', ')}.`
        : `${garden.name} has been updated. Check out the latest information!`;

      console.log(`📢 Sending garden update notifications to ${usersWithFavorite.length} users for garden: ${garden.name}`);
      
      for (const user of usersWithFavorite) {
        await NotificationService.createGardenUpdateNotification(
          user._id,
          garden._id,
          garden.name,
          'garden_info_updated',
          updateMessage
        );
      }
      
      console.log(`✅ Garden update notifications sent successfully for ${garden.name}`);
    } catch (notificationError) {
      console.error('Failed to send garden update notifications:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    res.json({
      message: 'Garden updated successfully',
      garden
    });
  } catch (error) {
    console.error('Error updating garden:', error);
    res.status(500).json({ error: 'Error updating garden' });
  }
};

const deleteGarden = async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);

    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Only admin can delete gardens
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete gardens' });
    }

    // Soft delete
    garden.isActive = false;
    await garden.save();

    res.json({ message: 'Garden deleted successfully' });
  } catch (error) {
    console.error('Error deleting garden:', error);
    res.status(500).json({ error: 'Error deleting garden' });
  }
};

const getCurrentVisitors = async (req, res) => {
  try {
    const Visit = require('../models/Visit');
    
    const activeVisits = await Visit.find({
      garden: req.params.id,
      status: 'active'
    })
      .populate({
        path: 'user',
        select: 'firstName lastName profileImage'
      })
      .populate({
        path: 'dogs',
        select: 'name breed size age profileVisibility owner image gallery'
      })
      .sort('-checkInTime');

    // Filter dogs based on visibility settings
    const visibleVisits = activeVisits.map(visit => {
      const visitObj = visit.toObject();
      visitObj.dogs = visitObj.dogs.filter(dog => 
        dog.profileVisibility === 'public' || 
        (req.userId && dog.owner && dog.owner.toString() === req.userId.toString())
      );
      return visitObj;
    });

    res.json({
      count: visibleVisits.length,
      visitors: visibleVisits
    });
  } catch (error) {
    console.error('Error fetching current visitors:', error);
    res.status(500).json({ error: 'Error fetching current visitors' });
  }
};

const updateGardenCustomProfile = async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);

    if (!garden) {
      return res.status(404).json({ error: 'Garden not found' });
    }

    // Check if user is authorized to update
    if (req.user.role !== 'admin' && garden.manager.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to update this garden' });
    }

    const { enabled, html, css } = req.body;

    // Sanitize HTML to prevent XSS (you might want to use a library like DOMPurify)
    garden.customProfile = {
      enabled: enabled || false,
      html: html || '',
      css: css || ''
    };

    await garden.save();

    res.json({
      message: 'Custom profile updated successfully',
      customProfile: garden.customProfile
    });
  } catch (error) {
    console.error('Error updating custom profile:', error);
    res.status(500).json({ error: 'Error updating custom profile' });
  }
};

module.exports = {
  getAllGardens,
  getGardenById,
  createGarden,
  updateGarden,
  deleteGarden,
  getCurrentVisitors,
  updateGardenCustomProfile
};
