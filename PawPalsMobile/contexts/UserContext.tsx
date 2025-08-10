import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, userApi, authApi, apiClient, AuthResponse, Badge, Dog, dogsApi } from '../services/api';
import WebSocketService from '../services/websocket';

interface UserContextType {
  // User state
  user: User | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  loading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setGuestMode: (isGuest: boolean) => Promise<void>;
  
  // User data management
  refreshUserData: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  updatePreferences: (preferences: any) => Promise<{ success: boolean; error?: string }>;
  reloadDogs: () => Promise<void>;
  
  // Real-time data
  badges: Badge[];
  dogs: Dog[];
  stats: UserStats | null;
  
  // Loading states
  refreshing: boolean;
  updating: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

interface UserStats {
  totalPoints: number;
  currentLevel: number;
  currentStreak: number;
  totalVisits: number;
  friendsCount: number;
  eventsAttended: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Real-time data states
  const [badges, setBadges] = useState<Badge[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Initialize user state on app start
  useEffect(() => {
    initializeUser();
  }, []);

  // Auto-refresh user data every 5 minutes when logged in
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoggedIn && !isGuest) {
      interval = setInterval(() => {
        refreshUserData(false); // Silent refresh
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoggedIn, isGuest, refreshUserData]);

  // WebSocket connection management
  useEffect(() => {
    if (isLoggedIn && !isGuest) {
      // Connect to WebSocket
      WebSocketService.connect();
      
      // Listen for real-time user updates
      WebSocketService.on('notification', async (notification: any) => {
        // Handle incoming notifications
        console.log('Received notification:', notification);
        
        // Process the notification (you can add custom handling here)
        console.log('Processing server notification:', notification);
        
        // You can trigger a notification modal or update UI here
      });

      // Listen for connection status
      WebSocketService.on('connected', () => {
        console.log('WebSocket connected for user');
      });

      WebSocketService.on('disconnected', (data: any) => {
        console.log('WebSocket disconnected:', data.reason);
      });

    } else {
      // Disconnect WebSocket when user logs out or is guest
      WebSocketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      WebSocketService.off('notification');
      WebSocketService.off('connected');
      WebSocketService.off('disconnected');
    };
  }, [isLoggedIn, isGuest]);

  // Helper function to extract essential user data for storage (avoid SecureStore 2048 byte limit)
  const getEssentialUserData = (userData: any) => ({
    _id: userData._id,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profileImage: userData.profileImage || userData.image,
    points: userData.points || 0,
    level: userData.level || 1,
    currentStreak: userData.currentStreak || 0,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt
  });

  const initializeUser = async () => {
    try {
      setLoading(true);
      
      // Check guest mode
      const guestMode = await SecureStore.getItemAsync('isGuest');
      if (guestMode === 'true') {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      // Check for stored user token
      const token = await SecureStore.getItemAsync('userToken');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsLoggedIn(true);
          apiClient.setToken(token);
          
          // Load user data (including mock data in development)
          await loadUserData();
          
          // Try to refresh from server (will fallback to mock data if fails)  
          await refreshUserData(false);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          await clearUserData();
        }
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearUserData = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('userData');
      await SecureStore.deleteItemAsync('isGuest');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
    
    setUser(null);
    setIsLoggedIn(false);
    setIsGuest(false);
    setBadges([]);
    setDogs([]);
    setStats(null);
    apiClient.clearToken();
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      const response = await authApi.login(email, password);
      
      if (response.success && response.data) {
        const authData = response.data;
        
        // Store tokens and user data
        await SecureStore.setItemAsync('userToken', authData.token);
        await SecureStore.setItemAsync('refreshToken', authData.refreshToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(authData.user)));
        await SecureStore.deleteItemAsync('isGuest');
        
        // Update state
        setUser(authData.user);
        setIsLoggedIn(true);
        setIsGuest(false);
        apiClient.setToken(authData.token);
        
        // Load additional user data
        await loadUserData();
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      const response = await authApi.register(userData);
      
      if (response.success && response.data) {
        const authData = response.data;
        
        // Store tokens and user data
        await SecureStore.setItemAsync('userToken', authData.token);
        await SecureStore.setItemAsync('refreshToken', authData.refreshToken);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(authData.user)));
        await SecureStore.deleteItemAsync('isGuest');
        
        // Update state
        setUser(authData.user);
        setIsLoggedIn(true);
        setIsGuest(false);
        apiClient.setToken(authData.token);
        
        // Load additional user data
        await loadUserData();
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      await authApi.logout();
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
    }
    
    // Clear local data regardless of API call success
    await clearUserData();
  };

