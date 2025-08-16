import apiClient from './config';
import * as SecureStore from 'expo-secure-store';

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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  points: number;
  level: number;
  currentStreak: number;
  badges: string[];
  profileImage?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.data.token) {
        // Save token and user data
        await SecureStore.setItemAsync('userToken', response.data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(response.data.user)));
        // Remove guest flag if it exists
        await SecureStore.deleteItemAsync('isGuest');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      if (response.data.token) {
        // Save token and user data
        await SecureStore.setItemAsync('userToken', response.data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(response.data.user)));
        // Remove guest flag if it exists
        await SecureStore.deleteItemAsync('isGuest');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async googleSignIn(idToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/google', { idToken });
      
      if (response.data.token) {
        // Save token and user data
        await SecureStore.setItemAsync('userToken', response.data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(getEssentialUserData(response.data.user)));
        // Remove guest flag if it exists
        await SecureStore.deleteItemAsync('isGuest');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.response?.data?.message || 'Google sign in failed');
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear stored data regardless of API call success
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      await SecureStore.deleteItemAsync('isGuest');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await SecureStore.getItemAsync('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const isGuest = await SecureStore.getItemAsync('isGuest');
      return !!(token && isGuest !== 'true');
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async isGuest(): Promise<boolean> {
    try {
      const isGuest = await SecureStore.getItemAsync('isGuest');
      return isGuest === 'true';
    } catch (error) {
      console.error('Error checking guest status:', error);
      return false;
    }
  }

  async continueAsGuest(): Promise<void> {
    try {
      await SecureStore.setItemAsync('isGuest', 'true');
      // Clear any existing auth data
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (error) {
      console.error('Error setting guest mode:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const response = await apiClient.post('/auth/refresh');
      if (response.data.token) {
        await SecureStore.setItemAsync('userToken', response.data.token);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, user needs to login again
      await this.logout();
      throw error;
    }
  }
}

export default new AuthService();