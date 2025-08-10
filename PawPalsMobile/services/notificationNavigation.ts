import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { NotificationData } from './notificationService';

// Notification types and their corresponding navigation paths
export const NOTIFICATION_TYPES = {
  // Dog & Park related
  DOG_CHECKIN: 'dog_checkin',
  DOG_CHECKOUT: 'dog_checkout', 
  PARK_ACTIVITY: 'park_activity',
  PARK_EVENT: 'park_event',
  
  // Social features
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  MESSAGE: 'message',
  CHAT_MESSAGE: 'chat_message',
  NEW_MESSAGE: 'new_message', // Backend compatibility
  
  // Events
  EVENT_REMINDER: 'event_reminder',
  EVENT_INVITATION: 'event_invitation',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_REGISTRATION: 'event_registration',
  EVENT_STATUS_UPDATE: 'event_status_update',
  
  // Garden & Management
  GARDEN_UPDATE: 'garden_update',
  PERMISSION_REQUEST: 'permission_request',
  NEWSLETTER_SUBSCRIPTION: 'newsletter_subscription',
  NEWSLETTER_CONTENT: 'newsletter_content',

  // System & Rewards
  ACHIEVEMENT_EARNED: 'achievement_earned',
  LEVEL_UP: 'level_up',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  SYSTEM: 'system',
  HEALTH_REMINDER: 'health_reminder',
  
  // Visits & Activities
  VISIT_REMINDER: 'visit_reminder',
  PLAYDATE_INVITATION: 'playdate_invitation',
  ACTIVITY_SUMMARY: 'activity_summary'
} as const;

export type NotificationTypeValue = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Navigation configuration for each notification type
const NAVIGATION_CONFIG = {
  [NOTIFICATION_TYPES.DOG_CHECKIN]: {
    path: '/(tabs)/parks',
    params: { showActiveVisit: true }
  },
  [NOTIFICATION_TYPES.DOG_CHECKOUT]: {
    path: '/(tabs)/home',
    params: { showSummary: true }
  },
  [NOTIFICATION_TYPES.PARK_ACTIVITY]: {
    path: '/(tabs)/parks',
    params: { filter: 'activity' }
  },
  [NOTIFICATION_TYPES.PARK_EVENT]: {
    path: '/(tabs)/events',
    params: {}
  },
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: {
    path: '/(tabs)/social',
    params: { tab: 'requests' }
  },
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: {
    path: '/(tabs)/social',
    params: { tab: 'friends' }
  },
  [NOTIFICATION_TYPES.MESSAGE]: {
    path: '/(tabs)/social',
    params: { tab: 'messages' }
  },
  [NOTIFICATION_TYPES.CHAT_MESSAGE]: {
    path: '/chat',
    params: {} // chatId will be added dynamically
  },
  [NOTIFICATION_TYPES.NEW_MESSAGE]: {
    path: '/chat',
    params: {} // chatId will be added dynamically
  },
  [NOTIFICATION_TYPES.EVENT_REMINDER]: {
    path: '/(tabs)/events',
    params: {} // eventId will be added dynamically
  },
  [NOTIFICATION_TYPES.EVENT_INVITATION]: {
    path: '/(tabs)/events',
    params: { tab: 'invitations' }
  },
  [NOTIFICATION_TYPES.EVENT_UPDATE]: {
    path: '/(tabs)/events',
    params: {} // eventId will be added dynamically
  },
  [NOTIFICATION_TYPES.EVENT_CANCELLED]: {
    path: '/(tabs)/events',
    params: { tab: 'cancelled' }
  },
  [NOTIFICATION_TYPES.EVENT_REGISTRATION]: {
    path: '/(tabs)/events',
    params: { tab: 'manage' }
  },
  [NOTIFICATION_TYPES.EVENT_STATUS_UPDATE]: {
    path: '/(tabs)/events',
    params: {} // eventId will be added dynamically
  },
  [NOTIFICATION_TYPES.GARDEN_UPDATE]: {
    path: '/(tabs)/parks',
    params: {} // gardenId will be added dynamically
  },
  [NOTIFICATION_TYPES.PERMISSION_REQUEST]: {
    path: '/(tabs)/profile',
    params: { tab: 'admin', section: 'requests' }
  },
  [NOTIFICATION_TYPES.NEWSLETTER_SUBSCRIPTION]: {
    path: '/(tabs)/parks',
    params: {} // gardenId will be added dynamically
  },
  [NOTIFICATION_TYPES.NEWSLETTER_CONTENT]: {
    path: '/(tabs)/parks',
    params: {} // gardenId will be added dynamically
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    path: '/(tabs)/home',
    params: { showSystem: true }
  },
  [NOTIFICATION_TYPES.ACHIEVEMENT_EARNED]: {
    path: '/(tabs)/profile',
    params: { tab: 'achievements' }
  },
  [NOTIFICATION_TYPES.LEVEL_UP]: {
    path: '/(tabs)/profile',
    params: { showLevelUp: true }
  },
  [NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT]: {
    path: '/(tabs)/home',
    params: { showAnnouncement: true }
  },
  [NOTIFICATION_TYPES.HEALTH_REMINDER]: {
    path: '/(tabs)/profile',
    params: { tab: 'dogs', showHealth: true }
  },
  [NOTIFICATION_TYPES.VISIT_REMINDER]: {
    path: '/(tabs)/parks',
    params: { showReminder: true }
  },
  [NOTIFICATION_TYPES.PLAYDATE_INVITATION]: {
    path: '/(tabs)/social',
    params: { tab: 'playdates' }
  },
  [NOTIFICATION_TYPES.ACTIVITY_SUMMARY]: {
    path: '/(tabs)/home',
    params: { showSummary: true }
  }
};

