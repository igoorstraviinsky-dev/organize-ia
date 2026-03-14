import { useQuery, useMutation } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_SERVER_URL + '/api/config/supabase'

export function useSupabaseConfig() {
  return useQuery({
    queryKey: ['supabaseConfig'],
    queryFn: async () => {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error('Erro ao buscar as configurações do Supabase')
      return res.json()
    }
  })
}

export function useSaveSupabaseConfig() {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações do Supabase')
      return data
    }
  })
}
