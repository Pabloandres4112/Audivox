import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { albums, artists } from '../services/mockData';
import { musicService } from '../services/musicService';
import { usePlayerStore } from '../store/usePlayerStore';
import { RootStackParamList } from '../navigation/types';
import { HeroPanel, SectionHeader } from './ui';
import { styles } from './styles';

export const ArtistScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Artist'>) => {
  const artist = artists.find(a => a.id === route.params.artistId);
  const play = usePlayerStore(s => s.playSong);
  const tracks = musicService.byArtist(route.params.artistId);

  if (!artist) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock
          title="Artist not found"
          subtitle="The selected artist no longer exists."
          icon="person-circle-outline"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel
        title={artist.name}
        subtitle={`${artist.monthlyListeners.toLocaleString()} monthly listeners`}
        image={artist.image}
      />
      <SectionHeader title="Popular tracks" />
      {tracks.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artist.name}
          onPress={() => play(song)}
        />
      ))}
      <SectionHeader title="Albums" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalRow}
      >
        {albums
          .filter(album => album.artistId === artist.id)
          .map(album => (
            <Pressable key={album.id} style={styles.playlistCard}>
              <Image source={{ uri: album.cover }} style={styles.playlistCover} />
              <Text style={styles.playlistTitle}>{album.title}</Text>
              <Text style={styles.playlistSub}>{album.year}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </ScrollView>
  );
};