// Default navigation if type is not recognized
const DEFAULT_NAVIGATION = {
  path: '/(tabs)/home',
  params: {}
};

/**
 * Main function to handle navigation from notifications
 */
export const handleNotificationNavigation = async (
  notification: any,
  isAppInForeground: boolean = false
): Promise<void> => {
  try {
    console.log('🔗 Handling notification navigation:', {
      notification: notification?.request?.content || notification,
      isAppInForeground
    });

    // Extract notification data
    const notificationData = extractNotificationData(notification);
    
    if (!notificationData) {
      console.warn('⚠️ No valid notification data found, navigating to home');
      navigateToHome();
      return;
    }

    // Get navigation config for this notification type
    const navigationConfig = getNavigationConfig(notificationData.type);
    
    // Add dynamic parameters if they exist in notification data
    const finalParams = {
      ...navigationConfig.params,
      ...extractDynamicParams(notificationData)
    };

    // Perform navigation with a slight delay for better UX
    setTimeout(() => {
      navigateToPath(navigationConfig.path, finalParams);
    }, isAppInForeground ? 100 : 500);

    // Log successful navigation
    console.log('✅ Notification navigation completed:', {
      type: notificationData.type,
      path: navigationConfig.path,
      params: finalParams
    });

  } catch (error) {
    console.error('❌ Error in notification navigation:', error);
    // Fallback to home screen
    navigateToHome();
  }
};

/**
 * Extract notification data from different notification formats
 */
const extractNotificationData = (notification: any): NotificationData | null => {
  try {
    // Handle different notification formats
    let data: any = null;

    if (notification?.request?.content?.data) {
      // Expo notification format
      data = notification.request.content.data;
    } else if (notification?.data) {
      // Direct data format
      data = notification.data;
    } else if (notification?.payload) {
      // FCM format
      data = notification.payload;
    }

    if (!data || !data.type) {
      return null;
    }

    return {
      type: data.type,
      targetId: data.targetId,
      action: data.action,
      screen: data.screen,
      params: data.params || {}
    } as NotificationData;

  } catch (error) {
    console.error('❌ Error extracting notification data:', error);
    return null;
  }
};

/**
 * Get navigation configuration for notification type
 */
const getNavigationConfig = (type: string) => {
  const config = NAVIGATION_CONFIG[type as NotificationTypeValue];
  return config || DEFAULT_NAVIGATION;
};

/**
 * Extract dynamic parameters from notification data
 */
const extractDynamicParams = (data: NotificationData): Record<string, any> => {
  const params: Record<string, any> = {};

  // Add targetId-based parameters
  if (data.targetId) {
    switch (data.type) {
      case NOTIFICATION_TYPES.CHAT_MESSAGE:
      case NOTIFICATION_TYPES.NEW_MESSAGE:
        // For new_message type, use chatId from data
        params.chatId = data.chatId || data.targetId;
        break;
      case NOTIFICATION_TYPES.EVENT_REMINDER:
      case NOTIFICATION_TYPES.EVENT_UPDATE:
      case NOTIFICATION_TYPES.EVENT_REGISTRATION:
      case NOTIFICATION_TYPES.EVENT_STATUS_UPDATE:
        params.eventId = data.eventId || data.targetId;
        break;
      case NOTIFICATION_TYPES.FRIEND_REQUEST:
        params.userId = data.targetId;
        break;
      case NOTIFICATION_TYPES.DOG_CHECKIN:
      case NOTIFICATION_TYPES.DOG_CHECKOUT:
        params.visitId = data.visitId || data.targetId;
        params.gardenId = data.gardenId;
        break;
      case NOTIFICATION_TYPES.GARDEN_UPDATE:
      case NOTIFICATION_TYPES.NEWSLETTER_SUBSCRIPTION:
      case NOTIFICATION_TYPES.NEWSLETTER_CONTENT:
        params.gardenId = data.gardenId || data.targetId;
        break;
      case NOTIFICATION_TYPES.PERMISSION_REQUEST:
        params.requesterId = data.requesterId;
        params.requestType = data.requestType;
        break;
      case NOTIFICATION_TYPES.VISIT_REMINDER:
        params.visitId = data.visitId || data.targetId;
        params.gardenId = data.gardenId;
        break;
      default:
        params.id = data.targetId;
    }
  }

  // Add any additional parameters from the notification
  if (data.params) {
    Object.assign(params, data.params);
  }

  return params;
};

