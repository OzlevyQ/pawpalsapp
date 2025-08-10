const User = require('../models/User');
const { validationResult } = require('express-validator');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure gamification field exists
    if (!user.gamification) {
      user.gamification = {
        points: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastVisitDate: null,
        badges: [],
        achievements: []
      };
      await user.save();
    }

    res.json(user.toJSON());
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fields that can be updated
    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'profileImage',
      'location'
    ];

    // Update only allowed fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
};

const addFavorite = async (req, res) => {
  try {
    const { gardenId } = req.body;

    if (!gardenId) {
      return res.status(400).json({ error: 'Garden ID is required' });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if garden is already in favorites
    if (user.favorites.includes(gardenId)) {
      return res.status(400).json({ error: 'Garden is already in favorites' });
    }

    // Add to favorites
    user.favorites.push(gardenId);
    await user.save();

    res.json({
      message: 'Garden added to favorites',
      favorites: user.favorites
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Error adding favorite' });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { gardenId } = req.params;

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from favorites
    user.favorites = user.favorites.filter(id => id.toString() !== gardenId);
    await user.save();

    res.json({
      message: 'Garden removed from favorites',
      favorites: user.favorites
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Error removing favorite' });
  }
};

const getFavorites = async (req, res) => {
  try {
    // PERFORMANCE FIX: Add pagination to prevent loading thousands of favorites
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 favorites per page
    const skip = (page - 1) * limit;

    const user = await User.findById(req.userId).populate({
      path: 'favorites',
      options: { 
        limit: limit,
        skip: skip,
        sort: { createdAt: -1 } // Newest first
      },
      select: 'name location image type isActive' // Only essential fields
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get total count for pagination info
    const totalFavorites = user.favorites ? user.favorites.length : 0;
    
    res.json({
      message: 'Favorites retrieved successfully',
      favorites: user.favorites,
      pagination: {
        page,
        limit,
        total: totalFavorites,
        pages: Math.ceil(totalFavorites / limit)
      }
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Error getting favorites' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  addFavorite,
  removeFavorite,
  getFavorites
};
