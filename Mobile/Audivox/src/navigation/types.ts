import { NavigatorScreenParams } from '@react-navigation/native';
export type AuthStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
};
export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  LibraryTab: undefined;
  DownloadsTab: undefined;
};
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Artist: { artistId: string };
  Album: { albumId: string };
  Playlist: { playlistId: string };
  SongDetails: { songId: string };
  Player: undefined;
};
