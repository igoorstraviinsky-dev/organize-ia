import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        
      if (error) throw error
      return data || []
    },
  })
}

export function useSaveIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data, error } = await supabase
        .from('integrations')
        .upsert({ ...payload, user_id: user.id }, { onConflict: 'user_id,provider' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('integrations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

export function useUpdateIntegrationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from('integrations')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}
