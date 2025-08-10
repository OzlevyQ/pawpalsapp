const Notification = require('../models/Notification');
const PushToken = require('../models/PushToken');
const PushNotificationService = require('../services/PushNotificationService');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user._id; // Fix: use _id instead of id

    const query = { user: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      // Remove populate for relatedUser as it doesn't exist in schema

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id; // Fix: use _id instead of id

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id; // Fix: use _id instead of id

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id; // Fix: use _id instead of id

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Delete all notifications
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      user: userId
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id; // Fix: use _id instead of id
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Create test notification (for development)
exports.createTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'system', title = 'בדיקת התראה 🚀', content = 'זו התראה לבדיקת המערכת! הכל עובד מצוין 🎉' } = req.body;

    const NotificationService = require('../utils/notificationService');
    
    console.log(`Creating test notification for user ${userId}`);
    
    // Use NotificationService to create notification (this will also send push notification)
    const notification = await NotificationService.createNotification(
      userId,
      type,
      title,
      content,
      { test: true, timestamp: new Date().toISOString() },
      'high' // High priority for test notifications
    );

    // Also send immediate push notification test
    const PushNotificationService = require('../services/PushNotificationService');
    const pushResult = await PushNotificationService.sendCustomNotification(
      userId,
      '🔔 בדיקת פוש מיידית',
      'אם אתה רואה את ההתראה הזו, המערכת עובדת!',
      { immediate: true, test: true }
    );

    console.log('Push notification result:', pushResult);

    res.json({
      success: true,
      message: 'Test notification created and sent',
      notification,
      pushResult,
      userTokensFound: pushResult.sent + pushResult.failed
    });
  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({ error: 'Failed to create test notification', details: error.message });
  }
};

// Create sample notifications for testing (development only)
exports.createSampleNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const sampleNotifications = [
      {
        type: 'event_reminder',
        title: 'אירוע חדש בגן',
        content: 'מפגש כלבים קטנים מחר ב-10:00 בגן כלבים מרכז. הצטרף למפגש הכלבים הקטנים שלנו מחר בשעה 10:00 בבוקר בגן כלבים מרכז. זה יהיה אירוע מיוחד עם פעילויות חברתיות, משחקים וכמובן הרבה כיף!',
        data: { eventId: 'test123', gardenId: 'garden123' },
      },
      {
        type: 'friend_request',
        title: 'חבר חדש',
        content: 'דני כהן רוצה להתחבר איתך. דני כהן, בעל הגולדן רטריבר מקס, שלח לך בקשת חברות. הוא גר בקרבתך ומעוניין להכיר כלבים חדשים לחברות.',
        data: { userId: 'user456', friendshipId: 'friendship789' },
      },
      {
        type: 'system',
        title: 'הישג חדש! 🏆',
        content: 'השגת רמה 3! קיבלת 50 נקודות בונוס. מזל טוב! עלית לרמה 3 באפליקציה שלנו. כחלק מהרמה החדשה, קיבלת 50 נקודות בונוס ופתחת תכונות חדשות כמו יכולת לארגן אירועים פרטיים.',
        data: { level: 3, points: 50 },
      },
      {
        type: 'visit_reminder',
        title: 'תזכורת: בדיקה וטרינרית',
        content: 'זכור לקבוע תור לבדיקה שנתית של מקס. הגיע הזמן לבדיקה שנתית של מקס! אנחנו ממליצים לקבוע תור אצל הווטרינר שלך לבדיקה כללית, חיסונים ובדיקת שיניים.',
        data: { dogId: 'dog789', reminder: true },
      },
      {
        type: 'garden_update',
        title: 'עדכון גן כלבים צפון',
        content: 'הגן נפתח מחדש אחרי שיפוצים משמעותיים! יש מתקני משחק חדשים, אזור אגיליטי מחודש ושיפורים באזור המנוחה לבעלים.',
        data: { gardenId: 'garden456', updateType: 'renovation' },
      }
    ];

    const createdNotifications = [];
    const NotificationService = require('../utils/notificationService');

    for (const notif of sampleNotifications) {
      // Use NotificationService to create notifications (this will also send push notifications)
      const created = await NotificationService.createNotification(
        userId,
        notif.type,
        notif.title,
        notif.content,
        notif.data,
        'medium'
      );
      
      // Randomly mark some as read for testing
      if (Math.random() > 0.7) { // 30% chance to be read
        created.isRead = true;
        created.readAt = new Date();
        await created.save();
      }
      
      createdNotifications.push(created);
    }

    res.json({
      success: true,
      message: `Created ${createdNotifications.length} sample notifications`,
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Create sample notifications error:', error);
    res.status(500).json({ error: 'Failed to create sample notifications' });
  }
};

// Update notification settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user._id; // Fix: use _id instead of id
    const settings = req.body;

    // This would typically update user preferences for notifications
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Notification settings updated',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
};

// Check push token status for user
exports.checkPushTokenStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const activeTokens = await PushToken.getActiveTokensForUser(userId);
    const allTokens = await PushToken.find({ user: userId }).sort({ createdAt: -1 });
    
    const status = {
      activeTokensCount: activeTokens.length,
      totalTokensCount: allTokens.length,
      activeTokens: activeTokens.map(token => ({
        id: token._id,
        token: token.token.substring(0, 20) + '...',
        platform: token.platform,
        deviceName: token.deviceName,
        isActive: token.isActive,
        isSimulator: token.token.startsWith('SimulatorToken['),
        lastUsed: token.lastUsed,
        createdAt: token.createdAt
      })),
      canReceivePush: activeTokens.filter(t => !t.token.startsWith('SimulatorToken[')).length > 0,
      hasSimulatorTokens: activeTokens.filter(t => t.token.startsWith('SimulatorToken[')).length > 0
    };
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Check push token status error:', error);
    res.status(500).json({ error: 'Failed to check push token status' });
  }
};

// Register push token
exports.registerPushToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { token, platform, deviceName, osVersion, appVersion } = req.body;

    console.log(`Registering push token for user ${userId}:`, {
      token: token ? `${token.substring(0, 20)}...` : 'NULL',
      platform,
      deviceName,
      osVersion,
      appVersion
    });

    if (!token || !platform) {
      return res.status(400).json({ 
        success: false,
        error: 'Token and platform are required' 
      });
    }

    const pushToken = await PushNotificationService.registerPushToken(userId, {
      token,
      platform,
      deviceName,
      osVersion,
      appVersion
    });

    console.log(`Push token registered successfully for user ${userId}, tokenId: ${pushToken._id}`);

    res.json({
      success: true,
      message: 'Push token registered successfully',
      tokenId: pushToken._id
    });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register push token' 
    });
  }
};

// Send test push notification
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;

    const result = await PushNotificationService.sendTestNotification(
      userId,
      message || 'Test notification from DogPark!'
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });
  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send test notification' 
    });
  }
};

// Mark multiple notifications as read
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds array is required'
      });
    }

    const result = await Notification.updateMany(
      { 
        _id: { $in: notificationIds },
        user: userId,
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark notifications as read' 
    });
  }
};

// Get push notification statistics (admin only)
exports.getPushStats = async (req, res) => {
  try {
    // Check if user is admin (you should implement this check)
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const stats = await PushNotificationService.getStatistics();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get push stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get push notification statistics' 
    });
  }
};
