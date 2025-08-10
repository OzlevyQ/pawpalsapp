import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient, notificationsApi } from './api';
import { handleNotificationNavigation, initializeNotificationNavigation } from './notificationNavigation';
import { 
  initializeBackgroundNotifications, 
  handlePendingNotifications, 
  handleAppStateChange 
} from './backgroundNotifications';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: {
    type?: string;
    targetId?: string;
    action?: string;
    [key: string]: any;
  };
  userId?: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationData {
  type: 'visit' | 'event' | 'friend' | 'badge' | 'system' | 'chat' | 'reminder';
  targetId?: string;
  action?: 'view' | 'navigate' | 'update';
  screen?: string;
  params?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private appStateListener: any = null;
  private isInitialized = false;
  private isInitializing = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('Notification service already initialized');
      return true;
    }

    if (this.isInitializing) {
      console.log('Notification service is currently initializing...');
      // Wait for current initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isInitialized;
    }

    try {
      this.isInitializing = true;
      console.log('Initializing notification service...');

      // Set up basic notification configuration first
      await this.setupNotificationChannels();
      
      // Set up listeners (these work in both Expo Go and production)
      this.setupNotificationListeners();
      
      // Initialize deep link navigation
      this.setupDeepLinkNavigation();
      
      // Initialize background notification handling
      await this.setupBackgroundNotifications();
      
      // Set up app state change listener
      this.setupAppStateListener();

      // Check permission status
      const { status } = await this.getPermissionStatus();
      
      if (status === 'granted') {
        console.log('Push notification permissions already granted');
        
        // Get push token
        const token = await this.registerForPushNotificationsAsync();
        if (token) {
          console.log('Push token received:', token);
          this.expoPushToken = token;
          
          // Register token with backend (don't fail if this doesn't work)
          await this.registerPushToken(token);
        } else {
          console.warn('Failed to get push token, but continuing with local notifications');
        }
      } else {
        console.log('Push notification permissions not granted, but local notifications will work');
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully!');
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      // Don't fail completely, some features may still work
      this.isInitialized = true;
      return true;
    } finally {
      this.isInitializing = false;
    }
  }

  private async setupNotificationChannels(): Promise<void> {
    try {
      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
        });

        // Create additional channels
        await Notifications.setNotificationChannelAsync('visits', {
          name: 'Visit Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('events', {
          name: 'Event Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('social', {
          name: 'Social Notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#8B5CF6',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('Error setting up notification channels:', error);
    }
  }

  // Check current permission status without requesting
  async getPermissionStatus(): Promise<{
    status: 'granted' | 'denied' | 'undetermined';
    canAskAgain: boolean;
  }> {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      
      return {
        status: permissions.status as 'granted' | 'denied' | 'undetermined',
        canAskAgain: permissions.canAskAgain ?? true,
      };
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {
        status: 'undetermined',
        canAskAgain: true,
      };
    }
  }

  // Check if we need to show permission request modal
  async shouldShowPermissionRequest(): Promise<boolean> {
    const { status, canAskAgain } = await this.getPermissionStatus();
    
    // Show if permissions are undetermined or denied but we can still ask
    return status !== 'granted' && (status === 'undetermined' || canAskAgain);
  }

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Push notifications don\'t work on simulator/emulator - using local notifications instead');
      // Still allow local notifications in simulator
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        return finalStatus === 'granted';
      } catch (error) {
        console.error('Error requesting local notification permissions:', error);
        return false;
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  private async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      // Generate a fake token for simulator to allow local notifications
      const simulatorToken = `SimulatorToken[${Date.now()}]`;
      console.log('Generated simulator token:', simulatorToken);
      return simulatorToken;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'd6a3770c-d510-4a27-ba10-8a8452ee48ee', // Your project ID from app.json
      });

      // Store token locally
      await SecureStore.setItemAsync('expoPushToken', token.data);
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private async registerPushToken(token: string): Promise<void> {
    try {
      const deviceInfo = {
        token,
        platform: Platform.OS,
        deviceName: Device.deviceName || `${Platform.OS} Device`,
        osVersion: Device.osVersion || 'Unknown',
        appVersion: '1.0.0', // TODO: Get from app config
      };

      console.log('Registering push token with backend:', deviceInfo);
      const response = await notificationsApi.registerToken(deviceInfo);
      console.log('Push token registration response:', response);
      
      if (response.success) {
        console.log('Push token registered successfully with backend');
      } else {
        console.error('Backend push token registration failed:', response.error);
      }
    } catch (error) {
      console.error('Error registering push token:', error);
      // Don't throw - we can still function without backend registration
    }
  }

  private setupDeepLinkNavigation(): void {
    try {
      console.log('🔗 Setting up deep link navigation...');
      
      // Initialize notification navigation listeners
      const cleanup = initializeNotificationNavigation();
      
      // Store cleanup function for later use
      // Note: In a real implementation, you'd want to store this cleanup function
      // and call it when the service is destroyed
      
      console.log('✅ Deep link navigation initialized');
    } catch (error) {
      console.error('❌ Error setting up deep link navigation:', error);
      // Don't throw - navigation is optional
    }
  }

  private async setupBackgroundNotifications(): Promise<void> {
    try {
      console.log('\n===============================================');
      console.log('📱 Setting up background notification handling...');
      console.log('===============================================');
      
      // Check if we're in Expo Go
      const isExpoGo = !!(global as any).expo;
      if (isExpoGo) {
        console.log('📦 Running in Expo Go environment');
        console.log('   → Background tasks are not supported');
        console.log('   → Notifications will work in foreground');
        console.log('   → WebSocket will handle real-time updates');
        console.log('===============================================\n');
        return; // Skip background setup in Expo Go
      }
      
      // Initialize background notifications for production builds
      const initialized = await initializeBackgroundNotifications();
      
      if (initialized) {
        console.log('✅ Background notifications ready');
      } else {
        console.log('💡 Using foreground-only notifications');
      }
      console.log('===============================================\n');
      
    } catch (error: any) {
      // Handle specific errors gracefully
      if (error.message?.includes('TaskManager') || error.message?.includes('Background')) {
        console.log('📦 Background tasks not supported in current environment');
        console.log('   This is normal for Expo Go - notifications will still work!');
      } else {
        console.error('❌ Unexpected error setting up background notifications:', error.message);
      }
      // Don't throw - background handling is optional
    }
  }

  private setupAppStateListener(): void {
    try {
      console.log('📱 Setting up app state listener...');
      
      // Listen for app state changes
      this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
        handleAppStateChange(nextAppState);
        
        // Handle pending notifications when app becomes active
        if (nextAppState === 'active') {
          setTimeout(() => {
            handlePendingNotifications();
          }, 1000);
        }
      });
      
      console.log('✅ App state listener initialized');
    } catch (error) {
      console.error('❌ Error setting up app state listener:', error);
      // Don't throw - app state handling is optional
    }
  }

  private setupNotificationListeners(): void {
    // Clean up existing listeners first
    this.cleanup();
    
    // Handle notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Handle notification tap/response
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  private handleNotificationReceived(notification: Notifications.Notification): void {
    const { request } = notification;
    const data = request.content.data as NotificationData;
    
    console.log('📱 Notification received (foreground):', {
      title: request.content.title,
      body: request.content.body,
      data
    });
    
    // Emit events for components to listen to (refresh data, show in-app notifications, etc.)
    this.emitNotificationEvent('received', { notification, data });
    
    // Handle foreground notification (could show in-app banner or update UI)
    this.handleForegroundNotification(notification, data);
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const notification = response.notification;
    const data = notification.request.content.data as NotificationData;
    
    console.log('👆 Notification tapped/responded:', {
      actionIdentifier: response.actionIdentifier,
      data
    });
    
    // Mark notification as read (if applicable)
    this.markNotificationAsRead(notification);
    
    // Navigate to appropriate screen based on notification data
    this.navigateFromNotification(notification);
    
    // Emit event for analytics or other listeners
    this.emitNotificationEvent('tapped', { response, data });
  }

  private async navigateFromNotification(notification: Notifications.Notification): Promise<void> {
    try {
      // Check if app is in foreground
      const appState = AppState.currentState;
      const isAppInForeground = appState === 'active';
      
      console.log('🔗 Navigating from notification:', {
        appState,
        isAppInForeground,
        notificationId: notification.request.identifier
      });
      
      // Use the new navigation service
      await handleNotificationNavigation(notification, isAppInForeground);
      
    } catch (error) {
      console.error('❌ Error navigating from notification:', error);
    }
  }

  private handleForegroundNotification(
    notification: Notifications.Notification, 
    data: NotificationData
  ): void {
    // Handle notification when app is in foreground
    // Could show custom in-app notification, update badge, play sound, etc.
    
    console.log('📱 Handling foreground notification:', data?.type);
    
    // Example: Show custom in-app notification for certain types
    if (data?.type === 'chat' || data?.type === 'friend') {
      // Could trigger a toast notification or update a chat indicator
      this.emitNotificationEvent('foreground', { notification, data });
    }
  }

  private async markNotificationAsRead(notification: Notifications.Notification): Promise<void> {
    try {
      const notificationId = notification.request.identifier;
      
      // Mark as read locally
      await Notifications.dismissNotificationAsync(notificationId);
      
      // Mark as read on server if it has a server ID
      const serverNotificationId = notification.request.content.data?.id;
      if (serverNotificationId) {
        // Call API to mark as read on server
        // await notificationsApi.markAsRead(serverNotificationId);
        console.log('📨 Notification marked as read:', serverNotificationId);
      }
      
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  private emitNotificationEvent(
    eventType: 'received' | 'tapped' | 'foreground',
    eventData: any
  ): void {
    // Emit events that other parts of the app can listen to
    // This is useful for analytics, UI updates, data refreshing, etc.
    
    console.log(`📡 Emitting notification event: ${eventType}`, eventData);
    
    // Could use EventEmitter or React Context to notify other components
    // For now, just log the event
  }

  // Send local notification (for testing or immediate feedback)
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    delay: number = 0
  ): Promise<string> {
    try {
      console.log('\n===============================================');
      console.log('📨 Sending local notification');
      console.log('   Title:', title);
      console.log('   Body:', body.substring(0, 100) + (body.length > 100 ? '...' : ''));
      if (data) {
        console.log('   Data:', JSON.stringify(data, null, 2));
      }
      console.log('   Delay:', delay > 0 ? `${delay} seconds` : 'immediate');
      
      const channelId = this.getChannelForType(data?.type);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: delay > 0 ? { seconds: delay } : null,
        identifier: undefined,
      });

      console.log('   ✅ Sent with ID:', notificationId);
      console.log('===============================================\n');
      return notificationId;
    } catch (error: any) {
      console.error('❌ Error sending local notification:', error.message);
      throw error;
    }
  }

  // Send immediate local notification (works in simulator)
  async sendImmediateLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string> {
    return this.sendLocalNotification(title, body, data, 1); // 1 second delay for immediate effect
  }

  private getChannelForType(type?: string): string {
    switch (type) {
      case 'visit':
        return 'visits';
      case 'event':
        return 'events';
      case 'friend':
      case 'social':
        return 'social';
      default:
        return 'default';
    }
  }

  // Cancel specific notification
  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get notification badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set notification badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Check if we should use fallback notifications
  isDeviceCapable(): boolean {
    return Device.isDevice;
  }

  // Get notification capability status
  getCapabilityStatus(): {
    canReceivePush: boolean;
    canReceiveLocal: boolean;
    platform: string;
    isSimulator: boolean;
  } {
    const isSimulator = !Device.isDevice;
    return {
      canReceivePush: Device.isDevice,
      canReceiveLocal: true,
      platform: Platform.OS,
      isSimulator
    };
  }

  // Update push token (call when user logs in/out)
  async updatePushToken(): Promise<void> {
    if (this.expoPushToken) {
      await this.registerPushToken(this.expoPushToken);
    }
  }

  // Store user's permission preference
  async storePermissionPreference(preference: 'allowed' | 'denied' | 'never_ask'): Promise<void> {
    try {
      await SecureStore.setItemAsync('notificationPermissionPreference', preference);
      await SecureStore.setItemAsync('notificationPermissionAskedAt', Date.now().toString());
    } catch (error) {
      console.error('Error storing permission preference:', error);
    }
  }

  // Get user's permission preference
  async getPermissionPreference(): Promise<{
    preference: 'allowed' | 'denied' | 'never_ask' | null;
    askedAt: number | null;
  }> {
    try {
      const preference = await SecureStore.getItemAsync('notificationPermissionPreference') as 'allowed' | 'denied' | 'never_ask' | null;
      const askedAtStr = await SecureStore.getItemAsync('notificationPermissionAskedAt');
      const askedAt = askedAtStr ? parseInt(askedAtStr, 10) : null;
      
      return { preference, askedAt };
    } catch (error) {
      console.error('Error getting permission preference:', error);
      return { preference: null, askedAt: null };
    }
  }

  // Check if we should show the permission request modal (considers user preference and time)
  async shouldShowPermissionModal(): Promise<boolean> {
    try {
      console.log('🔍 shouldShowPermissionModal: Starting check...');
      
      const { status, canAskAgain } = await this.getPermissionStatus();
      console.log('🔍 Permission Status:', { status, canAskAgain });
      
      const { preference, askedAt } = await this.getPermissionPreference();
      console.log('🔍 Permission Preference:', { preference, askedAt });
      
      // Don't show if user said never ask
      if (preference === 'never_ask') {
        console.log('🚫 Not showing modal: User said never ask');
        return false;
      }
      
      // Don't show if permissions are already granted
      if (status === 'granted') {
        console.log('✅ Not showing modal: Permissions already granted');
        return false;
      }
      
      // Don't show if user denied and system says we can't ask again
      if (status === 'denied' && !canAskAgain) {
        console.log('🚫 Not showing modal: User denied and can\'t ask again');
        return false;
      }
      
      // If user previously denied, wait at least 24 hours before asking again
      if (preference === 'denied' && askedAt) {
        const hoursSinceLastAsk = (Date.now() - askedAt) / (1000 * 60 * 60);
        console.log('⏰ Hours since last ask:', hoursSinceLastAsk);
        if (hoursSinceLastAsk < 24) {
          console.log('⏳ Not showing modal: Too soon since last ask');
          return false;
        }
      }
      
      // Show the modal for first time users or users who said "not now" and it's been a while
      const shouldShow = status === 'undetermined' || (canAskAgain && status === 'denied');
      console.log('🎯 Final decision - Should show modal:', shouldShow);
      
      // FOR TESTING: Force show modal for new users (remove this later)
      if (!preference) {
        console.log('🧪 TESTING: No previous preference found, showing modal');
        return true;
      }
      
      return shouldShow;
    } catch (error) {
      console.error('❌ Error in shouldShowPermissionModal:', error);
      return false;
    }
  }

  // Reset the service state (for re-initialization)
  reset(): void {
    this.cleanup();
    this.expoPushToken = null;
    this.isInitialized = false;
    this.isInitializing = false;
  }

  // Cleanup listeners
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    this.isInitialized = false;
  }

  // Get notification settings/preferences
  async getNotificationSettings() {
    try {
      // For now, return default settings since backend settings aren't fully implemented
      return {
        success: true,
        data: {
          pushEnabled: true,
          emailEnabled: false,
          types: {
            visits: true,
            events: true,
            friends: true,
            badges: true,
            reminders: true,
          },
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          }
        }
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  // Update notification settings
  async updateNotificationSettings(settings: {
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    types?: {
      visits?: boolean;
      events?: boolean;
      friends?: boolean;
      badges?: boolean;
      reminders?: boolean;
    };
    quietHours?: {
      enabled: boolean;
      start: string; // HH:mm format
      end: string;   // HH:mm format
    };
  }) {
    try {
      const response = await notificationsApi.updateSettings(settings);
      return response;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return null;
    }
  }

  // Mark notifications as read
  async markNotificationsAsRead(notificationIds: string[]) {
    try {
      const response = await notificationsApi.markMultipleAsRead(notificationIds);
      return response;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return null;
    }
  }

  // Get user notifications (for in-app notification center)
  async getUserNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  }) {
    try {
      const response = await notificationsApi.getNotifications(params);
      return response;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return null;
    }
  }

  // Test notification navigation system
  async testNotificationNavigation(): Promise<void> {
    console.log('🧪 Testing notification navigation system...');
    
    // Test different notification types
    const testNotifications = [
      {
        type: 'new_message',
        title: 'Test Chat Message',
        body: 'Testing chat navigation',
        data: { chatId: 'test-chat-123', senderId: 'user-456' }
      },
      {
        type: 'friend_request',
        title: 'Test Friend Request',
        body: 'Testing social navigation',
        data: { targetId: 'user-789' }
      },
      {
        type: 'event_reminder',
        title: 'Test Event Reminder',
        body: 'Testing event navigation',
        data: { targetId: 'event-321' }
      },
      {
        type: 'dog_checkin',
        title: 'Test Dog Check-in',
        body: 'Testing parks navigation',
        data: { targetId: 'dog-654', gardenId: 'garden-987' }
      }
    ];

    for (const notification of testNotifications) {
      try {
        await this.sendLocalNotification(
          notification.title,
          notification.body,
          notification.data as any,
          2000 // 2 second delay between notifications
        );
        console.log(`✅ Test notification sent: ${notification.type}`);
        
        // Wait between notifications
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to send test notification ${notification.type}:`, error);
      }
    }
    
    console.log('🎉 All test notifications sent!');
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

// Development/testing helper functions
export const testNotificationPermissions = async () => {
  console.log('🧪 Testing Notification Permissions...');
  
  // Check current permission status
  const permissionStatus = await notificationService.getPermissionStatus();
  console.log('📋 Permission Status:', permissionStatus);
  
  // Check if we should show the modal
  const shouldShow = await notificationService.shouldShowPermissionModal();
  console.log('🔍 Should Show Modal:', shouldShow);
  
  // Check user preferences
  const preferences = await notificationService.getPermissionPreference();
  console.log('⚙️ User Preferences:', preferences);
  
  // Check device capability
  const capability = notificationService.getCapabilityStatus();
  console.log('📱 Device Capabilities:', capability);
  
  return {
    permissionStatus,
    shouldShow,
    preferences,
    capability
  };
};

export const testLocalNotification = async () => {
  console.log('🧪 Testing Local Notification...');
  
  try {
    const notificationId = await notificationService.sendLocalNotification(
      'Test Notification',
      'This is a test notification from PawPals!',
      { type: 'test', timestamp: Date.now() },
      2 // 2 seconds delay
    );
    
    console.log('✅ Local notification scheduled with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Failed to send local notification:', error);
    throw error;
  }
};

export const resetNotificationPreferences = async () => {
  console.log('🔄 Resetting notification preferences for testing...');
  
  try {
    // Clear stored preferences
    await SecureStore.deleteItemAsync('notificationPermissionPreference');
    await SecureStore.deleteItemAsync('notificationPermissionAskedAt');
    
    // Reset the service
    notificationService.reset();
    
    console.log('✅ Notification preferences reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset preferences:', error);
    throw error;
  }
};

// Global debug functions for testing
// @ts-ignore
global.testNotificationNavigation = () => notificationService.testNotificationNavigation();
// @ts-ignore
global.testNotificationPermissions = testNotificationPermissions;
// @ts-ignore
global.testLocalNotification = testLocalNotification;
// @ts-ignore
global.resetNotificationPreferences = resetNotificationPreferences;