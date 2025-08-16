import apiClient from './config';

export interface Garden {
  _id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  manager: {
    _id: string;
    firstName?: string;
    lastName?: string;
  } | string;
  location: {
    address: string;
    city: string;
    coordinates: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  images?: string[];
  capacity: {
    maxDogs: number;
    maxSmallDogs?: number;
    maxLargeDogs?: number;
  };
  // Computed fields for backwards compatibility
  maxDogs?: number;
  maxSmallDogs?: number;
  maxLargeDogs?: number;
  currentOccupancy: number;
  currentVisitors?: Array<{
    user: {
      _id: string;
      firstName?: string;
      lastName?: string;
      profileImage?: string;
    };
    dog: {
      _id: string;
      name: string;
      breed?: string;
      size?: string;
      age?: number;
      image?: string;
    };
    checkInTime: string;
  }>;
  openingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  amenities: string[];
  rules: string[];
  requirements: {
    vaccinationRequired: boolean;
    minAge: number;
    maxAge?: number;
    sizeRestrictions: string[];
  };
  pricing: {
    type: 'free' | 'paid' | 'membership';
    price: number;
    currency: string;
  };
  statistics: {
    totalVisits: number;
    averageRating: number;
    totalReviews: number;
  };
  // Computed fields for backwards compatibility
  averageRating?: number;
  totalReviews?: number;
  totalVisits?: number;
  distance?: number; // Added by client for location-based queries
  features: {
    allowsPhotoSharing: boolean;
    requiresReservation: boolean;
    hasEvents: boolean;
  };
  eventSettings: {
    allowEvents: boolean;
    requireApprovalForEvents: boolean;
    autoApproveEvents: boolean;
    maxEventsPerMonth: number;
    defaultEventDuration: number;
    eventCategories: string[];
  };
  newsletter: {
    enabled: boolean;
    allowPublicSubscriptions: boolean;
    autoWelcomeEmail: boolean;
    welcomeEmailSubject: string;
    welcomeEmailContent: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
  };
  customProfile: {
    enabled: boolean;
    html: string;
    css: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GardenQuery {
  search?: string;
  type?: 'public' | 'private';
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  page?: number;
  limit?: number;
  sortBy?: 'distance' | 'rating' | 'name' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface Visit {
  _id: string;
  user: string;
  garden: Garden;
  checkInTime: string;
  checkOutTime?: string;
  duration?: number;
  dogs: string[];
  status: 'active' | 'completed';
}

class GardensService {
  async getGardens(query: GardenQuery = {}): Promise<Garden[]> {
    try {
      const response = await apiClient.get('/gardens', { params: query });
      let gardens: any[] = [];
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        gardens = response.data;
      } else if (response.data && response.data.gardens) {
        gardens = response.data.gardens;
      } else if (response.data && response.data.data) {
        gardens = response.data.data;
      }
      
      // Transform data to ensure compatibility
      return gardens.map(this.transformGardenData);
    } catch (error: any) {
      console.error('Get gardens error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch gardens');
    }
  }

  // Transform garden data to ensure backwards compatibility
  private transformGardenData(garden: any): Garden {
    return {
      ...garden,
      // Ensure backwards compatibility for maxDogs fields
      maxDogs: garden.maxDogs || garden.capacity?.maxDogs || 20,
      maxSmallDogs: garden.maxSmallDogs || garden.capacity?.maxSmallDogs,
      maxLargeDogs: garden.maxLargeDogs || garden.capacity?.maxLargeDogs,
      // Ensure backwards compatibility for statistics
      averageRating: garden.averageRating || garden.statistics?.averageRating || 0,
      totalReviews: garden.totalReviews || garden.statistics?.totalReviews || 0,
      totalVisits: garden.totalVisits || garden.statistics?.totalVisits || 0,
      // Ensure location is properly formatted
      location: {
        ...garden.location,
        coordinates: garden.location?.coordinates || {
          type: 'Point',
          coordinates: [0, 0]
        }
      }
    } as Garden;
  }

  async getGardenById(id: string): Promise<Garden> {
    try {
      const response = await apiClient.get(`/gardens/${id}`);
      let garden: any;
      
      // Handle different response formats
      if (response.data && response.data.data) {
        garden = response.data.data;
      } else if (response.data && response.data.garden) {
        garden = response.data.garden;
      } else {
        garden = response.data;
      }
      
      // Transform data to ensure compatibility
      return this.transformGardenData(garden);
    } catch (error: any) {
      console.error('Get garden error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch garden');
    }
  }

  async getNearbyGardens(latitude: number, longitude: number, radius: number = 10): Promise<Garden[]> {
    try {
      const response = await apiClient.get('/gardens', {
        params: { lat: latitude, lng: longitude, maxDistance: radius }
      });
      let gardens: any[] = [];
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        gardens = response.data;
      } else if (response.data && response.data.gardens) {
        gardens = response.data.gardens;
      } else if (response.data && response.data.data) {
        gardens = response.data.data;
      }
      
      // Transform data to ensure compatibility
      return gardens.map(this.transformGardenData);
    } catch (error: any) {
      console.error('Get nearby gardens error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch nearby gardens');
    }
  }

  async searchDogParks(query: string, latitude?: number, longitude?: number): Promise<any[]> {
    try {
      const response = await apiClient.get('/gardens/search-dog-parks', {
        params: { query, latitude, longitude }
      });
      return response.data;
    } catch (error: any) {
      console.error('Search dog parks error:', error);
      throw new Error(error.response?.data?.message || 'Failed to search dog parks');
    }
  }

  async checkIn(gardenId: string, dogs: string[] = []): Promise<Visit> {
    try {
      const response = await apiClient.post('/visits/checkin', {
        garden: gardenId,
        dogs
      });
      return response.data;
    } catch (error: any) {
      console.error('Check in error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check in');
    }
  }

  async checkOut(visitId: string): Promise<Visit> {
    try {
      const response = await apiClient.post(`/visits/${visitId}/checkout`);
      return response.data;
    } catch (error: any) {
      console.error('Check out error:', error);
      throw new Error(error.response?.data?.message || 'Failed to check out');
    }
  }

  async getCurrentVisit(gardenId: string): Promise<Visit | null> {
    try {
      const response = await apiClient.get(`/visits/current/${gardenId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No current visit
      }
      console.error('Get current visit error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get current visit');
    }
  }

  async getVisitHistory(page: number = 1, limit: number = 20): Promise<Visit[]> {
    try {
      const response = await apiClient.get('/visits/history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get visit history error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get visit history');
    }
  }

  async addToFavorites(gardenId: string): Promise<void> {
    try {
      await apiClient.post('/users/favorites', { gardenId });
    } catch (error: any) {
      console.error('Add to favorites error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add to favorites');
    }
  }

  async removeFromFavorites(gardenId: string): Promise<void> {
    try {
      await apiClient.delete(`/users/favorites/${gardenId}`);
    } catch (error: any) {
      console.error('Remove from favorites error:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove from favorites');
    }
  }

  async getFavoriteGardens(): Promise<Garden[]> {
    try {
      const response = await apiClient.get('/users/favorites');
      return response.data;
    } catch (error: any) {
      console.error('Get favorite gardens error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get favorite gardens');
    }
  }

  async scanQRCode(qrCode: string): Promise<{ garden: Garden; checkIn?: Visit }> {
    try {
      const response = await apiClient.post('/gardens/qr-checkin', { qrCode });
      return response.data;
    } catch (error: any) {
      console.error('QR scan error:', error);
      throw new Error(error.response?.data?.message || 'Failed to scan QR code');
    }
  }
}

export default new GardensService();