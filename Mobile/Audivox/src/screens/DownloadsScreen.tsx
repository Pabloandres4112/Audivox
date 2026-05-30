import React from 'react';
import { ScrollView, Text } from 'react-native';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { artists, songs } from '../services/mockData';
import { useAppStore } from '../store/useAppStore';
import { styles } from './styles';

export const DownloadsScreen = () => {
  const ids = useAppStore(s => s.downloadedIds);
  const toggle = useAppStore(s => s.toggleDownload);
  const list = songs.filter(song => ids.includes(song.id));

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <Text style={styles.pageTitle}>Downloads</Text>
      <Text style={styles.pageSub}>Saved tracks ready for offline listening.</Text>
      {list.length === 0 ? (
        <EmptyBlock
          title="No downloads"
          subtitle="Use song details to save tracks for offline mode."
          icon="cloud-download-outline"
        />
      ) : (
        list.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={() => toggle(song.id)}
          />
        ))
      )}
    </ScrollView>
  );
};
