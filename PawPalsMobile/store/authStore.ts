import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import AuthService, { User } from '../services/api/auth';
import WebSocketService from '../services/websocket';

// Custom storage for Zustand with SecureStore
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(name);
      return value;
    } catch (error) {
      console.error('Error getting item from secure store:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error('Error setting item in secure store:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error('Error removing item from secure store:', error);
    }
  },
};

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  googleSignIn: (idToken: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.login({ email, password });
          set({
            user: response.user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false,
            error: null,
          });
          
          // Connect WebSocket for authenticated users
          await WebSocketService.connect();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.register(userData);
          set({
            user: response.user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false,
            error: null,
          });
          
          // Connect WebSocket for authenticated users
          await WebSocketService.connect();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      googleSignIn: async (idToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.googleSignIn(idToken);
          set({
            user: response.user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false,
            error: null,
          });
          
          // Connect WebSocket for authenticated users
          await WebSocketService.connect();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      continueAsGuest: async () => {
        set({ isLoading: true, error: null });
        try {
          await AuthService.continueAsGuest();
          set({
            user: null,
            isAuthenticated: false,
            isGuest: true,
            isLoading: false,
            error: null,
          });
          
          // Disconnect WebSocket for guests
          WebSocketService.disconnect();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await AuthService.logout();
          
          // Disconnect WebSocket
          WebSocketService.disconnect();
          
          set({
            user: null,
            isAuthenticated: false,
            isGuest: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Logout error:', error);
          // Even if logout fails, clear local state
          set({
            user: null,
            isAuthenticated: false,
            isGuest: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshUser: async () => {
        try {
          const user = await AuthService.getCurrentUser();
          if (user) {
            set({ user });
          }
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      },

      clearError: () => {
        set({ error: null });
      },

      initialize: async () => {
        set({ isLoading: true });
        try {
          const [isAuthenticated, isGuest, user] = await Promise.all([
            AuthService.isAuthenticated(),
            AuthService.isGuest(),
            AuthService.getCurrentUser(),
          ]);

          set({
            isAuthenticated,
            isGuest,
            user,
            isLoading: false,
          });

          // Connect WebSocket if authenticated
          if (isAuthenticated && !isGuest) {
            await WebSocketService.connect();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            isAuthenticated: false,
            isGuest: false,
            user: null,
            isLoading: false,
            error: 'Failed to initialize authentication',
          });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => secureStorage),
      // Only persist essential auth state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);