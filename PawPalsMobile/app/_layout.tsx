import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { UserProvider } from '../contexts/UserContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { setupAppStateRefetch } from '../hooks/useQueryConfig';

// Import test functions for development
if (__DEV__) {
  import('../services/testNotificationAPI');
}

// Create a QueryClient instance with mobile-optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache time configuration optimized for mobile
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (formerly cacheTime)
      
      // Network behavior optimized for mobile
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors, only network/server errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Mobile-specific optimizations
      refetchOnWindowFocus: false, // Disable automatic refetch on window focus (not relevant for mobile)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Always refetch on component mount
      
      // Background refetching
      refetchInterval: false, // Disable automatic interval refetching by default
      refetchIntervalInBackground: false, // Don't refetch when app is in background
    },
    mutations: {
      // Mutation configuration
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function AppContent() {
  const { isDark } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Setup app state management for React Query
    const cleanup = setupAppStateRefetch(queryClient);
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <UserProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </UserProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}