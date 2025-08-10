import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationService, PushNotification } from '../services/notificationService';
import { handleNotificationNavigation } from '../services/notificationNavigation';
import { useUser } from './UserContext';

interface NotificationState {
  notifications: PushNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  pushToken: string | null;
  webSocketConnected: boolean;
}

interface NotificationContextType extends NotificationState {
  // Actions
  initializeNotifications: () => Promise<boolean>;
  reinitializeWithPermissions: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
  clearBadge: () => Promise<void>;
  updateUnreadCount: (count: number) => void;
  decreaseUnreadCount: (amount?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isLoggedIn, user } = useUser();
  
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    isInitialized: false,
    pushToken: null,
    webSocketConnected: false,
  });

  // Initialize notifications when user is logged in
  const initializeNotifications = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn || state.isInitialized) return false;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { status } = await notificationService.getPermissionStatus();
      
      if (status === 'granted') {
        const success = await notificationService.initialize();
        if (success) {
          const pushToken = notificationService.getPushToken();
          setState(prev => ({
            ...prev,
            isInitialized: true,
            pushToken,
            loading: false
          }));
          
          await refreshNotifications();
          return true;
        }
      } else {
        console.log('Notification permissions not granted, initializing with limited functionality');
        setState(prev => ({
          ...prev,
          isInitialized: true,
          pushToken: null,
          loading: false,
          error: null // Don't treat this as an error
        }));
        
        // Initialize basic functionality without push notifications
        await notificationService.initialize();
        return true;
      }
      
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize notifications',
        loading: false
      }));
      return false;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
      return false;
    }
  }, [isLoggedIn, state.isInitialized]);

  // Reinitialize with permissions
  const reinitializeWithPermissions = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn) return false;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const success = await notificationService.initialize();
      if (success) {
        const pushToken = notificationService.getPushToken();
        setState(prev => ({
          ...prev,
          isInitialized: true,
          pushToken,
          loading: false,
          error: null
        }));
        
        await refreshNotifications();
        return true;
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to reinitialize notifications',
          loading: false
        }));
        return false;
      }
    } catch (error) {
      console.error('Error reinitializing notifications:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
      return false;
    }
  }, [isLoggedIn]);

  // Refresh notifications from server
  const refreshNotifications = useCallback(async (): Promise<void> => {
    if (!isLoggedIn) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await notificationService.getUserNotifications({
        limit: 50,
        page: 1
      });
      
      if (response?.success && response.data) {
        const notifications = Array.isArray(response.data) 
          ? response.data 
          : response.data.notifications || [];
        
        const unreadCount = notifications.filter(n => !n.read).length;
        
        setState(prev => ({
          ...prev,
          notifications,
          unreadCount,
          loading: false
        }));
        
        await notificationService.setBadgeCount(unreadCount);
      } else {
        setState(prev => ({
          ...prev,
          error: null, // Don't treat as error if backend is unavailable
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      setState(prev => ({
        ...prev,
        error: null, // Don't treat as error, might be network issue
        loading: false
      }));
    }
  }, [isLoggedIn]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]): Promise<void> => {
    try {
      await notificationService.markNotificationsAsRead(notificationIds);
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, prev.unreadCount - notificationIds.length)
      }));
      
      const newUnreadCount = Math.max(0, state.unreadCount - notificationIds.length);
      await notificationService.setBadgeCount(newUnreadCount);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [state.unreadCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    const unreadNotifications = state.notifications.filter(n => !n.read);
    if (unreadNotifications.length > 0) {
      await markAsRead(unreadNotifications.map(n => n.id));
    }
  }, [state.notifications, markAsRead]);

  // Send local notification
  const sendLocalNotification = useCallback(async (
    title: string, 
    body: string, 
    data?: any
  ): Promise<void> => {
    try {
      await notificationService.sendLocalNotification(title, body, data);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }, []);

  // Clear badge
  const clearBadge = useCallback(async (): Promise<void> => {
    try {
      await notificationService.clearBadge();
      setState(prev => ({ ...prev, unreadCount: 0 }));
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }, []);

  // Update unread count directly
  const updateUnreadCount = useCallback((count: number): void => {
    setState(prev => ({ ...prev, unreadCount: Math.max(0, count) }));
    notificationService.setBadgeCount(Math.max(0, count));
  }, []);

  // Decrease unread count
  const decreaseUnreadCount = useCallback((amount: number = 1): void => {
    setState(prev => {
      const newCount = Math.max(0, prev.unreadCount - amount);
      notificationService.setBadgeCount(newCount);
      return { ...prev, unreadCount: newCount };
    });
  }, []);

  // Handle notification responses with navigation
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
      // Handle navigation based on notification data
      const notificationData = response.notification.request.content.data;
      if (notificationData) {
        handleNotificationNavigation(notificationData, false);
      }
    });

    return () => responseListener.remove();
  }, []);

  // WebSocket connection management
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectInterval = 3000;

    const connectWebSocket = () => {
      if (!isLoggedIn || !user?.token || state.webSocketConnected) return;

      try {
        // Use environment variable or fallback to hardcoded IP
        const baseUrl = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://172.20.10.2:5000';
        const wsUrl = `${baseUrl}/notifications-ws?token=${user.token}`;
        console.log('\n===============================================');
        console.log('🔌 Attempting WebSocket connection');
        console.log('   URL:', wsUrl.replace(user.token, 'TOKEN_HIDDEN'));
        console.log('   User logged in:', isLoggedIn);
        console.log('   Token available:', !!user?.token);
        console.log('===============================================\n');
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('\n===============================================');
          console.log('✅ WebSocket connected successfully!');
          console.log('   Ready to receive real-time notifications');
          console.log('===============================================\n');
          setState(prev => ({ ...prev, webSocketConnected: true, error: null }));
          reconnectAttempts = 0;
          
          // Send a ping to confirm connection
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('\n===============================================');
            console.log('📨 WebSocket message received');
            console.log('   Type:', data.type);
            console.log('   Data:', JSON.stringify(data, null, 2));
            console.log('===============================================\n');

            if (data.type === 'notification' && data.notification) {
              const notification = data.notification;
              
              // Add to local notifications state
              setState(prev => ({
                ...prev,
                notifications: [notification, ...prev.notifications],
                unreadCount: prev.unreadCount + 1
              }));

              // Send local notification if app is in background
              const appState = AppState.currentState;
              if (appState !== 'active') {
                await notificationService.sendLocalNotification(
                  notification.title,
                  notification.content,
                  notification.data
                );
              } else {
                // App is in foreground - handle navigation if needed
                if (notification.data) {
                  await handleNotificationNavigation(notification.data, true);
                }
              }

              // Update badge count
              await notificationService.setBadgeCount(state.unreadCount + 1);
            }
          } catch (error) {
            console.error('❌ Error processing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('\n===============================================');
          console.log('🔌 WebSocket disconnected');
          console.log('   Code:', event.code);
          console.log('   Reason:', event.reason || 'No reason provided');
          console.log('   Clean close:', event.wasClean);
          console.log('===============================================\n');
          
          setState(prev => ({ ...prev, webSocketConnected: false }));
          
          // Attempt to reconnect if not intentionally closed
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts && isLoggedIn) {
            reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${reconnectInterval}ms...`);
            reconnectTimer = setTimeout(connectWebSocket, reconnectInterval);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached. Giving up.');
          }
        };

        ws.onerror = (error: any) => {
          console.log('\n===============================================');
          console.error('❌ WebSocket error occurred');
          console.error('   Error:', error.message || 'Unknown error');
          console.error('   Type:', error.type || 'Unknown type');
          console.log('===============================================\n');
          
          setState(prev => ({ 
            ...prev, 
            webSocketConnected: false,
            error: 'WebSocket connection failed - check network connection'
          }));
        };

      } catch (error) {
        console.error('❌ Error creating WebSocket connection:', error);
        setState(prev => ({ 
          ...prev, 
          webSocketConnected: false,
          error: 'Failed to create WebSocket connection'
        }));
      }
    };

    // Connect when user is logged in and initialized
    if (isLoggedIn && state.isInitialized && user?.token) {
      connectWebSocket();
    }

    // Cleanup function
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
      setState(prev => ({ ...prev, webSocketConnected: false }));
    };
  }, [isLoggedIn, state.isInitialized, user?.token, state.webSocketConnected]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isLoggedIn && state.isInitialized) {
        refreshNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isLoggedIn, state.isInitialized, refreshNotifications]);

  // Initialize when user logs in
  useEffect(() => {
    if (isLoggedIn && !state.isInitialized) {
      initializeNotifications();
    }
  }, [isLoggedIn, state.isInitialized, initializeNotifications]);

  // Cleanup when user logs out
  useEffect(() => {
    if (!isLoggedIn && state.isInitialized) {
      notificationService.cleanup();
      setState({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        isInitialized: false,
        pushToken: null,
        webSocketConnected: false,
      });
    }
  }, [isLoggedIn, state.isInitialized]);

  const contextValue: NotificationContextType = {
    ...state,
    initializeNotifications,
    reinitializeWithPermissions,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    sendLocalNotification,
    clearBadge,
    updateUnreadCount,
    decreaseUnreadCount,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;