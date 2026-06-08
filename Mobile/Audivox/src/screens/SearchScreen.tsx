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
import { deezerService, DeezerTrack, DEEZER_GENRES } from '../services/deezerService';
import { invidiousService } from '../services/invidiousService';
import { localMediaService } from '../services/localMediaService';
import {
  ExternalDownload,
  ExternalDownloadFormat,
  useAppStore,
} from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { normalizeSearchQuery, sanitizeDisplayText } from '../security/inputValidation';
import { styles } from './styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENRE_COLORS = [
  '#7C3AED', '#059669', '#DC2626', '#D97706',
  '#2563EB', '#DB2777', '#0891B2', '#65A30D', '#9D4EDD',
];

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

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
    <Text style={[styles.genreLabel, active && { color }]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

// ─── Deezer Track Card ────────────────────────────────────────────────────────

type DeezerCardProps = {
  track: DeezerTrack;
  isPlaying: boolean;
  isResolving: boolean;
  onPreview: () => void;
  onFullPlay: () => void;
  onDownload: () => void;
};

const DeezerCard = ({
  track,
  isPlaying,
  isResolving,
  onPreview,
  onFullPlay,
  onDownload,
}: DeezerCardProps) => {
  const cover = track.album.cover_medium ?? track.album.cover_small;

  return (
    <View style={styles.searchTrackCard}>
      {/* Info row */}
      <View style={styles.searchTrackMain}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.searchTrackArt} />
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
            {track.artist.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.searchTrackMeta}>{fmtDuration(track.duration)}</Text>
            {isPlaying && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="musical-notes-outline" size={10} color={theme.colors.success} />
                <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: '700' }}>
                  Reproduciendo
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Action row */}
      <View style={styles.deezerActionsRow}>
        {/* Preview 30s — instantáneo, directo de Deezer */}
        <Pressable onPress={onPreview} style={styles.deezerPreviewBtn} hitSlop={6}>
          <Icon name="play-outline" size={13} color={theme.colors.accent} />
          <Text style={styles.deezerPreviewText}>Preview 30s</Text>
        </Pressable>

        {/* Audio completo — resuelve vía Invidious */}
        <Pressable
          onPress={onFullPlay}
          style={[styles.deezerFullBtn, isResolving && { opacity: 0.7 }]}
          disabled={isResolving}
          hitSlop={6}
        >
          {isResolving ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <>
              <Icon name="musical-notes" size={13} color={theme.colors.background} />
              <Text style={styles.deezerFullText}>Escuchar</Text>
            </>
          )}
        </Pressable>

        {/* Guardar */}
        <Pressable onPress={onDownload} style={styles.deezerSaveBtn} hitSlop={6}>
          <Icon name="download-outline" size={13} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const SearchScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'SearchTab'>) => {
  const [q, setQ] = useState('');
  const [activeGenreIdx, setActiveGenreIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DeezerTrack[]>([]);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const addRecentTrack = useAppStore(s => s.addRecentTrack);
  const playSong = usePlayerStore(s => s.playSong);
  const currentSong = usePlayerStore(s => s.current);
  const isPlayerPlaying = usePlayerStore(s => s.isPlaying);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Callbacks definidos ANTES de los effects que los usan (Rules of Hooks) ──

  const loadGenre = useCallback((idx: number) => {
    setActiveGenreIdx(idx);
    setQ('');
    setError(null);
    setLoading(true);
    deezerService
      .getChart(DEEZER_GENRES[idx].id)
      .then(setResults)
      .catch(e => setError(e?.message ?? 'Error al conectar con Deezer.'))
      .finally(() => setLoading(false));
  }, []);

  // Carga inicial: chart global de Deezer
  useEffect(() => {
    loadGenre(0);
  }, [loadGenre]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const safeQuery = normalizeSearchQuery(q);
    if (!safeQuery) return;

    debounceRef.current = setTimeout(() => {
      setError(null);
      setLoading(true);
      deezerService
        .searchTracks(safeQuery, 30)
        .then(setResults)
        .catch(e => setError(e?.message ?? 'Error de búsqueda.'))
        .finally(() => setLoading(false));
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // ── Preview 30s (instantáneo, URL directa de Deezer) ──────────────────────
  const handlePreview = useCallback(
    async (track: DeezerTrack) => {
      const song = {
        id: `deezer-preview-${track.id}`,
        title: `${track.title}`,
        artistId: track.artist.name,
        albumId: track.album.title,
        duration: 30,
        artwork: track.album.cover_medium ?? track.album.cover_small ?? '',
        streamUrl: track.preview,
      };
      const ok = await playSong(song);
      if (ok) navigation.getParent?.()?.navigate('Player' as never);
    },
    [playSong, navigation],
  );

  // ── Escuchar completo (resuelve vía Invidious → Google CDN) ───────────────
  const handleFullPlay = useCallback(
    async (track: DeezerTrack) => {
      setResolvingId(track.id);
      setError(null);

      try {
        const query = `${track.artist.name} ${track.title}`;
        const resolved = await invidiousService.resolveAudio(query);

        if (!resolved) {
          // Los servidores de YouTube no respondieron — reproducir preview de 30s
          setError(
            'Servidores de audio no disponibles ahora. Reproduciendo preview de 30s.',
          );
          await handlePreview(track);
          return;
        }

        const song = {
          id: `deezer-full-${track.id}`,
          title: track.title,
          artistId: track.artist.name,
          albumId: track.album.title,
          duration: resolved.durationSec ?? track.duration,
          artwork: track.album.cover_medium ?? track.album.cover_small ?? '',
          streamUrl: resolved.audioUrl,
        };

        const ok = await playSong(song);
        if (ok) {
          addRecentTrack({
            id: `deezer-full-${track.id}`,
            title: track.title,
            artistName: track.artist.name,
            artworkUrl: track.album.cover_medium ?? track.album.cover_small,
            duration: resolved.durationSec ?? track.duration,
            streamUrl: resolved.audioUrl,
          });
          navigation.getParent?.()?.navigate('Player' as never);
        } else {
          // El stream URL de Google CDN caducó (las URLs de YouTube duran ~6h)
          setError(
            'El enlace de audio caducó. Toca Escuchar de nuevo para obtener uno nuevo.',
          );
        }
      } finally {
        setResolvingId(null);
      }
    },
    [playSong, addRecentTrack, navigation, handlePreview],
  );

  // ── Descargar (encola en Downloads, navega a esa pestaña) ─────────────────
  const handleDownload = useCallback(
    (track: DeezerTrack) => {
      const id = `ext-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const queued: ExternalDownload = {
        id,
        url: '',               // se resolverá desde la URL de Invidious en Downloads
        title: `${track.artist.name} - ${track.title}`,
        thumbnailUrl: track.album.cover_medium ?? track.album.cover_small,
        format: 'mp3' as ExternalDownloadFormat,
        status: 'queued',
        progress: 0,
        createdAt: Date.now(),
      };

      // Resolvemos la URL en background antes de encolar
      invidiousService
        .resolveAudio(`${track.artist.name} ${track.title}`)
        .then(resolved => {
          if (!resolved) return;
          useAppStore.getState().enqueueExternalDownload({
            ...queued,
            url: resolved.audioUrl,
            format: 'm4a' as ExternalDownloadFormat,
          });
          localMediaService.ensureAudivoxFolder().catch(() => {});
          navigation.navigate('DownloadsTab');
        })
        .catch(() => {});
    },
    [navigation],
  );

  // Valores derivados — NO son hooks, se calculan en cada render
  const playingDeezerPreviewId =
    currentSong?.id.startsWith('deezer-preview-') && isPlayerPlaying
      ? Number(currentSong.id.replace('deezer-preview-', ''))
      : null;
  const playingDeezerFullId =
    currentSong?.id.startsWith('deezer-full-') && isPlayerPlaying
      ? Number(currentSong.id.replace('deezer-full-', ''))
      : null;
  const showGenreGrid = !q.trim();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollPage}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>Buscar</Text>
      <Text style={styles.pageSub}>
        Catálogo Deezer · Audio completo vía YouTube/Invidious
      </Text>

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
          onChangeText={value => setQ(sanitizeDisplayText(value, 80))}
          style={styles.searchBarInput}
          placeholder="Artista, canción, álbum..."
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

      {/* ── Grid de géneros ── */}
      {showGenreGrid && (
        <View style={styles.genreGrid}>
          {DEEZER_GENRES.map((g, i) => (
            <GenreCard
              key={g.id}
              label={g.name}
              icon={g.icon}
              color={GENRE_COLORS[i % GENRE_COLORS.length]}
              active={activeGenreIdx === i}
              onPress={() => loadGenre(i)}
            />
          ))}
        </View>
      )}

      {/* ── Cargando ── */}
      {loading && (
        <View style={styles.searchStateBlock}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.searchStateSub}>
            {q.trim()
              ? `Buscando "${q.trim()}"…`
              : `Cargando ${DEEZER_GENRES[activeGenreIdx]?.name}…`}
          </Text>
        </View>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <View style={styles.errorBanner}>
          <Icon name="wifi-outline" size={14} color={theme.colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ── Resultados ── */}
      {!loading && results.length > 0 && (
        <>
          <View style={styles.downloadsHeaderRow}>
            <Text style={styles.sectionTitle}>
              {q.trim()
                ? `Resultados (${results.length})`
                : DEEZER_GENRES[activeGenreIdx]?.name}
            </Text>
            <View style={styles.audiusCredit}>
              <Text style={styles.audiusCreditText}>Deezer</Text>
            </View>
          </View>

          {results.map(track => (
            <DeezerCard
              key={track.id}
              track={track}
              isPlaying={
                playingDeezerPreviewId === track.id ||
                playingDeezerFullId === track.id
              }
              isResolving={resolvingId === track.id}
              onPreview={() => handlePreview(track)}
              onFullPlay={() => handleFullPlay(track)}
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
          <Text style={styles.searchStateSub}>Prueba con otro artista o canción.</Text>
        </View>
      )}
    </ScrollView>
  );
};
