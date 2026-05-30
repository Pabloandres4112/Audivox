import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Screen } from '../components/common/Screen';
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

export const WelcomeScreen = ({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) => {
  const login = useAppStore(s => s.login);
  return (
    <Screen>
      <View style={st.center}>
        <Text style={st.brand}>Audivox</Text>
        <Text style={st.sub}>Premium music experience</Text>
        <Pressable
          style={st.btn}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={st.btnTxt}>Onboarding</Text>
        </Pressable>
        <Pressable
          style={st.btnAlt}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={st.btnTxt}>Login / Register</Text>
        </Pressable>
        <Pressable
          onPress={() => login({ name: 'Guest Listener', isGuest: true })}
        >
          <Text style={st.link}>Continue as guest</Text>
        </Pressable>
      </View>
    </Screen>
  );
};
export const OnboardingScreen = ({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, 'Onboarding'>) => {
  const [i, setI] = useState(0);
  const done = useAppStore(s => s.completeOnboarding);
  const slides = [
    'Trending + discovery',
    'Queue + mini player',
    'Offline + persistent library',
  ];
  const next = () => {
    if (i === slides.length - 1) {
      done();
      navigation.navigate('Login');
    } else setI(v => v + 1);
  };
  return (
    <Screen>
      <View style={st.center}>
        <View style={st.card}>
          <Text style={st.sub}>
            Step {i + 1}/{slides.length}
          </Text>
          <Text style={st.head}>{slides[i]}</Text>
        </View>
        <Pressable style={st.btn} onPress={next}>
          <Text style={st.btnTxt}>
            {i === slides.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};
export const LoginScreen = () => {
  const login = useAppStore(s => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <Screen>
      <View style={st.center}>
        <Text style={st.head}>Welcome back</Text>
        <TextInput
          style={st.input}
          placeholder="Name"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={st.input}
          placeholder="Email"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <Pressable
          style={st.btn}
          onPress={() =>
            login({ name: name || 'Listener', email, isGuest: false })
          }
        >
          <Text style={st.btnTxt}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

export const HomeScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'HomeTab'>) => {
  const d = musicService.home();
  const play = usePlayerStore(s => s.playSong);
  const mark = useAppStore(s => s.markRecent);
  return (
    <Screen scroll>
      <Text style={st.head}>Trending</Text>
      {d.trending.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={async () => {
            mark(song.id);
            await play(song);
            navigation.getParent()?.navigate('Player' as never);
          }}
        />
      ))}
      <Text style={st.head}>Artists</Text>
      <View style={st.row}>
        {d.artists.map(a => (
          <Pressable
            key={a.id}
            style={st.artist}
            onPress={() =>
              navigation
                .getParent()
                ?.navigate('Artist' as never, { artistId: a.id } as never)
            }
          >
            <Image source={{ uri: a.image }} style={st.artistImg} />
            <Text style={st.artistName}>{a.name}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
};
export const SearchScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'SearchTab'>) => {
  const [q, setQ] = useState('');
  const r = useMemo(() => musicService.search(q), [q]);
  const play = usePlayerStore(s => s.playSong);
  return (
    <Screen scroll>
      <TextInput
        value={q}
        onChangeText={setQ}
        style={st.input}
        placeholder="Search songs, artists, albums, playlists"
        placeholderTextColor={theme.colors.textMuted}
      />
      {!q && (
        <EmptyBlock
          title="Search your sound"
          subtitle="Type to discover tracks, artists and playlists."
        />
      )}
      {r.songs.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={async () => {
            await play(song);
            navigation.getParent()?.navigate('Player' as never);
          }}
        />
      ))}
      {r.artists.map(a => (
        <Pressable
          key={a.id}
          style={st.pill}
          onPress={() =>
            navigation
              .getParent()
              ?.navigate('Artist' as never, { artistId: a.id } as never)
          }
        >
          <Text style={st.pillTxt}>Artist · {a.name}</Text>
        </Pressable>
      ))}
      {r.albums.map(a => (
        <Pressable
          key={a.id}
          style={st.pill}
          onPress={() =>
            navigation
              .getParent()
              ?.navigate('Album' as never, { albumId: a.id } as never)
          }
        >
          <Text style={st.pillTxt}>Album · {a.title}</Text>
        </Pressable>
      ))}
      {r.playlists.map(p => (
        <Pressable
          key={p.id}
          style={st.pill}
          onPress={() =>
            navigation
              .getParent()
              ?.navigate('Playlist' as never, { playlistId: p.id } as never)
          }
        >
          <Text style={st.pillTxt}>Playlist · {p.title}</Text>
        </Pressable>
      ))}
    </Screen>
  );
};
export const LibraryScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'LibraryTab'>) => {
  const liked = useAppStore(s => s.likedSongs());
  const play = usePlayerStore(s => s.playSong);
  return (
    <Screen scroll>
      <Text style={st.head}>Liked songs</Text>
      {liked.length === 0 && (
        <EmptyBlock
          title="No favorites yet"
          subtitle="Tap heart on tracks to build your library."
        />
      )}
      {liked.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={async () => {
            await play(song);
            navigation.getParent()?.navigate('Player' as never);
          }}
        />
      ))}
    </Screen>
  );
};
export const DownloadsScreen = () => {
  const ids = useAppStore(s => s.downloadedIds);
  const toggle = useAppStore(s => s.toggleDownload);
  const list = songs.filter(s => ids.includes(s.id));
  return (
    <Screen scroll>
      <Text style={st.head}>Downloads</Text>
      {list.length === 0 && (
        <EmptyBlock
          title="No downloads"
          subtitle="Use song details to save tracks for offline mode."
        />
      )}
      {list.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={() => toggle(song.id)}
        />
      ))}
    </Screen>
  );
};

