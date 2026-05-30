import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MotiView } from 'moti';
import Icon from 'react-native-vector-icons/Ionicons';
import { deezerService, DeezerTrack, DEEZER_GENRES } from '../services/deezerService';
import { invidiousService } from '../services/invidiousService';
import { localMediaService, LocalMediaItem } from '../services/localMediaService';
import { LocalSongMenu } from '../components/music/LocalSongMenu';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { styles } from './styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─── Deezer Track Card (Home) ─────────────────────────────────────────────────

type DeezerCardProps = {
  track: DeezerTrack;
  isPlaying: boolean;
  isResolving: boolean;
  onPlay: () => void;
};

const DeezerHomeCard = ({ track, isPlaying, isResolving, onPlay }: DeezerCardProps) => {
  const cover = track.album.cover_medium ?? track.album.cover_small;
  return (
    <Pressable style={styles.localTrackCard} onPress={onPlay} disabled={isResolving}>
      {cover ? (
        <Image source={{ uri: cover }} style={[styles.localTrackIconWrap, { borderRadius: 10 }]} />
      ) : (
        <View
          style={[
            styles.localTrackIconWrap,
            isPlaying && { backgroundColor: theme.colors.primary },
          ]}
        >
          <Icon
            name="musical-note-outline"
            size={20}
            color={isPlaying ? theme.colors.background : theme.colors.primary}
          />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.localTrackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.localTrackMeta} numberOfLines={1}>
          {track.artist.name}
        </Text>
        <Text style={styles.localTrackMeta}>{fmtDuration(track.duration)}</Text>
      </View>
      {isResolving ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Icon
          name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
          size={32}
          color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
        />
      )}
    </Pressable>
  );
};

// ─── Local Track Card ─────────────────────────────────────────────────────────

type LocalCardProps = {
  track: LocalMediaItem;
  isPlaying: boolean;
  onPlay: () => void;
  onLongPress: () => void;
};

