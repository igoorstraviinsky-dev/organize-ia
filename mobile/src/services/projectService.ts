import { Project } from '../types/models';
import { supabase } from '../lib/supabase';

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Project[];
}

export async function getProjectById(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    throw error;
  }

  return data as Project;
}
