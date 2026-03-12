import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useColorScheme } from 'react-native';
import { CheckCircle, Circle, Clock, User, Hash, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

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
      case 1: return '#ef4444';
      case 2: return '#f59e0b';
      case 3: return '#6366f1';
      default: return 'rgba(255,255,255,0.3)';
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95, translateY: 10 }}
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={[
        styles.container,
        { 
          backgroundColor: isCompleted ? 'rgba(15, 23, 42, 0.3)' : 'rgba(30, 41, 59, 0.4)',
          borderColor: isCompleted ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.2)'
        }
      ]}
    >
      <TouchableOpacity 
        onPress={() => onPress(task)}
        activeOpacity={0.7}
        style={styles.touchArea}
      >
        <View style={styles.contentRow}>
          {/* Checkbox Section */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => onToggle?.(task)}
            activeOpacity={0.6}
          >
            <AnimatePresence exitBeforeEnter>
              {isCompleted ? (
                <MotiView
                  key="checked"
                  from={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.checkedCircle}
                  >
                    <CheckCircle size={16} color="#fff" strokeWidth={3} />
                  </LinearGradient>
                </MotiView>
              ) : (
                <MotiView
                  key="unchecked"
                  from={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  style={[styles.uncheckedCircle, { borderColor: 'rgba(255,255,255,0.2)' }]}
                />
              )}
            </AnimatePresence>
          </TouchableOpacity>

          {/* Info Section */}
          <View style={styles.infoContainer}>
            <Text 
              style={[
                styles.title, 
                { color: isCompleted ? 'rgba(255,255,255,0.3)' : '#fff' },
                isCompleted && styles.completedText
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>

            <View style={styles.metaRow}>
              {task.project && (
                <View style={[styles.projectBadge, { backgroundColor: (task.project.color || '#6366f1') + '15' }]}>
                  <View style={[styles.projectDot, { backgroundColor: task.project.color || '#6366f1' }]} />
                  <Text style={[styles.projectText, { color: task.project.color || '#6366f1' }]}>
                    {task.project.name}
                  </Text>
                </View>
              )}
              
              <View style={styles.timeBadge}>
                <Clock size={10} color="rgba(255,255,255,0.3)" />
                <Text style={styles.timeText}>{timeAgo}</Text>
              </View>
            </View>
          </View>

          {/* Right Action */}
          <View style={styles.rightAction}>
            <View style={[styles.priorityLine, { backgroundColor: getPriorityColor(task.priority) }]} />
            <ChevronRight size={16} color="rgba(255,255,255,0.15)" />
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  touchArea: {
    padding: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  infoContainer: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  projectText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityLine: {
    width: 3,
    height: 20,
    borderRadius: 2,
  },
  glossOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
});

