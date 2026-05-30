import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { EmptyBlock } from '../components/common/StateBlocks';
import { localMediaService } from '../services/localMediaService';
import { RecentTrack, useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { MainTabParamList } from '../navigation/types';
import { SectionHeader, StatCard } from './ui';
import { styles } from './styles';

// ─── Recent Track Card ────────────────────────────────────────────────────────

type RecentCardProps = {
  track: RecentTrack;
  isPlaying: boolean;
  onPlay: () => void;
};

const RecentCard = ({ track, isPlaying, onPlay }: RecentCardProps) => {
  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
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
        {track.genre ? (
          <Text style={[styles.localTrackMeta, { color: theme.colors.primary, fontSize: 10 }]}>
            {track.genre} · {fmtDuration(track.duration)}
          </Text>
        ) : (
          <Text style={styles.localTrackMeta}>{fmtDuration(track.duration)}</Text>
        )}
      </View>
      <Icon
        name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
        size={30}
        color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
};

// ─── Download Card ────────────────────────────────────────────────────────────

type DownloadCardProps = {
  item: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    fileName?: string;
    sizeLabel?: string;
    format: string;
  };
  isPlaying: boolean;
  onPlay: () => void;
};

const DownloadCard = ({ item, isPlaying, onPlay }: DownloadCardProps) => (
  <Pressable style={styles.localTrackCard} onPress={onPlay}>
    {item.thumbnailUrl ? (
      <Image
        source={{ uri: item.thumbnailUrl }}
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
          name="download-outline"
          size={18}
          color={isPlaying ? theme.colors.background : theme.colors.primary}
        />
      </View>
    )}
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.localTrackTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.localTrackMeta}>
        {item.format.toUpperCase()} · {item.sizeLabel ?? '-'}
      </Text>
      {item.fileName ? (
        <Text style={styles.localTrackMeta} numberOfLines={1}>
          {item.fileName}
        </Text>
      ) : null}
    </View>
    <Icon
      name={isPlaying ? 'pause-circle' : 'play-circle-outline'}
      size={30}
      color={isPlaying ? theme.colors.primary : theme.colors.textMuted}
    />
  </Pressable>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const LibraryScreen = ({
  navigation,
}: BottomTabScreenProps<MainTabParamList, 'LibraryTab'>) => {
  const recentlyPlayedTracks = useAppStore(s => s.recentlyPlayedTracks);
  const downloadHistory = useAppStore(s => s.downloadHistory);

  const playSong = usePlayerStore(s => s.playSong);
  const currentSong = usePlayerStore(s => s.current);
  const isPlayerPlaying = usePlayerStore(s => s.isPlaying);

  const playingAudiusId =
    currentSong?.id.startsWith('audius-') && isPlayerPlaying
      ? currentSong.id.slice(7)
      : null;

  const playingExtId =
    currentSong?.id.startsWith('ext-') && isPlayerPlaying
      ? currentSong.id.slice(4)
      : null;

  const recentTracks = recentlyPlayedTracks.slice(0, 10);
  const localDownloads = downloadHistory.slice(0, 10);

  const handlePlayRecent = async (track: RecentTrack) => {
    const song = {
      id: track.id,
      title: track.title,
      artistId: track.artistName,
      albumId: '',
      duration: track.duration,
      artwork: track.artworkUrl ?? '',
      streamUrl: track.streamUrl,
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

  return (
    <ScrollView contentContainerStyle={styles.scrollPage}>
      <Text style={styles.pageTitle}>Biblioteca</Text>
      <Text style={styles.pageSub}>Tu historial de reproducción y descargas guardadas.</Text>

      {/* ── Stats ── */}
      <View style={styles.statRow}>
        <StatCard
          label="Recientes"
          value={`${recentlyPlayedTracks.length}`}
          icon="time-outline"
        />
        <StatCard
          label="Descargadas"
          value={`${downloadHistory.length}`}
          icon="download-outline"
        />
      </View>

      {/* ── Reproducidas recientemente ── */}
      <SectionHeader
        title="Reproducidas recientemente"
        subtitle="Canciones de Audius que has escuchado"
      />
      {recentTracks.length === 0 ? (
        <EmptyBlock
          title="Sin historial"
          subtitle="Reproduce canciones desde Home o Search y aparecerán aquí."
          icon="time-outline"
        />
      ) : (
        recentTracks.map(track => (
          <RecentCard
            key={track.id}
            track={track}
            isPlaying={
              playingAudiusId === track.id.replace(/^audius-/, '') ||
              currentSong?.id === track.id
            }
            onPlay={() => handlePlayRecent(track)}
          />
        ))
      )}

      {/* ── Descargas guardadas ── */}
      <SectionHeader
        title="Guardadas localmente"
        subtitle="Audio descargado para reproducción offline"
      />
      {localDownloads.length === 0 ? (
        <EmptyBlock
          title="Sin descargas"
          subtitle="Ve a Search y toca Guardar para descargar canciones."
          icon="cloud-download-outline"
        />
      ) : (
        localDownloads.map(item => (
          <DownloadCard
            key={item.id}
            item={item}
            isPlaying={playingExtId === item.id}
            onPlay={() => handlePlayDownload(item)}
          />
        ))
      )}
    </ScrollView>
  );
};
