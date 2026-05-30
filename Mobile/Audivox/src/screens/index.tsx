import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MotiView } from 'moti';
import Icon from 'react-native-vector-icons/Ionicons';
import { EmptyBlock } from '../components/common/StateBlocks';
import { SongCard } from '../components/music/SongCard';
import { albums, artists, playlists, songs } from '../services/mockData';
import { musicService } from '../services/musicService';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { formatTime } from '../utils/time';
import {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../navigation/types';

const playAndOpen = async (
  songId: string,
  playSong: (song: (typeof songs)[number]) => Promise<void>,
  markRecent: (id: string) => void,
  navigation?: { getParent?: () => { navigate: (name: string, params?: never) => void } | undefined },
) => {
  const song = songs.find(item => item.id === songId);
  if (!song) return;
  markRecent(song.id);
  await playSong(song);
  navigation?.getParent?.()?.navigate('Player');
};

const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
    </View>
    {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
  </View>
);

const Chip = ({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

const HeroPanel = ({
  title,
  subtitle,
  image,
  onPress,
}: {
  title: string;
  subtitle: string;
  image: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={styles.heroPanel}>
    <Image source={{ uri: image }} style={styles.heroImage} />
    <View style={styles.heroOverlay} />
    <View style={styles.heroTextWrap}>
      <Text style={styles.heroKicker}>Featured session</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub}>{subtitle}</Text>
    </View>
  </Pressable>
);

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>
      <Icon name={icon} size={16} color={theme.colors.primary} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const WelcomeScreen = ({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) => {
  const login = useAppStore(s => s.login);
  return (
    <ScrollView contentContainerStyle={styles.fullScreen}>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={styles.welcomeWrap}
      >
        <View style={styles.brandMark}>
          <Icon name="radio-outline" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.welcomeTitle}>Audivox</Text>
        <Text style={styles.welcomeSub}>
          Música, descubrimiento y reproducción con una base preparada para crecer.
        </Text>
        <View style={styles.pillRow}>
          <Chip label="Home" active />
          <Chip label="Search" />
          <Chip label="Library" />
          <Chip label="Offline" />
        </View>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.primaryButtonText}>Start experience</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.secondaryButtonText}>Login / register</Text>
        </Pressable>
        <Pressable
          onPress={() => login({ name: 'Guest Listener', isGuest: true })}
        >
          <Text style={styles.linkText}>Continue as guest</Text>
        </Pressable>
      </MotiView>
    </ScrollView>
  );
};

export const OnboardingScreen = ({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Onboarding'>) => {
  const [index, setIndex] = useState(0);
  const done = useAppStore(s => s.completeOnboarding);
  const slides = [
    {
      title: 'Discover what fits your mood',
      description: 'Trending tracks, artists and playlists in a clean, fast flow.',
      icon: 'sparkles-outline',
    },
    {
      title: 'Control playback without friction',
      description: 'Mini player, queue, shuffle and repeat are always one tap away.',
      icon: 'play-circle-outline',
    },
    {
      title: 'Save data and continue later',
      description: 'Liked songs, downloads and recent activity persist locally.',
      icon: 'cloud-download-outline',
    },
  ];
  const current = slides[index];
  const next = () => {
    if (index === slides.length - 1) {
      done();
      navigation.navigate('Login');
      return;
    }
    setIndex(prev => prev + 1);
  };
  return (
    <View style={styles.fullScreenCenter}>
      <View style={styles.onboardingCard}>
        <View style={styles.onboardingIcon}>
          <Icon name={current.icon} size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.onboardingStep}>
          Step {index + 1}/{slides.length}
        </Text>
        <Text style={styles.onboardingTitle}>{current.title}</Text>
        <Text style={styles.onboardingSub}>{current.description}</Text>
      </View>
      <View style={styles.pagerDots}>
        {slides.map((_, dotIndex) => (
          <View
            key={dotIndex}
            style={[styles.dot, dotIndex === index && styles.dotActive]}
          />
        ))}
      </View>
      <Pressable style={styles.primaryButton} onPress={next}>
        <Text style={styles.primaryButtonText}>
          {index === slides.length - 1 ? 'Finish' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
};

export const LoginScreen = () => {
  const login = useAppStore(s => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <ScrollView contentContainerStyle={styles.fullScreen}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSub}>
          Sign in quickly and continue building your library.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            login({ name: name || 'Listener', email, isGuest: false })
          }
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => login({ name: 'Guest Listener', isGuest: true })}
        >
          <Text style={styles.secondaryButtonText}>Use guest mode</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export const HomeScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'HomeTab'>) => {
  const profile = useAppStore(s => s.profile);
  const d = musicService.home();
  const play = usePlayerStore(s => s.playSong);
  const mark = useAppStore(s => s.markRecent);
  const topSong = d.trending[0] ?? songs[0];
  const topArtist = artists.find(a => a.id === topSong.artistId)?.name || 'Unknown';
  const likedCount = useAppStore(s => s.likedIds.length);
  const downloadedCount = useAppStore(s => s.downloadedIds.length);

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
            <Text style={styles.topKicker}>Good evening</Text>
            <Text style={styles.topTitle}>{profile?.name || 'Listener'}</Text>
          </View>
          <View style={styles.avatarBubble}>
            <Icon name="person-circle-outline" size={28} color={theme.colors.primary} />
          </View>
        </View>

        <HeroPanel
          title={topSong.title}
          subtitle={`${topArtist} · ${formatTime(topSong.duration)} · Featured track`}
          image={topSong.artwork}
          onPress={async () => {
            await playAndOpen(topSong.id, play, mark, navigation as never);
          }}
        />

        <View style={styles.statRow}>
          <StatCard label="Liked" value={`${likedCount}`} icon="heart-outline" />
          <StatCard label="Downloads" value={`${downloadedCount}`} icon="download-outline" />
          <StatCard label="Artists" value={`${artists.length}`} icon="people-outline" />
        </View>

        <View style={styles.quickActions}>
          <Chip label="Trending" active />
          <Chip label="Albums" />
          <Chip label="Playlists" />
          <Chip label="Recent" />
        </View>

        <SectionHeader title="Trending now" subtitle="Tracks people are playing right now" />
        {d.trending.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={topSong.artistId === song.artistId ? topArtist : artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(song.id, play, mark, navigation as never);
            }}
          />
        ))}

        <SectionHeader title="Artists" subtitle="Tap to visit the profile page" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {d.artists.map(artist => (
            <Pressable
              key={artist.id}
              style={styles.artistCard}
              onPress={() =>
                navigation.getParent()?.navigate('Artist' as never, { artistId: artist.id } as never)
              }
            >
              <Image source={{ uri: artist.image }} style={styles.artistImage} />
              <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
              <Text style={styles.artistMeta}>{artist.monthlyListeners.toLocaleString()} listeners</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Recently played" subtitle="Quick access to what you listened to" />
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

        <SectionHeader title="Playlists" subtitle="Curated sets for different moods" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {d.playlists.map(list => (
            <Pressable
              key={list.id}
              style={styles.playlistCard}
              onPress={() =>
                navigation.getParent()?.navigate('Playlist' as never, { playlistId: list.id } as never)
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

export const SearchScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'SearchTab'>) => {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const deferredQ = useDeferredValue(q);
  const result = useMemo(() => musicService.search(deferredQ), [deferredQ]);
  const play = usePlayerStore(s => s.playSong);

  const filteredSongs = scope === 'songs' || scope === 'all' ? result.songs : [];
  const filteredArtists = scope === 'artists' || scope === 'all' ? result.artists : [];
  const filteredAlbums = scope === 'albums' || scope === 'all' ? result.albums : [];
  const filteredPlaylists = scope === 'playlists' || scope === 'all' ? result.playlists : [];

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
        {(['all', 'songs', 'artists', 'albums', 'playlists'] as const).map(item => (
          <Chip
            key={item}
            label={item}
            active={scope === item}
            onPress={() => setScope(item)}
          />
        ))}
      </ScrollView>

      {!q && <EmptyBlock title="Search your sound" subtitle="Type to discover tracks, artists and playlists." icon="search-outline" />}

      {q && filteredSongs.length === 0 && filteredArtists.length === 0 && filteredAlbums.length === 0 && filteredPlaylists.length === 0 && (
        <EmptyBlock title="No results" subtitle="Try another keyword or switch the category." icon="alert-circle-outline" />
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
                await playAndOpen(song.id, play, useAppStore.getState().markRecent, navigation as never);
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
              onPress={() =>
                navigation.getParent()?.navigate('Artist' as never, { artistId: artist.id } as never)
              }
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
              onPress={() =>
                navigation.getParent()?.navigate('Album' as never, { albumId: album.id } as never)
              }
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
              onPress={() =>
                navigation.getParent()?.navigate('Playlist' as never, { playlistId: list.id } as never)
              }
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
        <EmptyBlock title="No favorites yet" subtitle="Tap heart on tracks to build your library." icon="heart-outline" />
      ) : (
        liked.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(song.id, play, useAppStore.getState().markRecent, navigation as never);
            }}
          />
        ))
      )}

      <SectionHeader title="Recently played" />
      {recent.length === 0 ? (
        <EmptyBlock title="No recent plays" subtitle="Play something and it will appear here." icon="time-outline" />
      ) : (
        recent.slice(0, 3).map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(song.id, play, useAppStore.getState().markRecent, navigation as never);
            }}
          />
        ))
      )}

      <SectionHeader title="Downloads" />
      {downloads.length === 0 ? (
        <EmptyBlock title="No downloads" subtitle="Use song details to save tracks for offline mode." icon="cloud-download-outline" />
      ) : (
        downloads.map(song => (
          <SongCard
            key={song.id}
            song={song}
            artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
            onPress={async () => {
              await playAndOpen(song.id, play, useAppStore.getState().markRecent, navigation as never);
            }}
          />
        ))
      )}
    </ScrollView>
  );
};

