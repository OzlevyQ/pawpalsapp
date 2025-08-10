#!/usr/bin/env node

/**
 * Test script to verify the entire notification flow
 * Run this script to test if notifications are working end-to-end
 */

const NotificationService = require('./notificationService');
const webSocketService = require('./websocketService');
const mongoose = require('mongoose');
require('dotenv').config();

async function testNotificationFlow() {
  console.log('\n=================================================');
  console.log('🧪 NOTIFICATION SYSTEM TEST');
  console.log('=================================================\n');

  try {
    // Connect to MongoDB if not connected
    if (mongoose.connection.readyState === 0) {
      console.log('📦 Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB\n');
    }

    // Check WebSocket status
    console.log('🔌 WebSocket Service Status:');
    const connectedUsers = webSocketService.getConnectedUserIds();
    console.log(`   Connected users: ${connectedUsers.length}`);
    if (connectedUsers.length > 0) {
      console.log(`   User IDs: ${connectedUsers.join(', ')}`);
    }
    const stats = webSocketService.getConnectionStats();
    console.log(`   Connection stats:`, stats);
    console.log('');

    // Test creating a notification
    if (connectedUsers.length > 0) {
      const testUserId = connectedUsers[0];
      console.log(`📝 Creating test notification for user: ${testUserId}`);
      
      const notification = await NotificationService.createNotification(
        testUserId,
        'test_system',
        '🧪 Test Notification',
        'This is a test notification from the notification flow test script',
        {
          type: 'test_system',
          timestamp: new Date().toISOString(),
          testScript: true
        },
        'high'
      );

      console.log(`✅ Test notification created: ${notification._id}`);
      console.log('');
      
      // Check if WebSocket delivered it
      console.log('🔍 Checking WebSocket delivery...');
      const isConnected = webSocketService.isUserConnected(testUserId);
      console.log(`   User ${testUserId} connected: ${isConnected}`);
      
      if (isConnected) {
        console.log('   ✅ WebSocket should have delivered the notification');
      } else {
        console.log('   ⚠️ User not connected via WebSocket');
      }
    } else {
      console.log('⚠️ No users connected via WebSocket');
      console.log('   To test notifications:');
      console.log('   1. Make sure a user is logged in to the mobile app');
      console.log('   2. Check that WebSocket connection is established');
      console.log('   3. Run this test again');
    }

    console.log('\n=================================================');
    console.log('🏁 TEST COMPLETE');
    console.log('=================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Don't close the connection if server is running
    if (require.main === module) {
      // Script is being run directly
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  }
}

// Run the test if script is executed directly
if (require.main === module) {
  testNotificationFlow();
}

module.exports = testNotificationFlow;