  const setGuestMode = async (guestMode: boolean) => {
    try {
      if (guestMode) {
        await SecureStore.setItemAsync('isGuest', 'true');
        await clearUserData();
        setIsGuest(true);
      } else {
        await SecureStore.deleteItemAsync('isGuest');
        setIsGuest(false);
      }
    } catch (error) {
      console.error('Error setting guest mode:', error);
    }
  };

  const loadUserData = useCallback(async () => {
    try {
      console.log('🔄 Loading user data from backend...');
      
      // Try to load from API first
      const [dogsResponse, badgesResponse, statsResponse] = await Promise.all([
        dogsApi.getUserDogs(),
        userApi.getBadges(),
        userApi.getStats(),
      ]);

      console.log('🐕 Dogs response:', { success: dogsResponse.success, dataLength: dogsResponse.data?.length, error: dogsResponse.error });

      // Handle dogs response
      if (dogsResponse.success && Array.isArray(dogsResponse.data)) {
        setDogs(dogsResponse.data);
        console.log(`✅ Loaded ${dogsResponse.data.length} dogs from backend`);
      } else {
        // Log the specific error
        console.log('❌ Failed to load dogs from backend:', dogsResponse.error);
        
        if (__DEV__) {
          // Show error message instead of falling back to mock data immediately
          console.log('⚠️  Backend error - check if you are logged in and server is running');
          
          // Only use mock data if explicitly requested or for testing
          // For now, let's keep empty array to show the real state
          setDogs([]);
        } else {
          // In production, keep empty array
          setDogs([]);
        }
      }

      // Only use mock data for development testing (remove this in production)
      if (__DEV__ && dogsResponse.error?.includes('authenticate')) {
        console.log('🧪 DEV MODE: Using mock data because user not authenticated');
        setDogs([
          {
            _id: '1',
            name: 'מקס',
            owner: user?._id || 'mock',
            breed: 'גולדן רטריבר',
            age: 3,
            size: 'large',
            weight: 30,
            gender: 'male',
            description: 'כלב חברותי ואנרגטי שאוהב לשחק',
            isActive: true,
            image: undefined,
            medicalInfo: {
              vaccinated: true,
              healthIssues: [],
              medications: []
            },
            personality: {
              friendly: 5,
              energetic: 4,
              social: 5,
              aggressive: 1
            },
            profileVisibility: 'public',
            ratings: {
              average: 4.5,
              count: 12,
              breakdown: {
                friendliness: 5,
                playfulness: 4.5,
                obedience: 4,
                energy: 4.5
              }
            },
            popularity: {
              friendsCount: 8,
              status: 'popular',
              lastUpdated: new Date()
            },
            socialStats: {
              totalMeetings: 24,
              totalPlaymates: 15,
              lastActivity: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            totalVisits: 24,
            photosCount: 5
          },
          {
            _id: '2', 
            name: 'לונה',
            owner: user?._id || 'mock',
            breed: 'לברדור',
            age: 2,
            size: 'medium',
            weight: 25,
            gender: 'female',
            description: 'כלבה מתוקה ורגועה',
            isActive: true,
            image: undefined,
            medicalInfo: {
              vaccinated: true,
              healthIssues: [],
              medications: []
            },
            personality: {
              friendly: 5,
              energetic: 3,
              social: 4,
              aggressive: 1
            },
            profileVisibility: 'public',
            ratings: {
              average: 4.8,
              count: 8,
              breakdown: {
                friendliness: 5,
                playfulness: 4,
                obedience: 5,
                energy: 3.5
              }
            },
            popularity: {
              friendsCount: 5,
              status: 'popular',
              lastUpdated: new Date()
            },
            socialStats: {
              totalMeetings: 18,
              totalPlaymates: 10,
              lastActivity: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            totalVisits: 18,
            photosCount: 3
          }
        ]);
      }

      // Handle badges response
      if (badgesResponse.success) {
        setBadges(badgesResponse.data || []);
      } else if (__DEV__) {
        setBadges([
          {
            _id: '1',
            name: 'מבקר ראשון',
            description: 'ביקור ראשון בגן כלבים',
            icon: 'star',
            earnedAt: new Date().toISOString(),
            category: 'visits'
          }
        ]);
      }

      // Handle stats response
      if (statsResponse.success) {
        setStats(statsResponse.data || null);
      } else if (__DEV__) {
        setStats({
          totalPoints: user?.points || 150,
          currentLevel: user?.level || 2,
          currentStreak: user?.currentStreak || 5,
          totalVisits: 12,
          friendsCount: 8,
          eventsAttended: 3
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      
      // Fallback to empty data if everything fails
      if (!__DEV__) {
        setDogs([]);
        setBadges([]);
        setStats(null);
      }
    }
  }, [user?._id]);

  const refreshUserData = useCallback(async (showRefreshing = true) => {
    if (!isLoggedIn || isGuest) return;
    
    try {
      if (showRefreshing) {
        setRefreshing(true);
      }
      
      // Refresh current user data
      const userResponse = await userApi.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(userResponse.data)));
      }
      
      // Refresh additional data
      await loadUserData();
      
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      }
    }
  }, [isLoggedIn, isGuest, loadUserData]);

  const reloadDogs = useCallback(async () => {
    if (!isLoggedIn || isGuest) {
      console.log('👤 Cannot reload dogs: user not logged in or is guest');
      return;
    }
    
    try {
      console.log('🔄 Reloading dogs from backend...');
      const dogsResponse = await dogsApi.getUserDogs();
      
      console.log('🐕 Reload dogs response:', { 
        success: dogsResponse.success, 
        dataLength: dogsResponse.data?.length, 
        error: dogsResponse.error 
      });
      
      if (dogsResponse.success && Array.isArray(dogsResponse.data)) {
        setDogs(dogsResponse.data);
        console.log(`✅ Reloaded ${dogsResponse.data.length} dogs from backend`);
      } else {
        console.error('❌ Failed to reload dogs:', dogsResponse.error);
        // Don't clear existing dogs on reload failure
      }
    } catch (error) {
      console.error('💥 Error reloading dogs:', error);
    }
  }, [isLoggedIn, isGuest]);

  // Debug function - force reload dogs (for testing)
  const debugReloadDogs = useCallback(async () => {
    console.log('🧪 DEBUG: Force reloading dogs...');
    console.log('🧪 DEBUG: User state:', { isLoggedIn, isGuest, userId: user?._id });
    console.log('🧪 DEBUG: API URL:', process.env.EXPO_PUBLIC_API_URL);
    await reloadDogs();
  }, [isLoggedIn, isGuest, user?._id, reloadDogs]);

  // Add to global scope for debugging
  // @ts-ignore
  global.debugReloadDogs = debugReloadDogs;

  const updateProfile = useCallback(async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    try {
      setUpdating(true);
      
      const response = await userApi.updateProfile(data);
      
      if (response.success && response.data) {
        setUser(response.data);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(response.data)));
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Update failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    } finally {
      setUpdating(false);
    }
  }, []);

  const updatePreferences = useCallback(async (preferences: any): Promise<{ success: boolean; error?: string }> => {
    try {
      setUpdating(true);
      
      const response = await userApi.updatePreferences(preferences);
      
      if (response.success) {
        // Refresh user data to get updated preferences
        await refreshUserData(false);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Update failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    } finally {
      setUpdating(false);
    }
  }, [refreshUserData]);

  const contextValue: UserContextType = {
    // User state
    user,
    isLoggedIn,
    isGuest,
    loading,
    
    // Actions
    login,
    register,
    logout,
    setGuestMode,
    
    // User data management
    refreshUserData: useCallback(() => refreshUserData(true), [refreshUserData]),
    updateProfile,
    updatePreferences,
    reloadDogs,
    
    // Real-time data
    badges,
    dogs,
    stats,
    
    // Loading states
    refreshing,
    updating,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};