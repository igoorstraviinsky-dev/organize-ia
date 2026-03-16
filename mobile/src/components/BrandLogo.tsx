import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  tagline?: string;
  centered?: boolean;
};

export function BrandLogo({
  size = 92,
  showWordmark = false,
  tagline = 'Sua IA de tarefas no WhatsApp',
  centered = false,
}: BrandLogoProps) {
  const { colors } = useAppTheme();

  return (
    <View style={{ alignItems: centered ? 'center' : 'flex-start' }}>
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <Defs>
          <SvgLinearGradient id="tw-green" x1="16" y1="22" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#46DB7D" />
            <Stop offset="1" stopColor="#168F4D" />
          </SvgLinearGradient>
          <SvgLinearGradient id="tw-blue" x1="36" y1="24" x2="96" y2="96" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#49B2FF" />
            <Stop offset="1" stopColor="#0D6FE8" />
          </SvgLinearGradient>
        </Defs>

        <G>
          <Path
            d="M60 16C37.2 16 19 33.6 19 55.5C19 67.4 24.4 78.1 33.2 85.4L28.3 101.4C27.6 103.8 30.2 105.8 32.4 104.9L49.9 97.7C53.1 98.4 56.5 98.8 60 98.8C82.8 98.8 101 81.2 101 59.2C101 37.3 82.8 16 60 16Z"
            fill="url(#tw-green)"
          />
          <Path
            d="M37 92.1L46.5 88.3C50.8 89.6 55.3 90.2 60 90.2C77.7 90.2 92.2 76.6 92.2 59.8C92.2 42.9 77.7 29.4 60 29.4C42.3 29.4 27.8 42.9 27.8 59.8C27.8 70.2 33.4 79.4 42.1 85L37 92.1Z"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.6"
          />
          <Path
            d="M31 53C35.2 27.5 57.6 12.8 82.9 16.3"
            stroke="url(#tw-blue)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <Path
            d="M94.5 69.8C88.8 88.5 70.2 101.6 50.1 100.3"
            stroke="url(#tw-blue)"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <Circle cx="27.5" cy="61" r="5.8" fill="#F3FFFA" stroke="url(#tw-blue)" strokeWidth="4" />
          <Circle cx="58" cy="100.5" r="5.8" fill="#F3FFFA" stroke="url(#tw-blue)" strokeWidth="4" />
          <Path
            d="M49.8 60.4C54.5 60.8 58.5 64.7 62 69.2L91.7 32.2C93.6 29.8 97.3 32.1 96 35L76.8 78.3C75 82.4 69.6 83.3 66.9 80.1L44.3 63.6C41.6 61.4 44.8 59.9 49.8 60.4Z"
            fill="url(#tw-blue)"
          />
        </G>
      </Svg>

      {showWordmark ? (
        <View style={{ marginTop: 12, alignItems: centered ? 'center' : 'flex-start' }}>
          <Text style={{ color: colors.text, fontSize: size * 0.34, fontWeight: '900', letterSpacing: -1.2 }}>
            <Text style={{ color: colors.tint }}>TaskWise</Text>
            <Text style={{ color: colors.tintSecondary }}> AI</Text>
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: size * 0.15, marginTop: 2, fontWeight: '600' }}>{tagline}</Text>
        </View>
      ) : null}
    </View>
  );
}
