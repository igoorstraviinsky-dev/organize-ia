import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, useColorScheme, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Hash, Folder } from 'lucide-react-native';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/Colors';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sincronização em tempo real
  useRealtimeSync(() => fetchProjects());

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setProjects(data);
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const renderProject = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.projectCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
      onPress={() => router.push(`/project/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${item.color || theme.tint}20` }]}>
        <Hash size={24} color={item.color || theme.tint} />
      </View>
      <View style={styles.projectInfo}>
        <Text style={[styles.projectName, { color: theme.text }]}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Folder size={28} color={theme.tint} />
          <Text style={[styles.title, { color: theme.text }]}>Projetos</Text>
        </View>
        <Text style={styles.dateText}>Organização por categorias</Text>
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchProjects} tintColor={theme.tint} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum projeto criado ainda.</Text>
            </View>
          ) : (
            <ActivityIndicator color={theme.tint} style={{ marginTop: 40 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  projectCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectInfo: {
    alignItems: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    width: '100%',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
