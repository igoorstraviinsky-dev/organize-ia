import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../src/hooks/useSession';
import { useAppTheme } from '../src/hooks/useAppTheme';

export default function IndexScreen() {
  const { session, initialized } = useSession();
  const { colors } = useAppTheme();

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
