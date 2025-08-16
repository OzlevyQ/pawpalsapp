import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  visitsApi, 
  gardensApi, 
  dogsApi, 
  userApi, 
  eventsApi, 
  gamificationApi,
  Visit, 
  Garden, 
  Dog, 
  User, 
  Event,
  OptimizedFields 
} from '../services/api';

// Query keys - centralized for consistency
export const QueryKeys = {
  // User related
  USER_PROFILE: ['user', 'profile'] as const,
  USER_STATS: ['user', 'stats'] as const,
  USER_BADGES: ['user', 'badges'] as const,
  
  // Dogs related
  USER_DOGS: ['dogs', 'user'] as const,
  DOG_DETAIL: (dogId: string) => ['dogs', 'detail', dogId] as const,
  DOG_PROFILE: (dogId: string) => ['dogs', 'profile', dogId] as const,
  
  // Visits related
  VISITS_HISTORY: ['visits', 'history'] as const,
  ACTIVE_VISIT: ['visits', 'active'] as const,
  
  // Gardens related
  GARDENS_ALL: ['gardens', 'all'] as const,
  GARDENS_NEARBY: (lat: number, lng: number, radius: number) => ['gardens', 'nearby', lat, lng, radius] as const,
  GARDEN_DETAIL: (gardenId: string) => ['gardens', 'detail', gardenId] as const,
  GARDEN_VISITORS: (gardenId: string) => ['gardens', 'visitors', gardenId] as const,
  
  // Events related
  EVENTS_ALL: ['events', 'all'] as const,
  EVENT_DETAIL: (eventId: string) => ['events', 'detail', eventId] as const,
  
  // Gamification
  GAMIFICATION_STATS: ['gamification', 'stats'] as const,
  GAMIFICATION_LEVEL: ['gamification', 'level'] as const,
  GAMIFICATION_STREAK: ['gamification', 'streak'] as const,
} as const;

// Cache time configurations for different data types
export const CacheTimes = {
  // Very dynamic data (2-3 minutes)
  VISITS: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  ACTIVE_VISIT: {
    staleTime: 30 * 1000, // 30 seconds - very dynamic
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Poll every 30 seconds when active
  },
  GARDEN_VISITORS: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  },
  
  // Moderately dynamic data (5-10 minutes)
  USER_PROFILE: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  USER_DOGS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  GAMIFICATION: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Static or rarely changing data (10-15 minutes)
  GARDENS: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  EVENTS: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  },
} as const;

// ============= USER HOOKS =============

/**
 * Hook to get current user profile with optimized caching
 */
export const useUserProfile = (fields?: string[]) => {
  return useQuery({
    queryKey: QueryKeys.USER_PROFILE,
    queryFn: () => userApi.getCurrentUser(fields || [...OptimizedFields.USER_PROFILE_STATS]),
    ...CacheTimes.USER_PROFILE,
    select: (response) => response.data,
  });
};

/**
 * Hook to get user statistics
 */
export const useUserStats = () => {
  return useQuery({
    queryKey: QueryKeys.USER_STATS,
    queryFn: () => userApi.getStats(),
    ...CacheTimes.GAMIFICATION,
    select: (response) => response.data,
  });
};

/**
 * Hook to get user badges
 */
export const useUserBadges = () => {
  return useQuery({
    queryKey: QueryKeys.USER_BADGES,
    queryFn: () => userApi.getBadges(),
    ...CacheTimes.GAMIFICATION,
    select: (response) => response.data,
  });
};

// ============= DOGS HOOKS =============

/**
 * Hook to get user's dogs with optimized caching
 */
export const useUserDogs = (fields?: string[]) => {
  return useQuery({
    queryKey: QueryKeys.USER_DOGS,
    queryFn: () => dogsApi.getUserDogs(fields || [...OptimizedFields.DOG_LIST_BASIC]),
    ...CacheTimes.USER_DOGS,
    select: (response) => response.data,
  });
};

/**
 * Hook to get specific dog details
 */
export const useDogDetail = (dogId: string, fields?: string[]) => {
  return useQuery({
    queryKey: QueryKeys.DOG_DETAIL(dogId),
    queryFn: () => dogsApi.getDogById(dogId, fields || [...OptimizedFields.DOG_PROFILE_DETAILED]),
    ...CacheTimes.USER_DOGS,
    enabled: !!dogId,
    select: (response) => response.data,
  });
};

/**
 * Hook to get dog public profile
 */
export const useDogProfile = (dogId: string, fields?: string[]) => {
  return useQuery({
    queryKey: QueryKeys.DOG_PROFILE(dogId),
    queryFn: () => dogsApi.getDogPublicProfile(dogId, fields || [...OptimizedFields.DOG_PROFILE_BASIC]),
    ...CacheTimes.USER_DOGS,
    enabled: !!dogId,
    select: (response) => response.data,
  });
};

