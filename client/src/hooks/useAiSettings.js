import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const API_URL = '/api/ai/settings'

export function useAiSettings() {
  return useQuery({
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
        throw new Error('Erro ao buscar as configurações')
      }
      return res.json()
    }
  })
}

export function useSaveAiSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
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
      if (!res.ok) throw new Error('Erro ao salvar as configurações')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] })
    }
  })
}
