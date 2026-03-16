import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, FolderKanban } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '../../src/components/ScreenShell';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { TaskItem } from '../../src/components/TaskItem';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { getProjectById } from '../../src/services/projectService';
import { getTasksByProject, updateTaskStatus } from '../../src/services/taskService';
import { Project, Task } from '../../src/types/models';

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, layout, typography } = useAppTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useRealtimeSync(() => {
    fetchData();
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    if (!id) {
      return;
    }

    const projectId = Array.isArray(id) ? id[0] : id;
    const [projectData, taskData] = await Promise.all([getProjectById(projectId), getTasksByProject(projectId)]);
    setProject(projectData);
    setTasks(taskData);
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
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.backgroundTertiary }]}>
          <ArrowLeft size={18} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Voltar</Text>
        </Pressable>

        <GlassCard style={{ gap: 12 }}>
          <View style={[styles.projectChip, { backgroundColor: project?.color ? `${project.color}20` : colors.backgroundTertiary }]}>
            <FolderKanban size={18} color={project?.color || colors.tint} />
            <Text style={[styles.projectChipText, { color: project?.color || colors.tint }]}>Projeto ativo</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>{project?.name || 'Projeto'}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Todas as tarefas ligadas a esta frente de trabalho aparecem aqui com leitura clara e espaço confortável.
          </Text>
        </GlassCard>

        <SectionHeader eyebrow="Entrega" title={`${tasks.length} tarefa${tasks.length === 1 ? '' : 's'}`} subtitle="Toque em uma tarefa para abrir os detalhes." />

        {tasks.length ? (
          tasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggleTask} onPress={setSelectedTask} />)
        ) : (
          <EmptyState
            title="Sem tarefas neste projeto"
            description="Quando as tarefas forem associadas a este projeto, elas vão aparecer aqui com a nova leitura visual."
            icon={<FolderKanban size={24} color={project?.color || colors.tint} />}
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
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
  },
  projectChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  projectChipText: {
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
