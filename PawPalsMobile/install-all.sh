#!/bin/bash

echo "Installing all required dependencies..."

# Core dependencies
npm install \
  expo-secure-store \
  expo-linear-gradient \
  @expo/vector-icons \
  zustand \
  axios \
  socket.io-client

# Additional dependencies that might be needed
npm install \
  react-native-screens \
  expo-linking \
  expo-constants \
  expo-font

echo "All dependencies installed successfully!"
echo "Now run: npx expo start --clear"