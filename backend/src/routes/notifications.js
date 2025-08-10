const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark as read
router.put('/:notificationId/read', notificationController.markAsRead);

// Mark all as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

// Delete all notifications  
router.delete('/', notificationController.deleteAllNotifications);

// Update notification settings
router.put('/settings', notificationController.updateSettings);

// Push notification routes
router.post('/register-token', notificationController.registerPushToken);
router.get('/push-status', notificationController.checkPushTokenStatus);
router.put('/mark-read', notificationController.markNotificationsAsRead);

// Test notification (controlled via env flag or non-production)
if (process.env.ENABLE_TEST_NOTIFICATIONS === 'true' || process.env.NODE_ENV !== 'production') {
  router.post('/test', notificationController.createTestNotification);
  router.post('/test-push', notificationController.sendTestNotification);
  router.post('/create-samples', notificationController.createSampleNotifications);
}

// Admin routes
router.get('/stats', notificationController.getPushStats);

module.exports = router;
