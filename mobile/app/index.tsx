import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { supabase } from '../src/lib/supabase';
import { useSSE } from '../src/hooks/useSSE';
import { CheckCircle, Circle, MessageSquare, Layout } from 'lucide-react-native';

export default function App() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [integration, setIntegration] = useState<any>(null);
  const { status } = useSSE(integration?.id);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

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
    <View style={styles.taskCard}>
      {item.status === 'completed' ? (
        <CheckCircle size={20} color="#10b981" />
      ) : (
        <Circle size={20} color="#94a3b8" />
      )}
      <Text style={[styles.taskText, item.status === 'completed' && styles.completedText]}>
        {item.title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Organizador</Text>
        <View style={[styles.statusBadge, { backgroundColor: status === 'online' ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.statusText}>{status === 'online' ? 'ON' : 'OFF'}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Layout size={24} color="#6366f1" />
          <Text style={styles.statNumber}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Tarefas</Text>
        </View>
        <View style={styles.statBox}>
          <MessageSquare size={24} color="#10b981" />
          <Text style={styles.statNumber}>{integration ? '1' : '0'}</Text>
          <Text style={styles.statLabel}>WhatsApp</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Suas Tarefas</Text>
      
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma tarefa encontrada.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={fetchData}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginLeft: 20,
    marginBottom: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  taskText: {
    color: '#f8fafc',
    marginLeft: 15,
    fontSize: 16,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
  },
});
