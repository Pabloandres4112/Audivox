import React, { useEffect, useState } from 'react';
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
import { audiusService, AudiusTrackResult } from '../services/audiusService';
import { localMediaService, LocalMediaItem } from '../services/localMediaService';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { styles } from './styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRE_CHIPS: { label: string; audius?: string; icon: string }[] = [
  { label: 'Tendencias', icon: 'trending-up-outline' },
  { label: 'Electronic', icon: 'radio-outline', audius: 'Electronic' },
  { label: 'Hip-Hop', icon: 'mic-outline', audius: 'Hip-Hop/Rap' },
  { label: 'Pop', icon: 'musical-notes-outline', audius: 'Pop' },
  { label: 'Rock', icon: 'flash-outline', audius: 'Rock' },
  { label: 'R&B', icon: 'heart-outline', audius: 'R&B/Soul' },
  { label: 'Indie', icon: 'leaf-outline', audius: 'Indie Pop' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─── Audius Track Card ────────────────────────────────────────────────────────

type AudiusCardProps = {
  track: AudiusTrackResult;
  isPlaying: boolean;
  onPlay: () => void;
};

const AudiusCard = ({ track, isPlaying, onPlay }: AudiusCardProps) => (
  <Pressable style={styles.localTrackCard} onPress={onPlay}>
    {track.artworkUrl ? (
      <Image
        source={{ uri: track.artworkUrl }}
        style={[styles.localTrackIconWrap, { borderRadius: 10 }]}
      />
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
        {track.artistName}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {track.genre ? (
          <Text style={[styles.localTrackMeta, { color: theme.colors.primary, fontSize: 10 }]}>
            {track.genre}
          </Text>
        ) : null}
        <Text style={styles.localTrackMeta}>{fmtDuration(track.duration)}</Text>
      </View>
    </View>

    <Icon
      name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
      size={32}
      color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
    />
  </Pressable>
);

// ─── Local Track Card ─────────────────────────────────────────────────────────

type LocalTrackCardProps = {
  track: LocalMediaItem;
  isPlaying: boolean;
  onPlay: () => void;
};

const LocalTrackCard = ({ track, isPlaying, onPlay }: LocalTrackCardProps) => {
  const nameNoExt = track.name.replace(/\.[^.]+$/, '');
  const ext = track.name.split('.').pop()?.toUpperCase() ?? 'AUDIO';
  const sizeMB = (track.size / 1024 / 1024).toFixed(1);

  return (
    <Pressable style={styles.localTrackCard} onPress={onPlay}>
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
        <Text style={styles.localTrackTitle} numberOfLines={1}>
          {nameNoExt}
        </Text>
        <Text style={styles.localTrackMeta}>
          {ext} · {sizeMB} MB
        </Text>
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

  // ── Estado ONLINE: Audius ──────────────────────────────────────────────────
  const [audiusTracks, setAudiusTracks] = useState<AudiusTrackResult[]>([]);
  const [audiusLoading, setAudiusLoading] = useState(false);
  const [audiusError, setAudiusError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState(0);

  // ── Estado OFFLINE: música local ──────────────────────────────────────────
  const [localTracks, setLocalTracks] = useState<LocalMediaItem[]>([]);
  const [localScanStatus, setLocalScanStatus] = useState<
    'idle' | 'scanning' | 'done' | 'no-permission'
  >('idle');

  // ── Cargar trending al entrar en modo online ──────────────────────────────
  useEffect(() => {
    if (effectiveMode !== 'online') return;
    loadGenre(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode]);

  const loadGenre = (idx: number) => {
    setActiveGenre(idx);
    setAudiusLoading(true);
    setAudiusError(null);
    const genre = GENRE_CHIPS[idx].audius;
    audiusService
      .getTrending(15, genre)
      .then(setAudiusTracks)
      .catch(e => setAudiusError(e?.message ?? 'No se pudo conectar a Audius.'))
      .finally(() => setAudiusLoading(false));
  };

  // ── Offline: escanear música local ────────────────────────────────────────
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
  const playingAudiusId =
    currentSong?.id.startsWith('audius-') && isPlayerPlaying
      ? currentSong.id.slice(7)
      : null;

  const playingLocalPath =
    currentSong?.id.startsWith('local-') && isPlayerPlaying
      ? currentSong.id.slice(6)
      : null;

  const playingExtId =
    currentSong?.id.startsWith('ext-') && isPlayerPlaying
      ? currentSong.id.slice(4)
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlayAudius = async (track: AudiusTrackResult) => {
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
  };

  const handlePlayLocal = async (track: LocalMediaItem) => {
    const song = {
      id: `local-${track.path}`,
      title: track.name.replace(/\.[^.]+$/, ''),
      artistId: 'local',
      albumId: 'local',
      duration: 0,
      artwork: '',
      streamUrl: `file://${track.path}`,
    };
    const ok = await playSong(song);
    if (ok) navigation.getParent?.()?.navigate('Player' as never);
  };

  const handlePlayDownload = async (item: (typeof downloadHistory)[number]) => {
    if (!item.fileName) return;
    const dir = localMediaService.getAudivoxMusicDir();
    const song = {
      id: `ext-${item.id}`,
      title: item.title,
      artistId: 'local',
      albumId: 'local',
      duration: 0,
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
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('SearchTab')}
          >
            <Icon name="search-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Buscar</Text>
          </Pressable>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('DownloadsTab')}
          >
            <Icon name="cloud-download-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Descargas</Text>
          </Pressable>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('LibraryTab')}
          >
            <Icon name="library-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Biblioteca</Text>
          </Pressable>
        </View>

        {/* ── Mode Switch (compacto) ── */}
        <View style={styles.modeSwitchCard}>
          <View style={styles.modeSwitchHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: isConnected
                    ? theme.colors.success
                    : theme.colors.danger,
                }}
              />
              <Text style={styles.modeSwitchTitle}>
                {isConnected ? 'Online' : 'Sin internet · Offline auto'}
              </Text>
            </View>
            <View style={styles.modeSwitchRow}>
              <Pressable
                onPress={() => setModePreference('online')}
                style={[styles.modeChip, effectiveMode === 'online' && styles.modeChipActive]}
              >
                <Icon
                  name="wifi-outline"
                  size={13}
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
                style={[styles.modeChip, effectiveMode === 'offline' && styles.modeChipActive]}
              >
                <Icon
                  name="phone-portrait-outline"
                  size={13}
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
        </View>

        {/* ══════════════════════════════════════════
            MODO ONLINE — Audius (streaming directo)
            ══════════════════════════════════════════ */}
        {effectiveMode === 'online' && (
          <View style={{ gap: 12 }}>

            {/* Chips de género */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genreChipsRow}
            >
              {GENRE_CHIPS.map((g, i) => (
                <Pressable
                  key={g.label}
                  style={[
                    styles.genreChip,
                    activeGenre === i && styles.genreChipActive,
                  ]}
                  onPress={() => loadGenre(i)}
                >
                  <Icon
                    name={g.icon}
                    size={13}
                    color={
                      activeGenre === i
                        ? theme.colors.background
                        : theme.colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.genreChipText,
                      activeGenre === i && styles.genreChipTextActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Header de lista */}
            <View style={styles.downloadsHeaderRow}>
              <Text style={styles.sectionTitle}>
                {GENRE_CHIPS[activeGenre]?.label ?? 'Tendencias'}
              </Text>
              <View style={styles.audiusCredit}>
                <Icon name="radio-outline" size={11} color={theme.colors.primary} />
                <Text style={styles.audiusCreditText}>Audius</Text>
              </View>
            </View>

            {audiusError ? (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle-outline" size={13} color={theme.colors.danger} />
                <Text style={styles.errorBannerText}>{audiusError}</Text>
              </View>
            ) : null}

            {audiusLoading ? (
              <View style={{ alignItems: 'center', padding: 24, gap: 10 }}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.localTrackMeta}>Cargando música…</Text>
              </View>
            ) : audiusTracks.length === 0 && !audiusError ? (
              <View style={styles.offlineBanner}>
                <Icon name="musical-notes-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.offlineBannerText}>
                  No se pudieron cargar los resultados.
                </Text>
              </View>
            ) : (
              audiusTracks.map(track => (
                <AudiusCard
                  key={track.id}
                  track={track}
                  isPlaying={playingAudiusId === track.id}
                  onPlay={() => handlePlayAudius(track)}
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
                  <Pressable
                    key={item.id}
                    style={styles.localTrackCard}
                    onPress={() => handlePlayDownload(item)}
                  >
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={[styles.localTrackIconWrap, { borderRadius: 10 }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.localTrackIconWrap,
                          playingExtId === item.id && {
                            backgroundColor: theme.colors.primary,
                          },
                        ]}
                      >
                        <Icon
                          name="download-outline"
                          size={18}
                          color={
                            playingExtId === item.id
                              ? theme.colors.background
                              : theme.colors.primary
                          }
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.localTrackTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.localTrackMeta}>
                        {item.fileName ?? '-'} · {item.sizeLabel ?? ''}
                      </Text>
                    </View>
                    <Icon
                      name={
                        playingExtId === item.id ? 'pause-circle' : 'play-circle-outline'
                      }
                      size={30}
                      color={
                        playingExtId === item.id
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                    />
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════
            MODO OFFLINE — música local del dispositivo
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
                Tu música local
                {localTracks.length > 0 ? ` (${localTracks.length})` : ''}
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
              />
            ))}
          </View>
        )}
      </MotiView>
    </ScrollView>
  );
};
