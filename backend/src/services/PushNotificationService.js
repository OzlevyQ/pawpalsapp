const { Expo } = require('expo-server-sdk');
const PushToken = require('../models/PushToken');

class PushNotificationService {
  constructor() {
    this.expo = new Expo();
  }

  /**
   * Register a push token for a user
   */
  async registerPushToken(userId, tokenData) {
    try {
      // Check if it's a simulator token
      const isSimulatorToken = tokenData.token.startsWith('SimulatorToken[');
      
      // Validate Expo push token (skip validation for simulator tokens)
      if (!isSimulatorToken && !Expo.isExpoPushToken(tokenData.token)) {
        throw new Error('Invalid Expo push token');
      }

      // Mark simulator tokens differently
      if (isSimulatorToken) {
        console.log(`Registering simulator token for user ${userId}: ${tokenData.token}`);
        tokenData.isSimulator = true;
      }

      const pushToken = await PushToken.registerToken(userId, tokenData);
      console.log(`Push token registered for user ${userId}: ${tokenData.token}`);
      return pushToken;
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendNotificationToUser(userId, notification) {
    try {
      const tokens = await PushToken.getActiveTokensForUser(userId);
      if (tokens.length === 0) {
        console.log(`No active push tokens found for user ${userId}`);
        return { sent: 0, failed: 0 };
      }

      // Separate real tokens from simulator tokens
      const realTokens = tokens.filter(t => !t.token.startsWith('SimulatorToken['));
      const simulatorTokens = tokens.filter(t => t.token.startsWith('SimulatorToken['));

      let results = { sent: 0, failed: 0 };

      // Send to real devices
      if (realTokens.length > 0) {
        const messages = realTokens.map(tokenDoc => ({
          to: tokenDoc.token,
          sound: 'default',
          title: notification.title,
          body: notification.content,
          data: {
            notificationId: notification._id.toString(),
            type: notification.type,
            ...notification.data
          },
          channelId: this.getChannelIdForType(notification.type),
        }));

        const realResults = await this.sendPushNotifications(messages);
        results.sent += realResults.sent;
        results.failed += realResults.failed;
      }

      // For simulator tokens, just log (they will use local notifications)
      if (simulatorTokens.length > 0) {
        console.log(`\n📦 SIMULATOR TOKENS DETECTED`);
        console.log(`   Count: ${simulatorTokens.length}`);
        console.log(`   Notification: "${notification.title}"`);
        console.log(`   → Simulator will receive notifications via WebSocket/Local instead`);
        simulatorTokens.forEach((token, index) => {
          console.log(`   ${index + 1}. ${token.token}`);
        });
        console.log(`\n`);
        // Count simulators as "sent" since they'll receive local notifications
        results.sent += simulatorTokens.length;
      }

      return results;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return { sent: 0, failed: 1, error: error.message };
    }
  }

  /**
   * Send push notifications to multiple users
   */
  async sendNotificationToUsers(userIds, notification) {
    try {
      const results = await Promise.all(
        userIds.map(userId => this.sendNotificationToUser(userId, notification))
      );

      const summary = results.reduce((acc, result) => ({
        sent: acc.sent + result.sent,
        failed: acc.failed + result.failed
      }), { sent: 0, failed: 0 });

      console.log(`Bulk notification sent - Sent: ${summary.sent}, Failed: ${summary.failed}`);
      return summary;
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification with raw message data
   */
  async sendCustomNotification(userId, title, body, data = {}) {
    try {
      const tokens = await PushToken.getActiveTokensForUser(userId);
      if (tokens.length === 0) {
        console.log(`No active push tokens found for user ${userId}`);
        return { sent: 0, failed: 0 };
      }

      const messages = tokens.map(tokenDoc => ({
        to: tokenDoc.token,
        sound: 'default',
        title,
        body,
        data,
        channelId: this.getChannelIdForType(data.type),
      }));

      return await this.sendPushNotifications(messages);
    } catch (error) {
      console.error('Error sending custom notification:', error);
      return { sent: 0, failed: 1, error: error.message };
    }
  }

  /**
   * Send scheduled notification (for future use)
   */
  async scheduleNotification(userId, notification, scheduledFor) {
    // This would typically use a job queue like Bull or Agenda
    // For now, we'll just log it
    console.log(`Scheduled notification for user ${userId} at ${scheduledFor}:`, notification.title);
    
    // You could implement this with setTimeout for simple cases:
    const delay = new Date(scheduledFor).getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.sendNotificationToUser(userId, notification);
      }, delay);
    }
  }

  /**
   * Send the actual push notifications using Expo
   */
  async sendPushNotifications(messages) {
    try {
      // Filter out invalid tokens
      const validMessages = messages.filter(message => 
        Expo.isExpoPushToken(message.to)
      );

      if (validMessages.length === 0) {
        return { sent: 0, failed: 0 };
      }

      // Split messages into chunks (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(validMessages);
      const results = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          results.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
          // Add failed results for this chunk
          results.push(...chunk.map(() => ({ status: 'error', message: error.message })));
        }
      }

      // Process results and handle errors
      const failedTokens = [];
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < results.length; i++) {
        const ticket = results[i];
        if (ticket.status === 'error') {
          failed++;
          console.error(`Push notification error:`, ticket.message);
          
          // If token is invalid, mark it as inactive
          if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            const token = validMessages[i]?.to;
            if (token) {
              failedTokens.push(token);
            }
          }
        } else {
          sent++;
        }
      }

      // Deactivate failed tokens
      if (failedTokens.length > 0) {
        await Promise.all(failedTokens.map(token => 
          PushToken.deactivateToken(token)
        ));
        console.log(`Deactivated ${failedTokens.length} invalid push tokens`);
      }

      return { sent, failed, results };
    } catch (error) {
      console.error('Error in sendPushNotifications:', error);
      return { sent: 0, failed: messages.length, error: error.message };
    }
  }

  /**
   * Get notification channel ID based on type
   */
  getChannelIdForType(type) {
    switch (type) {
      case 'visit_reminder':
      case 'check_in_alert':
      case 'dog_checkin':
        return 'visits';
      case 'event_reminder':
      case 'event_registration':
      case 'event_status_update':
      case 'event_cancelled':
        return 'events';
      case 'friend_request':
      case 'friend_request_accepted':
      case 'friend_request_declined':
      case 'new_message':
        return 'social';
      case 'system':
      case 'garden_update':
      case 'newsletter_content':
      case 'permission_request':
        return 'default';
      default:
        return 'default';
    }
  }

  /**
   * Test notification for development
   */
  async sendTestNotification(userId, message = 'Test notification from DogPark app!') {
    return await this.sendCustomNotification(
      userId,
      'Test Notification',
      message,
      { type: 'system', test: true }
    );
  }

  /**
   * Clean up old push tokens
   */
  async cleanupOldTokens() {
    try {
      const result = await PushToken.cleanupOldTokens();
      console.log(`Cleaned up ${result.deletedCount} old push tokens`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old push tokens:', error);
      throw error;
    }
  }

  /**
   * Get push notification statistics
   */
  async getStatistics() {
    try {
      const totalTokens = await PushToken.countDocuments();
      const activeTokens = await PushToken.countDocuments({ isActive: true });
      const tokensByPlatform = await PushToken.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$platform', count: { $sum: 1 } } }
      ]);

      return {
        totalTokens,
        activeTokens,
        inactiveTokens: totalTokens - activeTokens,
        tokensByPlatform: tokensByPlatform.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting push notification statistics:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new PushNotificationService();