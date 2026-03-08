import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSections(projectId) {
  return useQuery({
    queryKey: ['sections', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, project_id, position }) => {
      const { data, error } = await supabase
        .from('sections')
        .insert({ name, project_id, position: position ?? 0 })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections', data.project_id] })
    },
  })
}

export function useUpdateSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sections', data.project_id] })
    },
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, project_id }) => {
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
