import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { GlassCard } from './GlassCard';

export function EmptyState({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  const { colors } = useAppTheme();

  return (
    <GlassCard style={{ alignItems: 'center', paddingVertical: 28, marginTop: 12 }}>
      <View style={{ width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundTertiary }}>
        {icon}
      </View>
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 16, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
        {description}
      </Text>
    </GlassCard>
  );
}
