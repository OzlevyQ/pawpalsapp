# PawPals React Native Mobile App Architecture Guide

## Table of Contents
1. [Overview](#overview)
2. [Expo Router Navigation System](#expo-router-navigation-system)
3. [NativeWind Styling Architecture](#nativewind-styling-architecture)
4. [Zustand State Management](#zustand-state-management)
5. [Component Architecture](#component-architecture)
6. [Real-Time Features](#real-time-features)
7. [Mobile-Specific Optimizations](#mobile-specific-optimizations)
8. [User Experience Patterns](#user-experience-patterns)
9. [Performance Considerations](#performance-considerations)
10. [Development Best Practices](#development-best-practices)

## Overview

The PawPals mobile application is a sophisticated React Native app built with Expo SDK 53, designed as a social platform for dog owners to connect, find dog parks, and manage their pets' activities. The architecture emphasizes native mobile experience, performance optimization, and real-time connectivity.

### Tech Stack
- **Framework**: React Native 0.79.5 with Expo SDK 53
- **Navigation**: Expo Router v5 (file-based routing)
- **Styling**: NativeWind v2 (Tailwind CSS for React Native)
- **State Management**: Zustand v5 with persistence
- **Data Fetching**: TanStack Query v5 with mobile optimizations
- **Real-time**: Socket.IO client with WebSocket
- **Secure Storage**: Expo SecureStore for sensitive data
- **Internationalization**: Custom i18n with RTL support

## Expo Router Navigation System

### File-Based Routing Structure

```
app/
├── _layout.tsx           # Root layout with providers
├── index.tsx            # Landing/splash screen
├── (auth)/              # Authentication flow
│   ├── _layout.tsx      # Auth layout
│   ├── welcome.tsx      # Welcome screen
│   ├── login.tsx        # Login form
│   └── register.tsx     # Registration form
├── (tabs)/              # Main app navigation
│   ├── _layout.tsx      # Tab bar configuration
│   ├── home.tsx         # Dashboard
│   ├── parks.tsx        # Dog park discovery
│   ├── checkin.tsx      # QR check-in system
│   ├── events.tsx       # Community events
│   ├── profile.tsx      # User profile
│   └── social.tsx       # Social features (hidden tab)
└── [individual screens] # Modal and detail screens
```

### Navigation Architecture Highlights

#### Cross-Platform Tab Bar Implementation

```typescript
// _layout.tsx - Platform-aware tab bar sizing
const getTabBarPaddingBottom = () => {
  if (Platform.OS === 'ios') {
    // iOS: Use safe area insets directly
    return Math.max(insets.bottom, 4);
  } else if (Platform.OS === 'android') {
    // Android: Handle various navigation modes
    const navBarHeight = getAndroidNavigationBarHeight();
    const extraPadding = screenHeight < 700 ? 12 : 8;
    return navBarHeight + extraPadding;
  }
  return 16; // Default fallback
};
```

#### Mobile-First Navigation Patterns

1. **Gesture-Enabled Navigation**: All screens support swipe gestures for natural navigation
2. **Authentication Flow Separation**: Auth screens disable gestures to prevent navigation confusion
3. **Tab Bar Optimization**: Platform-specific height calculations for optimal touch targets
4. **RTL Support**: Navigation directions adapt to language orientation

### Key Navigation Features

- **Secure Route Protection**: Authentication state guards sensitive screens
- **Deep Linking**: Supports notification-based navigation and external links
- **Modal Presentations**: Stack navigation with proper modal transitions
- **Tab Bar Customization**: Dynamic theming and platform-specific styling

## NativeWind Styling Architecture

### Design System Implementation

The app uses a comprehensive design system built on NativeWind, extending Tailwind CSS for mobile-specific needs:

```javascript
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          // ... complete color scale
          500: '#10b981', // Main brand green
          900: '#064e3b',
        },
        // Secondary and neutral scales
      },
      fontFamily: {
        'primary': ['SF Pro Display', 'system-ui', 'sans-serif'],
        'secondary': ['Inter', 'system-ui', 'sans-serif'],
      },
      // Mobile-optimized spacing and sizing
    },
  },
};
```

### Theme System Integration

The app features a sophisticated theming system that works seamlessly with NativeWind:

```typescript
// ThemeContext.tsx - Dynamic theme switching
interface ThemeColors {
  primary: Record<string, string>;
  background: {
    primary: string;
    secondary: string;
    card: string;
    surface: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  // ... complete theme structure
}

const useTheme = () => {
  const context = useContext(ThemeContext);
  return context; // Provides theme object for dynamic styling
};
```

### Mobile-Specific Styling Patterns

1. **Touch Target Optimization**: Minimum 44px touch targets on iOS, 48dp on Android
2. **Platform-Aware Components**: Different styling based on iOS/Android guidelines
3. **Responsive Design**: Breakpoints optimized for mobile screen sizes
4. **RTL Layout Support**: Automatic direction changes for Hebrew and Arabic

### Component Styling Examples

```typescript
// Platform-aware styling with NativeWind classes
<TouchableOpacity 
  style={{
    backgroundColor: theme.background.card,
    borderRadius: 12,
    padding: Platform.select({ ios: 16, android: 14 }),
    // Mobile-optimized shadows
    shadowColor: theme.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 8, // Android-specific elevation
  }}
>
```

## Zustand State Management

### Store Architecture

The app uses Zustand for lightweight, performant state management with persistence:

```typescript
// authStore.ts - Authentication state with secure storage
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isLoading: false,
      error: null,

      // Actions with async operations
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.login({ email, password });
          set({
            user: response.user,
            isAuthenticated: true,
            isGuest: false,
            isLoading: false,
          });
          
          // Connect WebSocket for real-time features
          await WebSocketService.connect();
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      // ... other actions
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);
```

### Secure Storage Integration

Custom storage adapter using Expo SecureStore for sensitive data:

```typescript
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
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
  // ... removeItem implementation
};
```

### State Management Patterns

1. **Optimistic Updates**: UI updates immediately, with rollback on failure
2. **Selective Persistence**: Only essential state persisted to secure storage
3. **Real-time Integration**: State automatically updates from WebSocket events
4. **Error Handling**: Comprehensive error states with user-friendly messages

## Component Architecture

### Component Organization

```
components/
├── common/              # Shared UI components
│   ├── NotificationModal.tsx
│   └── NotificationPermissionModal.tsx
├── home/               # Home screen components
├── ui/                 # Base UI components (buttons, inputs, etc.)
├── DogSelectionModal.tsx
├── NavigationModal.tsx
└── NotificationBell.tsx
```

### Reusable Component Patterns

#### Context-Aware Components

```typescript
// NotificationBell.tsx - Context integration
const NotificationBell: React.FC<Props> = ({ size = 24, color, showBadge = true }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { notifications, unreadCount } = useNotificationContext();
  
  return (
    <TouchableOpacity style={{ position: 'relative' }}>
      <Ionicons name="notifications-outline" size={size} color={color || theme.text.primary} />
      {showBadge && unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -2,
          right: -2,
          backgroundColor: theme.primary[500],
          borderRadius: 8,
          minWidth: 16,
          height: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
```

### Mobile UX Component Patterns

1. **Loading States**: Skeleton screens and progressive loading
2. **Error Boundaries**: Graceful error handling with retry mechanisms
3. **Pull-to-Refresh**: Native refresh control integration
4. **Swipe Gestures**: Natural mobile interaction patterns
5. **Haptic Feedback**: Touch feedback for better user experience

## Real-Time Features

### WebSocket Architecture

The app features a sophisticated real-time system using Socket.IO:

```typescript
// websocket.ts - Connection management
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private listeners: { [event: string]: Function[] } = {};

  async connect(): Promise<void> {
    const token = await SecureStore.getItemAsync('userToken');
    const isGuest = await SecureStore.getItemAsync('isGuest');
    
    // Skip connection for guest users
    if (isGuest === 'true' || !token) return;

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false, // Manual reconnection control
      timeout: 3000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  // Event listener management with cleanup
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
}
```

### Real-Time Data Hooks

Custom hooks for different real-time data types:

```typescript
// useRealTimeData.ts - Generic real-time hook
export const useRealTimeData = <T>(options: UseRealTimeDataOptions = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('not_initialized');
  
  // Handle real-time data updates
  const handleDataUpdate = useCallback((event: string, newData: any) => {
    setData(prevData => ({
      ...prevData,
      ...newData
    }));
    setLastUpdate(new Date());
  }, []);

  return {
    data,
    isConnected,
    connectionState,
    connect,
    disconnect,
    reconnect,
  };
};

// Specialized hooks for different features
export const useUserRealTimeData = () => {
  return useRealTimeData<any>({
    events: ['notification', 'friendOnline', 'friendOffline'],
    autoConnect: true,
  });
};
```

### Real-Time Features

1. **Live Notifications**: Instant notification delivery with sound and badges
2. **Garden Occupancy**: Real-time park visitor counts
3. **Friend Status**: Online/offline status of connections
4. **Chat Messages**: Instant messaging with typing indicators
5. **Event Updates**: Live event information and registration changes

## Mobile-Specific Optimizations

### Performance Optimizations

#### React Query Configuration

```typescript
// Mobile-optimized React Query setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes cache
      gcTime: 10 * 60 * 1000,          // 10 minutes garbage collection
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,      // Not relevant for mobile
      refetchOnReconnect: true,         // Refetch when network reconnects
      refetchOnMount: true,
    },
  },
});
```

#### App State Management

```typescript
// App state refetch configuration
export const setupAppStateRefetch = (queryClient: QueryClient) => {
  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  });

  return () => subscription?.remove();
};
```

### Memory Management

1. **Image Optimization**: Lazy loading and size optimization
2. **List Virtualization**: FlatList with optimized rendering
3. **Component Cleanup**: Proper cleanup of listeners and subscriptions
4. **Bundle Splitting**: Code splitting for reduced initial load

### Network Optimizations

1. **Request Deduplication**: Automatic deduplication with React Query
2. **Background Sync**: Sync when app becomes active
3. **Offline Support**: Cached data availability when offline
4. **Connection Quality Adaptation**: Reduced frequency on poor connections

## User Experience Patterns

### Gesture-Based Interactions

```typescript
// Pull-to-refresh implementation
<ScrollView
  refreshControl={
    <RefreshControl 
      refreshing={refreshing} 
      onRefresh={onRefresh}
      tintColor={theme.primary[500]}
      colors={[theme.primary[500]]}
    />
  }
>
```

### Loading States and Feedback

```typescript
// Progressive loading with skeleton states
if (loading) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background.secondary }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary[500]} />
        <Text style={{ color: theme.text.primary, marginTop: 16 }}>
          {t.common.loading}
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

### Accessibility Features

1. **Screen Reader Support**: Proper accessibility labels and hints
2. **Dynamic Type**: Support for iOS Dynamic Type and Android font scaling
3. **High Contrast**: Theme adaptation for accessibility preferences
4. **Voice Control**: VoiceOver and TalkBack optimization

### Internationalization (i18n)

```typescript
// RTL-aware component layout
<View style={{ 
  flexDirection: isRTL ? 'row-reverse' : 'row',
  textAlign: isRTL ? 'right' : 'left'
}}>
```

## Performance Considerations

### Rendering Optimizations

1. **Memoization**: Strategic use of React.memo and useMemo
2. **FlatList Optimization**: Proper keyExtractor and getItemLayout
3. **Image Caching**: Expo Image with caching strategies
4. **Animation Performance**: React Native Reanimated for 60fps animations

### Bundle Size Management

1. **Tree Shaking**: Proper import statements for optimal bundling
2. **Dynamic Imports**: Lazy loading of non-critical features
3. **Asset Optimization**: Compressed images and fonts
4. **Metro Configuration**: Optimized bundler settings

### Battery Life Considerations

1. **Background Processing**: Minimal background tasks
2. **Location Services**: Efficient location updates
3. **WebSocket Management**: Smart connection handling
4. **Push Notifications**: Optimized notification delivery

## Development Best Practices

### Code Organization

```
src/
├── components/         # Reusable UI components
├── contexts/          # React contexts for global state
├── hooks/             # Custom hooks
├── services/          # API and external service integrations
├── store/             # Zustand stores
├── utils/             # Utility functions
├── locales/           # i18n translation files
└── constants/         # App constants and configuration
```

### Type Safety

```typescript
// Strict TypeScript interfaces
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  points: number;
  level: number;
  currentStreak: number;
}

// Typed API responses
interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}
```

### Error Handling

```typescript
// Comprehensive error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to crash reporting service
    console.error('App error:', error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.retry} />;
    }
    return this.props.children;
  }
}
```

### Testing Strategy

1. **Unit Tests**: Jest for utility functions and hooks
2. **Component Tests**: React Native Testing Library
3. **Integration Tests**: End-to-end testing with Detox
4. **Performance Tests**: Flipper integration for profiling

## Conclusion

The PawPals mobile app represents a modern, performant React Native application that prioritizes native mobile experience, real-time connectivity, and user engagement. The architecture emphasizes:

- **Native Feel**: Platform-specific optimizations and design patterns
- **Performance**: Optimized rendering, caching, and network operations
- **Scalability**: Modular architecture supporting feature growth
- **Developer Experience**: Type safety, clear patterns, and maintainable code
- **User Experience**: Intuitive navigation, real-time updates, and accessibility

This architecture serves as a solid foundation for a social mobile application, demonstrating best practices for React Native development with modern tooling and patterns.