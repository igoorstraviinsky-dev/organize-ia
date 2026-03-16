import { DashboardStats, Task, TaskStatus } from '../types/models';
import { supabase } from '../lib/supabase';

const taskSelect = '*, project:projects(id, name, color), creator:profiles!creator_id(full_name, theme_color, avatar_url)';

export async function getRecentTasks(limit = 10) {
  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as Task[];
}

export async function getTodayTasks(date: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .eq('due_date', date)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Task[];
}

export async function getUpcomingTasks(date: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .gt('due_date', date)
    .order('due_date', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Task[];
}

export async function getTasksByProject(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Task[];
}

export async function createTask(input: {
  title: string;
  creatorId: string;
  dueDate?: string;
  projectId?: string;
}) {
  const payload = {
    title: input.title.trim(),
    creator_id: input.creatorId,
    due_date: input.dueDate,
    project_id: input.projectId,
    status: 'pending' as TaskStatus,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([payload])
    .select(taskSelect)
    .single();

  if (error) {
    throw error;
  }

  return data as Task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);

  if (error) {
    throw error;
  }
}

export async function getDashboardStats(today: string): Promise<DashboardStats> {
  const { data, error } = await supabase.from('tasks').select('due_date, status');

  if (error) {
    throw error;
  }

  const allTasks = data ?? [];

  return {
    today: allTasks.filter((task) => task.due_date === today && task.status !== 'completed').length,
    upcoming: allTasks.filter((task) => task.due_date && task.due_date > today && task.status !== 'completed').length,
    inbox: allTasks.filter((task) => !task.due_date && task.status !== 'completed').length,
  };
}
