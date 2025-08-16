import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';

interface NotificationBellProps {
  onPress?: () => void;
  size?: number;
  color?: string;
  showBadge?: boolean;
}

export default function NotificationBell({ 
  onPress, 
  size = 24, 
  color,
  showBadge = true 
}: NotificationBellProps) {
  const { unreadCount } = useNotificationContext();
  const { theme } = useTheme();
  const router = useRouter();
  
  const iconColor = color || theme.text.primary;
  const hasNotifications = unreadCount > 0;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default action: navigate to notifications screen
      router.push('/notifications');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.container,
        {
          width: size + 8,
          height: size + 8,
        }
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={hasNotifications ? 'notifications' : 'notifications-outline'}
        size={size}
        color={iconColor}
      />
      
      {showBadge && hasNotifications && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.error || '#EF4444',
              borderColor: theme.background.primary,
            }
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: 'white',
                fontSize: Math.min(10, size * 0.4),
              }
            ]}
          >
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    minHeight: 16,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});