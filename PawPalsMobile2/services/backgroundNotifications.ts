import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleNotificationNavigation } from './notificationNavigation';

// Task name for background notifications
export const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

// Define the background notification task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
  console.log('🔔 Background notification task triggered:', {
    data,
    error: error?.message,
    executionInfo
  });

  if (error) {
    console.error('❌ Background notification task error:', error);
    return;
  }

  if (data) {
    handleBackgroundNotification(data);
  }
});

/**
 * Handle notifications when app is in background or killed state
 */
const handleBackgroundNotification = async (data: any) => {
  try {
    console.log('📱 Handling background notification:', data);

    // Extract notification data
    const notificationData = extractNotificationData(data);
    
    if (!notificationData) {
      console.warn('⚠️ No valid notification data in background task');
      return;
    }

    // Perform necessary background work
    await performBackgroundWork(notificationData);

    // If the notification requires immediate action when app becomes active,
    // store it for later handling
    await storeNotificationForLaterHandling(notificationData);

    console.log('✅ Background notification handled successfully');

  } catch (error) {
    console.error('❌ Error handling background notification:', error);
  }
};

/**
 * Extract notification data from background task data
 */
const extractNotificationData = (data: any): any | null => {
  try {
    // Handle different data formats that might come from background tasks
    if (data.notification) {
      return data.notification;
    } else if (data.body) {
      return data;
    } else if (typeof data === 'string') {
      return JSON.parse(data);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error extracting notification data:', error);
    return null;
  }
};

/**
 * Perform background work when notification is received
 */
const performBackgroundWork = async (notificationData: any) => {
  try {
    console.log('🔧 Performing background work for:', notificationData.type);

    // Based on notification type, perform necessary background actions
    switch (notificationData.type) {
      case 'chat_message':
        // Update chat badge count or sync latest messages
        await updateChatBadgeCount();
        break;
        
      case 'friend_request':
        // Update friend requests count
        await updateFriendRequestsCount();
        break;
        
      case 'event_reminder':
        // Schedule local reminder if needed
        await scheduleEventReminder(notificationData);
        break;
        
      case 'activity_summary':
        // Sync activity data in background
        await syncActivityData();
        break;
        
      default:
        console.log('ℹ️ No specific background work for notification type:', notificationData.type);
    }
    
  } catch (error) {
    console.error('❌ Error performing background work:', error);
  }
};

/**
 * Store notification for handling when app becomes active
 */
const storeNotificationForLaterHandling = async (notificationData: any) => {
  try {
    // Store the notification data for when the app becomes active
    // This is useful for navigation that can't be performed in background
    
    const pendingNotifications = await getPendingNotifications();
    pendingNotifications.push({
      ...notificationData,
      receivedAt: Date.now(),
      handled: false
    });
    
    await storePendingNotifications(pendingNotifications);
    
    console.log('💾 Notification stored for later handling');
    
  } catch (error) {
    console.error('❌ Error storing notification for later:', error);
  }
};

/**
 * Handle pending notifications when app becomes active
 */
export const handlePendingNotifications = async () => {
  try {
    console.log('🔄 Checking for pending notifications...');
    
    const pendingNotifications = await getPendingNotifications();
    const unhandledNotifications = pendingNotifications.filter(n => !n.handled);
    
    if (unhandledNotifications.length === 0) {
      console.log('✅ No pending notifications to handle');
      return;
    }
    
    console.log(`📱 Found ${unhandledNotifications.length} pending notifications`);
    
    // Handle each pending notification
    for (const notification of unhandledNotifications) {
      try {
        // Perform navigation for the notification
        await handleNotificationNavigation(notification, true);
        
        // Mark as handled
        notification.handled = true;
        
        console.log('✅ Pending notification handled:', notification.type);
        
      } catch (error) {
        console.error('❌ Error handling pending notification:', error);
      }
    }
    
    // Update stored notifications
    await storePendingNotifications(pendingNotifications);
    
    // Clean up old notifications (older than 1 hour)
    await cleanupOldNotifications();
    
  } catch (error) {
    console.error('❌ Error handling pending notifications:', error);
  }
};

/**
 * Register background notification task
 */
export const registerBackgroundNotificationTask = async (): Promise<boolean> => {
  try {
    console.log('📝 Registering background notification task...');
    
    // Check if we're in Expo Go
    const isExpoGo = !!(global as any).expo;
    if (isExpoGo) {
      console.log('⚠️ Running in Expo Go - background tasks are not supported');
      console.log('💡 Using fallback notification handling instead');
      return false;
    }
    
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    
    if (isRegistered) {
      console.log('✅ Background notification task already registered');
      return true;
    }
    
    // Register background notification task
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    
    console.log('✅ Background notification task registered successfully');
    return true;
    
  } catch (error: any) {
    // Handle specific Expo Go error gracefully
    if (error.message?.includes('Background') || error.message?.includes('TaskManager')) {
      console.log('📦 Background tasks not available in current environment');
      console.log('💡 This is expected in Expo Go - notifications will still work in foreground');
    } else {
      console.error('❌ Unexpected error registering background task:', error.message);
    }
    
    // This might fail on Expo Go or in development
    if (__DEV__) {
      console.log('\n===============================================');
      console.log('📌 Development Mode Notice:');
      console.log('   Background tasks are limited in Expo Go');
      console.log('   Push notifications will work when app is open');
      console.log('   Full functionality available in production builds');
      console.log('===============================================\n');
    }
    
    return false;
  }
};

/**
 * Unregister background notification task
 */
export const unregisterBackgroundNotificationTask = async (): Promise<void> => {
  try {
    console.log('🗑️ Unregistering background notification task...');
    
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    
    if (!isRegistered) {
      console.log('ℹ️ Background notification task not registered');
      return;
    }
    
    await TaskManager.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('✅ Background notification task unregistered');
    
  } catch (error) {
    console.error('❌ Error unregistering background notification task:', error);
  }
};

// Helper functions for background work
const updateChatBadgeCount = async () => {
  // Implementation would sync with backend to get latest message count
  console.log('💬 Updating chat badge count');
};

const updateFriendRequestsCount = async () => {
  // Implementation would sync with backend to get latest friend requests
  console.log('👥 Updating friend requests count');
};

const scheduleEventReminder = async (notificationData: any) => {
  // Schedule a local notification reminder
  console.log('📅 Scheduling event reminder:', notificationData.targetId);
};

const syncActivityData = async () => {
  // Sync activity data in background
  console.log('📊 Syncing activity data');
};

// Storage helpers
const PENDING_NOTIFICATIONS_KEY = 'pendingNotifications';

const getPendingNotifications = async (): Promise<any[]> => {
  try {
    const stored = await AsyncStorage.getItem(PENDING_NOTIFICATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
};

const storePendingNotifications = async (notifications: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(PENDING_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    console.log(`💾 Stored ${notifications.length} pending notifications`);
  } catch (error) {
    console.error('Error storing pending notifications:', error);
  }
};

const cleanupOldNotifications = async (): Promise<void> => {
  try {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const pendingNotifications = await getPendingNotifications();
    const recentNotifications = pendingNotifications.filter(
      n => n.receivedAt > oneHourAgo
    );
    
    if (recentNotifications.length < pendingNotifications.length) {
      await storePendingNotifications(recentNotifications);
      console.log('🧹 Cleaned up old notifications');
    }
    
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
};

/**
 * Initialize background notification handling
 */
export const initializeBackgroundNotifications = async (): Promise<boolean> => {
  try {
    console.log('\n===============================================');
    console.log('🚀 Initializing background notifications...');
    console.log('===============================================');
    
    // Register the background task
    const taskRegistered = await registerBackgroundNotificationTask();
    
    if (taskRegistered) {
      console.log('✅ Background notifications initialized successfully');
      return true;
    } else {
      console.log('💡 Background notifications not available');
      console.log('   → Using foreground-only notification handling');
      console.log('   → Notifications will work when app is open');
      console.log('   → WebSocket will deliver real-time updates');
      console.log('===============================================\n');
      // Return true anyway - foreground notifications will still work
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error initializing background notifications:', error);
    // Don't fail completely - foreground notifications can still work
    return true;
  }
};

// App state change handler
export const handleAppStateChange = (nextAppState: string) => {
  console.log('📱 App state changed to:', nextAppState);
  
  if (nextAppState === 'active') {
    // App became active, handle any pending notifications
    setTimeout(() => {
      handlePendingNotifications();
    }, 1000); // Small delay to ensure app is fully loaded
  }
};