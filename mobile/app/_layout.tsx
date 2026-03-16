import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { Colors } from '../src/constants/Colors';
import { useSession } from '../src/hooks/useSession';
import { AnimatedSplash } from '../src/components/AnimatedSplash';

export default function RootLayout() {
  const { session, initialized } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';

    if (!session && inAuthGroup) {
      router.replace('/login');
    } else if (session && !inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, initialized, segments, router]);

  if (showSplash) {
    return <AnimatedSplash onFinish={() => setShowSplash(false)} />;
  }

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
