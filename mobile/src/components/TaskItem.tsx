import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useColorScheme } from 'react-native';
import { CheckCircle, Circle, Clock, User, Hash } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    creator?: {
      full_name: string;
    };
    project?: {
      name: string;
      color: string;
    };
    priority?: number;
  };
  onToggle?: (task: any) => void;
  onPress: (task: any) => void;
}

export const TaskItem = ({ task, onToggle, onPress }: TaskItemProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const isCompleted = task.status === 'completed';
  
  const timeAgo = formatDistanceToNow(new Date(task.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });

  const getPriorityColor = (priority?: number) => {
    switch (priority) {
      case 1: return theme.danger;
      case 2: return theme.warning;
      case 3: return theme.tint;
      default: return theme.subtext;
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.card, 
          borderColor: isCompleted ? theme.border : theme.neonBlue + '40',
        }
      ]} 
      onPress={() => onPress(task)}
      activeOpacity={0.8}
    >
      {/* Top Row: Title and Checkbox */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text 
            style={[
              styles.title, 
              { color: theme.text },
              isCompleted && styles.completedText
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.checkbox} 
          onPress={() => onToggle?.(task)}
          activeOpacity={0.6}
        >
          {isCompleted ? (
            <CheckCircle size={24} color={theme.success} />
          ) : (
            <Circle size={24} color={theme.neonBlue} />
          )}
        </TouchableOpacity>
      </View>

      {/* Middle Row: Meta info */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <User size={14} color={theme.subtext} />
          <Text style={[styles.metaText, { color: theme.subtext }]}>
            {task.creator?.full_name?.split(' ')[0] || 'Sistema'}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Clock size={14} color={theme.subtext} />
          <Text style={[styles.metaText, { color: theme.subtext }]}>
            {timeAgo}
          </Text>
        </View>
      </View>

      {/* Footer: Project and Priority */}
      <View style={styles.footer}>
        {task.project && (
          <View style={[styles.projectBadge, { backgroundColor: (task.project.color || theme.tint) + '20' }]}>
            <Hash size={12} color={task.project.color || theme.tint} />
            <Text style={[styles.projectText, { color: task.project.color || theme.tint }]}>
              {task.project.name}
            </Text>
          </View>
        )}
        
        <View style={styles.priorityIndicator}>
          <View 
            style={[
              styles.priorityDot, 
              { backgroundColor: getPriorityColor(task.priority) }
            ]} 
          />
          <Text style={[styles.priorityText, { color: theme.subtext }]}>
            P{task.priority || 4}
          </Text>
        </View>
      </View>

      {/* Gloss Effect Overlay */}
      <View style={styles.glossOverlay} pointerEvents="none" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.4,
  },
  checkbox: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 12,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  projectText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  glossOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
});
