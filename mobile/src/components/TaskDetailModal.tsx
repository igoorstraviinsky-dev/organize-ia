import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, CheckCircle2, Circle, FolderKanban, X } from 'lucide-react-native';
import { Task } from '../types/models';
import { useAppTheme } from '../hooks/useAppTheme';

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onToggle: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export function TaskDetailModal({ visible, task, onClose, onToggle }: TaskDetailModalProps) {
  const { colors, layout } = useAppTheme();

  if (!task) {
    return null;
  }

  const isCompleted = task.status === 'completed';

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(4, 12, 8, 0.55)' }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.borderStrong,
              paddingHorizontal: layout.horizontalPadding,
            },
          ]}
        >
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Detalhes da tarefa</Text>
            <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.backgroundTertiary }]}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Pressable onPress={() => onToggle(task)} style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View
                style={[
                  styles.toggleBadge,
                  {
                    backgroundColor: isCompleted ? colors.tint : colors.backgroundTertiary,
                    borderColor: isCompleted ? colors.tint : colors.borderStrong,
                  },
                ]}
              >
                {isCompleted ? <CheckCircle2 size={18} color="#fff" /> : <Circle size={18} color={colors.textMuted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <Text style={[styles.taskSubtitle, { color: colors.textMuted }]}>
                  {isCompleted ? 'Concluída. Toque para reabrir.' : 'Em andamento. Toque para concluir.'}
                </Text>
              </View>
            </Pressable>

            <View style={styles.infoGrid}>
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FolderKanban size={18} color={colors.tint} />
                <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Projeto</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{task.project?.name || 'Inbox'}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <CalendarDays size={18} color={colors.tintSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Entrega</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem data'}
                </Text>
              </View>
            </View>

            <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.notesTitle, { color: colors.text }]}>Resumo</Text>
              <Text style={[styles.notesText, { color: colors.textMuted }]}>
                {task.description || 'Essa tarefa ainda não possui descrição. Podemos adicionar observações, prazo detalhado e contexto mais tarde.'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '84%',
    paddingTop: 10,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  toggleBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
  },
  taskSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  infoCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  notesCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
});
