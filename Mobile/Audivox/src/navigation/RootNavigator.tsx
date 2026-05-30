import React, { useState } from 'react';
import {
  DarkTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MiniPlayer } from '../components/music/MiniPlayer';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import {
  AlbumScreen,
  ArtistScreen,
  DownloadsScreen,
  HomeScreen,
  LibraryScreen,
  LoginScreen,
  OnboardingScreen,
  PlayerScreen,
  PlaylistScreen,
  SearchScreen,
  SongDetailsScreen,
  WelcomeScreen,
} from '../screens';
import {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from './types';
const Root = createNativeStackNavigator<RootStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};
const AppTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: true,
      sceneStyle: {
        paddingTop: Math.max(insets.top, 6),
      },
      tabBarStyle: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: insets.bottom + 8,
        height: Math.max(62, 56 + insets.bottom),
        backgroundColor: theme.colors.surfaceRaised,
        borderTopColor: theme.colors.borderSoft,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        borderRadius: 22,
        paddingTop: 4,
        paddingBottom: Math.max(6, insets.bottom),
        shadowColor: '#000',
        shadowOpacity: 0.28,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      },
      tabBarItemStyle: { paddingVertical: 2, borderRadius: 14 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 1 },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textMuted,
      tabBarActiveBackgroundColor: theme.colors.surface,
      tabBarIcon: ({ color, size }) => (
        <Icon
          color={color}
          size={size - 2}
          name={
            {
              HomeTab: 'home-outline',
              SearchTab: 'search-outline',
              LibraryTab: 'library-outline',
              DownloadsTab: 'cloud-download-outline',
            }[route.name] as string
          }
        />
      ),
    })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{ title: 'Library' }}
      />
      <Tab.Screen
        name="DownloadsTab"
        component={DownloadsScreen}
        options={{ title: 'Downloads' }}
      />
    </Tab.Navigator>
  );
};
const AuthFlow = () => (
  <Auth.Navigator screenOptions={{ headerShown: false }}>
    <Auth.Screen name="Welcome" component={WelcomeScreen} />
    <Auth.Screen name="Onboarding" component={OnboardingScreen} />
    <Auth.Screen name="Login" component={LoginScreen} />
  </Auth.Navigator>
);
export const RootNavigator = () => {
  const profile = useAppStore(s => s.profile);
  // Ocultar MiniPlayer cuando el PlayerScreen está activo para evitar solapamiento
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  return (
    <NavigationContainer
      theme={navTheme}
      ref={navigationRef}
      onStateChange={() => {
        setIsPlayerOpen(navigationRef.getCurrentRoute()?.name === 'Player');
      }}
    >
      <Root.Navigator>
        <Root.Screen
          name={profile ? 'Main' : 'Auth'}
          component={profile ? AppTabs : AuthFlow}
          options={{ headerShown: false }}
        />
        <Root.Screen name="Artist" component={ArtistScreen} />
        <Root.Screen name="Album" component={AlbumScreen} />
        <Root.Screen name="Playlist" component={PlaylistScreen} />
        <Root.Screen name="SongDetails" component={SongDetailsScreen} />
        <Root.Screen
          name="Player"
          component={PlayerScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Root.Navigator>
      {profile && !isPlayerOpen && (
        <MiniPlayer
          onOpen={() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('Player');
            }
          }}
        />
      )}
    </NavigationContainer>
  );
};
