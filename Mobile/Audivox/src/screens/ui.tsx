import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { songs } from '../services/mockData';
import { theme } from '../theme';
import { styles } from './styles';

export const playAndOpen = async (
  songId: string,
  playSong: (song: (typeof songs)[number]) => Promise<void>,
  markRecent: (id: string) => void,
  navigation?: {
    getParent?: () =>
      | {
          navigate: (name: string, params?: never) => void;
        }
      | undefined;
  },
) => {
  const song = songs.find(item => item.id === songId);
  if (!song) return;
  markRecent(song.id);
  await playSong(song);
  navigation?.getParent?.()?.navigate('Player');
};

export const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
    </View>
    {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
  </View>
);

export const Chip = ({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

export const HeroPanel = ({
  title,
  subtitle,
  image,
  onPress,
}: {
  title: string;
  subtitle: string;
  image: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={styles.heroPanel}>
    <Image source={{ uri: image }} style={styles.heroImage} />
    <View style={styles.heroOverlay} />
    <View style={styles.heroTextWrap}>
      <Text style={styles.heroKicker}>Featured session</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSub}>{subtitle}</Text>
    </View>
  </Pressable>
);

export const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>
      <Icon name={icon} size={16} color={theme.colors.primary} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);
