import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { CheckCircle, Circle, Calendar, Plus, X } from 'lucide-react-native';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';

export default function TodayScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sincronização em tempo real
  useRealtimeSync(() => fetchTasks());

  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

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
      .eq('creator_id', userData.user.id)
      .eq('due_date', today)
      .order('position', { ascending: true });
    
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
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (error) setTasks(tasks.map(t => t.id === task.id ? { ...t, status: task.status } : t));
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: newTaskTitle.trim(),
        creator_id: userData.user.id,
        due_date: today,
        status: 'pending'
      }])
      .select()
      .single();

    if (!error && data) {
      setTasks([...tasks, data]);
      setNewTaskTitle('');
      setModalVisible(false);
    }
  };

  const renderTask = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.taskCard} 
      onPress={() => toggleTask(item)}
      activeOpacity={0.7}
    >
      {item.status === 'completed' ? (
        <CheckCircle size={22} color="#10b981" />
      ) : (
        <Circle size={22} color="#94a3b8" />
      )}
      <View style={styles.taskInfo}>
        <Text style={[styles.taskText, item.status === 'completed' && styles.completedText]}>
          {item.title}
        </Text>
        {item.project && (
          <View style={styles.projectBadge}>
            <View style={[styles.projectDot, { backgroundColor: item.project.color || '#6366f1' }]} />
            <Text style={styles.projectLabel}>{item.project.name}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Calendar size={24} color="#6366f1" />
          <Text style={styles.title}>Hoje</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

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
              <Text style={styles.emptyText}>Parece que você está livre hoje!</Text>
            </View>
          ) : null
        }
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
              <Text style={styles.modalTitle}>Tarefa para Hoje</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="O que precisa ser feito hoje?"
              placeholderTextColor="#64748b"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTask}
            >
              <Text style={styles.addButtonText}>Adicionar</Text>
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
    textTransform: 'capitalize',
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
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
