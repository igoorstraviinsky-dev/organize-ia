import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { BrandLogo } from './BrandLogo';
import { useAppTheme } from '../hooks/useAppTheme';

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colors, layout } = useAppTheme();

  useEffect(() => {
    const timer = setTimeout(onFinish, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, colors.backgroundSecondary, colors.background]} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { backgroundColor: colors.glowPrimary, top: '18%', left: -80 }]} />
      <View style={[styles.blob, { backgroundColor: colors.glowSecondary, bottom: '12%', right: -70 }]} />

      <MotiView
        from={{ opacity: 0, scale: 0.88, translateY: 16 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 140 }}
        style={[styles.logoShell, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
      >
        <MotiView
          from={{ rotate: '-8deg', opacity: 0.7 }}
          animate={{ rotate: '0deg', opacity: 1 }}
          transition={{ type: 'timing', duration: 900 }}
        >
          <BrandLogo size={layout.horizontalPadding > 24 ? 126 : 106} showWordmark centered />
        </MotiView>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 18 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: 400, duration: 700 }}
        style={styles.captionWrap}
      >
        <Text style={[styles.caption, { color: colors.textMuted }]}>Planejamento inteligente, rápido e fluido.</Text>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShell: {
    paddingHorizontal: 26,
    paddingVertical: 30,
    borderRadius: 36,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  captionWrap: {
    marginTop: 24,
  },
  caption: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
  },
});
