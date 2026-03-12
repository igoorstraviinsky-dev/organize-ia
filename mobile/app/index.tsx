import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, Dimensions, useColorScheme, Platform } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useRealtime } from '../src/hooks/useRealtime';
import { Bell, User, Zap, Layout, Search, Plus, Filter, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { Colors } from '../src/constants/Colors';
import { TaskItem } from '../src/components/TaskItem';
import { FlashList } from '@shopify/flash-list';
import XPBar from '../src/components/XPBar';

const { width, height } = Dimensions.get('window');

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [xpData, setXpData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Perfomance: Paralelizar buscas
    const [tasksRes, xpRes, profileRes] = await Promise.all([
      supabase.from('tasks').select('*, project:projects(name, color)').order('created_at', { ascending: false }),
      supabase.from('user_xp').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', user.id).single()
    ]);

    if (tasksRes.data) setTasks(tasksRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    
    if (xpRes.data) {
      const xpValue = xpRes.data.total_xp || 0;
      const level = Math.floor(xpValue / 500) + 1;
      const xpInCurrentLevel = xpValue % 500;
      setXpData({
        ...xpRes.data,
        level,
        xpInCurrentLevel,
        progress: (xpInCurrentLevel / 500) * 100,
        nextLevelXp: 500
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Configurar Realtime para tarefas e XP
  useRealtime('tasks', fetchData);
  useRealtime('user_xp', fetchData);

  const renderHeader = () => (
    <MotiView 
      from={{ opacity: 0, transform: [{ translateY: -20 }] }}
      animate={{ opacity: 1, transform: [{ translateY: 0 }] }}
      transition={{ type: 'spring', delay: 100 }}
      style={styles.headerContainer}
    >
      <View style={styles.topRow}>
        <View style={styles.branding}>
          <LinearGradient
            colors={['#6366f1', '#a855f7']}
            style={styles.logoBadge}
          >
            <Zap size={18} color="#fff" fill="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.greeting}>Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}</Text>
            <Text style={styles.dateText}>Sua jornada hoje</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Search size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              <User size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <XPBar data={xpData} />
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
      
      {/* Decorative Blur Spheres (Native simulation) */}
      <View style={[styles.glowSphere, { top: -50, right: -50, backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} />
      <View style={[styles.glowSphere, { bottom: 100, left: -100, backgroundColor: 'rgba(168, 85, 247, 0.1)' }]} />

      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <MotiText 
              from={{ opacity: 0, transform: [{ translateX: -10 }] }}
              animate={{ opacity: 1, transform: [{ translateX: 0 }] }}
              style={styles.sectionTitle}
            >
              Tarefas Recentes
            </MotiText>
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={16} color="#818cf8" />
              <Text style={styles.filterText}>Filtros</Text>
            </TouchableOpacity>
          </View>

          <FlashList
            data={tasks}
            keyExtractor={(item) => item.id}
            estimatedItemSize={100}
            renderItem={({ item }) => (
              <TaskItem 
                task={item} 
                onPress={() => console.log('Task pressed')}
                onToggle={async (task) => {
                  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
                  await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
                  // Realtime cuidará do refetch
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MotiView 
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={styles.emptyIcon}
                >
                  <Layout size={48} color="rgba(255,255,255,0.1)" />
                </MotiView>
                <Text style={styles.emptyText}>Nenhuma tarefa pendente</Text>
                <Text style={styles.emptySubtext}>Que tal começar algo novo agora?</Text>
              </View>
            }
          />
        </View>

        {/* Floating Action Button - Redesenhado */}
        <MotiView 
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 500 }}
          style={styles.fabWrapper}
        >
          <TouchableOpacity activeOpacity={0.8} style={styles.fabShadow}>
            <LinearGradient
              colors={['#6366f1', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <Plus size={32} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
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
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
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
  greeting: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  avatarBorder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.9,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 30,
    right: 20,
  },
  fabShadow: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


