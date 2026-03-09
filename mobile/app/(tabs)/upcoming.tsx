import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { CalendarRange } from 'lucide-react-native';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { TaskItem } from '../../src/components/TaskItem';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { Colors } from '../../src/constants/Colors';
import { useColorScheme } from 'react-native';

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <CalendarRange size={28} color={theme.tint} />
          <Text style={[styles.title, { color: theme.text }]}>Em Breve</Text>
        </View>
        <Text style={[styles.dateText, { color: theme.subtext }]}>Próximas tarefas agendadas</Text>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Nenhuma tarefa para o futuro.</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 5,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leftSection: {
    marginRight: 15,
  },
  taskInfo: {
    flex: 1,
  },
  taskText: {
    color: '#f8fafc',
    fontSize: 16,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '600',
  },
  separator: {
    color: '#334155',
    marginHorizontal: 8,
    fontSize: 12,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  projectLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
