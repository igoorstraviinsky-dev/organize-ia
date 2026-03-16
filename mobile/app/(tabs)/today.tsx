import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CirclePlus, Sparkle } from 'lucide-react-native';
import { ScreenShell } from '../../src/components/ScreenShell';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { EmptyState } from '../../src/components/EmptyState';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { TaskItem } from '../../src/components/TaskItem';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { getCurrentUser } from '../../src/services/authService';
import { createTask, getTodayTasks, updateTaskStatus } from '../../src/services/taskService';
import { Task } from '../../src/types/models';

export default function TodayScreen() {
  const { colors, layout, typography } = useAppTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useRealtimeSync(() => {
    fetchTasks();
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const today = new Date().toISOString().split('T')[0];
    setTasks(await getTodayTasks(today));
  }

  async function toggleTask(task: Task) {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));

    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch {
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: task.status } : item)));
    }
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) {
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const task = await createTask({ title: newTaskTitle, creatorId: user.id, dueDate: today });
    setTasks((current) => [task, ...current]);
    setNewTaskTitle('');
    setShowComposer(false);
  }

  return (
    <ScreenShell scroll>
      <View style={[styles.container, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <GlassCard style={{ gap: 14 }}>
          <Text style={[styles.date, { color: colors.tint }]}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>Hoje pede foco com leveza.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Centralize aqui o que precisa acontecer no dia e conclua sem se perder no excesso.
          </Text>
        </GlassCard>

        <SectionHeader
          eyebrow="Ritmo de hoje"
          title={`${tasks.length} tarefa${tasks.length === 1 ? '' : 's'} planejada${tasks.length === 1 ? '' : 's'}`}
          subtitle="Toque em uma tarefa para ver mais detalhes."
          right={
            <Pressable onPress={() => setShowComposer((value) => !value)} style={[styles.iconButton, { backgroundColor: colors.backgroundTertiary }]}>
              <CirclePlus size={18} color={colors.tint} />
            </Pressable>
          }
        />

        {showComposer ? (
          <GlassCard style={{ gap: 12 }}>
            <TextInput
              placeholder="Qual é a prioridade de hoje?"
              placeholderTextColor={colors.textSoft}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.borderStrong }]}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <Pressable onPress={handleAddTask} style={[styles.button, { backgroundColor: colors.tint }]}>
              <Text style={styles.buttonText}>Adicionar tarefa</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        {tasks.length ? (
          tasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggleTask} onPress={setSelectedTask} />)
        ) : (
          <EmptyState
            title="Agenda do dia vazia"
            description="Excelente momento para respirar, revisar prioridades ou adicionar uma nova entrega."
            icon={<Sparkle size={24} color={colors.tint} />}
          />
        )}
      </View>

      <TaskDetailModal visible={!!selectedTask} task={selectedTask} onClose={() => setSelectedTask(null)} onToggle={toggleTask} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 150,
  },
  date: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
  },
  button: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
