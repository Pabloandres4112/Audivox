import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';
import { Song } from '../../types/music';
import { formatTime } from '../../utils/time';
export const SongCard = ({
  song,
  artist,
  onPress,
}: {
  song: Song;
  artist: string;
  onPress: () => void;
}) => {
  const liked = useAppStore(s => s.likedIds.includes(song.id));
  const toggleLike = useAppStore(s => s.toggleLike);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: song.artwork }} style={styles.cover} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist}>{artist}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>Track</Text>
          </View>
          <Text style={styles.time}>{formatTime(song.duration)}</Text>
        </View>
      </View>
      <Pressable
        onPress={e => {
          e.stopPropagation();
          toggleLike(song.id);
        }}
        hitSlop={10}
        style={styles.likeBtn}
      >
        <Icon
          name={liked ? 'heart' : 'heart-outline'}
          size={20}
          color={liked ? theme.colors.danger : theme.colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
};
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.lg,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cover: { width: 56, height: 56, borderRadius: 14 },
  meta: { flex: 1, gap: 4 },
  title: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
  artist: { color: theme.colors.textMuted, fontSize: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceRaised,
  },
  badgeTxt: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
  time: { color: theme.colors.textMuted, fontSize: 12 },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
