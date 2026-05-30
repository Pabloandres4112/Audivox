import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MotiView } from 'moti';
import Icon from 'react-native-vector-icons/Ionicons';
import { SongCard } from '../components/music/SongCard';
import { artists, songs } from '../services/mockData';
import { musicService } from '../services/musicService';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { formatTime } from '../utils/time';
import { MainTabParamList } from '../navigation/types';
import { Chip, HeroPanel, SectionHeader, StatCard, playAndOpen } from './ui';
import { styles } from './styles';

export const HomeScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'HomeTab'>) => {
  const profile = useAppStore(s => s.profile);
  const modePreference = useAppStore(s => s.modePreference);
  const setModePreference = useAppStore(s => s.setModePreference);
  const isConnected = useAppStore(s => s.isConnected);
  const d = musicService.home();
  const play = usePlayerStore(s => s.playSong);
  const mark = useAppStore(s => s.markRecent);
  const topSong = d.trending[0] ?? songs[0];
  const topArtist =
    artists.find(a => a.id === topSong.artistId)?.name || 'Unknown';
  const likedCount = useAppStore(s => s.likedIds.length);
  const downloadedCount = useAppStore(s => s.downloadedIds.length);
  const effectiveMode = isConnected ? modePreference : 'offline';

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <MotiView
        from={{ opacity: 0, translateY: 18 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 450 }}
        style={{ gap: 16 }}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topKicker}>Bienvenido</Text>
            <Text style={styles.topTitle}>{profile?.name || 'Listener'}</Text>
          </View>
          <View style={styles.avatarBubble}>
            <Icon
              name="person-circle-outline"
              size={28}
              color={theme.colors.primary}
            />
          </View>
        </View>

        <View style={styles.modeSwitchCard}>
          <View style={styles.modeSwitchHeaderRow}>
            <Text style={styles.modeSwitchTitle}>Modo de reproduccion</Text>
            {!isConnected ? (
              <Text style={styles.offlineAutoPill}>Sin internet: Offline auto</Text>
            ) : (
              <Text style={styles.onlinePill}>Conectado</Text>
            )}
          </View>
          <View style={styles.modeSwitchRow}>
            <Pressable
              onPress={() => setModePreference('online')}
              style={[
                styles.modeChip,
                effectiveMode === 'online' && styles.modeChipActive,
              ]}
            >
              <Icon
                name="wifi-outline"
                size={14}
                color={
                  effectiveMode === 'online'
                    ? theme.colors.background
                    : theme.colors.text
                }
              />
              <Text
                style={[
                  styles.modeChipText,
                  effectiveMode === 'online' && styles.modeChipTextActive,
                ]}
              >
                Online
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setModePreference('offline')}
              style={[
                styles.modeChip,
                effectiveMode === 'offline' && styles.modeChipActive,
              ]}
            >
              <Icon
                name="cloud-download-outline"
                size={14}
                color={
                  effectiveMode === 'offline'
                    ? theme.colors.background
                    : theme.colors.text
                }
              />
              <Text
                style={[
                  styles.modeChipText,
                  effectiveMode === 'offline' && styles.modeChipTextActive,
                ]}
              >
                Offline
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.homeToolbar}>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('SearchTab')}
          >
            <Icon
              name="search-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.homeToolText}>Search</Text>
          </Pressable>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('LibraryTab')}
          >
            <Icon
              name="library-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.homeToolText}>Library</Text>
          </Pressable>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('DownloadsTab')}
          >
            <Icon
              name="cloud-download-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.homeToolText}>Offline</Text>
          </Pressable>
        </View>

        <View style={styles.spotlightGrid}>
          <Pressable
            style={[styles.spotlightTile, styles.spotlightWideTile]}
            onPress={async () => {
              await playAndOpen(topSong.id, play, mark, navigation as never);
            }}
          >
            <Image source={{ uri: topSong.artwork }} style={styles.spotlightCover} />
            <Text numberOfLines={2} style={styles.spotlightText}>
              {topSong.title}
            </Text>
          </Pressable>
          {d.trending.slice(1, 5).map(song => (
            <Pressable
              key={song.id}
              style={styles.spotlightTile}
              onPress={async () => {
                await playAndOpen(song.id, play, mark, navigation as never);
              }}
            >
              <Image source={{ uri: song.artwork }} style={styles.spotlightCover} />
              <Text numberOfLines={2} style={styles.spotlightText}>
                {song.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <HeroPanel
          title={topSong.title}
          subtitle={`${topArtist} · ${formatTime(topSong.duration)} · Seleccion del dia`}
          image={topSong.artwork}
          onPress={async () => {
            await playAndOpen(topSong.id, play, mark, navigation as never);
          }}
        />

        <View style={styles.statRow}>
          <StatCard label="Liked" value={`${likedCount}`} icon="heart-outline" />
          <StatCard
            label="Downloads"
            value={`${downloadedCount}`}
            icon="download-outline"
          />
          <StatCard label="Artists" value={`${artists.length}`} icon="people-outline" />
        </View>

        <View style={styles.quickActions}>
          <Chip label="Todo" active />
          <Chip label="Musica" />
          <Chip label="Podcasts" />
          <Chip label="Nuevos" />
        </View>

        <SectionHeader
          title="Trending now"
          subtitle="Tracks people are playing right now"
        />
        {d.trending.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={
              topSong.artistId === song.artistId
                ? topArtist
                : artists.find(a => a.id === song.artistId)?.name || 'Unknown'
            }
            onPress={async () => {
              await playAndOpen(song.id, play, mark, navigation as never);
            }}
          />
        ))}

        <SectionHeader title="Artists" subtitle="Tap to visit the profile page" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {d.artists.map(artist => (
            <Pressable
              key={artist.id}
              style={styles.artistCard}
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate('Artist' as never, { artistId: artist.id } as never)
              }
            >
              <Image source={{ uri: artist.image }} style={styles.artistImage} />
              <Text style={styles.artistName} numberOfLines={1}>
                {artist.name}
              </Text>
              <Text style={styles.artistMeta}>
                {artist.monthlyListeners.toLocaleString()} listeners
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader
          title="Recently played"
          subtitle="Quick access to what you listened to"
        />
        {d.recentlyPlayed.slice(0, 3).map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(song.id, play, mark, navigation as never);
            }}
          />
        ))}

        <SectionHeader
          title="Playlists"
          subtitle="Curated sets for different moods"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {d.playlists.map(list => (
            <Pressable
              key={list.id}
              style={styles.playlistCard}
              onPress={() =>
                navigation
                  .getParent()
                  ?.navigate('Playlist' as never, { playlistId: list.id } as never)
              }
            >
              <Image source={{ uri: list.cover }} style={styles.playlistCover} />
              <Text style={styles.playlistTitle}>{list.title}</Text>
              <Text style={styles.playlistSub}>{list.description}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </MotiView>
    </ScrollView>
  );
};
