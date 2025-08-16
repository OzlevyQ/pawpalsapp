import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// Optimized field selections for common use cases
export const OptimizedFields = {
  // User profile fields
  USER_PROFILE_BASIC: ['firstName', 'lastName', 'email', 'profileImage', 'gamification.points', 'gamification.level'],
  USER_PROFILE_STATS: ['firstName', 'lastName', 'email', 'profileImage', 'gamification.points', 'gamification.level', 'gamification.currentStreak'],
  
  // Dog fields
  DOG_LIST_BASIC: ['name', 'breed', 'age', 'image', 'owner'],
  DOG_PROFILE_BASIC: ['name', 'breed', 'age', 'image', 'size', 'gender', 'description'],
  DOG_PROFILE_DETAILED: ['name', 'breed', 'age', 'image', 'size', 'gender', 'description', 'personality', 'medicalInfo'],
  
  // Garden fields
  GARDEN_LIST_BASIC: ['name', 'location.address', 'image', 'averageRating', 'currentOccupancy'],
  GARDEN_DETAIL_BASIC: ['name', 'location.address', 'image', 'averageRating', 'currentOccupancy', 'maxDogs', 'amenities', 'type'],
  GARDEN_NEARBY: ['name', 'location.address', 'image', 'averageRating', 'currentOccupancy', 'location.coordinates'],
  
  // Visit fields
  VISIT_LIST_BASIC: ['checkInTime', 'checkOutTime', 'garden', 'dogs', 'status', 'duration'],
  VISIT_ACTIVE: ['checkInTime', 'garden', 'dogs', 'status', 'notes'],
  VISIT_HISTORY: ['checkInTime', 'checkOutTime', 'garden', 'dogs', 'status', 'duration', 'createdAt'],
} as const;

// Helper function to convert image to base64
const convertImageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to convert image');
  }
};

// Types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  image?: string; // Alternative field name for profile image
  points: number;
  level: number;
  currentStreak: number;
  totalVisits: number;
  badges: Badge[];
  dogs: Dog[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  _id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: 'visits' | 'social' | 'events' | 'achievements';
}

