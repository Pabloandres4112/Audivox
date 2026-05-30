import React, { useDeferredValue, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { artists } from '../services/mockData';
import { musicService } from '../services/musicService';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { Chip, SectionHeader, playAndOpen } from './ui';
import { styles } from './styles';

export const SearchScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'SearchTab'>) => {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<
    'all' | 'songs' | 'artists' | 'albums' | 'playlists'
  >('all');
  const deferredQ = useDeferredValue(q);
  const result = useMemo(() => musicService.search(deferredQ), [deferredQ]);
  const play = usePlayerStore(s => s.playSong);

  const filteredSongs = scope === 'songs' || scope === 'all' ? result.songs : [];
  const filteredArtists =
    scope === 'artists' || scope === 'all' ? result.artists : [];
  const filteredAlbums = scope === 'albums' || scope === 'all' ? result.albums : [];
  const filteredPlaylists =
    scope === 'playlists' || scope === 'all' ? result.playlists : [];

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <Text style={styles.pageTitle}>Search</Text>
      <Text style={styles.pageSub}>Find songs, artists, albums and playlists.</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        style={styles.searchInput}
        placeholder="Search by title, artist or playlist"
        placeholderTextColor={theme.colors.textMuted}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalRow}
      >
        {(['all', 'songs', 'artists', 'albums', 'playlists'] as const).map(
          item => (
            <Chip
              key={item}
              label={item}
              active={scope === item}
              onPress={() => setScope(item)}
            />
          ),
        )}
      </ScrollView>

      {!q && (
        <EmptyBlock
          title="Search your sound"
          subtitle="Type to discover tracks, artists and playlists."
          icon="search-outline"
        />
      )}

      {q &&
        filteredSongs.length === 0 &&
        filteredArtists.length === 0 &&
        filteredAlbums.length === 0 &&
        filteredPlaylists.length === 0 && (
          <EmptyBlock
            title="No results"
            subtitle="Try another keyword or switch the category."
            icon="alert-circle-outline"
          />
        )}

      {filteredSongs.length > 0 && (
        <>
          <SectionHeader title="Songs" />
          {filteredSongs.map(song => (
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
          ))}
        </>
      )}

      {filteredArtists.length > 0 && (
        <>
          <SectionHeader title="Artists" />
          {filteredArtists.map(artist => (
            <Pressable
              key={artist.id}
              style={styles.resultPill}
              onPress={() => {
                // getParent<any>() evita crash cuando el padre no tiene la ruta registrada
                const rootNav = navigation.getParent<any>();
                if (rootNav) rootNav.navigate('Artist', { artistId: artist.id });
              }}
            >
              <Text style={styles.resultPrimary}>Artist</Text>
              <Text style={styles.resultSecondary}>{artist.name}</Text>
            </Pressable>
          ))}
        </>
      )}

      {filteredAlbums.length > 0 && (
        <>
          <SectionHeader title="Albums" />
          {filteredAlbums.map(album => (
            <Pressable
              key={album.id}
              style={styles.resultPill}
              onPress={() => {
                const rootNav = navigation.getParent<any>();
                if (rootNav) rootNav.navigate('Album', { albumId: album.id });
              }}
            >
              <Text style={styles.resultPrimary}>Album</Text>
              <Text style={styles.resultSecondary}>{album.title}</Text>
            </Pressable>
          ))}
        </>
      )}

      {filteredPlaylists.length > 0 && (
        <>
          <SectionHeader title="Playlists" />
          {filteredPlaylists.map(list => (
            <Pressable
              key={list.id}
              style={styles.resultPill}
              onPress={() => {
                const rootNav = navigation.getParent<any>();
                if (rootNav) rootNav.navigate('Playlist', { playlistId: list.id });
              }}
            >
              <Text style={styles.resultPrimary}>Playlist</Text>
              <Text style={styles.resultSecondary}>{list.title}</Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
};
