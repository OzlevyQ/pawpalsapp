const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, addFavorite, removeFavorite, getFavorites, requestPermission } = require('../controllers/userController');
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

// Permission request routes
router.post('/request-permission', auth, requestPermission);

// Handle permission request response (admin only)
router.post('/permission-response', auth, authorize('admin'), async (req, res) => {
  try {
    const { userId, requestType, action, reason } = req.body; // action: 'approve' or 'deny'
    
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or deny' });
    }
    
    if (!['garden_manager', 'event_organizer'].includes(requestType)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    const User = require('../models/User');
    const NotificationService = require('../utils/notificationService');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (action === 'approve') {
      // Grant the permission
      user.role = requestType;
      await user.save();

      // Send approval notification
      const roleTitle = requestType === 'garden_manager' ? 'Garden Manager' : 'Event Organizer';
      await NotificationService.createSystemNotification(
        userId,
        '✅ Permission Request Approved!',
        `Congratulations! Your request for ${roleTitle} permissions has been approved. You can now start managing ${requestType === 'garden_manager' ? 'dog parks' : 'events'}.${reason ? ` Admin note: ${reason}` : ''}`,
        {
          requestType,
          action: 'approved',
          roleGranted: requestType,
          approvedBy: req.userId,
          reason,
          actionUrl: '/profile'
        }
      );
    } else {
      // Send denial notification
      const roleTitle = requestType === 'garden_manager' ? 'Garden Manager' : 'Event Organizer';
      await NotificationService.createSystemNotification(
        userId,
        '❌ Permission Request Denied',
        `Your request for ${roleTitle} permissions has been denied.${reason ? ` Reason: ${reason}` : ''}`,
        {
          requestType,
          action: 'denied',
          deniedBy: req.userId,
          reason,
          actionUrl: '/request-permission' // Allow them to request again
        }
      );
    }

    console.log(`✅ Permission request ${action}d for user ${userId} (${requestType})`);
    
    res.json({
      success: true,
      message: `Permission request ${action}d successfully`,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Error handling permission request response:', error);
    res.status(500).json({ error: 'Failed to handle permission request' });
  }
});

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
    const NotificationService = require('../utils/notificationService');
    const { role, reason } = req.body;
    
    if (!['admin', 'garden_manager', 'event_organizer', 'dog_owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Get user before update to see what changed
    const oldUser = await User.findById(req.params.userId);
    if (!oldUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true }
    ).select('-password');

    // Send notification about role change if it's a permission grant
    if (oldUser.role !== role && ['garden_manager', 'event_organizer', 'admin'].includes(role)) {
      try {
        const roleTitle = role === 'garden_manager' ? 'Garden Manager' : 
                         role === 'event_organizer' ? 'Event Organizer' : 'Admin';
        
        await NotificationService.createSystemNotification(
          user._id,
          'Permission Granted!',
          `Your request for ${roleTitle} permissions has been approved!${reason ? ` Reason: ${reason}` : ''}`,
          {
            roleGranted: role,
            grantedBy: req.userId,
            reason,
            actionUrl: '/profile'
          }
        );
        
        console.log(`✅ Permission granted notification sent to user ${user._id} for role: ${role}`);
      } catch (notificationError) {
        console.error('Failed to send permission granted notification:', notificationError);
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
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
