import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Garden } from '../services/api/gardens';
import WebSocketService, { NotificationData, MessageData } from '../services/websocket';

interface AppState {
  // Gardens
  gardens: Garden[];
  nearbyGardens: Garden[];
  favoriteGardens: Garden[];
  selectedGarden: Garden | null;
  
  // Notifications
  notifications: NotificationData[];
  unreadNotificationCount: number;
  
  // Messages/Chat
  messages: MessageData[];
  activeChats: string[];
  
  // App State
  isOnline: boolean;
  lastSync: Date | null;
  theme: 'light' | 'dark' | 'system';
  language: 'he' | 'en';
  
  // Loading states
  loading: {
    gardens: boolean;
    notifications: boolean;
    messages: boolean;
  };

  // Actions
  setGardens: (gardens: Garden[]) => void;
  setNearbyGardens: (gardens: Garden[]) => void;
  setFavoriteGardens: (gardens: Garden[]) => void;
  setSelectedGarden: (garden: Garden | null) => void;
  updateGarden: (gardenId: string, updates: Partial<Garden>) => void;
  
  addNotification: (notification: NotificationData) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  
  addMessage: (message: MessageData) => void;
  markMessagesAsRead: (chatId: string) => void;
  
  setOnlineStatus: (isOnline: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'he' | 'en') => void;
  
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  
  // WebSocket integration
  initializeWebSocket: () => void;
  cleanupWebSocket: () => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gardens: [],
    nearbyGardens: [],
    favoriteGardens: [],
    selectedGarden: null,
    
    notifications: [],
    unreadNotificationCount: 0,
    
    messages: [],
    activeChats: [],
    
    isOnline: true,
    lastSync: null,
    theme: 'system',
    language: 'he',
    
    loading: {
      gardens: false,
      notifications: false,
      messages: false,
    },

    // Garden actions
    setGardens: (gardens) => set({ gardens }),
    
    setNearbyGardens: (nearbyGardens) => set({ nearbyGardens }),
    
    setFavoriteGardens: (favoriteGardens) => set({ favoriteGardens }),
    
    setSelectedGarden: (selectedGarden) => set({ selectedGarden }),
    
    updateGarden: (gardenId, updates) => set((state) => ({
      gardens: state.gardens.map(garden => 
        garden._id === gardenId ? { ...garden, ...updates } : garden
      ),
      nearbyGardens: state.nearbyGardens.map(garden => 
        garden._id === gardenId ? { ...garden, ...updates } : garden
      ),
      favoriteGardens: state.favoriteGardens.map(garden => 
        garden._id === gardenId ? { ...garden, ...updates } : garden
      ),
      selectedGarden: state.selectedGarden?._id === gardenId 
        ? { ...state.selectedGarden, ...updates }
        : state.selectedGarden,
    })),

    // Notification actions
    addNotification: (notification) => set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadNotificationCount: state.unreadNotificationCount + (notification.read ? 0 : 1),
    })),
    
    markNotificationAsRead: (notificationId) => set((state) => {
      const updatedNotifications = state.notifications.map(notification =>
        notification._id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      return {
        notifications: updatedNotifications,
        unreadNotificationCount: unreadCount,
      };
    }),
    
    markAllNotificationsAsRead: () => set((state) => ({
      notifications: state.notifications.map(notification => 
        ({ ...notification, read: true })
      ),
      unreadNotificationCount: 0,
    })),
    
    clearNotifications: () => set({
      notifications: [],
      unreadNotificationCount: 0,
    }),

    // Message actions
    addMessage: (message) => set((state) => ({
      messages: [...state.messages, message],
    })),
    
    markMessagesAsRead: (chatId) => {
      // This would typically make an API call to mark messages as read
      console.log('Marking messages as read for chat:', chatId);
    },

    // App state actions
    setOnlineStatus: (isOnline) => set({ 
      isOnline,
      lastSync: isOnline ? new Date() : get().lastSync,
    }),
    
    setTheme: (theme) => set({ theme }),
    
    setLanguage: (language) => set({ language }),
    
    setLoading: (key, loading) => set((state) => ({
      loading: { ...state.loading, [key]: loading },
    })),

    // WebSocket integration
    initializeWebSocket: () => {
      const state = get();
      
      // Listen for notifications
      WebSocketService.on('notification', (notification: NotificationData) => {
        state.addNotification(notification);
      });
      
      // Listen for messages
      WebSocketService.on('message', (message: MessageData) => {
        state.addMessage(message);
      });
      
      // Listen for garden updates
      WebSocketService.on('gardenOccupancyUpdate', (data: { gardenId: string; occupancy: number }) => {
        state.updateGarden(data.gardenId, { currentOccupancy: data.occupancy });
      });
      
      // Listen for connection status
      WebSocketService.on('connected', () => {
        state.setOnlineStatus(true);
      });
      
      WebSocketService.on('disconnected', () => {
        state.setOnlineStatus(false);
      });
    },
    
    cleanupWebSocket: () => {
      // Remove all WebSocket listeners
      WebSocketService.off('notification');
      WebSocketService.off('message');
      WebSocketService.off('gardenOccupancyUpdate');
      WebSocketService.off('connected');
      WebSocketService.off('disconnected');
    },
  }))
);