export const ArtistScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Artist'>) => {
  const artist = artists.find(a => a.id === route.params.artistId);
  const play = usePlayerStore(s => s.playSong);
  const tracks = musicService.byArtist(route.params.artistId);
  if (!artist)
    return (
      <Screen>
        <Text style={st.sub}>Artist not found</Text>
      </Screen>
    );
  return (
    <Screen scroll>
      <Image source={{ uri: artist.image }} style={st.hero} />
      <Text style={st.head}>{artist.name}</Text>
      <Text style={st.sub}>
        {artist.monthlyListeners.toLocaleString()} monthly listeners
      </Text>
      {tracks.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artist.name}
          onPress={() => play(song)}
        />
      ))}
    </Screen>
  );
};
export const AlbumScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Album'>) => {
  const album = albums.find(a => a.id === route.params.albumId);
  const play = usePlayerStore(s => s.playSong);
  if (!album)
    return (
      <Screen>
        <Text style={st.sub}>Album not found</Text>
      </Screen>
    );
  const tracks = musicService.byAlbum(album.id);
  return (
    <Screen scroll>
      <Image source={{ uri: album.cover }} style={st.hero} />
      <Text style={st.head}>{album.title}</Text>
      <Text style={st.sub}>
        {artists.find(a => a.id === album.artistId)?.name}
      </Text>
      {tracks.map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={() => play(song)}
        />
      ))}
    </Screen>
  );
};
export const PlaylistScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Playlist'>) => {
  const p = playlists.find(x => x.id === route.params.playlistId);
  const play = usePlayerStore(s => s.playSong);
  if (!p)
    return (
      <Screen>
        <Text style={st.sub}>Playlist not found</Text>
      </Screen>
    );
  return (
    <Screen scroll>
      <Image source={{ uri: p.cover }} style={st.hero} />
      <Text style={st.head}>{p.title}</Text>
      <Text style={st.sub}>{p.description}</Text>
      {musicService.byPlaylist(p.id).map(song => (
        <SongCard
          key={song.id}
          song={song}
          artist={artists.find(a => a.id === song.artistId)?.name || 'Unknown'}
          onPress={() => play(song)}
        />
      ))}
    </Screen>
  );
};
export const SongDetailsScreen = ({
  route,
}: NativeStackScreenProps<RootStackParamList, 'SongDetails'>) => {
  const song = songs.find(s => s.id === route.params.songId);
  const toggle = useAppStore(s => s.toggleDownload);
  const ids = useAppStore(s => s.downloadedIds);
  const play = usePlayerStore(s => s.playSong);
  if (!song)
    return (
      <Screen>
        <Text style={st.sub}>Song not found</Text>
      </Screen>
    );
  const isSaved = ids.includes(song.id);
  return (
    <Screen>
      <View style={st.center}>
        <Image source={{ uri: song.artwork }} style={st.hero} />
        <Text style={st.head}>{song.title}</Text>
        <Text style={st.sub}>
          {artists.find(a => a.id === song.artistId)?.name} ·{' '}
          {formatTime(song.duration)}
        </Text>
        <Pressable style={st.btn} onPress={() => play(song)}>
          <Text style={st.btnTxt}>Play now</Text>
        </Pressable>
        <Pressable style={st.btnAlt} onPress={() => toggle(song.id)}>
          <Text style={st.btnTxt}>
            {isSaved ? 'Remove download' : 'Download offline'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};
export const PlayerScreen = () => {
  const p = usePlayerStore();
  if (!p.current)
    return (
      <Screen>
        <Text style={st.sub}>No track selected</Text>
      </Screen>
    );
  const artist =
    artists.find(a => a.id === p.current?.artistId)?.name || 'Unknown';
  const ratio = Math.min(1, p.progress / p.current.duration);
  return (
    <Screen>
      <Image source={{ uri: p.current.artwork }} style={st.hero} />
      <Text style={st.head}>{p.current.title}</Text>
      <Text style={st.sub}>{artist}</Text>
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={st.rowSpace}>
        <Text style={st.sub}>{formatTime(p.progress)}</Text>
        <Text style={st.sub}>{formatTime(p.current.duration)}</Text>
      </View>
      <View style={st.ctrl}>
        <Pressable onPress={p.toggleShuffle}>
          <Text
            style={[st.ctrlTxt, p.shuffle && { color: theme.colors.success }]}
          >
            Shuffle
          </Text>
        </Pressable>
        <Pressable onPress={() => p.previous()}>
          <Text style={st.ctrlTxt}>Prev</Text>
        </Pressable>
        <Pressable style={st.play} onPress={() => p.togglePlay()}>
          <Text style={st.playTxt}>{p.isPlaying ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable onPress={() => p.next()}>
          <Text style={st.ctrlTxt}>Next</Text>
        </Pressable>
        <Pressable onPress={p.toggleRepeat}>
          <Text
            style={[
              st.ctrlTxt,
              p.repeat !== 'off' && { color: theme.colors.success },
            ]}
          >
            Repeat {p.repeat === 'one' ? '1' : ''}
          </Text>
        </Pressable>
      </View>
      <View style={st.rowSpace}>
        <Pressable onPress={() => p.seek(Math.max(0, p.progress - 10))}>
          <Text style={st.link}>-10s</Text>
        </Pressable>
        <Pressable
          onPress={() => p.seek(Math.min(p.current.duration, p.progress + 10))}
        >
          <Text style={st.link}>+10s</Text>
        </Pressable>
      </View>
    </Screen>
  );
};
const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 12 },
  brand: { color: theme.colors.text, fontSize: 30, fontWeight: '800' },
  head: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: theme.colors.textMuted },
  btn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  btnAlt: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  btnTxt: { color: theme.colors.text, fontWeight: '700' },
  link: { color: theme.colors.textMuted, textAlign: 'center' },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  rowSpace: { flexDirection: 'row', justifyContent: 'space-between' },
  artist: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  artistImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  artistName: { color: theme.colors.text, fontSize: 12 },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillTxt: { color: theme.colors.textMuted },
  hero: { width: '100%', aspectRatio: 1, borderRadius: 20 },
  progressTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 5, backgroundColor: theme.colors.primary },
  ctrl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  ctrlTxt: { color: theme.colors.textMuted, fontSize: 12 },
  play: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  playTxt: { color: theme.colors.text, fontWeight: '700' },
});
