import { QueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';
import { QueryKeys } from './useQueries';

/**
 * Enhanced Query Configuration for Mobile Optimization
 * This file contains advanced configurations and utilities for React Query
 */

// Background app state management
let appState = AppState.currentState;

/**
 * Configure app state listeners for React Query
 * This optimizes when queries should refetch based on app state
 */
export const setupAppStateRefetch = (queryClient: QueryClient) => {
  const onAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App has come to foreground - refreshing critical data');
      
      // Only refetch critical data that might have changed while app was in background
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.ACTIVE_VISIT,
        exact: false,
        refetchType: 'active' 
      });
      
      // Refetch gamification data (might have changed due to server-side calculations)
      queryClient.invalidateQueries({ 
        queryKey: QueryKeys.GAMIFICATION_STATS,
        exact: false,
        refetchType: 'active' 
      });
      
      // Refetch garden visitor counts (highly dynamic)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === 'gardens' && 
                 query.queryKey[1] === 'visitors';
        },
        refetchType: 'active'
      });
    }
    
    appState = nextAppState;
  };

  const subscription = AppState.addEventListener('change', onAppStateChange);
  
  return () => {
    subscription?.remove();
  };
};

/**
 * Smart cache invalidation based on user actions
 */
export const createSmartInvalidation = (queryClient: QueryClient) => ({
  
  /**
   * Invalidate queries after successful check-in
   */
  onCheckinSuccess: (gardenId: string) => {
    // High priority invalidations
    queryClient.invalidateQueries({ queryKey: QueryKeys.ACTIVE_VISIT });
    queryClient.invalidateQueries({ queryKey: QueryKeys.GARDEN_VISITORS(gardenId) });
    
    // Medium priority invalidations (batch these)
    Promise.resolve().then(() => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.VISITS_HISTORY });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STATS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STREAK });
    });
  },

  /**
   * Invalidate queries after successful check-out
   */
  onCheckoutSuccess: (gardenId: string) => {
    // High priority invalidations
    queryClient.invalidateQueries({ queryKey: QueryKeys.ACTIVE_VISIT });
    queryClient.invalidateQueries({ queryKey: QueryKeys.GARDEN_VISITORS(gardenId) });
    
    // Medium priority invalidations
    Promise.resolve().then(() => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.VISITS_HISTORY });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STATS });
      queryClient.invalidateQueries({ queryKey: QueryKeys.GAMIFICATION_STREAK });
    });
  },

  /**
   * Invalidate queries after profile changes
   */
  onProfileUpdate: () => {
    queryClient.invalidateQueries({ queryKey: QueryKeys.USER_PROFILE });
    
    // If dogs were updated, invalidate dog-related queries
    Promise.resolve().then(() => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.USER_DOGS });
    });
  },

  /**
   * Invalidate queries after dog changes
   */
  onDogUpdate: (dogId?: string) => {
    queryClient.invalidateQueries({ queryKey: QueryKeys.USER_DOGS });
    
    if (dogId) {
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOG_DETAIL(dogId) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOG_PROFILE(dogId) });
    }
  },

  /**
   * Invalidate queries after event registration changes
   */
  onEventRegistrationChange: (eventId: string) => {
    queryClient.invalidateQueries({ queryKey: QueryKeys.EVENT_DETAIL(eventId) });
    
    // Batch update the events list
    Promise.resolve().then(() => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.EVENTS_ALL });
    });
  },
});

/**
 * Performance monitoring for queries
 */
export const createQueryPerformanceMonitor = () => {
  const performanceLog: Record<string, { count: number; totalTime: number; avgTime: number }> = {};

  return {
    logQueryPerformance: (queryKey: readonly unknown[], duration: number) => {
      const key = JSON.stringify(queryKey);
      
      if (!performanceLog[key]) {
        performanceLog[key] = { count: 0, totalTime: 0, avgTime: 0 };
      }
      
      performanceLog[key].count++;
      performanceLog[key].totalTime += duration;
      performanceLog[key].avgTime = performanceLog[key].totalTime / performanceLog[key].count;
      
      // Log slow queries in development
      if (__DEV__ && duration > 2000) {
        console.warn(`Slow query detected: ${key} took ${duration}ms`);
      }
    },
    
    getPerformanceReport: () => performanceLog,
    
    getSlowQueries: (threshold: number = 1000) => {
      return Object.entries(performanceLog)
        .filter(([, stats]) => stats.avgTime > threshold)
        .sort(([, a], [, b]) => b.avgTime - a.avgTime);
    }
  };
};

/**
 * Memory optimization utilities
 */
