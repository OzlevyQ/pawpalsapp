const express = require('express');
const router = express.Router();
const { register, login, logout, googleAuth } = require('../controllers/authController');
const { authValidation } = require('../utils/validation');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Register new user
router.post('/register', authValidation.register, register);

// Login user
router.post('/login', authValidation.login, login);

// Logout user
router.post('/logout', logout);

// Google OAuth authentication
router.post('/google', googleAuth);

// TEMPORARY: Make current user admin (for development only)
router.post('/make-admin', auth, async (req, res) => {
  try {
    console.log('Making user admin:', req.user.email);
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { role: 'admin' },
      { new: true }
    ).select('-password');
    
    console.log('User updated to admin:', user.email, user.role);
    
    res.json({
      message: 'User role updated to admin',
      user
    });
  } catch (error) {
    console.error('Error making user admin:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;
