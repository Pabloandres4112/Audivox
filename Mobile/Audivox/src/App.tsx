import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CompromisedEnvironmentScreen } from './components/security/CompromisedEnvironmentScreen';
import { RootNavigator } from './navigation/RootNavigator';
import { useConnectivitySync } from './hooks/useConnectivitySync';
import { usePlaybackTick } from './hooks/usePlaybackTick';
import { securityService } from './security/securityService';

Ionicons.loadFont();

const AppContent = () => {
  usePlaybackTick();
  useConnectivitySync();
  if (securityService.isCompromisedEnvironment()) {
    return <CompromisedEnvironmentScreen />;
  }
  return <RootNavigator />;
};
export const App = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <React.StrictMode>
        <AppContent />
      </React.StrictMode>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);
