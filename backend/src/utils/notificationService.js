const Notification = require('../models/Notification');
const User = require('../models/User');
const PushNotificationService = require('../services/PushNotificationService');

class NotificationService {
  constructor() {
    this.webSocketService = null;
  }

  // Set WebSocket service reference
  setWebSocketService(wsService) {
    this.webSocketService = wsService;
  }

  // Create new notification
  static async createNotification(userId, type, title, content, data = {}, priority = 'medium') {
    try {
      console.log('\n===============================================');
      console.log(`📝 Creating notification in DB`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Type: ${type}`);
      console.log(`   Title: ${title}`);
      console.log(`   Content: ${content}`);
      console.log(`   Data:`, JSON.stringify(data, null, 2));
      console.log('===============================================');
      
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        content,
        data,
        priority,
        actionUrl: data.actionUrl
      });

      console.log(`💾 Notification saved to DB with ID: ${notification._id}`);

      // Send real-time notification via WebSocket
      const webSocketService = require('./websocketService');
      if (webSocketService) {
        console.log(`🔌 Attempting to send via WebSocket to user ${userId}...`);
        const sent = webSocketService.sendNotificationToUser(userId, notification);
        console.log(`🔌 WebSocket result for user ${userId}: ${sent ? '✅ SUCCESS' : '❌ FAILED (user may not be connected)'}`);
      } else {
        console.log(`❌ WebSocket service not available`);
      }

      // Send push notification
      try {
        console.log(`📱 Attempting to send push notification to user ${userId}...`);
        const pushResult = await PushNotificationService.sendNotificationToUser(userId, notification);
        console.log(`📱 Push notification result for user ${userId}:`);
        console.log(`   Sent: ${pushResult.sent || 0}`);
        console.log(`   Failed: ${pushResult.failed || 0}`);
        if (pushResult.error) {
          console.log(`   Error: ${pushResult.error}`);
        }
        
        if (pushResult.sent > 0) {
          console.log(`✅ Push notification sent successfully to ${pushResult.sent} device(s)`);
        } else if (pushResult.failed === 0 && pushResult.sent === 0) {
          console.log(`⚠️ No active push tokens found for user ${userId}`);
        } else {
          console.log(`❌ Push notification failed for user ${userId}`);
        }
      } catch (pushError) {
        console.error('❌ Push notification error:', pushError.message || pushError);
        // Don't fail the whole operation if push fails
      }
      
      console.log(`✅ Notification process completed for user ${userId}`);
      console.log('===============================================\n');
      return notification;
    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      throw error;
    }
  }

  // New message notification
  static async createMessageNotification(senderId, recipientId, chatId, messageText) {
    try {
      console.log(`🔔 Creating message notification - Sender: ${senderId}, Recipient: ${recipientId}, Chat: ${chatId}`);
      
      const sender = await User.findById(senderId).select('firstName lastName');
      if (!sender) {
        console.error(`❌ Sender not found: ${senderId}`);
        return;
      }

      console.log(`👤 Sender found: ${sender.firstName} ${sender.lastName}`);
      const truncatedMessage = messageText?.substring(0, 50) + (messageText?.length > 50 ? '...' : '');
      
      const notification = await this.createNotification(
        recipientId,
        'new_message',
        'New Message',
        `${sender.firstName} ${sender.lastName} sent you a message: ${truncatedMessage}`,
        {
          chatId,
          senderId,
          senderName: `${sender.firstName} ${sender.lastName}`,
          actionUrl: `/chat/${chatId}`
        }
      );
      
      console.log(`✅ Message notification created successfully for recipient ${recipientId}:`, notification._id);
      return notification;
    } catch (error) {
      console.error('❌ Failed to create message notification:', error);
      throw error;
    }
  }

  // Friend request notification
  static async createFriendRequestNotification(requesterId, recipientId, friendshipId) {
    try {
      const requester = await User.findById(requesterId).select('firstName lastName');
      if (!requester) return;

      return await this.createNotification(
        recipientId,
        'friend_request',
        'New Friend Request',
        `${requester.firstName} ${requester.lastName} sent you a friend request`,
        {
          relatedUser: requesterId,
          relatedModel: 'Friendship',
          relatedId: friendshipId,
          actionUrl: `/friends/requests`
        }
      );
    } catch (error) {
      console.error('Failed to create friend request notification:', error);
    }
  }

  // Friend request response notification
  static async createFriendRequestResponseNotification(responderId, requesterId, friendshipId, status) {
    try {
      const responder = await User.findById(responderId).select('firstName lastName');
      if (!responder) return;

      const isAccepted = status === 'accepted';
      const title = isAccepted ? 'Friend Request Accepted' : 'Friend Request Declined';
      const content = isAccepted 
        ? `${responder.firstName} ${responder.lastName} accepted your friend request`
        : `${responder.firstName} ${responder.lastName} declined your friend request`;

      return await this.createNotification(
        requesterId,
        isAccepted ? 'friend_request_accepted' : 'friend_request_declined',
        title,
        content,
        {
          relatedUser: responderId,
          relatedModel: 'Friendship',
          relatedId: friendshipId,
          actionUrl: isAccepted ? `/friends` : null
        }
      );
    } catch (error) {
      console.error('Failed to create friend request response notification:', error);
    }
  }

  // Event registration notification
  static async createEventRegistrationNotification(participantId, organizerId, eventId, eventTitle) {
    try {
      const participant = await User.findById(participantId).select('firstName lastName');
      if (!participant) return;

      return await this.createNotification(
        organizerId,
        'event_registration',
        'New Event Registration',
        `${participant.firstName} ${participant.lastName} registered for your event "${eventTitle}"`,
        {
          eventId,
          participantId,
          eventTitle,
          actionUrl: `/events/${eventId}/manage`
        }
      );
    } catch (error) {
      console.error('Failed to create event registration notification:', error);
    }
  }

  // Event status update notification  
  static async createEventStatusUpdateNotification(participantId, eventId, eventTitle, status, notes) {
    try {
      const isApproved = status === 'approved';
      const title = isApproved ? 'Event Registration Approved' : 'Event Registration Declined';
      const content = isApproved 
        ? `Your registration for "${eventTitle}" has been approved`
        : `Your registration for "${eventTitle}" has been declined`;

      return await this.createNotification(
        participantId,
        'event_status_update',
        title,
        content + (notes ? `. Note: ${notes}` : ''),
        {
          eventId,
          eventTitle,
          status,
          notes,
          actionUrl: `/events/${eventId}`
        },
        isApproved ? 'medium' : 'high'
      );
    } catch (error) {
      console.error('Failed to create event status update notification:', error);
    }
  }

  // Event reminder notification
  static async createEventReminderNotification(participantId, eventId, eventTitle, eventDate) {
    try {
      return await this.createNotification(
        participantId,
        'event_reminder',
        'Event Reminder',
        `Reminder: "${eventTitle}" is starting tomorrow`,
        {
          eventId,
          eventTitle,
          eventDate,
          actionUrl: `/events/${eventId}`
        },
        'high'
      );
    } catch (error) {
      console.error('Failed to create event reminder notification:', error);
    }
  }

  // Event cancellation notification
  static async createEventCancellationNotification(participantId, eventId, eventTitle) {
    try {
      return await this.createNotification(
        participantId,
        'event_cancelled',
        'Event Cancelled',
        `The event "${eventTitle}" has been cancelled`,
        {
          eventId,
          eventTitle,
          actionUrl: `/events`
        },
        'urgent'
      );
    } catch (error) {
      console.error('Failed to create event cancellation notification:', error);
    }
  }

  // Garden update notification
  static async createGardenUpdateNotification(userId, gardenId, gardenName, updateType, content) {
    try {
      return await this.createNotification(
        userId,
        'garden_update',
        `Update for ${gardenName}`,
        content,
        {
          gardenId,
          gardenName,
          updateType,
          actionUrl: `/gardens/${gardenId}`
        }
      );
    } catch (error) {
      console.error('Failed to create garden update notification:', error);
    }
  }

  // Permission request notification for admin
  static async createPermissionRequestNotification(adminId, requesterId, requestType) {
    try {
      const requester = await User.findById(requesterId).select('firstName lastName');
      if (!requester) return;

      const typeText = requestType === 'garden_manager' ? 'garden manager' : 'event organizer';
      
      return await this.createNotification(
        adminId,
        'permission_request',
        'New Permission Request',
        `${requester.firstName} ${requester.lastName} has requested ${typeText} permissions`,
        {
          requesterId,
          requestType,
          actionUrl: `/admin/requests`
        },
        'high'
      );
    } catch (error) {
      console.error('Failed to create permission request notification:', error);
    }
  }

  // System notification
  static async createSystemNotification(userId, title, content, data = {}) {
    try {
      return await this.createNotification(
        userId,
        'system',
        title,
        content,
        data,
        'medium'
      );
    } catch (error) {
      console.error('Failed to create system notification:', error);
    }
  }

  // Newsletter subscription notification
  static async createNewsletterSubscriptionNotification(userId, gardenId, gardenName) {
    try {
      return await this.createNotification(
        userId,
        'newsletter_subscription',
        '🔔 Newsletter Subscription Confirmed',
        `You have successfully subscribed to "${gardenName}" newsletter`,
        {
          gardenId,
          gardenName,
          icon: '🔔',
          actionUrl: `/gardens/${gardenId}`
        }
      );
    } catch (error) {
      console.error('Failed to create newsletter subscription notification:', error);
    }
  }

  // Dog check-in notification
  static async createDogCheckinNotification(userId, visitId, gardenId, gardenName, dogNames) {
    try {
      const dogsText = dogNames.length === 1 
        ? dogNames[0] 
        : `${dogNames.slice(0, -1).join(', ')} and ${dogNames[dogNames.length - 1]}`;
      
      return await this.createNotification(
        userId,
        'dog_checkin',
        'Successful Check-in!',
        `${dogsText} checked in successfully at ${gardenName}`,
        {
          visitId,
          gardenId,
          gardenName,
          dogNames,
          actionUrl: `/visits/${visitId}`
        },
        'medium'
      );
    } catch (error) {
      console.error('Failed to create dog check-in notification:', error);
    }
  }

  // Visit reminder notification
  static async createVisitReminderNotification(userId, visitId, gardenId, gardenName, reminderTime) {
    try {
      return await this.createNotification(
        userId,
        'visit_reminder',
        'Visit Reminder',
        `Don't forget to check out from ${gardenName}`,
        {
          visitId,
          gardenId,
          gardenName,
          reminderTime,
          actionUrl: `/visits/${visitId}`
        },
        'high'
      );
    } catch (error) {
      console.error('Failed to create visit reminder notification:', error);
    }
  }

