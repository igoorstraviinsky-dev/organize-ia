import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useColorScheme } from 'react-native';
import { CheckCircle, Circle } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface TaskItemProps {
  task: any;
  onToggle: (task: any) => void;
  onPress: (task: any) => void;
}

export const TaskItem = ({ task, onToggle, onPress }: TaskItemProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const isCompleted = task.status === 'completed';

  return (
    <TouchableOpacity 
      style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.border }]} 
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <TouchableOpacity 
        style={styles.checkboxArea} 
        onPress={() => onToggle(task)}
        activeOpacity={0.6}
      >
        {isCompleted ? (
          <CheckCircle size={22} color="#10b981" />
        ) : (
          <Circle size={22} color={theme.tabIconDefault} />
        )}
      </TouchableOpacity>
      
      <View style={styles.taskInfo}>
        <Text 
          style={[
            styles.taskText, 
            { color: theme.text },
            isCompleted && styles.completedText
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.project && (
          <Text style={[styles.projectLabel, { color: task.project.color || theme.tint }]}>
            #{task.project.name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  checkboxArea: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  projectLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});
