import { Tabs } from 'expo-router';
import { View, Text, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
  const { t, isRTL } = useLanguage();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Get device dimensions for additional calculations
  const { height: screenHeight } = Dimensions.get('window');

  // Android-specific navigation bar handling
  // Android devices may have different navigation modes:
  // - 3-button navigation (back, home, recent)
  // - 2-button navigation (back + home swipe)
  // - Gesture navigation (swipe gestures)
  const getAndroidNavigationBarHeight = () => {
    // For Android, we need to ensure proper spacing even when insets.bottom is 0
    // This happens with transparent navigation bars or gesture navigation
    if (insets.bottom > 0) {
      // If we have a bottom inset, use it (physical navigation bar)
      return insets.bottom;
    } else {
      // Handle gesture navigation and transparent navigation bars
      // Different Android versions and OEMs have different gesture bar heights
      const isLargeScreen = screenHeight > 800;
      const gestureBarHeight = isLargeScreen ? 24 : 20;
      
      // Add extra padding to ensure tab bar doesn't overlap with gesture area
      return gestureBarHeight + 4;
    }
  };

  // Calculate proper bottom padding for the tab bar
  const getTabBarPaddingBottom = () => {
    if (Platform.OS === 'ios') {
      // iOS: Use safe area insets directly, minimum 4px for better touch targets
      return Math.max(insets.bottom, 4);
    } else if (Platform.OS === 'android') {
      // Android: Handle various navigation modes
      const navBarHeight = getAndroidNavigationBarHeight();
      // Add extra padding for better touch targets near system navigation
      // Ensure minimum 16px padding for small screens
      const extraPadding = screenHeight < 700 ? 12 : 8;
      return navBarHeight + extraPadding;
    }
    return 16; // Default fallback
  };

  // Calculate the total tab bar height
  const getTabBarHeight = () => {
    const baseHeight = Platform.select({
      ios: 49, // Standard iOS tab bar height
      android: 56, // Standard Android tab bar height
      default: 56,
    });
    
    const paddingTop = 8;
    const paddingBottom = getTabBarPaddingBottom();
    
    return baseHeight + paddingTop + paddingBottom;
  };

  const tabBarHeight = getTabBarHeight();
  const paddingBottom = getTabBarPaddingBottom();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary[500],
        tabBarInactiveTintColor: theme.text.muted,
        tabBarStyle: {
          backgroundColor: theme.background.primary,
          borderTopWidth: 1,
          borderTopColor: theme.border.light,
          paddingTop: 8,
          paddingBottom: paddingBottom,
          height: tabBarHeight,
          shadowColor: theme.shadow.medium,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
          color: theme.text.secondary,
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        tabBarIconStyle: {
          marginTop: Platform.select({
            ios: 6,
            android: 4,
            default: 4,
          }),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.homeTab,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="parks"
        options={{
          title: t.parksTab,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: t.checkIn,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t.eventsTab,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profileTab,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}