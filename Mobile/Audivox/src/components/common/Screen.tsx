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
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 96,
  },
});
