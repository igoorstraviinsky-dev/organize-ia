import React, { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../hooks/useAppTheme';

type ScreenShellProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function ScreenShell({ children, scroll = false }: ScreenShellProps) {
  const { colors, layout } = useAppTheme();
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: layout.horizontalPadding }]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { paddingHorizontal: layout.horizontalPadding }]}>{children}</View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#f4f7f2' ? 'dark-content' : 'light-content'} />
      <LinearGradient colors={[colors.background, colors.backgroundSecondary, colors.background]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, { top: -40, right: -70, backgroundColor: colors.glowPrimary }]} />
      <View style={[styles.glow, { bottom: 120, left: -60, backgroundColor: colors.glowSecondary }]} />
      <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
  },
});
