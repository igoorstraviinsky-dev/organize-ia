import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, Dimensions, Platform } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { CalendarRange, Zap } from 'lucide-react-native';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { TaskItem } from '../../src/components/TaskItem';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { Colors } from '../../src/constants/Colors';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';

const { width } = Dimensions.get('window');

export default function UpcomingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Sincronização em tempo real
  useRealtimeSync(() => fetchTasks());

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(id, name, color)')
      .gt('due_date', today)
      .order('due_date', { ascending: true });
    
    if (data) setTasks(data);
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    // Optimistic UI
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      // Revert if error
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const renderTask = ({ item }: { item: any }) => (
    <TaskItem 
      task={item} 
      onToggle={toggleTask} 
      onPress={(task) => {
        setSelectedTask(task);
        setDetailVisible(true);
      }}
    />
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
              <CalendarRange size={20} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.title}>Em Breve</Text>
              <Text style={styles.dateText}>Próximas tarefas agendadas</Text>
            </View>
          </View>
        </MotiView>

        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
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
                <Text style={styles.emptyText}>Nenhuma tarefa para o futuro.</Text>
                <Text style={styles.emptySubtext}>Que tal agendar um novo objetivo agora?</Text>
              </View>
            ) : null
          }
        />

        <TaskDetailModal
          visible={detailVisible}
          task={selectedTask}
          onClose={() => setDetailVisible(false)}
          onToggle={toggleTask}
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
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
