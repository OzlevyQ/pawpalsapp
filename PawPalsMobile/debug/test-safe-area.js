/**
 * Test Script for Safe Area Insets Debug
 * Run this in your app to check safe area values on different devices
 * 
 * Usage:
 * 1. Import this in any screen component
 * 2. Add the DebugSafeArea component to see insets values
 * 3. Test on different Android devices with various navigation modes
 */

import React from 'react';
import { View, Text, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function DebugSafeArea() {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const screenData = Dimensions.get('screen');

  return (
    <View style={{
      position: 'absolute',
      top: insets.top + 50,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10,
      borderRadius: 8,
      zIndex: 1000,
    }}>
      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'monospace' }}>
        SafeArea Debug
      </Text>
      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'monospace' }}>
        Platform: {Platform.OS}
      </Text>
      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'monospace' }}>
        Insets: T:{insets.top} B:{insets.bottom} L:{insets.left} R:{insets.right}
      </Text>
      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'monospace' }}>
        Window: {width}x{height}
      </Text>
      <Text style={{ color: 'white', fontSize: 10, fontFamily: 'monospace' }}>
        Screen: {screenData.width}x{screenData.height}
      </Text>
      {Platform.OS === 'android' && (
        <Text style={{ color: insets.bottom > 0 ? 'lightgreen' : 'orange', fontSize: 10, fontFamily: 'monospace' }}>
          Nav Bar: {insets.bottom > 0 ? 'Detected' : 'Transparent/Gesture'}
        </Text>
      )}
    </View>
  );
}

// Test the tab bar padding calculation
export function calculateTabBarPadding(insets) {
  const getAndroidNavigationBarHeight = () => {
    if (insets.bottom > 0) {
      return insets.bottom;
    } else {
      return 24; // Standard Android navigation gesture bar height
    }
  };

  const getTabBarPaddingBottom = () => {
    if (Platform.OS === 'ios') {
      return Math.max(insets.bottom, 0);
    } else if (Platform.OS === 'android') {
      const navBarHeight = getAndroidNavigationBarHeight();
      return navBarHeight + 8;
    }
    return 16;
  };

  const getTabBarHeight = () => {
    const baseHeight = Platform.select({
      ios: 49,
      android: 56,
      default: 56,
    });
    
    const paddingTop = 8;
    const paddingBottom = getTabBarPaddingBottom();
    
    return baseHeight + paddingTop + paddingBottom;
  };

  return {
    paddingBottom: getTabBarPaddingBottom(),
    totalHeight: getTabBarHeight(),
    navigationBarHeight: Platform.OS === 'android' ? getAndroidNavigationBarHeight() : insets.bottom,
  };
}