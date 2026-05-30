import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootNavigator } from './navigation/RootNavigator';
import { usePlaybackTick } from './hooks/usePlaybackTick';

Ionicons.loadFont();

const AppContent = () => {
  usePlaybackTick();
  return <RootNavigator />;
};
export const App = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <AppContent />
  </GestureHandlerRootView>
);
