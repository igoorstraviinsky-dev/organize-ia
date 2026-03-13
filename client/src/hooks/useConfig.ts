import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const API_URL = (import.meta as any).env.VITE_SERVER_URL + '/api/config/supabase'

export interface SupabaseConfig {
  supabase_url: string
  supabase_anon_key: string
  supabase_service_key: string
}

export function useSupabaseConfig() {
  return useQuery<Partial<SupabaseConfig>>({
    queryKey: ['supabaseConfig'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao buscar as configurações do Supabase')
      }
      return res.json()
    }
  })
}

export function useSaveSupabaseConfig() {
  return useMutation({
    mutationFn: async (payload: Partial<SupabaseConfig>) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações do Supabase')
      return data as { message: string, reload_required: boolean }
    }
  })
}
