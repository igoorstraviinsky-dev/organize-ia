import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, useColorScheme, ActivityIndicator } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TaskItem } from '../../src/components/TaskItem';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { Colors } from '../../src/constants/Colors';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useRealtimeSync(() => fetchData());

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    if (!id) return;
    setLoading(true);

    // Fetch project info
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (projectData) setProject(projectData);

    // Fetch project tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, project:projects(id, name, color)')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    
    setTasks(tasksData || []);
    setLoading(false);
  }

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) fetchData();
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {project?.name || 'Projeto'}
          </Text>
          <View style={[styles.projectIndicator, { backgroundColor: project?.color || theme.tint }]} />
        </View>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={theme.tint} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Este projeto ainda não tem tarefas.</Text>
            </View>
          ) : (
            <ActivityIndicator color={theme.tint} style={{ marginTop: 40 }} />
          )
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
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  projectIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
