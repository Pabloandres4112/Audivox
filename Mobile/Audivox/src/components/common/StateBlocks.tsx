import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../../theme';
export const EmptyBlock = ({
  title,
  subtitle,
  icon = 'musical-notes-outline',
}: {
  title: string;
  subtitle: string;
  icon?: string;
}) => (
  <View style={styles.box}>
    <View style={styles.iconWrap}>
      <Icon name={icon} size={20} color={theme.colors.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.sub}>{subtitle}</Text>
  </View>
);
export const SkeletonBlock = () => (
  <View style={[styles.box, { minHeight: 96, justifyContent: 'center' }]}>
    <View style={styles.skeletonTitle} />
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, { width: '58%' }]} />
  </View>
);
const styles = StyleSheet.create({
  box: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { color: theme.colors.text, fontWeight: '700' },
  sub: { color: theme.colors.textMuted },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  skeletonTitle: {
    width: '56%',
    height: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceRaised,
  },
  skeletonLine: {
    width: '82%',
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceRaised,
  },
});
