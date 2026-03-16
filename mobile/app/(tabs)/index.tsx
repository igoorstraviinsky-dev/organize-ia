import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Archive, CalendarDays, CirclePlus, FolderKanban, Sparkles } from 'lucide-react-native';
import { ScreenShell } from '../../src/components/ScreenShell';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GlassCard } from '../../src/components/GlassCard';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { TaskItem } from '../../src/components/TaskItem';
import { EmptyState } from '../../src/components/EmptyState';
import { BrandLogo } from '../../src/components/BrandLogo';
import { useRealtimeSync } from '../../src/hooks/useRealtimeSync';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { getCurrentUser } from '../../src/services/authService';
import { createTask, getDashboardStats, getRecentTasks, updateTaskStatus } from '../../src/services/taskService';
import { DashboardStats, Task } from '../../src/types/models';

export default function DashboardScreen() {
  const { colors, layout, typography } = useAppTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ today: 0, upcoming: 0, inbox: 0 });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useRealtimeSync(() => {
    fetchData();
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0];
    const [recentTasks, nextStats] = await Promise.all([getRecentTasks(), getDashboardStats(today)]);
    setTasks(recentTasks);
    setStats(nextStats);
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

  async function handleQuickAdd() {
    if (!newTaskTitle.trim()) {
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      return;
    }

    const task = await createTask({ title: newTaskTitle, creatorId: user.id });
    setTasks((current) => [task, ...current]);
    setNewTaskTitle('');
    setShowQuickAdd(false);
    fetchData();
  }

  const metrics = [
    { label: 'Hoje', value: stats.today, icon: <CalendarDays size={18} color={colors.tint} /> },
    { label: 'Agenda', value: stats.upcoming, icon: <Sparkles size={18} color={colors.tintSecondary} /> },
    { label: 'Inbox', value: stats.inbox, icon: <Archive size={18} color={colors.success} /> },
  ];

  return (
    <ScreenShell scroll>
      <View style={[styles.container, { maxWidth: layout.contentMaxWidth, alignSelf: 'center', width: '100%' }]}>
        <GlassCard style={{ padding: 22 }}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[styles.kicker, { color: colors.tint }]}>TaskWise AI</Text>
              <Text style={[styles.heroTitle, { color: colors.text, fontSize: typography.hero }]}>Seu painel diário, leve e preciso.</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                Acompanhe prazos, priorize o que importa e capture novas tarefas em segundos.
              </Text>
            </View>
            <BrandLogo size={84} />
          </View>
        </GlassCard>

        <View style={styles.metricsRow}>
          {metrics.map((metric) => (
            <GlassCard key={metric.label} style={styles.metricCard}>
              {metric.icon}
              <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{metric.label}</Text>
            </GlassCard>
          ))}
        </View>

        <SectionHeader
          eyebrow="Ação rápida"
          title="Adicionar sem perder o ritmo"
          subtitle="Uma nova tarefa vai direto para seu fluxo."
          right={
            <Pressable onPress={() => setShowQuickAdd((value) => !value)} style={[styles.iconButton, { backgroundColor: colors.backgroundTertiary }]}>
              <CirclePlus size={18} color={colors.tint} />
            </Pressable>
          }
        />

        {showQuickAdd ? (
          <GlassCard style={{ gap: 12 }}>
            <TextInput
              placeholder="Ex.: revisar proposta comercial"
              placeholderTextColor={colors.textSoft}
              style={[styles.quickAddInput, { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.borderStrong }]}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <Pressable onPress={handleQuickAdd} style={[styles.primaryButton, { backgroundColor: colors.tint }]}>
              <Text style={styles.primaryButtonText}>Criar tarefa</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        <SectionHeader eyebrow="Recentes" title="Tarefas em foco" subtitle="As últimas tarefas criadas aparecem aqui." />

        {tasks.length ? (
          tasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggleTask} onPress={setSelectedTask} />)
        ) : (
          <EmptyState
            title="Seu painel está limpo"
            description="Crie a primeira tarefa e comece a organizar seu dia com mais clareza."
            icon={<FolderKanban size={24} color={colors.tint} />}
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
  heroRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 102,
    gap: 10,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddInput: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
