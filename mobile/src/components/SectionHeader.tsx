import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const { colors, typography } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.tint }]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, { color: colors.text, fontSize: typography.title }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: 10,
    marginBottom: 18,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
