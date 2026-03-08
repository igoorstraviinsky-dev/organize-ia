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
        colors={['#0f172a', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Olá,</Text>
            <Text style={styles.userName}>{profile?.full_name?.split(' ')[0] || 'Usuário'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={22} color="#f8fafc" />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer}>
              <User size={20} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsWrapper}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.15)', 'rgba(168, 85, 247, 0.05)']}
            style={styles.statsCard}
          >
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                <Zap size={20} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.statValue}>{tasks.length}</Text>
                <Text style={styles.statLabel}>Tarefas</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconCircle, { backgroundColor: status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
                <MessageSquare size={20} color={status === 'online' ? '#10b981' : '#f59e0b'} />
              </View>
              <View>
                <Text style={styles.statValue}>{status === 'online' ? 'Ativo' : 'Off'}</Text>
                <Text style={styles.statLabel}>WhatsApp</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tasks List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tarefas Recentes</Text>
            <TouchableOpacity onPress={fetchData}>
              <Text style={styles.viewAllText}>Atualizar</Text>
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
                <Layout size={48} color="#334155" />
                <Text style={styles.emptyText}>Nenhuma tarefa para hoje.</Text>
              </View>
            }
          />
        </View>

        {/* FAB */}
        <TouchableOpacity style={styles.fabContainer} activeOpacity={0.8}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            style={styles.fab}
          >
            <Text style={styles.fabIcon}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsWrapper: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  listSection: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  viewAllText: {
    fontSize: 14,
    color: '#818cf8',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
});

