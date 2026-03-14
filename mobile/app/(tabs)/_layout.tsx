import { Tabs } from 'expo-router';
import { Layout, Calendar, CalendarRange, Hash, Settings } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Platform, View, useColorScheme } from 'react-native';
import { Colors } from '../../src/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        paddingTop: 12,
        position: 'absolute',
      },
      tabBarActiveTintColor: theme.tint,
      tabBarInactiveTintColor: theme.tabIconDefault,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Layout size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, size }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Breve',
          tabBarIcon: ({ color, size }) => <CalendarRange size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projetos',
          tabBarIcon: ({ color, size }) => <Hash size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