// ============= VISITS HOOKS =============

/**
 * Hook to get visit history with optimized caching
 */
export const useVisitsHistory = (params?: {
  status?: string;
  garden?: string;
  dog?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...QueryKeys.VISITS_HISTORY, params],
    queryFn: () => visitsApi.getMyVisits({
      ...params,
      fields: [...OptimizedFields.VISIT_HISTORY],
    }),
    ...CacheTimes.VISITS,
    select: (response) => response.data,
  });
};

/**
 * Hook to get active visit with real-time updates
 */
export const useActiveVisit = () => {
  return useQuery({
    queryKey: QueryKeys.ACTIVE_VISIT,
    queryFn: () => visitsApi.getActiveVisit([...OptimizedFields.VISIT_ACTIVE]),
    ...CacheTimes.ACTIVE_VISIT,
    select: (response) => response.data,
  });
};

// ============= GARDENS HOOKS =============

/**
 * Hook to get all gardens with optimized caching
 */
export const useGardens = (params?: {
  type?: 'public' | 'private';
  isOpen?: boolean;
  minRating?: number;
  limit?: number;
  skip?: number;
}) => {
  return useQuery({
    queryKey: [...QueryKeys.GARDENS_ALL, params],
    queryFn: () => gardensApi.getAllGardens({
      ...params,
      fields: [...OptimizedFields.GARDEN_LIST_BASIC],
    }),
    ...CacheTimes.GARDENS,
    select: (response) => response.data,
  });
};

/**
 * Hook to get nearby gardens
 */
export const useNearbyGardens = (
  latitude: number,
  longitude: number,
  radius: number = 10,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: QueryKeys.GARDENS_NEARBY(latitude, longitude, radius),
    queryFn: () => gardensApi.getNearbyGardens(
      latitude,
      longitude,
      radius,
      [...OptimizedFields.GARDEN_NEARBY]
    ),
    ...CacheTimes.GARDENS,
    enabled: enabled && !!latitude && !!longitude,
    select: (response) => response.data,
  });
};

/**
 * Hook to get garden details
 */
export const useGardenDetail = (gardenId: string, fields?: string[]) => {
  return useQuery({
    queryKey: QueryKeys.GARDEN_DETAIL(gardenId),
    queryFn: () => gardensApi.getGardenById(gardenId, fields || [...OptimizedFields.GARDEN_DETAIL_BASIC]),
    ...CacheTimes.GARDENS,
    enabled: !!gardenId,
    select: (response) => response.data?.data,
  });
};

/**
 * Hook to get current garden visitors (real-time data)
 */
export const useGardenVisitors = (gardenId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: QueryKeys.GARDEN_VISITORS(gardenId),
    queryFn: () => gardensApi.getGardenVisitors(gardenId),
    ...CacheTimes.GARDEN_VISITORS,
    enabled: enabled && !!gardenId,
    select: (response) => response.data,
  });
};

// ============= EVENTS HOOKS =============

/**
 * Hook to get all events with filtering
 */
export const useEvents = (params?: {
  gardenId?: string;
  eventType?: string;
  status?: string;
  limit?: number;
  skip?: number;
}) => {
  return useQuery({
    queryKey: [...QueryKeys.EVENTS_ALL, params],
    queryFn: () => eventsApi.getAllEvents(params),
    ...CacheTimes.EVENTS,
    select: (response) => response.data,
  });
};

/**
 * Hook to get event details
 */
export const useEventDetail = (eventId: string) => {
  return useQuery({
    queryKey: QueryKeys.EVENT_DETAIL(eventId),
    queryFn: () => eventsApi.getEventById(eventId),
    ...CacheTimes.EVENTS,
    enabled: !!eventId,
    select: (response) => response.data?.data,
  });
};

// ============= GAMIFICATION HOOKS =============

/**
 * Hook to get gamification stats
 */
export const useGamificationStats = () => {
  return useQuery({
    queryKey: QueryKeys.GAMIFICATION_STATS,
    queryFn: () => gamificationApi.getStats(),
    ...CacheTimes.GAMIFICATION,
    select: (response) => response.data,
  });
};

/**
 * Hook to get user level information
 */
export const useUserLevel = () => {
  return useQuery({
    queryKey: QueryKeys.GAMIFICATION_LEVEL,
    queryFn: () => gamificationApi.getLevel(),
    ...CacheTimes.GAMIFICATION,
    select: (response) => response.data,
  });
};

/**
 * Hook to get streak information
 */
