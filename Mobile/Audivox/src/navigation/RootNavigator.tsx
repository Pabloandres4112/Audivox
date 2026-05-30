import React from 'react';
import {
  DarkTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14,
        height: 74,
        backgroundColor: theme.colors.surfaceRaised,
        borderTopColor: theme.colors.borderSoft,
        borderWidth: 1,
        borderColor: theme.colors.borderSoft,
        borderRadius: 26,
        paddingTop: 6,
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 14,
      },
      tabBarItemStyle: { paddingVertical: 4, borderRadius: 18 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textMuted,
      tabBarActiveBackgroundColor: theme.colors.surface,
      tabBarIcon: ({ color, size }) => (
        <Icon
          color={color}
          size={size + 1}
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
const AuthFlow = () => (
  <Auth.Navigator screenOptions={{ headerShown: false }}>
    <Auth.Screen name="Welcome" component={WelcomeScreen} />
    <Auth.Screen name="Onboarding" component={OnboardingScreen} />
    <Auth.Screen name="Login" component={LoginScreen} />
  </Auth.Navigator>
);
export const RootNavigator = () => {
  const profile = useAppStore(s => s.profile);
  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
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
      {profile && (
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
