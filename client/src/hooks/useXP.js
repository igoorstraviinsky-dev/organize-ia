import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useXP() {
  return useQuery({
    queryKey: ['user_xp'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('user_xp')
        .select(`
          *,
          user_achievements (
            achievement_key,
            unlocked_at,
            achievements (*)
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error) throw error

      // Cálculo de Nível (XP por nível = 500)
      const level = Math.floor((data?.total_xp || 0) / 500) + 1
      const xpInCurrentLevel = (data?.total_xp || 0) % 500
      const progress = (xpInCurrentLevel / 500) * 100

      return {
        ...data,
        level,
        xpInCurrentLevel,
        progress,
        nextLevelXp: 500
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
