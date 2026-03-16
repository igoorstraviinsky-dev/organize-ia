import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Compass } from 'lucide-react-native';
import { ScreenShell } from '../../src/components/ScreenShell';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { EmptyState } from '../../src/components/EmptyState';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { TaskItem } from '../../src/components/TaskItem';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { getUpcomingTasks, updateTaskStatus } from '../../src/services/taskService';
import { Task } from '../../src/types/models';

export default function UpcomingScreen() {
  const { colors, layout, typography } = useAppTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useRealtimeSync(() => {
    fetchTasks();
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const today = new Date().toISOString().split('T')[0];
    setTasks(await getUpcomingTasks(today));
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

  return (
    <ScreenShell scroll>
      <View style={[styles.container, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <GlassCard style={{ gap: 12 }}>
          <Text style={[styles.eyebrow, { color: colors.tintSecondary }]}>Próximos passos</Text>
          <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>O que já está no radar.</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Visualize o que vem depois para distribuir energia e antecipar entregas sem sobrecarga.
          </Text>
        </GlassCard>

        <SectionHeader eyebrow="Agenda futura" title="Planejamento adiantado" subtitle="As tarefas aparecem ordenadas por data de entrega." />

        {tasks.length ? (
          tasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggleTask} onPress={setSelectedTask} />)
        ) : (
          <EmptyState
            title="Nenhum item no futuro"
            description="Isso pode ser ótimo. Quando quiser, adicione novos compromissos e distribua a carga com antecedência."
            icon={<Compass size={24} color={colors.tintSecondary} />}
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
  eyebrow: {
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
});
