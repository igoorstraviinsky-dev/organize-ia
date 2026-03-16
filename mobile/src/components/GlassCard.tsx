import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export function GlassCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useAppTheme();

  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
});
