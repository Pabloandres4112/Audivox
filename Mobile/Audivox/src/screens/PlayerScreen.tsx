import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyBlock } from '../components/common/StateBlocks';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { formatTime } from '../utils/time';
import { styles } from './styles';

export const PlayerScreen = () => {
  const insets = useSafeAreaInsets();

  // Un solo selector — mismo conteo de hooks entre renders (evita error Fast Refresh)
  const {
    current,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeat,
    queue,
    togglePlay,
    next,
    previous,
    seek,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  const liked = useAppStore(s => s.likedIds.includes(current?.id ?? ''));
  const toggleLike = useAppStore(s => s.toggleLike);

  // Ancho real de la barra de progreso para seek exacto
  const [barWidth, setBarWidth] = useState(1);

  if (!current) {
    return (
      <View style={[styles.fullScreenCenter, { paddingTop: insets.top }]}>
        <EmptyBlock
          title="Sin reproducción"
          subtitle="Selecciona una canción desde Home o Descargas."
          icon="play-circle-outline"
        />
      </View>
    );
  }

  const ratio = duration > 0 ? Math.min(1, progress / duration) : 0;

  const artistDisplay =
    current.artistId === 'local'
      ? 'Música local'
      : current.artistId === 'a1'
      ? 'Descarga'
      : current.artistId;

  const queuePreview = queue.filter(s => s.id !== current.id).slice(0, 3);

  return (
    <ScrollView
      // paddingTop dinámico para respetar la barra de estado del SO
      contentContainerStyle={[styles.playerPage, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Artwork ── */}
      <View style={styles.playerArtWrap}>
        {current.artwork ? (
          <Image source={{ uri: current.artwork }} style={styles.playerArt} />
        ) : (
          <View style={[styles.playerArt, styles.playerArtFallback]}>
            <Icon name="musical-notes" size={64} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.playerGlow} />
      </View>

      {/* ── Info ── */}
      <View style={{ gap: 3 }}>
        <Text style={styles.playerTitle} numberOfLines={2}>
          {current.title}
        </Text>
        <Text style={styles.playerArtist}>{artistDisplay}</Text>
      </View>

      {/* ── Progress + seek ──
          hitSlop extiende el área táctil a ±18px verticalmente sin cambiar locationX.
          onLayout mide el ancho real para calcular la posición exacta del seek. */}
      <View style={{ gap: 8 }}>
        <Pressable
          style={styles.playerProgressTrack}
          hitSlop={{ top: 18, bottom: 18, left: 0, right: 0 }}
          onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
          onPress={e => {
            if (duration > 0 && barWidth > 1) {
              const raw = e.nativeEvent.locationX / barWidth;
              seek(Math.max(0, Math.min(raw, 1)) * duration);
            }
          }}
        >
          <View style={[styles.playerProgressFill, { width: `${ratio * 100}%` }]} />
          {/* Thumb visible en la posición actual */}
          <View
            style={[
              styles.playerProgressThumb,
              { left: `${Math.max(0, Math.min(ratio * 100, 97))}%` },
            ]}
          />
        </Pressable>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTime}>{formatTime(progress)}</Text>
          <Text style={styles.progressTime}>
            {duration > 0 ? formatTime(duration) : '--:--'}
          </Text>
        </View>
      </View>

      {/* ── Controles principales ── */}
      <View style={styles.actionRowCentered}>
        <Pressable
          onPress={toggleShuffle}
          style={[styles.circleBtn, shuffle && styles.circleBtnActive]}
        >
          <Icon
            name="shuffle"
            size={20}
            color={shuffle ? theme.colors.background : theme.colors.text}
          />
        </Pressable>

        <Pressable onPress={() => previous()} style={styles.circleBtn}>
          <Icon name="play-skip-back" size={20} color={theme.colors.text} />
        </Pressable>

        <Pressable style={styles.mainPlayBtn} onPress={() => togglePlay()}>
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color={theme.colors.background}
          />
        </Pressable>

        <Pressable onPress={() => next()} style={styles.circleBtn}>
          <Icon name="play-skip-forward" size={20} color={theme.colors.text} />
        </Pressable>

        <Pressable
          onPress={toggleRepeat}
          style={[styles.circleBtn, repeat !== 'off' && styles.circleBtnActive]}
        >
          <Icon
            name={repeat === 'one' ? 'repeat-outline' : 'repeat'}
            size={20}
            color={repeat !== 'off' ? theme.colors.background : theme.colors.text}
          />
        </Pressable>
      </View>

      {/* ── Saltar + like ── */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => seek(Math.max(0, progress - 10))}
        >
          <Text style={styles.secondaryButtonText}>−10s</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => seek(Math.min(duration > 0 ? duration : progress + 10, progress + 10))}
        >
          <Text style={styles.secondaryButtonText}>+10s</Text>
        </Pressable>
        <Pressable
          style={[
            styles.secondaryButton,
            liked && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => toggleLike(current.id)}
        >
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={16}
            color={liked ? theme.colors.background : theme.colors.text}
          />
        </Pressable>
      </View>

      {/* ── Cola ── */}
      {queuePreview.length > 0 && (
        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Siguiente</Text>
          {queuePreview.map(item => (
            <View key={item.id} style={styles.queueRow}>
              {item.artwork ? (
                <Image source={{ uri: item.artwork }} style={styles.queueCover} />
              ) : (
                <View style={[styles.queueCover, styles.queueCoverFallback]}>
                  <Icon
                    name="musical-note-outline"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.queueItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.queueSub}>
                  {item.artistId === 'local' ? 'Música local' : 'Descarga'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};