/**
 * Navigate to specific path with parameters
 */
const navigateToPath = (path: string, params: Record<string, any> = {}) => {
  try {
    if (Object.keys(params).length === 0) {
      router.push(path as any);
    } else {
      const queryString = new URLSearchParams(params).toString();
      const fullPath = `${path}?${queryString}`;
      router.push(fullPath as any);
    }
    
    console.log('🔄 Navigated to:', path, 'with params:', params);
  } catch (error) {
    console.error('❌ Navigation error:', error);
    navigateToHome();
  }
};

/**
 * Navigate to home screen as fallback
 */
const navigateToHome = () => {
  try {
    router.push('/(tabs)/home');
    console.log('🏠 Navigated to home screen');
  } catch (error) {
    console.error('❌ Failed to navigate to home:', error);
  }
};

/**
 * Handle deep link URLs (for external links)
 */
export const handleDeepLink = async (url: string): Promise<void> => {
  try {
    console.log('🔗 Handling deep link:', url);
    
    const parsedUrl = Linking.parse(url);
    const { hostname, path, queryParams } = parsedUrl;
    
    // Handle different URL formats
    if (hostname === 'pawpals.app' || hostname === 'app.pawpals.com') {
      // Handle HTTPS links
      handleWebDeepLink(path, queryParams);
    } else if (parsedUrl.scheme === 'pawpals') {
      // Handle custom scheme links
      handleCustomSchemeLink(parsedUrl.path, queryParams);
    } else {
      console.warn('⚠️ Unrecognized deep link format:', url);
      navigateToHome();
    }
    
  } catch (error) {
    console.error('❌ Error handling deep link:', error);
    navigateToHome();
  }
};

/**
 * Handle web-based deep links (https://)
 */
const handleWebDeepLink = (path: string | null, params: Record<string, any> = {}) => {
  if (!path) {
    navigateToHome();
    return;
  }

  // Map web paths to app routes
  const webPathMap: Record<string, string> = {
    '/home': '/(tabs)/home',
    '/parks': '/(tabs)/parks',
    '/social': '/(tabs)/social',
    '/events': '/(tabs)/events',
    '/profile': '/(tabs)/profile',
    '/checkin': '/(tabs)/checkin',
    '/chat': '/chat',
    '/add-dog': '/add-dog',
    '/edit-dog': '/edit-dog'
  };

  const appPath = webPathMap[path] || path;
  navigateToPath(appPath, params);
};

/**
 * Handle custom scheme deep links (pawpals://)
 */
const handleCustomSchemeLink = (path: string | null, params: Record<string, any> = {}) => {
  if (!path) {
    navigateToHome();
    return;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Handle custom scheme paths
  switch (cleanPath) {
    case 'home':
      navigateToPath('/(tabs)/home', params);
      break;
    case 'parks':
      navigateToPath('/(tabs)/parks', params);
      break;
    case 'social':
      navigateToPath('/(tabs)/social', params);
      break;
    case 'events':
      navigateToPath('/(tabs)/events', params);
      break;
    case 'profile':
      navigateToPath('/(tabs)/profile', params);
      break;
    case 'checkin':
      navigateToPath('/(tabs)/checkin', params);
      break;
    default:
      console.warn('⚠️ Unrecognized custom scheme path:', cleanPath);
      navigateToHome();
  }
};

/**
 * Initialize notification navigation listeners
 */
export const initializeNotificationNavigation = () => {
  console.log('🚀 Initializing notification navigation listeners...');
  
  // Listen for incoming URLs when app is already running
  const urlListener = Linking.addEventListener('url', ({ url }) => {
    console.log('📱 Deep link received:', url);
    handleDeepLink(url);
  });

  // Get initial URL if app was opened via deep link
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('🔗 Initial URL detected:', url);
      handleDeepLink(url);
    }
  });

  return () => {
    urlListener?.remove();
  };
};

// Export types and constants for use in other files
export type { NotificationData };