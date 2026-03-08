import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { CheckCircle, Circle, Archive, Calendar, CalendarRange, Plus, X } from 'lucide-react-native';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';

export default function DashboardScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ today: 0, upcoming: 0, inbox: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Sincronização em tempo real
  useRealtimeSync(() => fetchData());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const today = new Date().toISOString().split('T')[0];

    // Fetch Recent/Inbox tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, project:projects(id, name, color)')
      .eq('creator_id', userData.user.id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    setTasks(tasksData || []);

    // Calculate stats
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('due_date, status')
      .eq('creator_id', userData.user.id);
    
    if (allTasks) {
      const todayCount = allTasks.filter(t => t.due_date === today && t.status !== 'completed').length;
      const upcomingCount = allTasks.filter(t => t.due_date && t.due_date > today && t.status !== 'completed').length;
      const inboxCount = allTasks.filter(t => !t.due_date && t.status !== 'completed').length;
      setStats({ today: todayCount, upcoming: upcomingCount, inbox: inboxCount });
    }
    
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) setTasks(tasks.map(t => t.id === task.id ? { ...t, status: task.status } : t));
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: newTaskTitle.trim(),
        creator_id: userData.user.id,
        status: 'pending'
      }])
      .select()
      .single();

    if (!error && data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
      setModalVisible(false);
      fetchData(); // Update stats
    }
  };

  const renderTask = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.taskCard} 
      onPress={() => toggleTask(item)}
      activeOpacity={0.7}
    >
      {item.status === 'completed' ? (
        <CheckCircle size={20} color="#10b981" />
      ) : (
        <Circle size={20} color="#94a3b8" />
      )}
      <View style={styles.taskInfo}>
        <Text style={[styles.taskText, item.status === 'completed' && styles.completedText]}>
          {item.title}
        </Text>
        {item.project && (
          <Text style={[styles.projectLabel, { color: item.project.color || '#94a3b8' }]}>
            #{item.project.name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Minha Visão</Text>
        <Text style={styles.subtitle}>Gerencie suas tarefas e prazos</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Calendar size={20} color="#ef4444" />
          <Text style={styles.statNumber}>{stats.today}</Text>
          <Text style={styles.statLabel}>Hoje</Text>
        </View>
        <View style={styles.statBox}>
          <CalendarRange size={20} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>Breve</Text>
        </View>
        <View style={styles.statBox}>
          <Archive size={20} color="#6366f1" />
          <Text style={styles.statNumber}>{stats.inbox}</Text>
          <Text style={styles.statLabel}>Inbox</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Tarefas Recentes</Text>
      
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma tarefa recente.</Text>}
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={30} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Tarefa</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="O que precisa ser feito?"
              placeholderTextColor="#64748b"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTask}
            >
              <Text style={styles.addButtonText}>Criar Tarefa</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 10,
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
  taskInfo: {
    marginLeft: 15,
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
  projectLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#6366f1',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 15,
    color: '#f8fafc',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
