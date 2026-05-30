import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EmptyBlock } from '../components/common/StateBlocks';
import { albums, artists, songs } from '../services/mockData';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatTime } from '../utils/time';
import { RootStackParamList } from '../navigation/types';
import { HeroPanel } from './ui';
import { styles } from './styles';

export const SongDetailsScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'SongDetails'>) => {
  const song = songs.find(track => track.id === route.params.songId);
  const toggle = useAppStore(s => s.toggleDownload);
  const ids = useAppStore(s => s.downloadedIds);
  const play = usePlayerStore(s => s.playSong);

  if (!song) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock
          title="Song not found"
          subtitle="The selected track is not available."
          icon="musical-notes-outline"
        />
      </View>
    );
  }

  const artistName =
    artists.find(artist => artist.id === song.artistId)?.name || 'Unknown';
  const isSaved = ids.includes(song.id);

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel
        title={song.title}
        subtitle={`${artistName} · ${formatTime(song.duration)}`}
        image={song.artwork}
      />
      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => play(song)}>
          <Text style={styles.primaryButtonText}>Play now</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => toggle(song.id)}>
          <Text style={styles.secondaryButtonText}>
            {isSaved ? 'Remove download' : 'Download offline'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Artist</Text>
        <Text style={styles.infoValue}>{artistName}</Text>
        <Text style={styles.infoLabel}>Album</Text>
        <Text style={styles.infoValue}>
          {albums.find(album => album.id === song.albumId)?.title || 'Single'}
        </Text>
      </View>
    </ScrollView>
  );
};
