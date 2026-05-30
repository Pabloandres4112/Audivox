import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import { usePlayerStore } from '../../store/usePlayerStore';
import { theme } from '../../theme';
import { formatTime } from '../../utils/time';
export const MiniPlayer = ({ onOpen }: { onOpen: () => void }) => {
  const { current, isPlaying, togglePlay, next, progress } = usePlayerStore();
  if (!current) return null;
  const ratio = Math.min(1, progress / current.duration);
  return (
    <MotiView
      from={{ translateY: 80, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      transition={{ type: 'timing', duration: 280 }}
      style={styles.box}
    >
      <Pressable onPress={onOpen} style={styles.track}>
        <Image source={{ uri: current.artwork }} style={styles.cover} />
        <View style={styles.meta}>
          <Text style={styles.caption}>Now playing</Text>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
          </View>
          <Text style={styles.sub}>
            {formatTime(progress)} / {formatTime(current.duration)}
          </Text>
        </View>
      </Pressable>
      <View style={styles.controls}>
        <Pressable onPress={() => togglePlay()} style={styles.controlBtn}>
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={theme.colors.text}
          />
        </Pressable>
        <Pressable onPress={() => next()} style={styles.controlBtnSoft}>
          <Icon name="play-skip-forward" size={18} color={theme.colors.primary} />
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
    bottom: 14,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  track: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cover: { width: 48, height: 48, borderRadius: 14 },
  meta: { flex: 1, gap: 4 },
  caption: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  title: { color: theme.colors.text, flex: 1, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, fontSize: 11 },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: theme.colors.primary },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnSoft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
});
