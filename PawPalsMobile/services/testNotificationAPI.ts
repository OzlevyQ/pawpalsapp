import { apiClient } from './api';

// Test notification types
export const TEST_NOTIFICATION_TYPES = {
  MESSAGE: 'new_message',
  FRIEND_REQUEST: 'friend_request',
  EVENT_REMINDER: 'event_reminder',
  DOG_CHECKIN: 'dog_checkin',
  SYSTEM: 'system'
};

/**
 * Send a test push notification through the backend
 */
export const sendTestNotification = async (
  type: string = TEST_NOTIFICATION_TYPES.MESSAGE,
  customData?: any
) => {
  try {
    console.log('📤 Sending test notification request to backend...');
    
    const response = await apiClient.post('/test-notification/test', {
      type,
      title: `Test ${type} Notification`,
      body: `Testing ${type} notification at ${new Date().toLocaleTimeString()}`,
      data: customData || {}
    });

    if (response.success) {
      console.log('✅ Test notification sent successfully:', response.data);
      return response.data;
    } else {
      console.error('❌ Failed to send test notification:', response.error);
      throw new Error(response.error || 'Failed to send test notification');
    }
  } catch (error) {
    console.error('💥 Error sending test notification:', error);
    throw error;
  }
};

/**
 * Send test notification to all devices
 */
export const sendTestNotificationToAllDevices = async () => {
  try {
    console.log('📤 Sending test notification to all devices...');
    
    const response = await apiClient.post('/test-notification/test-all-devices', {
      title: 'Test All Devices',
      body: `Testing on all devices at ${new Date().toLocaleTimeString()}`
    });

    if (response.success) {
      console.log('✅ Test sent to all devices:', response.data);
      return response.data;
    } else {
      console.error('❌ Failed to send to all devices:', response.error);
      throw new Error(response.error || 'Failed to send to all devices');
    }
  } catch (error) {
    console.error('💥 Error sending to all devices:', error);
    throw error;
  }
};

/**
 * Quick test function for console
 */
export const quickTestNotification = async () => {
  console.log('🧪 Running quick notification test...');
  
  try {
    // Test different notification types
    const types = [
      TEST_NOTIFICATION_TYPES.MESSAGE,
      TEST_NOTIFICATION_TYPES.FRIEND_REQUEST,
      TEST_NOTIFICATION_TYPES.EVENT_REMINDER,
      TEST_NOTIFICATION_TYPES.DOG_CHECKIN
    ];

    for (const type of types) {
      console.log(`📱 Testing ${type}...`);
      await sendTestNotification(type);
      
      // Wait 2 seconds between notifications
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🎉 All test notifications sent!');
  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
};

/**
 * Test message notification (simulates real message scenario)
 */
export const testMessageNotification = async (
  recipientId?: string,
  chatId?: string,
  messageText?: string
) => {
  try {
    console.log('📤 Testing message notification...');
    
    const response = await apiClient.post('/test-notification/test-message', {
      recipientId: recipientId || 'test-recipient',
      chatId: chatId || 'test-chat',
      messageText: messageText || 'Test message for notification testing'
    });

    if (response.success) {
      console.log('✅ Message notification test successful:', response.data);
      return response.data;
    } else {
      console.error('❌ Message notification test failed:', response.error);
      throw new Error(response.error || 'Failed to test message notification');
    }
  } catch (error) {
    console.error('💥 Error testing message notification:', error);
    throw error;
  }
};

/**
 * Test friend request notification (simulates real friend request)
 */
export const testFriendRequestNotification = async (recipientId?: string) => {
  try {
    console.log('👥 Testing friend request notification...');
    
    const response = await apiClient.post('/test-notification/test-friend-request', {
      recipientId: recipientId // Will default to sending to self
    });

    if (response.success) {
      console.log('✅ Friend request notification test successful:', response.data);
      return response.data;
    } else {
      console.error('❌ Friend request notification test failed:', response.error);
      throw new Error(response.error || 'Failed to test friend request notification');
    }
  } catch (error) {
    console.error('💥 Error testing friend request notification:', error);
    throw error;
  }
};

/**
 * Test friend request acceptance notification
 */
export const testFriendAcceptedNotification = async (requesterId?: string) => {
  try {
    console.log('✅ Testing friend request acceptance notification...');
    
    const response = await apiClient.post('/test-notification/test-friend-accepted', {
      requesterId: requesterId // Will default to sending to self
    });

    if (response.success) {
      console.log('✅ Friend acceptance notification test successful:', response.data);
      return response.data;
    } else {
      console.error('❌ Friend acceptance notification test failed:', response.error);
      throw new Error(response.error || 'Failed to test friend acceptance notification');
    }
  } catch (error) {
    console.error('💥 Error testing friend acceptance notification:', error);
    throw error;
  }
};

/**
 * Test all basic notification types
 */
export const testAllBasicNotifications = async () => {
  console.log('🧪 Running comprehensive notification tests...');
  
  try {
    // Test message notification
    console.log('📱 Testing message notification...');
    await testMessageNotification();
    
    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test friend request notification
    console.log('👥 Testing friend request notification...');
    await testFriendRequestNotification();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test friend acceptance notification
    console.log('✅ Testing friend acceptance notification...');
    await testFriendAcceptedNotification();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test other notification types
    const types = [
      TEST_NOTIFICATION_TYPES.EVENT_REMINDER,
      TEST_NOTIFICATION_TYPES.DOG_CHECKIN
    ];

    for (const type of types) {
      console.log(`📱 Testing ${type}...`);
      await sendTestNotification(type);
      
      // Wait 2 seconds between notifications
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🎉 All basic notification tests completed!');
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    throw error;
  }
};

/**
 * Send all test notification types (for UI buttons)
 */
export const sendAllTestNotifications = async () => {
  return await testAllBasicNotifications();
};

// Add to global scope for easy testing
// @ts-ignore
global.sendTestNotification = sendTestNotification;
// @ts-ignore
global.sendTestNotificationToAllDevices = sendTestNotificationToAllDevices;
// @ts-ignore
global.quickTestNotification = quickTestNotification;
// @ts-ignore
global.testMessageNotification = testMessageNotification;
// @ts-ignore
global.testFriendRequestNotification = testFriendRequestNotification;
// @ts-ignore
global.testFriendAcceptedNotification = testFriendAcceptedNotification;
// @ts-ignore
global.testAllBasicNotifications = testAllBasicNotifications;
// @ts-ignore
global.sendAllTestNotifications = sendAllTestNotifications;

// Export additional functions
export const testNotificationAPI = {
  sendTestNotification,
  sendTestNotificationToAllDevices,
  testMessageNotification,
  testFriendRequestNotification,
  testFriendAcceptedNotification,
  sendAllTestNotifications,
  quickTestNotification,
  testAllBasicNotifications,
};