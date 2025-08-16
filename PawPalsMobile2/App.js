import React from 'react';
import { ExpoRoot } from 'expo-router';
import { registerRootComponent } from 'expo';

export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);