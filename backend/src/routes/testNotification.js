const express = require('express');
const router = express.Router();
const NotificationService = require('../utils/notificationService');
const pushNotificationService = require('../services/PushNotificationService');

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

// Send test notification to authenticated user
router.post('/test', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { 
      type = 'new_message',
      title = 'Test Notification',
      body = 'This is a test notification from PawPals',
      data = {}
    } = req.body;

    console.log(`📱 Sending test notification to user ${userId}`);

    // Add default data for navigation testing
    const notificationData = {
      ...data,
      type,
      timestamp: new Date().toISOString(),
      testNotification: true
    };

    // Add type-specific data for navigation testing
    switch (type) {
      case 'new_message':
        notificationData.chatId = data.chatId || 'test-chat-123';
        notificationData.senderId = data.senderId || 'test-sender';
        notificationData.senderName = data.senderName || 'Test User';
        break;
      case 'friend_request':
        notificationData.targetId = data.targetId || 'test-user-456';
        notificationData.requesterName = data.requesterName || 'Test Friend';
        break;
      case 'event_reminder':
        notificationData.targetId = data.targetId || 'test-event-789';
        notificationData.eventName = data.eventName || 'Test Event';
        break;
      case 'dog_checkin':
        notificationData.visitId = data.visitId || 'test-visit-111';
        notificationData.gardenId = data.gardenId || 'test-garden-222';
        notificationData.gardenName = data.gardenName || 'Test Dog Park';
        notificationData.dogNames = data.dogNames || ['Buddy'];
        break;
      case 'visit_reminder':
        notificationData.visitId = data.visitId || 'test-visit-111';
        notificationData.gardenId = data.gardenId || 'test-garden-222';
        notificationData.gardenName = data.gardenName || 'Test Dog Park';
        break;
      case 'garden_update':
        notificationData.gardenId = data.gardenId || 'test-garden-222';
        notificationData.gardenName = data.gardenName || 'Test Dog Park';
        notificationData.updateType = data.updateType || 'garden_info_updated';
        break;
      case 'permission_request':
        notificationData.requesterId = data.requesterId || 'test-user-456';
        notificationData.requestType = data.requestType || 'garden_manager';
        break;
    }

    // Create notification in database
    const notification = await NotificationService.createNotification(
      userId,
      type,
      title,
      body,
      notificationData,
      'high' // High priority for test notifications
    );

    console.log('✅ Test notification created:', notification._id);

    // Try to send push notification
    const pushResult = await pushNotificationService.sendNotificationToUser(userId, {
      _id: notification._id,
      title,
      content: body,
      type,
      data: notificationData
    });

    console.log('📱 Push notification result:', pushResult);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        notificationId: notification._id,
        pushResult,
        type,
        title,
        body,
        data: notificationData
      }
    });

  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Send test notification to all authenticated user's devices
