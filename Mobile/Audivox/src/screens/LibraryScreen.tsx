import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { artists, songs } from '../services/mockData';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { MainTabParamList } from '../navigation/types';
import { SectionHeader, StatCard, playAndOpen } from './ui';
import { styles } from './styles';

export const LibraryScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'LibraryTab'>) => {
  const liked = useAppStore(s => s.likedSongs());
  const recentIds = useAppStore(s => s.recentIds);
  const downloadedIds = useAppStore(s => s.downloadedIds);
  const play = usePlayerStore(s => s.playSong);
  const recent = songs.filter(song => recentIds.includes(song.id));
  const downloads = songs.filter(song => downloadedIds.includes(song.id));

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <Text style={styles.pageTitle}>Library</Text>
      <Text style={styles.pageSub}>Your favorites, recent activity and downloads.</Text>

      <View style={styles.statRow}>
        <StatCard label="Liked" value={`${liked.length}`} icon="heart-outline" />
        <StatCard label="Recent" value={`${recent.length}`} icon="time-outline" />
        <StatCard label="Offline" value={`${downloads.length}`} icon="download-outline" />
      </View>

      <SectionHeader title="Liked songs" subtitle="Tracks you have saved" />
      {liked.length === 0 ? (
        <EmptyBlock
          title="No favorites yet"
          subtitle="Tap heart on tracks to build your library."
          icon="heart-outline"
        />
      ) : (
        liked.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(
                song.id,
                play,
                useAppStore.getState().markRecent,
                navigation as never,
              );
            }}
          />
        ))
      )}

      <SectionHeader title="Recently played" />
      {recent.length === 0 ? (
        <EmptyBlock
          title="No recent plays"
          subtitle="Play something and it will appear here."
          icon="time-outline"
        />
      ) : (
        recent.slice(0, 3).map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(
                song.id,
                play,
                useAppStore.getState().markRecent,
                navigation as never,
              );
            }}
          />
        ))
      )}

      <SectionHeader title="Downloads" />
      {downloads.length === 0 ? (
        <EmptyBlock
          title="No downloads"
          subtitle="Use song details to save tracks for offline mode."
          icon="cloud-download-outline"
        />
      ) : (
        downloads.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(
                song.id,
                play,
                useAppStore.getState().markRecent,
                navigation as never,
              );
            }}
          />
        ))
      )}
    </ScrollView>
  );
};
