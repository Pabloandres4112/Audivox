import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../store/usePlayerStore';
import { theme } from '../../theme';
import { formatTime } from '../../utils/time';

export const MiniPlayer = ({ onOpen }: { onOpen: () => void }) => {
  const insets = useSafeAreaInsets();
  // Un solo selector evita cambio en el conteo de hooks entre renders
  const { current, isPlaying, progress, duration, togglePlay, next } =
    usePlayerStore();

  if (!current) return null;

  const ratio = duration > 0 ? Math.min(1, progress / duration) : 0;
  // tab bar: height 56 + insets, bottom: insets+8 -> total ~ insets+74+10 -> +12 respiro = +96

  return (
    <MotiView
      from={{ translateY: 90, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      transition={{ type: 'timing', duration: 280 }}
      style={[styles.box, { bottom: insets.bottom + 96 }]}
    >
      <Pressable onPress={onOpen} style={styles.track}>
        {current.artwork ? (
          <Image source={{ uri: current.artwork }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Icon name="musical-note-outline" size={20} color={theme.colors.primary} />
          </View>
        )}

        <View style={styles.meta}>
          <Text style={styles.caption}>Reproduciendo</Text>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
          </View>
          <Text style={styles.sub}>
            {formatTime(progress)}
            {duration > 0 ? ` / ${formatTime(duration)}` : ''}
          </Text>
        </View>
      </Pressable>

      <View style={styles.controls}>
        <Pressable onPress={() => togglePlay()} style={styles.controlBtn}>
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={theme.colors.background}
          />
        </Pressable>
        <Pressable onPress={() => next()} style={styles.controlBtnSoft}>
          <Icon name="play-skip-forward" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  track: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cover: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  meta: { flex: 1, gap: 3 },
  caption: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  title: { color: theme.colors.text, fontWeight: '800', fontSize: 13 },
  sub: { color: theme.colors.textMuted, fontSize: 11 },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: { height: 3, backgroundColor: theme.colors.primary },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnSoft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
});