export const DownloadsScreen = () => {
  const ids = useAppStore(s => s.downloadedIds);
  const toggle = useAppStore(s => s.toggleDownload);
  const list = songs.filter(song => ids.includes(song.id));
  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <Text style={styles.pageTitle}>Downloads</Text>
      <Text style={styles.pageSub}>Saved tracks ready for offline listening.</Text>
      {list.length === 0 ? (
        <EmptyBlock title="No downloads" subtitle="Use song details to save tracks for offline mode." icon="cloud-download-outline" />
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

export const ArtistScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Artist'>) => {
  const artist = artists.find(a => a.id === route.params.artistId);
  const play = usePlayerStore(s => s.playSong);
  const tracks = musicService.byArtist(route.params.artistId);
  if (!artist) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock title="Artist not found" subtitle="The selected artist no longer exists." icon="person-circle-outline" />
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel title={artist.name} subtitle={`${artist.monthlyListeners.toLocaleString()} monthly listeners`} image={artist.image} />
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
        {albums.filter(album => album.artistId === artist.id).map(album => (
          <Pressable
            key={album.id}
            style={styles.playlistCard}
            onPress={() => {}}
          >
            <Image source={{ uri: album.cover }} style={styles.playlistCover} />
            <Text style={styles.playlistTitle}>{album.title}</Text>
            <Text style={styles.playlistSub}>{album.year}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
};

export const AlbumScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Album'>) => {
  const album = albums.find(a => a.id === route.params.albumId);
  const play = usePlayerStore(s => s.playSong);
  if (!album) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock title="Album not found" subtitle="This album is not available anymore." icon="albums-outline" />
      </View>
    );
  }
  const tracks = musicService.byAlbum(album.id);
  const artistName = artists.find(a => a.id === album.artistId)?.name || 'Unknown';
  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel title={album.title} subtitle={`${artistName} · ${album.year}`} image={album.cover} />
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

export const PlaylistScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Playlist'>) => {
  const playlist = playlists.find(item => item.id === route.params.playlistId);
  const play = usePlayerStore(s => s.playSong);
  if (!playlist) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock title="Playlist not found" subtitle="This playlist is not available anymore." icon="list-outline" />
      </View>
    );
  }
  const tracks = musicService.byPlaylist(playlist.id);
  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel title={playlist.title} subtitle={playlist.description} image={playlist.cover} />
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
        <EmptyBlock title="Song not found" subtitle="The selected track is not available." icon="musical-notes-outline" />
      </View>
    );
  }
  const artistName = artists.find(artist => artist.id === song.artistId)?.name || 'Unknown';
  const isSaved = ids.includes(song.id);
  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <HeroPanel title={song.title} subtitle={`${artistName} · ${formatTime(song.duration)}`} image={song.artwork} />
      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => play(song)}>
          <Text style={styles.primaryButtonText}>Play now</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => toggle(song.id)}>
          <Text style={styles.secondaryButtonText}>{isSaved ? 'Remove download' : 'Download offline'}</Text>
        </Pressable>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Artist</Text>
        <Text style={styles.infoValue}>{artistName}</Text>
        <Text style={styles.infoLabel}>Album</Text>
        <Text style={styles.infoValue}>{albums.find(album => album.id === song.albumId)?.title || 'Single'}</Text>
      </View>
    </ScrollView>
  );
};

