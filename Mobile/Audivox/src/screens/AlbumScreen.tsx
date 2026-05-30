import React from 'react';
import { ScrollView, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { albums, artists } from '../services/mockData';
import { musicService } from '../services/musicService';
import { usePlayerStore } from '../store/usePlayerStore';
import { RootStackParamList } from '../navigation/types';
import { HeroPanel, SectionHeader } from './ui';
import { styles } from './styles';

export const AlbumScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Album'>) => {
  const album = albums.find(a => a.id === route.params.albumId);
  const play = usePlayerStore(s => s.playSong);

  if (!album) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock
          title="Album not found"
          subtitle="This album is not available anymore."
          icon="albums-outline"
        />
      </View>
    );
  }

  const tracks = musicService.byAlbum(album.id);
  const artistName =
    artists.find(a => a.id === album.artistId)?.name || 'Unknown';

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel
        title={album.title}
        subtitle={`${artistName} · ${album.year}`}
        image={album.cover}
      />
      <SectionHeader title="Songs on the album" />
      {tracks.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artistName}
          onPress={() => play(song)}
        />
      ))}
    </ScrollView>
  );
};
