import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, useColorScheme, SafeAreaView, Platform } from 'react-native';
import { X, Calendar, Hash, Trash2, Archive, CheckCircle, Circle, User } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface TaskDetailModalProps {
  visible: boolean;
  task: any;
  onClose: () => void;
  onToggle: (task: any) => void;
  onDelete?: (task: any) => void;
}

export const TaskDetailModal = ({ visible, task, onClose, onToggle, onDelete }: TaskDetailModalProps) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  if (!task) return null;
  const isCompleted = task.status === 'completed';

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.content, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Detalhes da Tarefa</Text>
            <View style={{ width: 44 }} /> 
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => onToggle(task)}>
                {isCompleted ? (
                  <CheckCircle size={28} color="#10b981" />
                ) : (
                  <Circle size={28} color={theme.tabIconDefault} />
                )}
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }, isCompleted && styles.completedText]}>
                {task.title}
              </Text>
            </View>

              <View style={styles.infoSection}>
                {task.creator && (
                  <View style={styles.infoItem}>
                    <User size={20} color={theme.tint} />
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Atribuído por</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {task.creator.full_name}
                    </Text>
                  </View>
                )}

                <View style={styles.infoItem}>
                  <Hash size={20} color={theme.tint} />
                  <Text style={[styles.infoLabel, { color: theme.subtext }]}>Projeto</Text>
                  <Text style={[styles.infoValue, { color: task.project?.color || theme.text }]}>
                    {task.project?.name || 'Inbox'}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Calendar size={20} color={theme.tint} />
                  <Text style={[styles.infoLabel, { color: theme.subtext }]}>Data de Entrega</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Sem data'}
                  </Text>
                </View>
              </View>

            {task.description && (
              <View style={styles.descriptionSection}>
                <Text style={[styles.sectionTitle, { color: theme.subtext }]}>Descrição</Text>
                <Text style={[styles.description, { color: theme.text }]}>{task.description}</Text>
              </View>
            )}
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.actionButton}>
              <Archive size={20} color={theme.subtext} />
              <Text style={[styles.actionText, { color: theme.text }]}>Arquivar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => onDelete && onDelete(task)}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.actionText, { color: "#ef4444" }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    padding: 24,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    lineHeight: 32,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  infoSection: {
    gap: 20,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  descriptionSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
