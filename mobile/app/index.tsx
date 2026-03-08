import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useSSE } from '../src/hooks/useSSE';
import { CheckCircle, Circle, MessageSquare, Layout, Bell, User, Zap, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function App() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [integration, setIntegration] = useState<any>(null);
  const { status } = useSSE(integration?.id);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Buscar perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    
    setProfile(profileData);

    // Buscar tarefas
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('creator_id', userData.user.id)
      .order('created_at', { ascending: false });
    
    setTasks(tasksData || []);

    // Buscar integração UazAPI ativa
    const { data: intData } = await supabase
      .from('integrations')
      .select('*')
      .eq('owner_id', userData.user.id)
      .eq('type', 'uazapi')
      .single();
    
    setIntegration(intData);
  }

  const renderTask = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.taskCard} activeOpacity={0.7}>
      <View style={styles.taskIconContainer}>
        {item.status === 'completed' ? (
          <CheckCircle size={22} color="#10b981" />
        ) : (
          <Circle size={22} color="#475569" />
        )}
      </View>
      <View style={styles.taskInfo}>
        <Text style={[styles.taskText, item.status === 'completed' && styles.completedText]}>
          {item.title}
        </Text>
        <Text style={styles.taskTime}>
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <ChevronRight size={18} color="#475569" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Background Decorative Blur */}
      <View style={[styles.blurSphere, { top: -100, right: -100, backgroundColor: 'rgba(99, 102, 241, 0.1)' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Bem-vindo de volta,</Text>
            <Text style={styles.userName}>{profile?.full_name?.split(' ')[0] || 'Produtivo'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Bell size={20} color="#f8fafc" />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8}>
              <LinearGradient
                colors={['#6366f1', '#a855f7']}
                style={styles.avatarGradient}
              >
                <User size={20} color="#f8fafc" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsWrapper}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.5)', 'rgba(15, 23, 42, 0.5)']}
            style={styles.statsCard}
          >
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Zap size={22} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.statValue}>{tasks.length}</Text>
                <Text style={styles.statLabel}>Foco</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: status === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' }]}>
                <MessageSquare size={22} color={status === 'online' ? '#10b981' : '#f43f5e'} />
              </View>
              <View>
                <Text style={styles.statValue}>{status === 'online' ? 'Online' : 'Off'}</Text>
                <Text style={styles.statLabel}>Status WA</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tasks List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sua Jornada</Text>
            <TouchableOpacity onPress={fetchData} activeOpacity={0.6}>
              <Text style={styles.viewAllText}>Recarregar</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Layout size={40} color="#334155" />
                </View>
                <Text style={styles.emptyText}>Tudo limpo por aqui.</Text>
                <Text style={styles.emptySubtext}>Crie uma nova tarefa para começar.</Text>
              </View>
            }
          />
        </View>

        {/* FAB */}
        <TouchableOpacity style={styles.fabContainer} activeOpacity={0.9}>
          <LinearGradient
            colors={['#6366f1', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Text style={styles.fabIcon}>+</Text>
          </LinearGradient>
          <View style={styles.fabGlow} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  blurSphere: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  notifBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
    borderWidth: 2,
    borderColor: '#020617',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsWrapper: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  listSection: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  viewAllText: {
    fontSize: 14,
    color: '#818cf8',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: 20,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskIconContainer: {
    marginRight: 16,
  },
  taskInfo: {
    flex: 1,
  },
  taskText: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#475569',
  },
  taskTime: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 34,
    right: 28,
    zIndex: 10,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  fabGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    opacity: 0.4,
    transform: [{ scale: 1.2 }],
    zIndex: 1,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '300',
  },
});

