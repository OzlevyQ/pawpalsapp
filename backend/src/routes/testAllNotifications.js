const express = require('express');
const router = express.Router();
const NotificationService = require('../utils/notificationService');
const SchedulerService = require('../services/SchedulerService');

// Import auth middleware
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Simple auth middleware for testing
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId || decoded.id;
    req.user = { id: req.userId };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Test all notification types at once
router.post('/test-all', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const results = [];

    console.log(`🚀 Testing all notification types for user ${userId}`);

    // 1. Test new message notification
    try {
      await NotificationService.createMessageNotification(
        'test-sender-123',
        userId,
        'test-chat-123',
        'This is a test message from our comprehensive notification test!'
      );
      results.push({ type: 'new_message', status: 'success' });
    } catch (error) {
      results.push({ type: 'new_message', status: 'failed', error: error.message });
    }

    // 2. Test friend request notification
    try {
      await NotificationService.createFriendRequestNotification(
        'test-requester-123',
        userId,
        'test-friendship-123'
      );
      results.push({ type: 'friend_request', status: 'success' });
    } catch (error) {
      results.push({ type: 'friend_request', status: 'failed', error: error.message });
    }

    // 3. Test friend request accepted notification
    try {
      await NotificationService.createFriendRequestResponseNotification(
        userId,
        'test-original-requester-123',
        'test-friendship-456',
        'accepted'
      );
      results.push({ type: 'friend_request_accepted', status: 'success' });
    } catch (error) {
      results.push({ type: 'friend_request_accepted', status: 'failed', error: error.message });
    }

    // 4. Test event registration notification
    try {
      await NotificationService.createEventRegistrationNotification(
        userId,
        'test-organizer-123',
        'test-event-123',
        'Test Dog Meetup Event'
      );
      results.push({ type: 'event_registration', status: 'success' });
    } catch (error) {
      results.push({ type: 'event_registration', status: 'failed', error: error.message });
    }

    // 5. Test event status update notification
    try {
      await NotificationService.createEventStatusUpdateNotification(
        userId,
        'test-event-123',
        'Test Dog Meetup Event',
        'approved',
        'Welcome to the event!'
      );
      results.push({ type: 'event_status_update', status: 'success' });
    } catch (error) {
      results.push({ type: 'event_status_update', status: 'failed', error: error.message });
    }

    // 6. Test event reminder notification
    try {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 1);
      
      await NotificationService.createEventReminderNotification(
        userId,
        'test-event-123',
        'Test Dog Meetup Event',
        eventDate
      );
      results.push({ type: 'event_reminder', status: 'success' });
    } catch (error) {
      results.push({ type: 'event_reminder', status: 'failed', error: error.message });
    }

    // 7. Test event cancellation notification
    try {
      await NotificationService.createEventCancellationNotification(
        userId,
        'test-event-123',
        'Test Dog Meetup Event'
      );
      results.push({ type: 'event_cancelled', status: 'success' });
    } catch (error) {
      results.push({ type: 'event_cancelled', status: 'failed', error: error.message });
    }

    // 8. Test garden update notification
    try {
      await NotificationService.createGardenUpdateNotification(
        userId,
        'test-garden-123',
        'Test Dog Park',
        'garden_info_updated',
        'Test Dog Park has been updated with new facilities!'
      );
      results.push({ type: 'garden_update', status: 'success' });
    } catch (error) {
      results.push({ type: 'garden_update', status: 'failed', error: error.message });
    }

    // 9. Test permission request notification
    try {
      await NotificationService.createPermissionRequestNotification(
        userId, // Admin receiving notification
        'test-requester-123',
        'garden_manager'
      );
      results.push({ type: 'permission_request', status: 'success' });
    } catch (error) {
      results.push({ type: 'permission_request', status: 'failed', error: error.message });
    }

    // 10. Test newsletter subscription notification
    try {
      await NotificationService.createNewsletterSubscriptionNotification(
        userId,
        'test-garden-123',
        'Test Dog Park'
      );
      results.push({ type: 'newsletter_subscription', status: 'success' });
    } catch (error) {
      results.push({ type: 'newsletter_subscription', status: 'failed', error: error.message });
    }

    // 11. Test newsletter content notification
    try {
      await NotificationService.createNewsletterContentNotification(
        userId,
        'test-garden-123',
        'Test Dog Park',
        'Weekly Newsletter - Test Edition',
        'This is a test newsletter content with important updates about the park!',
        'announcements'
      );
      results.push({ type: 'newsletter_content', status: 'success' });
    } catch (error) {
      results.push({ type: 'newsletter_content', status: 'failed', error: error.message });
    }

    // 12. Test dog check-in notification
    try {
      await NotificationService.createDogCheckinNotification(
        userId,
        'test-visit-123',
        'test-garden-123',
        'Test Dog Park',
        ['Buddy', 'Max', 'Luna']
      );
      results.push({ type: 'dog_checkin', status: 'success' });
    } catch (error) {
      results.push({ type: 'dog_checkin', status: 'failed', error: error.message });
    }

    // 13. Test visit reminder notification
    try {
      await NotificationService.createVisitReminderNotification(
        userId,
        'test-visit-123',
        'test-garden-123',
        'Test Dog Park',
        new Date()
      );
      results.push({ type: 'visit_reminder', status: 'success' });
    } catch (error) {
      results.push({ type: 'visit_reminder', status: 'failed', error: error.message });
    }

    // 14. Test system notification
    try {
      await NotificationService.createSystemNotification(
        userId,
        'System Test Notification',
        'This is a comprehensive system test notification for all notification types.',
        { testRun: true, timestamp: new Date().toISOString() }
      );
      results.push({ type: 'system', status: 'success' });
    } catch (error) {
      results.push({ type: 'system', status: 'failed', error: error.message });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    console.log(`✅ Notification test complete: ${successCount} successful, ${failCount} failed`);

    res.json({
      success: true,
      message: `Comprehensive notification test completed`,
      summary: {
        totalTests: results.length,
        successful: successCount,
        failed: failCount,
        successRate: `${((successCount / results.length) * 100).toFixed(1)}%`
      },
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in comprehensive notification test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete notification test',
      error: error.message
    });
  }
});

