import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, useColorScheme, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Hash, Folder, Zap } from 'lucide-react-native';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';

const { width } = Dimensions.get('window');

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const router = useRouter();

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

  const renderProject = ({ item, index }: { item: any; index: number }) => (
    <MotiView
      from={{ opacity: 0, scale: 0.9, translateY: 20 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: index * 100 }}
      style={styles.projectCardWrapper}
    >
      <TouchableOpacity 
        style={[styles.projectCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]} 
        onPress={() => router.push(`/project/${item.id}`)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[`${item.color || '#6366f1'}30`, `${item.color || '#a855f7'}10`]}
          style={styles.iconContainer}
        >
          <Hash size={24} color={item.color || '#6366f1'} strokeWidth={2.5} />
        </LinearGradient>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Membro</Text>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Premium */}
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Glow Spheres */}
      <View style={[styles.glowSphere, { top: -50, right: -50, backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} />
      <View style={[styles.glowSphere, { bottom: 100, left: -100, backgroundColor: 'rgba(168, 85, 247, 0.1)' }]} />

      <SafeAreaView style={styles.safeArea}>
        <MotiView 
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.header}
        >
          <View style={styles.titleRow}>
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              style={styles.headerIconWrapper}
            >
              <Folder size={20} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.title}>Projetos</Text>
              <Text style={styles.dateText}>Organização por categorias</Text>
            </View>
          </View>
        </MotiView>

        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchProjects} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <MotiView 
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={styles.emptyIcon}
                >
                  <Zap size={48} color="rgba(255,255,255,0.1)" />
                </MotiView>
                <Text style={styles.emptyText}>Nenhum projeto ainda.</Text>
                <Text style={styles.emptySubtext}>Crie seu primeiro projeto para começar a se organizar.</Text>
              </View>
            ) : (
              <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  safeArea: {
    flex: 1,
  },
  glowSphere: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
  },
  projectCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  projectCard: {
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectInfo: {
    alignItems: 'center',
    gap: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
    width: width - 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