export interface Dog {
  _id: string;
  name: string;
  owner: string | { _id: string; firstName: string; lastName: string };
  breed: string;
  age: number;
  gender: 'male' | 'female';
  size: 'small' | 'medium' | 'large';
  weight?: number;
  description?: string;
  image?: string;
  images?: string[];
  gallery?: string[];
  medicalInfo?: {
    vaccinated: boolean;
    lastVaccination?: Date;
    healthIssues?: string[];
    medications?: string[];
  };
  personality?: {
    friendly: number;
    energetic: number;
    social: number;
    aggressive: number;
  };
  specialNeeds?: string[];
  profileVisibility: 'public' | 'friends' | 'private';
  ratings: {
    average: number;
    count: number;
    breakdown: {
      friendliness: number;
      playfulness: number;
      obedience: number;
      energy: number;
    };
  };
  popularity: {
    friendsCount: number;
    status: 'new' | 'popular' | 'well-known' | 'beloved' | 'community-favorite';
    lastUpdated: Date;
  };
  socialStats: {
    totalMeetings: number;
    totalPlaymates: number;
    favoritePark?: string;
    lastActivity: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Additional stats from API response
  totalVisits?: number;
  photosCount?: number;
  friendsCount?: number;
}

export interface UserPreferences {
  notifications: {
    events: boolean;
    social: boolean;
    marketing: boolean;
    push: boolean;
  };
  privacy: {
    showProfile: boolean;
    showDogs: boolean;
    showActivity: boolean;
  };
  language: 'en' | 'he';
  theme: 'light' | 'dark';
}

export interface Visit {
  _id: string;
  user: string | User;
  dogs: (string | Dog)[];
  garden: string | Garden;
  checkInTime: string;
  checkOutTime?: string;
  duration?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Garden {
  _id: string;
  name: string;
  description?: string;
  location: {
    address: string;
    coordinates: [number, number];
  };
  image?: string;
  images?: string[];
  amenities: string[];
  type: 'public' | 'private';
  averageRating: number;
  totalReviews: number;
  currentOccupancy: number;
  maxDogs: number;
  openingHours?: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  facilities?: {
    parking: boolean;
    water: boolean;
    shade: boolean;
    lighting: boolean;
    fencing: boolean;
    wasteDisposal: boolean;
    seating: boolean;
    agility: boolean;
  };
  rules?: string[];
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  points: number;
  level: number;
  totalVisits: number;
  totalDuration: number;
  currentStreak: number;
  longestStreak: number;
  badgesCount: number;
  achievementsCount: number;
  friendsCount: number;
  eventsAttended: number;
}

export interface UserLevel {
  currentLevel: number;
  currentLevelTitle: string;
  pointsForCurrent: number;
  pointsForNext: number;
  progressToNext: number;
  totalPoints: number;
}

export interface Level {
  level: number;
  title: string;
  pointsRequired: number;
  rewards: {
    badgeUnlocked?: string;
    specialFeatures?: string[];
  };
}

export interface GamificationActivity {
  _id: string;
  type: 'badge_earned' | 'achievement_completed' | 'level_up' | 'streak_milestone';
  title: string;
  description: string;
  points?: number;
  icon: string;
  createdAt: string;
}

export interface Mission {
  _id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  targetValue: number;
  pointsReward: number;
  badgeReward?: string;
  specialReward?: any;
  requirements?: string[];
  icon: string;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
}

export interface UserMission {
  _id: string;
  user: string | User;
  mission: string | Mission;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: string;
  rewardsClaimed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MissionProgress {
  mission: Mission;
  userMission: UserMission | null;
  progressPercentage: number;
  canComplete: boolean;
}

export interface Achievement {
  _id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: string;
  rewards: {
    points: number;
    badge?: string;
  };
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  status: 'active' | 'at_risk' | 'broken' | 'none';
  nextMilestone: number;
  daysUntilMilestone: number;
  lastVisitDate?: string;
}

export interface LeaderboardEntry {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  value: number;
  rank: number;
  change: number;
}

export interface UserBadge {
  _id: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'visits' | 'streaks' | 'social' | 'levels' | 'special' | 'exploration';
  earnedAt: string;
}

export interface BadgeDefinition {
  _id: string;
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'visits' | 'streaks' | 'social' | 'levels' | 'special' | 'exploration';
  requirements: {
    type: string;
    target: number;
  };
  rewards: {
    points: number;
  };
}

export interface BadgeStats {
  total: number;
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
}

export interface Friend {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  status: 'accepted';
  createdAt: string;
}

export interface FriendRequest {
  _id: string;
  requester: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  recipient: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// HTTP Client with authentication
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await SecureStore.getItemAsync('userToken');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (!this.token) {
      await this.loadToken();
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          await this.refreshToken();
          throw new Error('Authentication failed');
        }

        return {
          success: false,
          data: null as T,
          error: data.error || data.message || `HTTP ${response.status}`
        };
      }

      // Handle different response formats from the backend
      // Some endpoints return just the data, others return { message, data, visit, etc. }
      let responseData: T;
      
      if (data.visit !== undefined) {
        // For visit endpoints that return { message, visit, ... }
        // Handle null/undefined visit properly
        responseData = data.visit as T;
      } else if (data.data !== undefined) {
        // For endpoints that return { data, message }
        // Handle null/undefined data properly
        responseData = data.data as T;
      } else {
        // For endpoints that return the data directly (like visits with total + visits)
        responseData = data as T;
      }