export const PlayerScreen = () => {
  const player = usePlayerStore();
  const liked = useAppStore(s => s.likedIds.includes(player.current?.id || ''));
  const toggleLike = useAppStore(s => s.toggleLike);
  if (!player.current) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock title="No track selected" subtitle="Pick a song from Home, Search or Library." icon="play-circle-outline" />
      </View>
    );
  }
  const artistName = artists.find(artist => artist.id === player.current?.artistId)?.name || 'Unknown';
  const ratio = Math.min(1, player.progress / player.current.duration);
  const queuePreview = player.queue.filter(song => song.id !== player.current?.id).slice(0, 3);
  return (
    <ScrollView contentContainerStyle={styles.playerPage}>
      <View style={styles.playerArtWrap}>
        <Image source={{ uri: player.current.artwork }} style={styles.playerArt} />
        <View style={styles.playerGlow} />
      </View>
      <Text style={styles.playerTitle}>{player.current.title}</Text>
      <Text style={styles.playerArtist}>{artistName}</Text>

      <View style={styles.progressHeader}>
        <Text style={styles.progressTime}>{formatTime(player.progress)}</Text>
        <Text style={styles.progressTime}>{formatTime(player.current.duration)}</Text>
      </View>
      <View style={styles.playerProgressTrack}>
        <View style={[styles.playerProgressFill, { width: `${ratio * 100}%` }]} />
      </View>

      <View style={styles.actionRowCentered}>
        <Pressable onPress={player.toggleShuffle} style={[styles.circleBtn, player.shuffle && styles.circleBtnActive]}>
          <Icon name="shuffle" size={18} color={player.shuffle ? theme.colors.background : theme.colors.text} />
        </Pressable>
        <Pressable onPress={() => player.previous()} style={styles.circleBtn}>
          <Icon name="play-skip-back" size={18} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.mainPlayBtn} onPress={() => player.togglePlay()}>
          <Icon name={player.isPlaying ? 'pause' : 'play'} size={22} color={theme.colors.background} />
        </Pressable>
        <Pressable onPress={() => player.next()} style={styles.circleBtn}>
          <Icon name="play-skip-forward" size={18} color={theme.colors.text} />
        </Pressable>
        <Pressable onPress={player.toggleRepeat} style={[styles.circleBtn, player.repeat !== 'off' && styles.circleBtnActive]}>
          <Icon name="repeat" size={18} color={player.repeat !== 'off' ? theme.colors.background : theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryButton} onPress={() => player.seek(Math.max(0, player.progress - 10))}>
          <Text style={styles.secondaryButtonText}>-10s</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => player.seek(Math.min(player.current.duration, player.progress + 10))}>
          <Text style={styles.secondaryButtonText}>+10s</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => toggleLike(player.current!.id)}>
          <Text style={styles.secondaryButtonText}>{liked ? 'Liked' : 'Like'}</Text>
        </Pressable>
      </View>

      <View style={styles.queueCard}>
        <Text style={styles.queueTitle}>Up next</Text>
        {queuePreview.length === 0 ? (
          <Text style={styles.queueSub}>Queue is empty.</Text>
        ) : (
          queuePreview.map(item => (
            <View key={item.id} style={styles.queueRow}>
              <Image source={{ uri: item.artwork }} style={styles.queueCover} />
              <View style={{ flex: 1 }}>
                <Text style={styles.queueItemTitle}>{item.title}</Text>
                <Text style={styles.queueSub}>{artists.find(artist => artist.id === item.artistId)?.name || 'Unknown'}</Text>
              </View>
              <Text style={styles.queueSub}>{formatTime(item.duration)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollPage: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 132,
  },
  fullScreen: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  welcomeWrap: {
    gap: 16,
    padding: 18,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  welcomeTitle: { color: theme.colors.text, fontSize: 34, fontWeight: '900' },
  welcomeSub: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryButtonText: { color: theme.colors.background, fontWeight: '900' },
  secondaryButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  secondaryButtonText: { color: theme.colors.text, fontWeight: '800' },
  linkText: { color: theme.colors.primary, textAlign: 'center', fontWeight: '700' },
  onboardingCard: {
    gap: 12,
    padding: 20,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  onboardingIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  onboardingStep: { color: theme.colors.primary, fontWeight: '800', fontSize: 12 },
  onboardingTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  onboardingSub: { color: theme.colors.textMuted, lineHeight: 22 },
  pagerDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: theme.colors.border },
  dotActive: { width: 28, backgroundColor: theme.colors.primary },
  formCard: {
    gap: 14,
    padding: 20,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  formTitle: { color: theme.colors.text, fontSize: 26, fontWeight: '900' },
  formSub: { color: theme.colors.textMuted, lineHeight: 22 },
  input: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topKicker: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  topTitle: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  avatarBubble: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  heroPanel: {
    minHeight: 210,
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 11, 18, 0.18)',
  },
  heroTextWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    gap: 6,
  },
  heroKicker: { color: theme.colors.primary, fontWeight: '800', fontSize: 12 },
  heroTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 24 },
  heroSub: { color: theme.colors.text, opacity: 0.84, lineHeight: 20 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    gap: 6,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  statValue: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  statLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  sectionSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  sectionAction: { color: theme.colors.primary, fontWeight: '800' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textMuted, fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: theme.colors.background },
  horizontalRow: { gap: 12, paddingVertical: 6 },
  artistCard: {
    width: 132,
    padding: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    gap: 8,
  },
  artistImage: { width: '100%', aspectRatio: 1, borderRadius: 14 },
  artistName: { color: theme.colors.text, fontWeight: '900' },
  artistMeta: { color: theme.colors.textMuted, fontSize: 11 },
  playlistCard: {
    width: 160,
    padding: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    gap: 8,
  },
  playlistCover: { width: '100%', aspectRatio: 1, borderRadius: 14 },
  playlistTitle: { color: theme.colors.text, fontWeight: '900' },
  playlistSub: { color: theme.colors.textMuted, fontSize: 12 },
  pageTitle: { color: theme.colors.text, fontSize: 30, fontWeight: '900' },
  pageSub: { color: theme.colors.textMuted, marginTop: -6 },
  searchInput: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.colors.text,
  },
  resultPill: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    gap: 4,
  },
  resultPrimary: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  resultSecondary: { color: theme.colors.text, fontWeight: '800' },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    gap: 6,
  },
  infoLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: theme.colors.text, fontWeight: '800', marginBottom: 6 },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionRowCentered: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  playerPage: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 140,
  },
  playerArtWrap: {
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  playerArt: { width: '100%', aspectRatio: 1 },
  playerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(83, 214, 196, 0.08)',
  },
  playerTitle: { color: theme.colors.text, fontSize: 28, fontWeight: '900' },
  playerArtist: { color: theme.colors.textMuted, fontSize: 15 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTime: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  playerProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
  },
  playerProgressFill: { height: 6, backgroundColor: theme.colors.primary },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  circleBtnActive: { backgroundColor: theme.colors.primary },
  mainPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  queueCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    gap: 10,
  },
  queueTitle: { color: theme.colors.text, fontWeight: '900', fontSize: 16 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  queueCover: { width: 42, height: 42, borderRadius: 12 },
  queueItemTitle: { color: theme.colors.text, fontWeight: '800' },
  queueSub: { color: theme.colors.textMuted, fontSize: 12 },
});