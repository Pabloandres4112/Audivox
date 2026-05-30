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
import { localMediaService, LocalMediaItem } from '../services/localMediaService';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { styles } from './styles';

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

// ─── Recent Download Card ─────────────────────────────────────────────────────

type RecentDownloadCardProps = {
  title: string;
  fileName?: string;
  thumbnailUrl?: string;
  sizeLabel?: string;
  isPlaying: boolean;
  onPlay: () => void;
};

const RecentDownloadCard = ({
  title,
  fileName,
  thumbnailUrl,
  sizeLabel,
  isPlaying,
  onPlay,
}: RecentDownloadCardProps) => (
  <Pressable style={styles.localTrackCard} onPress={onPlay}>
    {thumbnailUrl ? (
      <Image
        source={{ uri: thumbnailUrl }}
        style={[styles.localTrackIconWrap, { borderRadius: 10 }]}
      />
    ) : (
      <View style={[styles.localTrackIconWrap, isPlaying && { backgroundColor: theme.colors.primary }]}>
        <Icon
          name={isPlaying ? 'musical-notes' : 'download-outline'}
          size={18}
          color={isPlaying ? theme.colors.background : theme.colors.primary}
        />
      </View>
    )}
    <View style={{ flex: 1 }}>
      <Text style={styles.localTrackTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.localTrackMeta} numberOfLines={1}>
        {fileName ?? '-'} {sizeLabel ? `· ${sizeLabel}` : ''}
      </Text>
    </View>
    <Icon
      name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
      size={30}
      color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
    />
  </Pressable>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const HomeScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'HomeTab'>) => {
  const profile = useAppStore(s => s.profile);
  const modePreference = useAppStore(s => s.modePreference);
  const setModePreference = useAppStore(s => s.setModePreference);
  const isConnected = useAppStore(s => s.isConnected);
  const downloadHistory = useAppStore(s => s.downloadHistory);

  const playSong = usePlayerStore(s => s.playSong);
  const currentSong = usePlayerStore(s => s.current);
  const isPlayerPlaying = usePlayerStore(s => s.isPlaying);

  const effectiveMode = isConnected ? modePreference : 'offline';

  // ── Estado offline: música local ──
  const [localTracks, setLocalTracks] = useState<LocalMediaItem[]>([]);
  const [localScanStatus, setLocalScanStatus] = useState<
    'idle' | 'scanning' | 'done' | 'no-permission'
  >('idle');

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

  // Track local activo (id = `local-${path}`)
  const playingLocalPath =
    currentSong?.id.startsWith('local-') && isPlayerPlaying
      ? currentSong.id.slice(6)
      : null;

  // Track descarga activo (id = `ext-${itemId}`)
  const playingExtId =
    currentSong?.id.startsWith('ext-') && isPlayerPlaying
      ? currentSong.id.slice(4)
      : null;

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

  const handlePlayDownload = async (item: typeof downloadHistory[number]) => {
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

  // Descargas completadas más recientes (máx 10 en Home)
  const recentDownloads = [...downloadHistory]
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
    .slice(0, 10);

  // ── Render ──────────────────────────────────────────────────────────────────

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
                {isConnected ? 'Conectado' : 'Sin internet · Offline auto'}
              </Text>
            </View>
          </View>
          <View style={styles.modeSwitchRow}>
            <Pressable
              onPress={() => setModePreference('online')}
              style={[styles.modeChip, effectiveMode === 'online' && styles.modeChipActive]}
            >
              <Icon
                name="wifi-outline"
                size={14}
                color={effectiveMode === 'online' ? theme.colors.background : theme.colors.text}
              />
              <Text style={[styles.modeChipText, effectiveMode === 'online' && styles.modeChipTextActive]}>
                Online
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setModePreference('offline')}
              style={[styles.modeChip, effectiveMode === 'offline' && styles.modeChipActive]}
            >
              <Icon
                name="phone-portrait-outline"
                size={14}
                color={effectiveMode === 'offline' ? theme.colors.background : theme.colors.text}
              />
              <Text style={[styles.modeChipText, effectiveMode === 'offline' && styles.modeChipTextActive]}>
                Offline
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Accesos rápidos ── */}
        <View style={styles.homeToolbar}>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('DownloadsTab')}
          >
            <Icon name="cloud-download-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Descargar</Text>
          </Pressable>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('LibraryTab')}
          >
            <Icon name="library-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Biblioteca</Text>
          </Pressable>
          <Pressable
            style={styles.homeToolBtn}
            onPress={() => navigation.navigate('SearchTab')}
          >
            <Icon name="search-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.homeToolText}>Buscar</Text>
          </Pressable>
        </View>

        {/* ════════════════════════════════════════════════
            MODO OFFLINE — música local del dispositivo
            ════════════════════════════════════════════════ */}
        {effectiveMode === 'offline' && (
          <View style={{ gap: 10 }}>
            <View style={styles.offlineBanner}>
              <Icon name="phone-portrait-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.offlineBannerText}>
                Modo offline · Escuchando desde tu dispositivo
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
                <Text style={styles.localTrackMeta}>Escaneando dispositivo...</Text>
              </View>
            )}

            {localScanStatus === 'no-permission' && (
              <View style={styles.errorBanner}>
                <Icon name="lock-closed-outline" size={14} color={theme.colors.danger} />
                <Text style={styles.errorBannerText}>
                  Sin permiso de almacenamiento. Ve a Descargas → Pedir permisos.
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

        {/* ════════════════════════════════════════════════
            MODO ONLINE — mis descargas
            ════════════════════════════════════════════════ */}
        {effectiveMode === 'online' && (
          <View style={{ gap: 10 }}>
            <View style={styles.downloadsHeaderRow}>
              <Text style={styles.sectionTitle}>
                Mis descargas
                {recentDownloads.length > 0 ? ` (${recentDownloads.length})` : ''}
              </Text>
              <Pressable onPress={() => navigation.navigate('DownloadsTab')}>
                <Text style={styles.sectionAction}>Ver todas</Text>
              </Pressable>
            </View>

            {recentDownloads.length === 0 ? (
              <Pressable
                style={styles.offlineBanner}
                onPress={() => navigation.navigate('DownloadsTab')}
              >
                <Icon name="cloud-download-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.offlineBannerText}>
                  Aún no tienes descargas. Toca aquí para agregar música.
                </Text>
              </Pressable>
            ) : (
              recentDownloads.map(item => (
                <RecentDownloadCard
                  key={item.id}
                  title={item.title}
                  fileName={item.fileName}
                  thumbnailUrl={item.thumbnailUrl}
                  sizeLabel={item.sizeLabel}
                  isPlaying={playingExtId === item.id}
                  onPlay={() => handlePlayDownload(item)}
                />
              ))
            )}
          </View>
        )}
      </MotiView>
    </ScrollView>
  );
};