export const createMemoryOptimization = (queryClient: QueryClient) => ({
  
  /**
   * Clear old cached data to free memory
   */
  clearOldCache: () => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.dataUpdatedAt && (now - query.state.dataUpdatedAt) > maxAge) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    const queries = queryClient.getQueryCache().getAll();
    const totalQueries = queries.length;
    const stalQueries = queries.filter(q => q.isStale()).length;
    const errorQueries = queries.filter(q => q.state.status === 'error').length;
    const loadingQueries = queries.filter(q => q.state.status === 'pending').length;
    
    return {
      total: totalQueries,
      stale: stalQueries,
      error: errorQueries,
      loading: loadingQueries,
      fresh: totalQueries - stalQueries - errorQueries - loadingQueries,
    };
  },

  /**
   * Force cleanup of unused queries
   */
  cleanup: () => {
    queryClient.getQueryCache().clear();
  },
});

/**
 * Network-aware query configuration
 */
export const createNetworkAwareConfig = () => {
  // This would integrate with NetInfo in a real implementation
  return {
    getNetworkOptimizedConfig: (isSlowConnection: boolean) => ({
      retry: isSlowConnection ? 1 : 3,
      retryDelay: (attemptIndex: number) => 
        isSlowConnection 
          ? Math.min(2000 * 2 ** attemptIndex, 60000)  // Longer delays on slow connections
          : Math.min(1000 * 2 ** attemptIndex, 30000), // Normal delays
      staleTime: isSlowConnection ? 10 * 60 * 1000 : 5 * 60 * 1000, // Longer stale time on slow connections
    }),
  };
};

/**
 * Query optimization for specific screens
 */
export const ScreenOptimizations = {
  
  /**
   * Optimizations for the home screen
   * Prefetch likely-to-be-needed data
   */
  homeScreen: (queryClient: QueryClient, userId?: string) => {
    // Prefetch user dogs if not already cached
    if (!queryClient.getQueryData(QueryKeys.USER_DOGS)) {
      queryClient.prefetchQuery({
        queryKey: QueryKeys.USER_DOGS,
        staleTime: 5 * 60 * 1000,
      });
    }
    
    // Prefetch active visit status
    if (!queryClient.getQueryData(QueryKeys.ACTIVE_VISIT)) {
      queryClient.prefetchQuery({
        queryKey: QueryKeys.ACTIVE_VISIT,
        staleTime: 1 * 60 * 1000,
      });
    }
  },

  /**
   * Optimizations for the parks screen
   */
  parksScreen: (queryClient: QueryClient, location?: { lat: number; lng: number }) => {
    if (location) {
      // Prefetch nearby gardens
      queryClient.prefetchQuery({
        queryKey: QueryKeys.GARDENS_NEARBY(location.lat, location.lng, 10),
        staleTime: 10 * 60 * 1000,
      });
    }
  },

  /**
   * Optimizations for the events screen
   */
  eventsScreen: (queryClient: QueryClient) => {
    // Prefetch upcoming events
    queryClient.prefetchQuery({
      queryKey: [...QueryKeys.EVENTS_ALL, { status: 'upcoming' }],
      staleTime: 5 * 60 * 1000,
    });
  },

  /**
   * Optimizations for the profile screen
   */
  profileScreen: (queryClient: QueryClient) => {
    // Prefetch user profile and stats
    if (!queryClient.getQueryData(QueryKeys.USER_PROFILE)) {
      queryClient.prefetchQuery({
        queryKey: QueryKeys.USER_PROFILE,
        staleTime: 5 * 60 * 1000,
      });
    }
    
    if (!queryClient.getQueryData(QueryKeys.GAMIFICATION_STATS)) {
      queryClient.prefetchQuery({
        queryKey: QueryKeys.GAMIFICATION_STATS,
        staleTime: 3 * 60 * 1000,
      });
    }
  },
};

/**
 * Development helpers
 */
export const DevHelpers = {
  /**
   * Log all current queries and their states
   */
  logAllQueries: (queryClient: QueryClient) => {
    if (__DEV__) {
      const queries = queryClient.getQueryCache().getAll();
      console.group('React Query Cache State');
      queries.forEach(query => {
        console.log({
          key: query.queryKey,
          status: query.state.status,
          isStale: query.isStale(),
          dataUpdatedAt: new Date(query.state.dataUpdatedAt),
          error: query.state.error,
        });
      });
      console.groupEnd();
    }
  },

  /**
   * Clear specific query for testing
   */
  clearQuery: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    if (__DEV__) {
      queryClient.removeQueries({ queryKey });
      console.log('Cleared query:', queryKey);
    }
  },

  /**
   * Force refetch for testing
   */
  forceRefetch: (queryClient: QueryClient, queryKey: readonly unknown[]) => {
    if (__DEV__) {
      queryClient.invalidateQueries({ queryKey });
      console.log('Force refetched query:', queryKey);
    }
  },
};

export default {
  setupAppStateRefetch,
  createSmartInvalidation,
  createQueryPerformanceMonitor,
  createMemoryOptimization,
  createNetworkAwareConfig,
  ScreenOptimizations,
  DevHelpers,
};