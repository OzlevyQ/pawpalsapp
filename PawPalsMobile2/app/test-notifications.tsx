import React from 'react';
import { View, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import TestNotifications from '../components/TestNotifications';

export default function TestNotificationsPage() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.content}>
        <TestNotifications />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
});