// Test WebSocket connectivity
router.post('/test-websocket-connection', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    // Try to get WebSocket service
    const webSocketService = require('../utils/websocketService');
    
    if (!webSocketService) {
      return res.json({
        success: false,
        message: 'WebSocket service not available',
        connected: false
      });
    }

    // Send a test notification to check WebSocket
    const testNotification = await NotificationService.createNotification(
      userId,
      'system',
      'WebSocket Connection Test',
      'Testing WebSocket real-time notification delivery',
      {
        testType: 'websocket_connection',
        timestamp: new Date().toISOString()
      },
      'high'
    );

    res.json({
      success: true,
      message: 'WebSocket test notification sent',
      notificationId: testNotification._id,
      websocketAvailable: true
    });

  } catch (error) {
    console.error('WebSocket test error:', error);
    res.status(500).json({
      success: false,
      message: 'WebSocket test failed',
      error: error.message,
      websocketAvailable: false
    });
  }
});

// Get notification statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    
    // Get notification counts by type
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get total counts
    const totalNotifications = await Notification.countDocuments();
    const totalUnread = await Notification.countDocuments({ isRead: false });

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        unread: totalUnread,
        byType: stats,
        readPercentage: totalNotifications > 0 
          ? ((totalNotifications - totalUnread) / totalNotifications * 100).toFixed(1)
          : '0.0'
      }
    });

  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
});

// Test manual trigger of event reminders
router.post('/test-event-reminders', authenticate, async (req, res) => {
  try {
    console.log('🚀 Manually testing event reminder scheduler...');
    
    const result = await SchedulerService.triggerEventReminders();
    
    res.json({
      success: true,
      message: 'Event reminder scheduler test completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in event reminder test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test event reminder scheduler',
      error: error.message
    });
  }
});

// Test manual trigger of visit reminders
router.post('/test-visit-reminders', authenticate, async (req, res) => {
  try {
    console.log('🚀 Manually testing visit reminder scheduler...');
    
    const result = await SchedulerService.triggerVisitReminders();
    
    res.json({
      success: true,
      message: 'Visit reminder scheduler test completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in visit reminder test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test visit reminder scheduler',
      error: error.message
    });
  }
});

// Test individual notification types
router.post('/test-garden-update', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    await NotificationService.createGardenUpdateNotification(
      userId,
      'test-garden-123',
      'Test Dog Park',
      'garden_maintenance',
      'Test Dog Park will be closed for maintenance tomorrow from 9 AM to 12 PM. Thank you for your understanding!'
    );

    res.json({
      success: true,
      message: 'Garden update notification test completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test garden update notification',
      error: error.message
    });
  }
});

router.post('/test-permission-request', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    await NotificationService.createPermissionRequestNotification(
      userId, // Admin receiving the request
      'test-requester-123',
      'event_organizer'
    );

    res.json({
      success: true,
      message: 'Permission request notification test completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test permission request notification',
      error: error.message
    });
  }
});

module.exports = router;