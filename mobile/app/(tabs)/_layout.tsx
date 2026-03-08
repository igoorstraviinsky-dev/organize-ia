import { Tabs } from 'expo-router';
import { Layout, Calendar, CalendarRange, Hash, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#1e293b',
        borderTopColor: '#334155',
        height: 65,
        paddingBottom: 10,
        paddingTop: 5,
      },
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: '#94a3b8',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Layout size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Breve',
          tabBarIcon: ({ color, size }) => <CalendarRange size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projetos',
          tabBarIcon: ({ color, size }) => <Hash size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
