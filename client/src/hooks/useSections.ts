import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Section {
  id: string;
  name: string;
  project_id: string;
  position: number;
  created_at: string;
}

export function useSections(projectId: string) {
  return useQuery<Section[]>({
    queryKey: ['sections', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true })
      if (error) throw error
      return data as Section[]
    },
    enabled: !!projectId,
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, project_id, position }: { name: string, project_id: string, position?: number }) => {
      const { data, error } = await supabase
        .from('sections')
        .insert({ name, project_id, position: position ?? 0 })
        .select()
        .single()
      if (error) throw error
      return data as Section
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections', data.project_id] })
    },
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Section> & { id: string }) => {
      const { data, error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Section
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections', data.project_id] })
    },
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string, project_id: string }) => {
      const { error } = await supabase.from('sections').delete().eq('id', id)
      if (error) throw error
      return { project_id }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
