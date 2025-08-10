const Dog = require('../models/Dog');
const Friendship = require('../models/Friendship');
const { validationResult } = require('express-validator');

const getMyDogs = async (req, res) => {
  try {
    const dogs = await Dog.find({ owner: req.userId, isActive: true })
      .sort('-createdAt');

    // Get owner's friends count
    const friends = await Friendship.getFriends(req.userId);
    const friendsCount = friends.length;

    // Calculate stats for each dog
    const dogsWithStats = await Promise.all(dogs.map(async (dog) => {
      const dogObj = dog.toObject();
      
      // Count visits for this dog
      try {
        const Visit = require('../models/Visit');
        const visitCount = await Visit.countDocuments({
          dogs: dog._id,
          status: { $in: ['active', 'completed'] }
        });
        dogObj.totalVisits = visitCount;
      } catch (error) {
        console.error('Error counting visits for dog:', error);
        dogObj.totalVisits = 0;
      }

      // Count photos for this dog
      try {
        const Photo = require('../models/Photo');
        const photoCount = await Photo.countDocuments({
          entityType: 'dog',
          entityId: dog._id,
          isActive: true
        });
        dogObj.photosCount = photoCount;
      } catch (error) {
        console.error('Error counting photos for dog:', error);
        dogObj.photosCount = 0;
      }

      dogObj.friendsCount = friendsCount;
      return dogObj;
    }));

    res.json({
      count: dogsWithStats.length,
      dogs: dogsWithStats
    });
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Error fetching dogs' });
  }
};

const getDogById = async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id).populate('owner', 'firstName lastName');

    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Check if user owns this dog
    if (dog.owner._id.toString() !== req.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to view this dog' });
    }

    res.json(dog);
  } catch (error) {
    console.error('Error fetching dog:', error);
    res.status(500).json({ error: 'Error fetching dog' });
  }
};

const createDog = async (req, res) => {
  try {
    console.log('Create dog request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const dogData = {
      ...req.body,
      owner: req.userId
    };

    console.log('Dog data to save:', JSON.stringify(dogData, null, 2));

    const dog = new Dog(dogData);
    await dog.save();

    res.status(201).json({
      message: 'Dog registered successfully',
      dog
    });
  } catch (error) {
    console.error('Error creating dog:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Error registering dog', details: error.message });
  }
};

const updateDog = async (req, res) => {
  try {
    console.log('Update dog request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const dog = await Dog.findById(req.params.id);

    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Check if user owns this dog
    if (dog.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to update this dog' });
    }

    console.log('Original dog data:', JSON.stringify(dog.toObject(), null, 2));

    // Update fields with proper handling of nested objects
    Object.keys(req.body).forEach(key => {
      if (key !== 'owner' && key !== '_id') {
        if (key === 'personality' && req.body[key]) {
          dog.personality = { ...dog.personality, ...req.body[key] };
        } else if (key === 'medicalInfo' && req.body[key]) {
          dog.medicalInfo = { ...dog.medicalInfo, ...req.body[key] };
        } else {
          dog[key] = req.body[key];
        }
      }
    });

    console.log('Updated dog data before save:', JSON.stringify(dog.toObject(), null, 2));

    await dog.save();

    res.json({
      message: 'Dog updated successfully',
      dog
    });
  } catch (error) {
    console.error('Error updating dog:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Error updating dog', details: error.message });
  }
};

const deleteDog = async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id);

    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Check if user owns this dog
    if (dog.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to delete this dog' });
    }

    // Soft delete
    dog.isActive = false;
    await dog.save();

    res.json({ message: 'Dog removed successfully' });
  } catch (error) {
    console.error('Error deleting dog:', error);
    res.status(500).json({ error: 'Error removing dog' });
  }
};

const getDogPublicProfile = async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id)
      .populate('owner', 'firstName lastName _id');

    if (!dog || !dog.isActive) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Check visibility settings
    if (dog.profileVisibility === 'private' && 
        (!req.userId || dog.owner._id.toString() !== req.userId.toString())) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    // Check if profile is friends-only and user is not a friend
    if (dog.profileVisibility === 'friends' && req.userId) {
      const isOwner = dog.owner._id.toString() === req.userId.toString();
      if (!isOwner) {
        const areFriends = await Friendship.areFriends(req.userId, dog.owner._id);
        if (!areFriends) {
          return res.status(403).json({ error: 'This profile is only visible to friends' });
        }
      }
    }

    // Return public info only if not the owner
    const isOwner = req.userId && dog.owner._id.toString() === req.userId.toString();
    
    if (!isOwner) {
      const publicProfile = {
        _id: dog._id,
        name: dog.name,
        breed: dog.breed,
        age: dog.age,
        size: dog.size,
        gender: dog.gender,
        weight: dog.weight,
        image: dog.image,
        images: dog.images,
        gallery: dog.gallery,
        description: dog.description,
        personality: dog.personality,
        medicalInfo: dog.medicalInfo,
        customProfile: dog.customProfile,
        owner: {
          _id: dog.owner._id,
          firstName: dog.owner.firstName,
          lastName: dog.owner.lastName
        }
      };
      return res.json(publicProfile);
    }

    res.json(dog);
  } catch (error) {
    console.error('Error fetching dog profile:', error);
    res.status(500).json({ error: 'Error fetching dog profile' });
  }
};

const updateDogCustomProfile = async (req, res) => {
  try {
    const dog = await Dog.findById(req.params.id);

    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }

    // Check if user owns this dog
    if (dog.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to update this dog' });
    }

    const { enabled, html, css, profileVisibility } = req.body;

    // Update custom profile
    if (html !== undefined || css !== undefined || enabled !== undefined) {
      dog.customProfile = {
        enabled: enabled !== undefined ? enabled : dog.customProfile.enabled,
        html: html !== undefined ? html : dog.customProfile.html,
        css: css !== undefined ? css : dog.customProfile.css
      };
    }

    // Update visibility
    if (profileVisibility) {
      dog.profileVisibility = profileVisibility;
    }

    await dog.save();

    res.json({
      message: 'Custom profile updated successfully',
      dog
    });
  } catch (error) {
    console.error('Error updating custom profile:', error);
    res.status(500).json({ error: 'Error updating custom profile' });
  }
};

module.exports = {
  getMyDogs,
  getDogById,
  createDog,
  updateDog,
  deleteDog,
  getDogPublicProfile,
  updateDogCustomProfile
};
