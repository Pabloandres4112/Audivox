import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { audiusService, AudiusTrackResult } from '../services/audiusService';
import { localMediaService } from '../services/localMediaService';
import {
  ExternalDownload,
  ExternalDownloadFormat,
  useAppStore,
} from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { styles } from './styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRES: { label: string; icon: string; audius?: string }[] = [
  { label: 'Tendencias', icon: 'trending-up-outline' },
  { label: 'Electronic', icon: 'radio-outline', audius: 'Electronic' },
  { label: 'Hip-Hop', icon: 'mic-outline', audius: 'Hip-Hop/Rap' },
  { label: 'Pop', icon: 'musical-notes-outline', audius: 'Pop' },
  { label: 'Rock', icon: 'flash-outline', audius: 'Rock' },
  { label: 'R&B / Soul', icon: 'heart-outline', audius: 'R&B/Soul' },
  { label: 'Indie', icon: 'leaf-outline', audius: 'Indie Pop' },
  { label: 'Jazz', icon: 'cafe-outline', audius: 'Jazz' },
];

const GENRE_COLORS = [
  '#7C3AED', '#059669', '#DC2626', '#D97706',
  '#2563EB', '#DB2777', '#0891B2', '#65A30D',
];

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const toDownloadFormat = (raw?: string): ExternalDownloadFormat => {
  if (raw === 'm4a' || raw === 'wav' || raw === 'mp3') return raw;
  return 'mp3';
};

// ─── Track result card ────────────────────────────────────────────────────────

type TrackCardProps = {
  track: AudiusTrackResult;
  isPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
};