  // Newsletter content notification with email type support
  static async createNewsletterContentNotification(userId, gardenId, gardenName, subject, fullContent, emailType = 'announcements') {
    try {
      // Define email type specific icons for priority
      const emailTypeConfig = {
        events: {
          icon: '📅',
          priority: 'high'
        },
        promotions: {
          icon: '🎉',
          priority: 'medium'
        },
        announcements: {
          icon: '📢',
          priority: 'medium'
        },
        maintenance: {
          icon: '🔧',
          priority: 'high'
        }
      };

      const config = emailTypeConfig[emailType] || emailTypeConfig.announcements;
      
      return await this.createNotification(
        userId,
        'newsletter_content',
        subject, // Use the subject as the notification title
        fullContent, // Use the full content as the notification content
        {
          gardenId,
          gardenName,
          subject,
          emailType,
          icon: config.icon,
          fullContent,
          // No actionUrl - clicking will show full content instead of redirecting
        },
        config.priority
      );
    } catch (error) {
      console.error('Failed to create newsletter content notification:', error);
    }
  }

  // Broadcast system notifications to all users
  static async broadcastSystemNotification(title, content, data = {}) {
    try {
      const users = await User.find({ status: 'active' }).select('_id');
      const notifications = users.map(user => ({
        user: user._id,
        type: 'system',
        title,
        content,
        data,
        priority: 'medium'
      }));

      await Notification.insertMany(notifications);
      console.log(`Broadcast notification sent to ${users.length} users`);
    } catch (error) {
      console.error('Failed to broadcast system notification:', error);
    }
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
    }
  }
}

module.exports = NotificationService; 