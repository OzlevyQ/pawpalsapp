import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNotificationContext } from '../contexts/NotificationContext';
import { testNotificationAPI } from '../services/testNotificationAPI';
import { notificationService } from '../services/notificationService';

export default function TestNotifications() {
  const {
    notifications,
    unreadCount,
    webSocketConnected,
    pushToken,
    sendLocalNotification,
    refreshNotifications,
  } = useNotificationContext();

  const [loading, setLoading] = useState(false);

  const getStatusColor = (connected: boolean) => connected ? '#10B981' : '#EF4444';

  const testLocalNotification = async () => {
    try {
      console.log('🔔 Testing local notification...');
      await sendLocalNotification(
        'Local Test Notification',
        'This is a local notification test from PawPals!',
        { type: 'test', source: 'local' }
      );
      Alert.alert('Success', 'Local notification sent!');
    } catch (error) {
      console.error('Error sending local notification:', error);
      Alert.alert('Error', 'Failed to send local notification');
    }
  };

  const testBackendNotification = async (type: string) => {
    try {
      setLoading(true);
      console.log(`🔔 Testing backend notification: ${type}`);
      
      let result;
      switch (type) {
        case 'message':
          result = await testNotificationAPI.sendTestNotification({
            type: 'new_message',
            title: 'Test Message',
            body: 'You have a new test message from PawPals!',
            data: {
              chatId: 'test-chat-123',
              senderName: 'Test User'
            }
          });
          break;
        
        case 'friend':
          result = await testNotificationAPI.sendTestNotification({
            type: 'friend_request',
            title: 'Friend Request',
            body: 'Test User sent you a friend request!',
            data: {
              targetId: 'test-user-456',
              requesterName: 'Test Friend'
            }
          });
          break;
        
        case 'event':
          result = await testNotificationAPI.sendTestNotification({
            type: 'event_reminder',
            title: 'Event Reminder',
            body: 'Don\'t forget about the Test Event tomorrow!',
            data: {
              targetId: 'test-event-789',
              eventName: 'Test Event'
            }
          });
          break;

        case 'garden':
          result = await testNotificationAPI.sendTestNotification({
            type: 'garden_update',
            title: 'Garden Update',
            body: 'Test Dog Park has been updated with new amenities!',
            data: {
              gardenId: 'test-garden-123',
              gardenName: 'Test Dog Park',
              updateType: 'amenities_added'
            }
          });
          break;

        case 'permission':
          result = await testNotificationAPI.sendTestNotification({
            type: 'permission_request',
            title: 'Permission Request',
            body: 'A user has requested garden manager permissions',
            data: {
              requesterId: 'test-user-456',
              requestType: 'garden_manager'
            }
          });
          break;

        case 'checkin':
          result = await testNotificationAPI.sendTestNotification({
            type: 'dog_checkin',
            title: 'Check-in Successful',
            body: 'Buddy and Max checked in at Test Dog Park!',
            data: {
              visitId: 'test-visit-789',
              gardenId: 'test-garden-123',
              gardenName: 'Test Dog Park',
              dogNames: ['Buddy', 'Max']
            }
          });
          break;

        case 'visit-reminder':
          result = await testNotificationAPI.sendTestNotification({
            type: 'visit_reminder',
            title: 'Visit Reminder',
            body: 'Don\'t forget to check out from Test Dog Park',
            data: {
              visitId: 'test-visit-789',
              gardenId: 'test-garden-123',
              gardenName: 'Test Dog Park'
            }
          });
          break;
        
        default:
          result = await testNotificationAPI.sendTestNotification({
            type: 'system',
            title: 'System Notification',
            body: 'This is a test system notification',
            data: { type: 'system' }
          });
      }
      
      console.log('Backend notification result:', result);
      Alert.alert('Success', `${type} notification sent from backend!`);
      
      // Refresh notifications list
      setTimeout(() => {
        refreshNotifications();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error sending backend notification:', error);
      Alert.alert('Error', error.message || 'Failed to send backend notification');
    } finally {
      setLoading(false);
    }
  };

  const testAllNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔔 Testing all notification types...');
      
      const result = await testNotificationAPI.sendAllTestNotifications();
      console.log('All notifications test result:', result);
      
      Alert.alert('Success', 'All test notifications sent! Check your notifications.');
      
      // Refresh notifications list after a delay
      setTimeout(() => {
        refreshNotifications();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error testing all notifications:', error);
      Alert.alert('Error', error.message || 'Failed to test all notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>System Status</Text>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>WebSocket:</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(webSocketConnected) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(webSocketConnected) }]}>
            {webSocketConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Push Token:</Text>
          <Text style={styles.statusText}>
            {pushToken ? `${pushToken.substring(0, 20)}...` : 'Not available'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Unread Count:</Text>
          <Text style={styles.statusText}>{unreadCount}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Total Notifications:</Text>
          <Text style={styles.statusText}>{notifications.length}</Text>
        </View>
      </View>

      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Test Notifications</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.localButton]}
          onPress={testLocalNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Local Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.messageButton]}
          onPress={() => testBackendNotification('message')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Message Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.friendButton]}
          onPress={() => testBackendNotification('friend')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Friend Request</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.eventButton]}
          onPress={() => testBackendNotification('event')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Event Reminder</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.systemButton]}
          onPress={() => testBackendNotification('system')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test System Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.gardenButton]}
          onPress={() => testBackendNotification('garden')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Garden Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.permissionButton]}
          onPress={() => testBackendNotification('permission')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Permission Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.checkinButton]}
          onPress={() => testBackendNotification('checkin')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Dog Check-in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.visitReminderButton]}
          onPress={() => testBackendNotification('visit-reminder')}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Visit Reminder</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.allButton]}
          onPress={testAllNotifications}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test All Notification Types</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        {notifications.slice(0, 5).map((notification, index) => (
          <View key={notification.id || index} style={styles.notificationItem}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationBody}>{notification.body}</Text>
            <Text style={styles.notificationTime}>
              {new Date(notification.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        ))}
        {notifications.length === 0 && (
          <Text style={styles.emptyText}>No notifications yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  statusSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  testSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  recentSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 120,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  localButton: {
    backgroundColor: '#10B981',
  },
  messageButton: {
    backgroundColor: '#3B82F6',
  },
  friendButton: {
    backgroundColor: '#8B5CF6',
  },
  eventButton: {
    backgroundColor: '#F59E0B',
  },
  systemButton: {
    backgroundColor: '#6B7280',
  },
  gardenButton: {
    backgroundColor: '#10B981',
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
  },
  checkinButton: {
    backgroundColor: '#06B6D4',
  },
  visitReminderButton: {
    backgroundColor: '#F97316',
  },
  allButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  notificationBody: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});