export const useStreakInfo = () => {
  return useQuery({
    queryKey: QueryKeys.GAMIFICATION_STREAK,
    queryFn: () => gamificationApi.getStreak(),
    ...CacheTimes.GAMIFICATION,
    select: (response) => response.data,
  });
};

// ============= MUTATION HOOKS =============

/**
 * Hook for check-in mutation with optimistic updates
 */
export const useCheckinMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gardenId, dogIds, notes }: { gardenId: string; dogIds: string[]; notes?: string }) =>
      visitsApi.checkin(gardenId, dogIds, notes),
    onSuccess: (response) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QueryKeys.ACTIVE_VISIT });
      queryClient.invalidateQueries({ queryKey: QueryKeys.VISITS_HISTORY });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STATS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STREAK });
      
      // Update garden visitor count if we have the garden ID
      if (response.data?.garden) {
        const gardenId = typeof response.data.garden === 'string' ? response.data.garden : response.data.garden._id;
        queryClient.invalidateQueries({ queryKey: QueryKeys.GARDEN_VISITORS(gardenId) });
      }
    },
  });
};

/**
 * Hook for check-out mutation with optimistic updates
 */
export const useCheckoutMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ visitId, notes }: { visitId: string; notes?: string }) =>
      visitsApi.checkout(visitId, notes),
    onSuccess: (response) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QueryKeys.ACTIVE_VISIT });
      queryClient.invalidateQueries({ queryKey: QueryKeys.VISITS_HISTORY });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STATS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STREAK });
      
      // Update garden visitor count if we have the garden ID
      if (response.data?.garden) {
        const gardenId = typeof response.data.garden === 'string' ? response.data.garden : response.data.garden._id;
        queryClient.invalidateQueries({ queryKey: QueryKeys.GARDEN_VISITORS(gardenId) });
      }
    },
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<User>) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USER_PROFILE });
    },
  });
};

/**
 * Hook for adding a new dog
 */
export const useAddDogMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (dog: Partial<Dog>) => dogsApi.addDog(dog),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USER_DOGS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.USER_PROFILE });
    },
  });
};

/**
 * Hook for updating a dog
 */
export const useUpdateDogMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ dogId, data }: { dogId: string; data: Partial<Dog> }) =>
      dogsApi.updateDog(dogId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USER_DOGS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOG_DETAIL(variables.dogId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOG_PROFILE(variables.dogId) });
    },
  });
};

/**
 * Hook for deleting a dog
 */
export const useDeleteDogMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (dogId: string) => dogsApi.deleteDog(dogId),
    onSuccess: (response, dogId) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USER_DOGS });
      queryClient.removeQueries({ queryKey: QueryKeys.DOG_DETAIL(dogId) });
      queryClient.removeQueries({ queryKey: QueryKeys.DOG_PROFILE(dogId) });
    },
  });
};

/**
 * Hook for event registration
 */
export const useEventRegistrationMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, dogIds }: { eventId: string; dogIds?: string[] }) =>
      eventsApi.registerForEvent(eventId, dogIds),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.EVENT_DETAIL(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.EVENTS_ALL });
    },
  });
};

/**
 * Hook for canceling event registration
 */
export const useCancelEventRegistrationMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId: string) => eventsApi.cancelEventRegistration(eventId),
    onSuccess: (response, eventId) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.EVENT_DETAIL(eventId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.EVENTS_ALL });
    },
  });
};

// ============= UTILITY HOOKS =============

/**
 * Hook to prefetch nearby gardens based on location
 * Useful for preloading data when user location is available
 */
export const usePrefetchNearbyGardens = () => {
  const queryClient = useQueryClient();
  
  return (latitude: number, longitude: number, radius: number = 10) => {
    queryClient.prefetchQuery({
      queryKey: QueryKeys.GARDENS_NEARBY(latitude, longitude, radius),
      queryFn: () => gardensApi.getNearbyGardens(
        latitude,
        longitude,
        radius,
        [...OptimizedFields.GARDEN_NEARBY]
      ),
      ...CacheTimes.GARDENS,
    });
  };
};

/**
 * Hook to manually invalidate specific data
 * Useful for force refreshing data after external changes
 */
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateActiveVisit: () => queryClient.invalidateQueries({ queryKey: QueryKeys.ACTIVE_VISIT }),
    invalidateUserDogs: () => queryClient.invalidateQueries({ queryKey: QueryKeys.USER_DOGS }),
    invalidateUserProfile: () => queryClient.invalidateQueries({ queryKey: QueryKeys.USER_PROFILE }),
    invalidateGamification: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STATS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_LEVEL });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STREAK });
    },
    invalidateAll: () => queryClient.invalidateQueries(),
  };
};