const LocalTrackCard = ({ track, isPlaying, onPlay, onLongPress }: LocalCardProps) => {
  const nameNoExt = track.name.replace(/\.[^.]+$/, '');
  const ext = track.name.split('.').pop()?.toUpperCase() ?? 'AUDIO';
  const sizeMB = (track.size / 1024 / 1024).toFixed(1);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.localTrackCard,
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPlay}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View
        style={[
          styles.localTrackIconWrap,
          isPlaying && { backgroundColor: theme.colors.primary },
        ]}
      >
        <Icon
          name={isPlaying ? 'musical-notes' : 'musical-note-outline'}
          size={20}
          color={isPlaying ? theme.colors.background : theme.colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.localTrackTitle} numberOfLines={1}>{nameNoExt}</Text>
        <Text style={styles.localTrackMeta}>{ext} · {sizeMB} MB</Text>
      </View>
      <Icon
        name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
        size={30}
        color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const HomeScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'HomeTab'>) => {
  const profile = useAppStore(s => s.profile);
  const modePreference = useAppStore(s => s.modePreference);
  const setModePreference = useAppStore(s => s.setModePreference);
  const isConnected = useAppStore(s => s.isConnected);
  const downloadHistory = useAppStore(s => s.downloadHistory);
  const addRecentTrack = useAppStore(s => s.addRecentTrack);

  const { playSong, current: currentSong, isPlaying: isPlayerPlaying } = usePlayerStore();
  const effectiveMode = isConnected ? modePreference : 'offline';

  // ── Estado ONLINE: Deezer ──────────────────────────────────────────────────
  const [deezerTracks, setDeezerTracks] = useState<DeezerTrack[]>([]);
  const [deezerLoading, setDeezerLoading] = useState(false);
  const [deezerError, setDeezerError] = useState<string | null>(null);
  const [activeGenreIdx, setActiveGenreIdx] = useState(0);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // ── Estado OFFLINE ─────────────────────────────────────────────────────────
  const [localTracks, setLocalTracks] = useState<LocalMediaItem[]>([]);
  const [localScanStatus, setLocalScanStatus] = useState<
    'idle' | 'scanning' | 'done' | 'no-permission'
  >('idle');
  // Menú contextual de pulsación larga
  const [menuTrack, setMenuTrack] = useState<LocalMediaItem | null>(null);

  // ── loadGenre declarado antes de los effects que lo usan (Rules of Hooks) ──
  const loadGenre = useCallback((idx: number) => {
    setActiveGenreIdx(idx);
    setDeezerLoading(true);
    setDeezerError(null);
    deezerService
      .getChart(DEEZER_GENRES[idx].id)
      .then(setDeezerTracks)
      .catch(e => setDeezerError(e?.message ?? 'No se pudo conectar a Deezer.'))
      .finally(() => setDeezerLoading(false));
  }, []);

  // ── Carga chart Deezer al entrar en online ────────────────────────────────
  useEffect(() => {
    if (effectiveMode !== 'online') return;
    loadGenre(0);
  }, [effectiveMode, loadGenre]);

  // ── Escaneo offline ───────────────────────────────────────────────────────
  useEffect(() => {
    if (effectiveMode !== 'offline') return;
    setLocalScanStatus('scanning');
    localMediaService
      .requestStoragePermissions()
      .then(async res => {
        if (!res.granted) { setLocalScanStatus('no-permission'); return; }
        const tracks = await localMediaService.scanDeviceMusic();
        setLocalTracks(tracks);
        setLocalScanStatus('done');
      })
      .catch(() => setLocalScanStatus('done'));
  }, [effectiveMode]);

  // ── IDs activos ───────────────────────────────────────────────────────────
  const playingDeezerFullId =
    currentSong?.id.startsWith('deezer-full-') && isPlayerPlaying
      ? Number(currentSong.id.replace('deezer-full-', ''))
      : null;

  const playingLocalPath =
    currentSong?.id.startsWith('local-') && isPlayerPlaying
      ? currentSong.id.slice(6) : null;

  const playingExtId =
    currentSong?.id.startsWith('ext-') && isPlayerPlaying
      ? currentSong.id.slice(4) : null;

  // ── Play Deezer → resuelve vía Invidious ─────────────────────────────────
  const handlePlayDeezer = async (track: DeezerTrack) => {
    setResolvingId(track.id);
    try {
      const resolved = await invidiousService.resolveAudio(
        `${track.artist.name} ${track.title}`,
      );
      if (!resolved) {
        // Fallback: reproducir preview de 30s de Deezer
        const song = {
          id: `deezer-preview-${track.id}`,
          title: `${track.title}`,
          artistId: track.artist.name,
          albumId: track.album.title,
          duration: 30,
          artwork: track.album.cover_medium ?? track.album.cover_small ?? '',
          streamUrl: track.preview,
        };
        await playSong(song);
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
      }
    } finally {
      setResolvingId(null);
    }
  };

  const handlePlayLocal = async (track: LocalMediaItem) => {
    const song = {
      id: `local-${track.path}`,
      title: track.name.replace(/\.[^.]+$/, ''),
      artistId: 'local', albumId: 'local', duration: 0, artwork: '',
      streamUrl: `file://${track.path}`,
    };
    const ok = await playSong(song);
    if (ok) navigation.getParent?.()?.navigate('Player' as never);
  };

  const handleDeleteLocal = async (track: LocalMediaItem) => {
    await localMediaService.deleteLocalFile(track.path);
    // Actualiza la lista eliminando el track borrado
    setLocalTracks(prev => prev.filter(t => t.path !== track.path));
    setMenuTrack(null);
  };

  const handlePlayDownload = async (item: (typeof downloadHistory)[number]) => {
    if (!item.fileName) return;
    const dir = localMediaService.getAudivoxMusicDir();
    const song = {
      id: `ext-${item.id}`,
      title: item.title, artistId: 'local', albumId: 'local', duration: 0,
      artwork: item.thumbnailUrl ?? '',
      streamUrl: `file://${dir}/${item.fileName}`,
    };
    const ok = await playSong(song);
    if (ok) navigation.getParent?.()?.navigate('Player' as never);
  };

  const recentDownloads = [...downloadHistory]
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
    .slice(0, 6);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <MotiView
        from={{ opacity: 0, translateY: 18 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={{ gap: 16 }}
      >
        {/* ── Header ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topKicker}>Bienvenido</Text>
            <Text style={styles.topTitle}>{profile?.name ?? 'Listener'}</Text>
          </View>
          <View style={styles.avatarBubble}>
            <Icon name="person-circle-outline" size={28} color={theme.colors.primary} />
          </View>
        </View>

        {/* ── Accesos rápidos ── */}
        <View style={styles.homeToolbar}>
          <Pressable style={styles.homeToolBtn} onPress={() => navigation.navigate('SearchTab')}>
            <Icon name="search-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Buscar</Text>
          </Pressable>
          <Pressable style={styles.homeToolBtn} onPress={() => navigation.navigate('DownloadsTab')}>
            <Icon name="cloud-download-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Descargas</Text>
          </Pressable>
          <Pressable style={styles.homeToolBtn} onPress={() => navigation.navigate('LibraryTab')}>
            <Icon name="library-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Biblioteca</Text>
          </Pressable>
        </View>

        {/* ── Mode Switch ── */}
        <View style={styles.modeSwitchCard}>
          <View style={styles.modeSwitchHeaderRow}>
            <Text style={styles.modeSwitchTitle}>Modo de reproducción</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View
                style={{
                  width: 7, height: 7, borderRadius: 4,
                  backgroundColor: isConnected ? theme.colors.success : theme.colors.danger,
                }}
              />
              <Text style={isConnected ? styles.onlinePill : styles.offlineAutoPill}>
                {isConnected ? 'Conectado' : 'Sin internet'}
              </Text>
            </View>
          </View>
          <View style={styles.modeSwitchRow}>
            <Pressable
              onPress={() => setModePreference('online')}
              style={[styles.modeChip, effectiveMode === 'online' && styles.modeChipActive]}
            >
              <Icon name="wifi-outline" size={13}
                color={effectiveMode === 'online' ? theme.colors.background : theme.colors.text} />
              <Text style={[styles.modeChipText, effectiveMode === 'online' && styles.modeChipTextActive]}>
                Online
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setModePreference('offline')}
              style={[styles.modeChip, effectiveMode === 'offline' && styles.modeChipActive]}
            >
              <Icon name="phone-portrait-outline" size={13}
                color={effectiveMode === 'offline' ? theme.colors.background : theme.colors.text} />
              <Text style={[styles.modeChipText, effectiveMode === 'offline' && styles.modeChipTextActive]}>
                Offline
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            MODO ONLINE — Deezer Charts
            ══════════════════════════════════════════ */}
        {effectiveMode === 'online' && (
          <View style={{ gap: 12 }}>
            {/* Chips de género Deezer */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genreChipsRow}
            >
              {DEEZER_GENRES.map((g, i) => (
                <Pressable
                  key={g.id}
                  style={[styles.genreChip, activeGenreIdx === i && styles.genreChipActive]}
                  onPress={() => loadGenre(i)}
                >
                  <Icon
                    name={g.icon}
                    size={13}
                    color={activeGenreIdx === i ? theme.colors.background : theme.colors.textMuted}
                  />
                  <Text style={[styles.genreChipText, activeGenreIdx === i && styles.genreChipTextActive]}>
                    {g.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Header */}
            <View style={styles.downloadsHeaderRow}>
              <Text style={styles.sectionTitle}>
                {DEEZER_GENRES[activeGenreIdx]?.name}
              </Text>
              <View style={styles.audiusCredit}>
                <Text style={styles.audiusCreditText}>Deezer</Text>
              </View>
            </View>

            {deezerError ? (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle-outline" size={13} color={theme.colors.danger} />
                <Text style={styles.errorBannerText}>{deezerError}</Text>
              </View>
            ) : null}

            {deezerLoading ? (
              <View style={{ alignItems: 'center', padding: 24, gap: 10 }}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.localTrackMeta}>Cargando chart…</Text>
              </View>
            ) : deezerTracks.length === 0 && !deezerError ? (
              <View style={styles.offlineBanner}>
                <Icon name="musical-notes-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.offlineBannerText}>No se pudo cargar el chart.</Text>
              </View>
            ) : (
              deezerTracks.map(track => (
                <DeezerHomeCard
                  key={track.id}
                  track={track}
                  isPlaying={playingDeezerFullId === track.id}
                  isResolving={resolvingId === track.id}
                  onPlay={() => handlePlayDeezer(track)}
                />
              ))
            )}

            {/* Descargas recientes */}
            {recentDownloads.length > 0 && (
              <>
                <View style={styles.downloadsHeaderRow}>
                  <Text style={styles.sectionTitle}>Guardadas localmente</Text>
                  <Pressable onPress={() => navigation.navigate('DownloadsTab')}>
                    <Text style={styles.sectionAction}>Ver todas</Text>
                  </Pressable>
                </View>
                {recentDownloads.map(item => (
                  <Pressable key={item.id} style={styles.localTrackCard} onPress={() => handlePlayDownload(item)}>
                    {item.thumbnailUrl ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={[styles.localTrackIconWrap, { borderRadius: 10 }]} />
                    ) : (
                      <View style={[styles.localTrackIconWrap, playingExtId === item.id && { backgroundColor: theme.colors.primary }]}>
                        <Icon name="download-outline" size={18}
                          color={playingExtId === item.id ? theme.colors.background : theme.colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.localTrackTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.localTrackMeta}>{item.fileName ?? '-'} · {item.sizeLabel ?? ''}</Text>
                    </View>
                    <Icon
                      name={playingExtId === item.id ? 'pause-circle' : 'play-circle-outline'}
                      size={30}
                      color={playingExtId === item.id ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════
            MODO OFFLINE — música local
            ══════════════════════════════════════════ */}
        {effectiveMode === 'offline' && (
          <View style={{ gap: 10 }}>
            <View style={styles.offlineBanner}>
              <Icon name="phone-portrait-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.offlineBannerText}>
                Modo offline · Reproduciendo desde tu dispositivo
              </Text>
            </View>
            <View style={styles.downloadsHeaderRow}>
              <Text style={styles.sectionTitle}>
                Tu música local{localTracks.length > 0 ? ` (${localTracks.length})` : ''}
              </Text>
            </View>
            {localScanStatus === 'scanning' && (
              <View style={{ alignItems: 'center', padding: 24, gap: 10 }}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.localTrackMeta}>Escaneando dispositivo…</Text>
              </View>
            )}
            {localScanStatus === 'no-permission' && (
              <View style={styles.errorBanner}>
                <Icon name="lock-closed-outline" size={14} color={theme.colors.danger} />
                <Text style={styles.errorBannerText}>
                  Sin permiso de almacenamiento. Ve a Descargas → Permisos.
                </Text>
              </View>
            )}
            {localScanStatus === 'done' && localTracks.length === 0 && (
              <View style={styles.offlineBanner}>
                <Icon name="musical-notes-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.offlineBannerText}>
                  No se encontraron archivos de audio en el dispositivo.
                </Text>
              </View>
            )}
            {localTracks.map(track => (
              <LocalTrackCard
                key={track.path}
                track={track}
                isPlaying={playingLocalPath === track.path}
                onPlay={() => handlePlayLocal(track)}
                onLongPress={() => setMenuTrack(track)}
              />
            ))}
          </View>
        )}
      </MotiView>

      {/* ── Menú contextual de pulsación larga ── */}
      <LocalSongMenu
        item={menuTrack}
        isPlaying={
          menuTrack !== null && playingLocalPath === menuTrack.path
        }
        onPlay={() => menuTrack && handlePlayLocal(menuTrack)}
        onDelete={() => menuTrack ? handleDeleteLocal(menuTrack) : Promise.resolve()}
        onClose={() => setMenuTrack(null)}
      />
    </ScrollView>
  );
};
