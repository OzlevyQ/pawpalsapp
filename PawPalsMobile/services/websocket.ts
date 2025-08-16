import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

export interface NotificationData {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface MessageData {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  content: string;
  messageType: 'text' | 'image' | 'location';
  timestamp: string;
  chatId: string;
}

export interface GamificationUpdateData {
  type: 'points_updated' | 'level_up' | 'streak_updated' | 'achievement_unlocked' | 'mission_completed';
  data: {
    points?: number;
    level?: number;
    previousLevel?: number;
    streak?: number;
    previousStreak?: number;
    achievement?: {
      _id: string;
      name: string;
      description: string;
      icon?: string;
      pointsReward: number;
    };
    mission?: {
      _id: string;
      title: string;
      description: string;
      pointsReward: number;
      icon?: string;
    };
    totalPoints?: number;
    reason?: string; // e.g., "check_in", "mission_complete", "daily_bonus"
  };
  userId: string;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private listeners: { [event: string]: Function[] } = {};
  private lastErrorLog = 0;
  private errorLogThrottle = 5000; // Log errors only once per 5 seconds

  async connect(): Promise<void> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const isGuest = await SecureStore.getItemAsync('isGuest');
      
      // Don't connect for guests
      if (isGuest === 'true' || !token) {
        console.log('Not connecting WebSocket for guest user');
        return;
      }

      const wsUrl = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://localhost:5000';
      
      this.socket = io(wsUrl, {
        auth: {
          token: token
        },
        transports: ['websocket'],
        reconnection: false, // Disable auto-reconnection in development
        timeout: 3000, // Faster timeout for development
        forceNew: true,
      });

      this.setupEventListeners();
      
    } catch (error) {
      const now = Date.now();
      if (now - this.lastErrorLog > this.errorLogThrottle) {
        console.warn('WebSocket initialization failed. This is normal in development without a backend server.');
        this.lastErrorLog = now;
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      
      // Throttle error logging in development
      const now = Date.now();
      if (now - this.lastErrorLog > this.errorLogThrottle) {
        // Only show warning if we've tried multiple times to reduce noise
        if (this.reconnectAttempts >= 2) {
          console.warn(`WebSocket connection failed (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}). This is normal in development without a backend server.`);
        }
        this.lastErrorLog = now;
      }
      
      this.emit('connectionError', { error, attempts: this.reconnectAttempts });
    });

    // Notification events
    this.socket.on('notification', (data: NotificationData) => {
      console.log('New notification:', data);
      this.emit('notification', data);
    });

    // Chat events
    this.socket.on('message', (data: MessageData) => {
      console.log('New message:', data);
      this.emit('message', data);
    });

    this.socket.on('userTyping', (data: { userId: string; chatId: string; isTyping: boolean }) => {
      this.emit('userTyping', data);
    });

    // Friend events
    this.socket.on('friendOnline', (data: { userId: string; status: string }) => {
      this.emit('friendOnline', data);
    });

    this.socket.on('friendOffline', (data: { userId: string }) => {
      this.emit('friendOffline', data);
    });

    // Garden events
    this.socket.on('gardenOccupancyUpdate', (data: { gardenId: string; occupancy: number }) => {
      this.emit('gardenOccupancyUpdate', data);
    });

    this.socket.on('gardenStatusUpdate', (data: { gardenId: string; status: string }) => {
      this.emit('gardenStatusUpdate', data);
    });

    // Event updates
    this.socket.on('eventUpdate', (data: { eventId: string; type: string; data: any }) => {
      this.emit('eventUpdate', data);
    });

    // Dog rating updates
    this.socket.on('dogRatingUpdate', (data: { dogId: string; rating: number }) => {
      this.emit('dogRatingUpdate', data);
    });

    // Gamification events
    this.socket.on('points_updated', (data: GamificationUpdateData) => {
      console.log('🎮 Points updated:', data);
      this.emit('points_updated', data);
    });

    this.socket.on('level_up', (data: GamificationUpdateData) => {
      console.log('🎮 Level up:', data);
      this.emit('level_up', data);
    });

    this.socket.on('streak_updated', (data: GamificationUpdateData) => {
      console.log('🎮 Streak updated:', data);
      this.emit('streak_updated', data);
    });

    this.socket.on('achievement_unlocked', (data: GamificationUpdateData) => {
      console.log('🎮 Achievement unlocked:', data);
      this.emit('achievement_unlocked', data);
    });

    this.socket.on('mission_completed', (data: GamificationUpdateData) => {
      console.log('🎮 Mission completed:', data);
      this.emit('mission_completed', data);
    });

    // Generic gamification update (fallback)
    this.socket.on('gamification_update', (data: GamificationUpdateData) => {
      console.log('🎮 Gamification update:', data);
      this.emit('gamification_update', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket manually disconnected');
    }
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      this.listeners[event] = [];
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Outgoing events
  joinGarden(gardenId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('joinGarden', { gardenId });
    }
  }

  leaveGarden(gardenId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leaveGarden', { gardenId });
    }
  }

  joinChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('joinChat', { chatId });
    }
  }

  leaveChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leaveChat', { chatId });
    }
  }

  sendMessage(chatId: string, content: string, messageType: 'text' | 'image' | 'location' = 'text'): void {
    if (this.socket?.connected) {
      this.socket.emit('sendMessage', {
        chatId,
        content,
        messageType
      });
    }
  }

  setTyping(chatId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { chatId, isTyping });
    }
  }

  updateLocation(latitude: number, longitude: number): void {
    if (this.socket?.connected) {
      this.socket.emit('updateLocation', { latitude, longitude });
    }
  }

  markNotificationAsRead(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('markNotificationRead', { notificationId });
    }
  }

  // Status methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): string {
    if (!this.socket) return 'not_initialized';
    if (this.socket.connected) return 'connected';
    if (this.socket.disconnected) return 'disconnected';
    return 'connecting';
  }

  // Reconnect manually
  async reconnect(): Promise<void> {
    if (this.socket) {
      this.disconnect();
    }
    await this.connect();
  }
}

export default new WebSocketService();