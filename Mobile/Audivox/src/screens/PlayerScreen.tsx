import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { EmptyBlock } from '../components/common/StateBlocks';
import { artists } from '../services/mockData';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { theme } from '../theme';
import { formatTime } from '../utils/time';
import { styles } from './styles';

export const PlayerScreen = () => {
  const player = usePlayerStore();
  const liked = useAppStore(s => s.likedIds.includes(player.current?.id || ''));
  const toggleLike = useAppStore(s => s.toggleLike);

  if (!player.current) {
    return (
      <View style={styles.fullScreenCenter}>
        <EmptyBlock
          title="No track selected"
          subtitle="Pick a song from Home, Search or Library."
          icon="play-circle-outline"
        />
      </View>
    );
  }

  const artistName =
    artists.find(artist => artist.id === player.current?.artistId)?.name ||
    'Unknown';
  const ratio = Math.min(1, player.progress / player.current.duration);
  const queuePreview = player.queue
    .filter(song => song.id !== player.current?.id)
    .slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.playerPage}>
      <View style={styles.playerArtWrap}>
        <Image source={{ uri: player.current.artwork }} style={styles.playerArt} />
        <View style={styles.playerGlow} />
      </View>
      <Text style={styles.playerTitle}>{player.current.title}</Text>
      <Text style={styles.playerArtist}>{artistName}</Text>

      <View style={styles.progressHeader}>
        <Text style={styles.progressTime}>{formatTime(player.progress)}</Text>
        <Text style={styles.progressTime}>{formatTime(player.current.duration)}</Text>
      </View>
      <View style={styles.playerProgressTrack}>
        <View style={[styles.playerProgressFill, { width: `${ratio * 100}%` }]} />
      </View>

      <View style={styles.actionRowCentered}>
        <Pressable
          onPress={player.toggleShuffle}
          style={[styles.circleBtn, player.shuffle && styles.circleBtnActive]}
        >
          <Icon
            name="shuffle"
            size={18}
            color={player.shuffle ? theme.colors.background : theme.colors.text}
          />
        </Pressable>
        <Pressable onPress={() => player.previous()} style={styles.circleBtn}>
          <Icon name="play-skip-back" size={18} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.mainPlayBtn} onPress={() => player.togglePlay()}>
          <Icon
            name={player.isPlaying ? 'pause' : 'play'}
            size={22}
            color={theme.colors.background}
          />
        </Pressable>
        <Pressable onPress={() => player.next()} style={styles.circleBtn}>
          <Icon name="play-skip-forward" size={18} color={theme.colors.text} />
        </Pressable>
        <Pressable
          onPress={player.toggleRepeat}
          style={[styles.circleBtn, player.repeat !== 'off' && styles.circleBtnActive]}
        >
          <Icon
            name="repeat"
            size={18}
            color={player.repeat !== 'off' ? theme.colors.background : theme.colors.text}
          />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => player.seek(Math.max(0, player.progress - 10))}
        >
          <Text style={styles.secondaryButtonText}>-10s</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            player.seek(Math.min(player.current.duration, player.progress + 10))
          }
        >
          <Text style={styles.secondaryButtonText}>+10s</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => toggleLike(player.current!.id)}
        >
          <Text style={styles.secondaryButtonText}>{liked ? 'Liked' : 'Like'}</Text>
        </Pressable>
      </View>

      <View style={styles.queueCard}>
        <Text style={styles.queueTitle}>Up next</Text>
        {queuePreview.length === 0 ? (
          <Text style={styles.queueSub}>Queue is empty.</Text>
        ) : (
          queuePreview.map(item => (
            <View key={item.id} style={styles.queueRow}>
              <Image source={{ uri: item.artwork }} style={styles.queueCover} />
              <View style={{ flex: 1 }}>
                <Text style={styles.queueItemTitle}>{item.title}</Text>
                <Text style={styles.queueSub}>
                  {artists.find(artist => artist.id === item.artistId)?.name ||
                    'Unknown'}
                </Text>
              </View>
              <Text style={styles.queueSub}>{formatTime(item.duration)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
