import { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { Layout, Calendar, CalendarRange, Hash, Settings } from 'lucide-react-native';
import { Platform, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../src/hooks/useAppTheme';

function TabIcon({
  color,
  label,
  focused,
  children,
  activeBg,
}: {
  color: string;
  label: string;
  focused: boolean;
  children: ReactNode;
  activeBg: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <View
        style={{
          minWidth: 46,
          height: 34,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? activeBg : 'transparent',
        }}
      >
        {children}
      </View>
      <Text style={{ color, fontSize: 11, fontWeight: focused ? '800' : '700' }}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, layout } = useAppTheme();
  const blurTint = colors.background === '#f4f7f2' ? 'light' : 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: layout.horizontalPadding,
          right: layout.horizontalPadding,
          bottom: Platform.OS === 'ios' ? 26 : 18,
          height: layout.tabBarHeight,
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          borderRadius: 28,
          paddingHorizontal: 8,
          paddingTop: 10,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.16,
          shadowRadius: 20,
          elevation: 12,
        },
        tabBarBackground: () => <BlurView tint={blurTint} intensity={40} style={{ flex: 1, borderRadius: 28 }} />,
        tabBarItemStyle: {
          borderRadius: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Visão',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} label="Visão" focused={focused} activeBg={colors.backgroundTertiary}>
              <Layout size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} label="Hoje" focused={focused} activeBg={colors.backgroundTertiary}>
              <Calendar size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} label="Agenda" focused={focused} activeBg={colors.backgroundTertiary}>
              <CalendarRange size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projetos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} label="Projetos" focused={focused} activeBg={colors.backgroundTertiary}>
              <Hash size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} label="Conta" focused={focused} activeBg={colors.backgroundTertiary}>
              <Settings size={20} color={color} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}
