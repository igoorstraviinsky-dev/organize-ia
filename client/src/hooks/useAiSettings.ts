import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { buildApiUrl } from '../lib/api'

export interface AiSettings {
  id?: string
  user_id?: string
  gemini_api_key?: string
  openai_api_key?: string
  elevenlabs_api_key?: string
  active_provider?: 'gemini' | 'openai' | 'anthropic' | string
  created_at?: string
  updated_at?: string
  [key: string]: any
}

// O Vite Server atua como proxy via proxy.config, ou batemos direto caso use porta 3001 etc
const API_URL = buildApiUrl('/api/ai/settings')

export function useAiSettings() {
  return useQuery<AiSettings | null>({
    queryKey: ['aiSettings'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      const res = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-user-id': session.user.id,
          'x-user-token': session.access_token
        }
      })
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error('Erro ao buscar as configurações de IA')
      }
      return (await res.json()) as AiSettings
    }
  })
}

export function useSaveAiSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AiSettings) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Não autenticado')

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-user-id': session.user.id,
          'x-user-token': session.access_token
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Erro ao salvar as configurações de IA')
      return (await res.json()) as AiSettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] })
    }
  })
}
