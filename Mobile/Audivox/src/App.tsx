import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootNavigator } from './navigation/RootNavigator';
import { useConnectivitySync } from './hooks/useConnectivitySync';
import { usePlaybackTick } from './hooks/usePlaybackTick';

Ionicons.loadFont();

const AppContent = () => {
  usePlaybackTick();
  useConnectivitySync();
  return <RootNavigator />;
};
export const App = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
