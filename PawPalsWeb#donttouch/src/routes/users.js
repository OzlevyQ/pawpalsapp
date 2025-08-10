const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, addFavorite, removeFavorite, getFavorites } = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');
const { userValidation } = require('../utils/validation');

// Get user profile
router.get('/profile', auth, getProfile);

// Update user profile
router.put('/profile', auth, userValidation.updateProfile, updateProfile);

// Change password
router.post('/change-password', auth, userValidation.changePassword, changePassword);

// Favorites routes
router.get('/favorites', auth, getFavorites);
router.post('/favorites', auth, addFavorite);
router.delete('/favorites/:gardenId', auth, removeFavorite);

// Admin routes
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/:userId/role', auth, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const { role } = req.body;
    
    if (!['admin', 'garden_manager', 'dog_owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

router.put('/:userId/status', auth, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const { status } = req.body;
    
    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
