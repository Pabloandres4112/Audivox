import React from 'react';
import { ScrollView, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { artists, playlists } from '../services/mockData';
import { musicService } from '../services/musicService';
import { usePlayerStore } from '../store/usePlayerStore';
import { RootStackParamList } from '../navigation/types';
import { HeroPanel, SectionHeader } from './ui';
import { styles } from './styles';

export const PlaylistScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Playlist'>) => {
  const playlist = playlists.find(item => item.id === route.params.playlistId);
  const play = usePlayerStore(s => s.playSong);

  if (!playlist) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock
          title="Playlist not found"
          subtitle="This playlist is not available anymore."
          icon="list-outline"
        />
      </View>
    );
  }

  const tracks = musicService.byPlaylist(playlist.id);

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel
        title={playlist.title}
        subtitle={playlist.description}
        image={playlist.cover}
      />
      <SectionHeader title="Playlist tracks" />
      {tracks.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={() => play(song)}
        />
      ))}
    </ScrollView>
  );
};
