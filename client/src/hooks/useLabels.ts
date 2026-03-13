import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Label {
  id: string
  name: string
  color: string
  owner_id: string
  created_at: string
  task_count?: number
}

export function useLabels() {
  return useQuery<Label[]>({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('owner_id', user.id)
        .order('name', { ascending: true })
        
      if (error) throw error

      // Contar tarefas por label separadamente
      const { data: counts } = await supabase
        .from('task_labels')
        .select('label_id')
      
      const countMap: Record<string, number> = {}
      if (counts) {
        for (const row of counts) {
          countMap[row.label_id] = (countMap[row.label_id] || 0) + 1
        }
      }

      return data.map((l: any) => ({
        ...l,
        task_count: countMap[l.id] || 0,
      })) as Label[]
    },
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, color }: { name: string, color?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated')

      const { data, error } = await supabase
        .from('labels')
        .insert({ name, color: color || '#6366f1', owner_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Label
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useUpdateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string, name?: string, color?: string }) => {
      const { data, error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Label
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['labels'] }),
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('labels').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useToggleTaskLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ task_id, label_id, active }: { task_id: string, label_id: string, active: boolean }) => {
      if (active) {
        const { error } = await supabase
          .from('task_labels')
          .delete()
          .eq('task_id', task_id)
          .eq('label_id', label_id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('task_labels')
          .insert({ task_id, label_id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['labels'] })
    },
  })
}
