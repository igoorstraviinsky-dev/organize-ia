import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight, Clock3 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MotiView } from 'moti';
import { Task } from '../types/models';
import { useAppTheme } from '../hooks/useAppTheme';

interface TaskItemProps {
  task: Task;
  onToggle?: (task: Task) => void;
  onPress: (task: Task) => void;
}

export function TaskItem({ task, onToggle, onPress }: TaskItemProps) {
  const { colors } = useAppTheme();
  const isCompleted = task.status === 'completed';
  const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ptBR });
  const accentColor = task.creator?.theme_color || task.project?.color || colors.tint;

  return (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={styles.wrapper}>
      <Pressable
        onPress={() => onPress(task)}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isCompleted ? colors.border : `${accentColor}40`,
            shadowColor: colors.shadow,
            borderLeftWidth: isCompleted ? 1 : 5,
          },
        ]}
      >
        <Pressable
          onPress={() => onToggle?.(task)}
          style={[
            styles.checkWrap,
            {
              backgroundColor: isCompleted ? colors.tint : colors.backgroundTertiary,
              borderColor: isCompleted ? colors.tint : colors.borderStrong,
            },
          ]}
        >
          {isCompleted ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
        </Pressable>

        <View style={styles.content}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: isCompleted ? colors.textSoft : colors.text,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              },
            ]}
          >
            {task.title}
          </Text>

          <View style={styles.metaRow}>
              <View style={[styles.metaPill, { backgroundColor: colors.backgroundTertiary }]}>
                <Clock3 size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{timeAgo}</Text>
            </View>

            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: task.project?.color ? `${task.project.color}18` : `${accentColor}16`,
                },
              ]}
            >
              <View style={[styles.projectDot, { backgroundColor: task.project?.color || accentColor }]} />
              <Text style={[styles.metaText, { color: task.project?.color || accentColor }]} numberOfLines={1}>
                {task.project?.name || 'Inbox'}
              </Text>
            </View>
          </View>
        </View>

        <ChevronRight size={18} color={colors.textSoft} />
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  projectDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
});
