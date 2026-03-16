import { useColorScheme, useWindowDimensions } from 'react-native';

const palette = {
  light: {
    background: '#f4f7f2',
    backgroundSecondary: '#ffffff',
    backgroundTertiary: '#e8f4ef',
    surface: 'rgba(255,255,255,0.84)',
    surfaceStrong: '#ffffff',
    border: 'rgba(15, 41, 32, 0.10)',
    borderStrong: 'rgba(15, 41, 32, 0.18)',
    text: '#123528',
    textMuted: '#5f746b',
    textSoft: '#7f9188',
    tint: '#177245',
    tintSecondary: '#228be6',
    success: '#1f9d55',
    warning: '#d9822b',
    danger: '#d64545',
    shadow: 'rgba(18, 53, 40, 0.10)',
    glowPrimary: 'rgba(41, 191, 110, 0.18)',
    glowSecondary: 'rgba(34, 139, 230, 0.14)',
    tabInactive: '#7f9188',
  },
  dark: {
    background: '#07140f',
    backgroundSecondary: '#0d1f18',
    backgroundTertiary: '#11281e',
    surface: 'rgba(10, 25, 19, 0.82)',
    surfaceStrong: '#12241d',
    border: 'rgba(196, 244, 219, 0.10)',
    borderStrong: 'rgba(196, 244, 219, 0.18)',
    text: '#effbf4',
    textMuted: '#95b1a3',
    textSoft: '#6f8c7f',
    tint: '#2ec56f',
    tintSecondary: '#3b9cff',
    success: '#32d17c',
    warning: '#ffb44d',
    danger: '#ff6d6d',
    shadow: 'rgba(0, 0, 0, 0.34)',
    glowPrimary: 'rgba(46, 197, 111, 0.16)',
    glowSecondary: 'rgba(59, 156, 255, 0.14)',
    tabInactive: '#6f8c7f',
  },
} as const;

export function useAppTheme() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const horizontalPadding = width >= 1024 ? 40 : width >= 768 ? 32 : width >= 390 ? 24 : 18;
  const contentMaxWidth = isTablet ? 760 : 560;

  return {
    scheme,
    colors: palette[scheme],
    isTablet,
    width,
    height,
    spacing: {
      xs: 8,
      sm: 12,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    },
    radius: {
      sm: 14,
      md: 20,
      lg: 28,
      pill: 999,
    },
    layout: {
      horizontalPadding,
      contentMaxWidth,
      tabBarHeight: isTablet ? 86 : 78,
      cardGap: width >= 768 ? 18 : 14,
    },
    typography: {
      hero: isTablet ? 42 : width >= 390 ? 34 : 30,
      title: isTablet ? 28 : 24,
      section: isTablet ? 22 : 18,
      body: isTablet ? 17 : 15,
      caption: isTablet ? 14 : 12,
    },
  };
}
