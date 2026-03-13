import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Integration {
  id: string
  user_id: string
  provider: 'uazapi' | 'whatsapp_cloud' | 'telegram' | string
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | string
  
  // UazApi fields
  api_url?: string
  api_token?: string
  instance_name?: string
  
  // WhatsApp Cloud fields
  phone_number_id?: string
  waba_id?: string
  access_token?: string
  
  // Telegram fields
  telegram_bot_token?: string
  telegram_bot_username?: string
  
  webhook_url?: string
  metadata?: any
  created_at: string
  updated_at?: string
}

export function useIntegrations() {
  return useQuery<Integration[]>({
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
      return (data || []) as Integration[]
    },
  })
}

export function useSaveIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<Integration>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data, error } = await supabase
        .from('integrations')
        .upsert({ ...payload, user_id: user.id }, { onConflict: 'user_id,provider' })
        .select()
        .single()

      if (error) throw error
      return data as Integration
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('integrations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

export function useUpdateIntegrationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data, error } = await supabase
        .from('integrations')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Integration
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}