const TrackCard = ({ track, isPlaying, onPlay, onDownload }: TrackCardProps) => (
  <View style={styles.searchTrackCard}>
    <Pressable style={styles.searchTrackMain} onPress={onPlay}>
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={styles.searchTrackArt} />
      ) : (
        <View style={[styles.searchTrackArt, styles.searchTrackArtFallback]}>
          <Icon name="musical-note-outline" size={18} color={theme.colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.searchTrackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.searchTrackMeta} numberOfLines={1}>
          {track.artistName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {track.genre ? (
            <Text style={styles.searchTrackGenre}>{track.genre}</Text>
          ) : null}
          <Text style={styles.searchTrackMeta}>{fmtDuration(track.duration)}</Text>
        </View>
      </View>
      <Icon
        name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
        size={32}
        color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
    <Pressable onPress={onDownload} style={styles.searchDownloadBtn} hitSlop={8}>
      <Icon name="download-outline" size={14} color={theme.colors.primary} />
      <Text style={styles.searchDownloadBtnText}>Guardar</Text>
    </Pressable>
  </View>
);

// ─── Genre Card ───────────────────────────────────────────────────────────────

type GenreCardProps = {
  label: string;
  icon: string;
  color: string;
  active: boolean;
  onPress: () => void;
};

const GenreCard = ({ label, icon, color, active, onPress }: GenreCardProps) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.genreCard,
      { borderColor: active ? color : theme.colors.borderSoft },
      active && { backgroundColor: color + '22' },
    ]}
  >
    <View style={[styles.genreIcon, { backgroundColor: color + '33' }]}>
      <Icon name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.genreLabel, active && { color }]}>{label}</Text>
  </Pressable>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const SearchScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'SearchTab'>) => {
  const [q, setQ] = useState('');
  const [activeGenre, setActiveGenre] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AudiusTrackResult[]>([]);

  const enqueueExternalDownload = useAppStore(s => s.enqueueExternalDownload);
  const addRecentTrack = useAppStore(s => s.addRecentTrack);
  const playSong = usePlayerStore(s => s.playSong);
  const currentSong = usePlayerStore(s => s.current);
  const isPlayerPlaying = usePlayerStore(s => s.isPlaying);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playingAudiusId =
    currentSong?.id.startsWith('audius-') && isPlayerPlaying
      ? currentSong.id.slice(7)
      : null;

  // Carga inicial: trending
  useEffect(() => {
    loadGenre(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGenre = useCallback((idx: number) => {
    setActiveGenre(idx);
    setQ('');
    setError(null);
    setLoading(true);
    const genre = GENRES[idx].audius;
    audiusService
      .getTrending(20, genre)
      .then(setResults)
      .catch(e => setError(e?.message ?? 'Error al conectar con Audius.'))
      .finally(() => setLoading(false));
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) return;

    debounceRef.current = setTimeout(() => {
      setError(null);
      setLoading(true);
      audiusService
        .searchTracks(q.trim(), 25)
        .then(setResults)
        .catch(e => setError(e?.message ?? 'Error de búsqueda.'))
        .finally(() => setLoading(false));
    }, 480);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const handlePlay = useCallback(
    async (track: AudiusTrackResult) => {
      const song = {
        id: `audius-${track.id}`,
        title: track.title,
        artistId: track.artistName,
        albumId: '',
        duration: track.duration,
        artwork: track.artworkUrl ?? '',
        streamUrl: track.streamUrl,
      };
      const ok = await playSong(song);
      if (ok) {
        addRecentTrack({
          id: `audius-${track.id}`,
          title: track.title,
          artistName: track.artistName,
          artworkUrl: track.artworkUrl,
          duration: track.duration,
          genre: track.genre,
          streamUrl: track.streamUrl,
        });
        navigation.getParent?.()?.navigate('Player' as never);
      }
    },
    [playSong, addRecentTrack, navigation],
  );

  const handleDownload = useCallback(
    (track: AudiusTrackResult) => {
      const id = `ext-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const format = toDownloadFormat(track.format);
      const queued: ExternalDownload = {
        id,
        url: track.streamUrl,
        title: track.title,
        thumbnailUrl: track.artworkUrl,
        format,
        status: 'queued',
        progress: 0,
        createdAt: Date.now(),
      };
      enqueueExternalDownload(queued);
      localMediaService.ensureAudivoxFolder().catch(() => {});
      navigation.navigate('DownloadsTab');
    },
    [enqueueExternalDownload, navigation],
  );

  const showGenreGrid = !q.trim();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollPage}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>Buscar</Text>
      <Text style={styles.pageSub}>Descubre música real en Audius, gratis y sin cuenta.</Text>

      {/* ── Buscador ── */}
      <View style={styles.searchBarRow}>
        <Icon
          name="search-outline"
          size={18}
          color={theme.colors.textMuted}
          style={{ marginLeft: 12 }}
        />
        <TextInput
          value={q}
          onChangeText={setQ}
          style={styles.searchBarInput}
          placeholder="Artista, canción o álbum..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {q.length > 0 && (
          <Pressable onPress={() => setQ('')} hitSlop={10} style={{ marginRight: 12 }}>
            <Icon name="close-circle" size={18} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ── Grid de géneros (cuando no hay query) ── */}
      {showGenreGrid && (
        <View style={styles.genreGrid}>
          {GENRES.map((g, i) => (
            <GenreCard
              key={g.label}
              label={g.label}
              icon={g.icon}
              color={GENRE_COLORS[i % GENRE_COLORS.length]}
              active={activeGenre === i && !q.trim()}
              onPress={() => loadGenre(i)}
            />
          ))}
        </View>
      )}

      {/* ── Estado: cargando ── */}
      {loading && (
        <View style={styles.searchStateBlock}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.searchStateSub}>
            {q.trim() ? `Buscando "${q.trim()}"…` : `Cargando ${GENRES[activeGenre]?.label}…`}
          </Text>
        </View>
      )}

      {/* ── Estado: error ── */}
      {!loading && error && (
        <View style={styles.errorBanner}>
          <Icon name="wifi-outline" size={14} color={theme.colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ── Resultados ── */}
      {!loading && !error && results.length > 0 && (
        <>
          <View style={styles.downloadsHeaderRow}>
            <Text style={styles.sectionTitle}>
              {q.trim()
                ? `Resultados (${results.length})`
                : GENRES[activeGenre]?.label}
            </Text>
            <View style={styles.audiusCredit}>
              <Icon name="radio-outline" size={11} color={theme.colors.primary} />
              <Text style={styles.audiusCreditText}>Audius</Text>
            </View>
          </View>
          {results.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              isPlaying={playingAudiusId === track.id}
              onPlay={() => handlePlay(track)}
              onDownload={() => handleDownload(track)}
            />
          ))}
        </>
      )}

      {/* ── Sin resultados ── */}
      {!loading && !error && results.length === 0 && q.trim().length > 0 && (
        <View style={styles.searchStateBlock}>
          <Icon name="musical-notes-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.searchStateTitle}>Sin resultados</Text>
          <Text style={styles.searchStateSub}>
            Prueba con otro artista o canción.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};