router.post('/test-all-devices', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { 
      title = 'Test All Devices',
      body = 'Testing notification on all your devices'
    } = req.body;

    console.log(`📱 Sending test notification to all devices of user ${userId}`);

    // Create a simple test notification
    const notification = await NotificationService.createNotification(
      userId,
      'system',
      title,
      body,
      {
        type: 'system',
        testAllDevices: true,
        timestamp: new Date().toISOString()
      },
      'high'
    );

    res.json({
      success: true,
      message: 'Test notification sent to all devices',
      data: {
        notificationId: notification._id,
        title,
        body
      }
    });

  } catch (error) {
    console.error('❌ Error sending test notification to all devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Test local notification (for development)
router.post('/test-local', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    console.log(`📱 Triggering local notification test for user ${userId}`);

    // This endpoint just returns data that the client can use to trigger a local notification
    res.json({
      success: true,
      message: 'Local notification data prepared',
      data: {
        trigger: 'local',
        notification: {
          title: 'Local Test Notification',
          body: 'This should trigger a local notification on your device',
          data: {
            type: 'new_message',
            chatId: 'local-test-chat',
            senderId: 'local-test-sender',
            testLocal: true
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error preparing local notification test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prepare local notification',
      error: error.message
    });
  }
});

// Test specific notification types
router.post('/test-dog-checkin', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { gardenName = 'Test Dog Park', dogNames = ['Buddy', 'Max'] } = req.body;

    await NotificationService.createDogCheckinNotification(
      userId,
      'test-visit-123',
      'test-garden-456', 
      gardenName,
      dogNames
    );

    res.json({
      success: true,
      message: 'Dog check-in notification sent successfully',
      type: 'dog_checkin'
    });
  } catch (error) {
    console.error('Error sending dog check-in test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

router.post('/test-visit-reminder', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { gardenName = 'Test Dog Park' } = req.body;

    await NotificationService.createVisitReminderNotification(
      userId,
      'test-visit-123',
      'test-garden-456',
      gardenName,
      new Date()
    );

    res.json({
      success: true,
      message: 'Visit reminder notification sent successfully',
      type: 'visit_reminder'
    });
  } catch (error) {
    console.error('Error sending visit reminder test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

router.post('/test-garden-update', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { gardenName = 'Test Dog Park' } = req.body;

    await NotificationService.createGardenUpdateNotification(
      userId,
      'test-garden-456',
      gardenName,
      'garden_info_updated',
      `${gardenName} has been updated. Check out the latest information!`
    );

    res.json({
      success: true,
      message: 'Garden update notification sent successfully',
      type: 'garden_update'
    });
  } catch (error) {
    console.error('Error sending garden update test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

router.post('/test-permission-request', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { requestType = 'garden_manager' } = req.body;

    await NotificationService.createPermissionRequestNotification(
      userId, // Admin receiving the notification
      'test-requester-123', // User requesting permission
      requestType
    );

    res.json({
      success: true,
      message: 'Permission request notification sent successfully',
      type: 'permission_request'
    });
  } catch (error) {
    console.error('Error sending permission request test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

router.post('/test-event-reminder', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { eventTitle = 'Test Event' } = req.body;

    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 1); // Tomorrow

    await NotificationService.createEventReminderNotification(
      userId,
      'test-event-123',
      eventTitle,
      eventDate
    );

    res.json({
      success: true,
      message: 'Event reminder notification sent successfully',
      type: 'event_reminder'
    });
  } catch (error) {
    console.error('Error sending event reminder test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

// Test scheduler functionality
router.post('/trigger-event-reminders', authenticate, async (req, res) => {
  try {
    const SchedulerService = require('../services/SchedulerService');
    const result = await SchedulerService.triggerEventReminders();
    
    res.json({
      success: true,
      message: 'Event reminders triggered manually',
      result
    });
  } catch (error) {
    console.error('Error triggering event reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger event reminders',
      error: error.message
    });
  }
});

router.post('/trigger-visit-reminders', authenticate, async (req, res) => {
  try {
    const SchedulerService = require('../services/SchedulerService');
    const result = await SchedulerService.triggerVisitReminders();
    
    res.json({
      success: true,
      message: 'Visit reminders triggered manually',
      result
    });
  } catch (error) {
    console.error('Error triggering visit reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger visit reminders',
      error: error.message
    });
  }
});

// Test message notification (simulates real message creation)
router.post('/test-message', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { 
      recipientId = 'test-recipient-123',
      chatId = 'test-chat-456',
      messageText = 'This is a test message for notification testing'
    } = req.body;

    console.log(`💬 Testing message notification creation:`);
    console.log(`- Sender: ${userId}`);
    console.log(`- Recipient: ${recipientId}`);
    console.log(`- Chat: ${chatId}`);
    console.log(`- Message: ${messageText}`);

    // Create message notification using the same function as real messages
    const notification = await NotificationService.createMessageNotification(
      userId,
      recipientId,
      chatId, 
      messageText
    );

    res.json({
      success: true,
      message: 'Test message notification created successfully',
      data: {
        notificationId: notification?._id,
        senderId: userId,
        recipientId,
        chatId,
        messageText
      }
    });

  } catch (error) {
    console.error('❌ Error creating test message notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test message notification',
      error: error.message
    });
  }
});

// Test friend request notification (simulates real friend request)
router.post('/test-friend-request', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { 
      recipientId = userId, // Send to self for testing
      friendshipId = 'test-friendship-' + Date.now()
    } = req.body;

    console.log(`👥 Testing friend request notification creation:`);
    console.log(`- From: ${userId}`);
    console.log(`- To: ${recipientId}`);
    console.log(`- Friendship ID: ${friendshipId}`);

    // Create friend request notification using the same function as real requests
    const notification = await NotificationService.createFriendRequestNotification(
      userId, // requester
      recipientId, // recipient  
      friendshipId
    );

    res.json({
      success: true,
      message: 'Test friend request notification created successfully',
      data: {
        notificationId: notification?._id,
        requesterId: userId,
        recipientId,
        friendshipId
      }
    });

  } catch (error) {
    console.error('❌ Error creating test friend request notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test friend request notification',
      error: error.message
    });
  }
});

// Test friend request acceptance notification
router.post('/test-friend-accepted', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { 
      requesterId = userId, // Who originally requested (now receiving acceptance notification)
      friendshipId = 'test-friendship-' + Date.now()
    } = req.body;

    console.log(`✅ Testing friend request acceptance notification:`);
    console.log(`- Responder (accepter): ${userId}`);
    console.log(`- Original requester: ${requesterId}`);
    console.log(`- Friendship ID: ${friendshipId}`);

    // Create friend request response notification (accepted)
    const notification = await NotificationService.createFriendRequestResponseNotification(
      userId, // responder (who accepted)
      requesterId, // original requester (who gets this notification)
      friendshipId,
      'accepted'
    );

    res.json({
      success: true,
      message: 'Test friend request acceptance notification created successfully',
      data: {
        notificationId: notification?._id,
        responderId: userId,
        requesterId,
        friendshipId,
        status: 'accepted'
      }
    });

  } catch (error) {
    console.error('❌ Error creating test friend acceptance notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test friend acceptance notification',
      error: error.message
    });
  }
});

// Check push token status for authenticated user
router.get('/push-token-status', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    
    console.log(`📊 Checking push token status for user: ${userId}`);
    
    const PushToken = require('../models/PushToken');
    const webSocketService = require('../utils/websocketService');
    
    // Get active tokens
    const tokens = await PushToken.getActiveTokensForUser(userId);
    
    // Check WebSocket connection
    const isWebSocketConnected = webSocketService.isUserConnected(userId);
    const wsStats = webSocketService.getConnectionStats();
    
    // Check all tokens for this user (including inactive)
    const allTokens = await PushToken.find({ user: userId })
      .select('token platform deviceName isActive isSimulator createdAt lastUsed')
      .sort({ createdAt: -1 });
    
    const response = {
      success: true,
      data: {
        userId,
        webSocket: {
          connected: isWebSocketConnected,
          stats: wsStats
        },
        pushTokens: {
          active: tokens.length,
          total: allTokens.length,
          tokens: allTokens.map(token => ({
            id: token._id,
            platform: token.platform,
            device: token.deviceName,
            isActive: token.isActive,
            isSimulator: token.isSimulator,
            tokenPreview: token.token.substring(0, 30) + '...',
            createdAt: token.createdAt,
            lastUsed: token.lastUsed
          }))
        },
        canReceiveNotifications: {
          webSocket: isWebSocketConnected,
          pushNotification: tokens.length > 0,
          overall: isWebSocketConnected || tokens.length > 0
        }
      }
    };
    
    console.log('✅ Push token status retrieved:', {
      activeTokens: tokens.length,
      totalTokens: allTokens.length,
      webSocketConnected: isWebSocketConnected
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error checking push token status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check push token status',
      error: error.message
    });
  }
});

module.exports = router;