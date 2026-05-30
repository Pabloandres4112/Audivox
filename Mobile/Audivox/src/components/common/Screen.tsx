import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
export const Screen = ({
  children,
  scroll = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) => (
  <SafeAreaView style={styles.root}>
    <View style={styles.orbTop} />
    <View style={styles.orbBottom} />
    {scroll ? (
      <ScrollView contentContainerStyle={[styles.content, style]}>
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.content, style]}>{children}</View>
    )}
  </SafeAreaView>
);
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  orbTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(83, 214, 196, 0.08)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -140,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: 'rgba(132, 167, 255, 0.07)',
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 132,
  },
});