      return {
        success: true,
        data: responseData,
        message: data.message
      };
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        await SecureStore.setItemAsync('userToken', data.token);
        if (data.refreshToken) {
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        }
      } else {
        // Refresh failed, clear tokens
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('userData');
        this.token = null;
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Clear stored tokens on error
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('userData');
      this.token = null;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: data ? JSON.stringify(data) : undefined
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        data: null as T,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// User API endpoints
export const userApi = {
  // Get current user profile with optional field selection
  getCurrentUser: (fields?: string[]) => {
    const queryParams = fields ? `?fields=${fields.join(',')}` : '';
    return apiClient.get<User>(`/users/profile${queryParams}`);
  },
  
  // Update user profile
  updateProfile: (data: Partial<User>) => 
    apiClient.put<User>('/users/profile', data),
    
  // Update user preferences
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    apiClient.put<UserPreferences>('/users/profile', { preferences }),
    
  // Get user statistics - using gamification endpoint
  getStats: () => apiClient.get<{
    totalPoints: number;
    currentLevel: number;
    currentStreak: number;
    totalVisits: number;
    friendsCount: number;
    eventsAttended: number;
  }>('/gamification/stats'),
  
  // Get user badges - using gamification endpoint
  getBadges: () => apiClient.get<Badge[]>('/gamification/badges'),
  
  // Upload profile image - uploads image and updates user profile
  uploadProfileImage: async (imageUri: string): Promise<ApiResponse<User>> => {
    try {
      // Convert image to base64
      const imageBase64 = await convertImageToBase64(imageUri);
      
      // Update user profile with base64 image data
      const updateResponse = await apiClient.put<User>('/users/profile', {
        profileImage: imageBase64
      });
      
      return updateResponse;
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  },
};

// Dogs API endpoints  
export const dogsApi = {
  // Get user's dogs with optional field selection
  getUserDogs: (fields?: string[]) => {
    const queryParams = fields ? `?fields=${fields.join(',')}` : '';
    return apiClient.get<Dog[]>(`/dogs${queryParams}`);
  },
  
  // Get specific dog by ID with optional field selection
  getDogById: (dogId: string, fields?: string[]) => {
    const queryParams = fields ? `?fields=${fields.join(',')}` : '';
    return apiClient.get<Dog>(`/dogs/${dogId}${queryParams}`);
  },
  
  // Get dog public profile with optional field selection
  getDogPublicProfile: (dogId: string, fields?: string[]) => {
    const queryParams = fields ? `?fields=${fields.join(',')}` : '';
    return apiClient.get<Dog>(`/dogs/profile/${dogId}${queryParams}`);
  },
  
  // Add new dog
  addDog: (dog: Partial<Dog>) => 
    apiClient.post<Dog>('/dogs', dog),
    
  // Update dog
  updateDog: (dogId: string, data: Partial<Dog>) =>
    apiClient.put<Dog>(`/dogs/${dogId}`, data),
    
  // Update dog custom profile
  updateDogCustomProfile: (dogId: string, customProfile: { enabled: boolean; html: string; css: string }) =>
    apiClient.put<Dog>(`/dogs/${dogId}/custom-profile`, customProfile),
    
  // Delete dog
  deleteDog: (dogId: string) =>
    apiClient.delete(`/dogs/${dogId}`),
    
  // Upload dog image
  uploadDogImage: async (dogId: string, imageUri: string): Promise<ApiResponse<Dog>> => {
    try {
      // Convert image to base64
      const imageBase64 = await convertImageToBase64(imageUri);
      
      // Update dog with base64 image data
      const response = await apiClient.put<Dog>(`/dogs/${dogId}`, {
        image: imageBase64
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  },

};

// Visits API endpoints
export const visitsApi = {
  // Get user's visit history with optional field selection
  getMyVisits: (params?: { status?: string; garden?: string; dog?: string; page?: number; limit?: number; fields?: string[] }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.garden) queryParams.append('garden', params.garden);
    if (params?.dog) queryParams.append('dog', params.dog);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.fields) queryParams.append('fields', params.fields.join(','));
    
    const queryString = queryParams.toString();
    return apiClient.get<{ total: number; visits: Visit[] }>(`/visits/my-visits${queryString ? `?${queryString}` : ''}`);
  },

  // Get current active visit with optional field selection
  getActiveVisit: async (fields?: string[]): Promise<ApiResponse<Visit | null>> => {
    const queryParams = fields ? `?fields=${fields.join(',')}` : '';
    const result = await apiClient.get<Visit | null>(`/visits/active${queryParams}`);
    return result;
  },

  // Check into a park
  checkin: (gardenId: string, dogIds: string[], notes?: string) =>
    apiClient.post<Visit>('/visits/checkin', { gardenId, dogIds, notes }),

  // Check out from current visit
  checkout: async (visitId?: string, notes?: string): Promise<ApiResponse<Visit | null>> => {
    console.log('Checkout called with visitId:', visitId, 'notes:', notes);
    
    if (!visitId) {
      return {
        success: false,
        data: null,
        error: 'Visit ID is required for checkout'
      };
    }
    
    const payload: { visitId: string; notes?: string } = { visitId };
    if (notes) {
      payload.notes = notes;
    }
    
    try {
      console.log('Calling POST /visits/checkout with payload:', payload);
      const result = await apiClient.post<Visit>('/visits/checkout', payload);
      
      if (result.success) {
        console.log('Checkout successful');
        return result;
      } else {
        console.log('Checkout returned error:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Checkout failed'
      };
    }
  },
};

// Gamification API endpoints
export const gamificationApi = {
  // Get user stats
  getStats: () => apiClient.get<UserStats>('/gamification/stats'),

  // Get user level info
  getLevel: () => apiClient.get<UserLevel>('/gamification/level'),

  // Get all levels
  getLevels: () => apiClient.get<Level[]>('/gamification/levels'),

  // Get recent activity
  getActivity: () => apiClient.get<GamificationActivity[]>('/gamification/activity'),

  // Get achievements
  getAchievements: () => apiClient.get<Achievement[]>('/gamification/achievements'),

  // Get streak info
  getStreak: () => apiClient.get<StreakInfo>('/gamification/streak'),

  // Get streak leaderboard
  getStreakLeaderboard: () => apiClient.get<LeaderboardEntry[]>('/gamification/leaderboard/streak'),
};

// Badges API endpoints  
export const badgesApi = {
  // Get user badges - using the gamification endpoint
  getUserBadges: () => apiClient.get<UserBadge[]>('/gamification/badges'),

  // Get all available badges
  getAllBadges: () => apiClient.get<BadgeDefinition[]>('/gamification/badges/all'),

  // Get badge stats
  getBadgeStats: () => apiClient.get<BadgeStats>('/gamification/badges/stats'),
};

// Friendship API endpoints
export const friendshipApi = {
  // Get friends list
  getFriends: () => apiClient.get<Friend[]>('/friendships'),

  // Send friend request
  sendFriendRequest: (userId: string) => apiClient.post('/friendships/request', { userId }),

  // Accept friend request
  acceptFriend: (friendshipId: string) => apiClient.put(`/friendships/accept/${friendshipId}`),

  // Decline friend request
  declineFriend: (friendshipId: string) => apiClient.put(`/friendships/decline/${friendshipId}`),

  // Remove friend
  removeFriend: (friendId: string) => apiClient.delete(`/friendships/${friendId}`),

  // Get pending requests
  getPendingRequests: () => apiClient.get<FriendRequest[]>('/friendships/requests/pending'),

  // Get sent requests
  getSentRequests: () => apiClient.get<FriendRequest[]>('/friendships/requests/sent'),

  // Search friends
  searchFriends: (query: string) => apiClient.get<Friend[]>(`/friendships/search?q=${encodeURIComponent(query)}`),
};

// Authentication API endpoints
export const authApi = {
  // Login
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),
    
  // Register
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => apiClient.post<AuthResponse>('/auth/register', userData),
  
  // Logout
  logout: () => apiClient.post('/auth/logout'),
  
  // Forgot password
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
    
  // Reset password
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
    
  // Verify email
  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }),
    
  // Refresh token
  refreshToken: (refreshToken: string) =>
    apiClient.post<{ token: string; refreshToken?: string }>('/auth/refresh', { refreshToken }),
};

// Event types
export interface Event {
  _id: string;
  title: string;
  description: string;
  garden: {
    _id: string;
    name: string;
    location: {
      coordinates: [number, number];
      address?: string;
    };
  };
  organizer: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  eventDate: string;
  startTime: string;
  endTime: string;
  eventType: 'meetup' | 'training' | 'competition' | 'adoption' | 'social' | 'educational' | 'other';
  maxParticipants?: number;
  registrationDeadline: string;
  requiresApproval: boolean;
  allowWaitingList: boolean;
  participants: Array<{
    user: string | User;
    dogs: string[];
    registeredAt: string;
    status: 'pending' | 'approved' | 'rejected' | 'attended' | 'no-show';
    notes?: string;
  }>;
  waitingList: Array<{
    user: string | User;
    dogs: string[];
    addedAt: string;
  }>;
  requirements: {
    vaccinationRequired: boolean;
    sizeRestrictions?: string[];
    ageRestrictions?: {
      min?: number;
      max?: number;
    };
    other?: string[];
  };
  images?: string[];
  tags?: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isPublic: boolean;
  // Virtual fields
  participantCount: number;
  pendingCount: number;
  isFull: boolean;
  availableSpots?: number;
  createdAt: string;
  updatedAt: string;
}

// Events API endpoints
export const eventsApi = {
  // Get all public events with filtering
  getAllEvents: (params?: {
    gardenId?: string;
    eventType?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.gardenId) queryParams.append('gardenId', params.gardenId);
    if (params?.eventType) queryParams.append('eventType', params.eventType);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<{ total: number; events: Event[] }>(`/events${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get specific event by ID
  getEventById: (eventId: string) =>
    apiClient.get<{ message: string; data: Event }>(`/events/${eventId}`),
  
  // Create new event (requires authentication and permissions)
  createEvent: (eventData: {
    title: string;
    description: string;
    gardenId: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    eventType?: string;
    maxParticipants?: number;
    requiresApproval?: boolean;
    allowWaitingList?: boolean;
    requirements?: Event['requirements'];
    images?: string[];
    tags?: string[];
  }) => apiClient.post<{ message: string; event: Event }>('/events', eventData),
  
  // Register for event
  registerForEvent: (eventId: string, dogIds?: string[]) =>
    apiClient.post<{ status: string; message: string }>(`/events/${eventId}/register`, { dogIds }),
  
  // Cancel event registration
  cancelEventRegistration: (eventId: string) =>
    apiClient.delete<{ message: string }>(`/events/${eventId}/register`),
  
  // Update event (organizers only)
  updateEvent: (eventId: string, eventData: Partial<Event>) =>
    apiClient.put<{ message: string; event: Event }>(`/events/${eventId}`, eventData),
  
  // Cancel event (organizers only)
  cancelEvent: (eventId: string) =>
    apiClient.delete<{ message: string }>(`/events/${eventId}`),
  
  // Update participant status (organizers only)
  updateParticipantStatus: (eventId: string, participantId: string, status: string, notes?: string) =>
    apiClient.put<{ message: string; participant: any }>(`/events/${eventId}/participants/${participantId}`, { status, notes }),
  
  // Get events organized by current user
  getOrganizerEvents: () =>
    apiClient.get<{ message: string; data: Event[]; count: number }>('/events/organizer/my-events'),
};

// Notifications API endpoints
export const notificationsApi = {
  // Register push token
  registerToken: (tokenData: {
    token: string;
    platform: string;
    deviceName?: string;
    osVersion?: string;
    appVersion?: string;
  }) => apiClient.post('/notifications/register-token', tokenData),

  // Get user notifications
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
    if (params?.type) queryParams.append('type', params.type);

    const queryString = queryParams.toString();
    return apiClient.get(`/notifications${queryString ? `?${queryString}` : ''}`);
  },

  // Get unread count
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),

  // Mark notification as read
  markAsRead: (notificationId: string) => 
    apiClient.put(`/notifications/${notificationId}/read`),

  // Mark multiple notifications as read
  markMultipleAsRead: (notificationIds: string[]) =>
    apiClient.put('/notifications/mark-read', { notificationIds }),

  // Mark all notifications as read
  markAllAsRead: () => apiClient.put('/notifications/mark-all-read'),

  // Delete notification
  deleteNotification: (notificationId: string) =>
    apiClient.delete(`/notifications/${notificationId}`),

  // Delete all notifications
  deleteAllNotifications: () =>
    apiClient.delete('/notifications'),

  // Update notification settings
  updateSettings: (settings: {
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
      start: string;
      end: string;
    };
  }) => apiClient.put('/notifications/settings', settings),

  // Send test push notification (development only)
  sendTestNotification: (message?: string) =>
    apiClient.post('/notifications/test-push', { message }),

  // Create sample notifications (development only)
  createSamples: () => apiClient.post('/notifications/create-samples'),

  // Create test notification from server with push
  createTestNotification: (params?: { 
    type?: string; 
    title?: string; 
    content?: string; 
  }) => apiClient.post('/notifications/test', params),

  // Check push token status
  checkPushStatus: () => apiClient.get('/notifications/push-status'),

  // Get notification statistics (admin only)
  getStats: () => apiClient.get('/notifications/stats'),
};

// Gardens API endpoints
export const gardensApi = {
  // Get all gardens with optional field selection
  getAllGardens: (params?: {
    type?: 'public' | 'private';
    isOpen?: boolean;
    minRating?: number;
    limit?: number;
    skip?: number;
    fields?: string[];
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isOpen !== undefined) queryParams.append('isOpen', params.isOpen.toString());
    if (params?.minRating) queryParams.append('minRating', params.minRating.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.fields) queryParams.append('fields', params.fields.join(','));
    
    const queryString = queryParams.toString();
    return apiClient.get<{ total: number; gardens: Garden[] }>(`/gardens${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get specific garden by ID with optional field selection
  getGardenById: (gardenId: string, fields?: string[]) => {
    const queryParams = fields ? `?fields=${fields.join(',')}` : '';
    return apiClient.get<{ message: string; data: Garden }>(`/gardens/${gardenId}${queryParams}`);
  },
  
  // Search gardens
  searchGardens: (query: string, params?: {
    location?: [number, number];
    radius?: number; // in km
    type?: 'public' | 'private';
    isOpen?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    if (params?.location) {
      queryParams.append('lat', params.location[0].toString());
      queryParams.append('lng', params.location[1].toString());
    }
    if (params?.radius) queryParams.append('radius', params.radius.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isOpen !== undefined) queryParams.append('isOpen', params.isOpen.toString());
    
    return apiClient.get<{ total: number; gardens: Garden[] }>(`/gardens/search?${queryParams.toString()}`);
  },
  
  // Get nearby gardens with optional field selection
  getNearbyGardens: (latitude: number, longitude: number, radius = 10, fields?: string[]) => {
    const queryParams = new URLSearchParams();
    queryParams.append('lat', latitude.toString());
    queryParams.append('lng', longitude.toString());
    queryParams.append('radius', radius.toString());
    if (fields) queryParams.append('fields', fields.join(','));
    
    return apiClient.get<{ total: number; gardens: Garden[] }>(`/gardens/nearby?${queryParams.toString()}`);
  },
  
  // Get garden reviews
  getGardenReviews: (gardenId: string, params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<{ reviews: any[]; total: number }>(`/gardens/${gardenId}/reviews${queryString ? `?${queryString}` : ''}`);
  },
  
  // Add garden review
  addGardenReview: (gardenId: string, review: {
    rating: number;
    comment?: string;
    photos?: string[];
  }) => apiClient.post(`/gardens/${gardenId}/reviews`, review),
  
  // Get current visitors in garden
  getGardenVisitors: (gardenId: string) =>
    apiClient.get<{ visitors: any[]; count: number }>(`/gardens/${gardenId}/visitors`),
  
  // Report garden issue
  reportGardenIssue: (gardenId: string, issue: {
    type: string;
    description: string;
    photos?: string[];
  }) => apiClient.post(`/gardens/${gardenId}/report`, issue),
};

// Missions API
export const missionsApi = {
  // Get daily missions
  getDailyMissions: () => 
    apiClient.get<Mission[]>('/missions/daily'),
  
  // Get all available missions
  getAvailableMissions: (type?: 'daily' | 'weekly' | 'monthly' | 'special') => {
    const queryParams = new URLSearchParams();
    if (type) queryParams.append('type', type);
    const queryString = queryParams.toString();
    return apiClient.get<Mission[]>(`/missions/available${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get user's mission progress
  getMyProgress: () => 
    apiClient.get<UserMission[]>('/missions/my-progress'),
  
  // Get mission progress with details
  getMissionProgressDetails: () =>
    apiClient.get<MissionProgress[]>('/missions/my-progress?details=true'),
  
  // Update mission progress
  updateProgress: (missionId: string, progress: number) =>
    apiClient.post(`/missions/${missionId}/progress`, { progress }),
  
  // Complete a mission
  completeMission: (missionId: string) =>
    apiClient.post(`/missions/${missionId}/complete`),
  
  // Get mission statistics
  getStats: () =>
    apiClient.get<{
      totalCompleted: number;
      dailyCompleted: number;
      weeklyCompleted: number;
      monthlyCompleted: number;
      totalPoints: number;
      currentStreak: number;
      completionRate: number;
    }>('/missions/stats'),
};