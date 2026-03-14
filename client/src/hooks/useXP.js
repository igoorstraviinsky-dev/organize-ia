import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useXP() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel;
    
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel('user_xp_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_xp',
            filter: `user_id=eq.${userId}`
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['user_xp'] });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);
  return useQuery({
    queryKey: ['user_xp'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return null

      // Busca XP e Conquistas em paralelo para performance e evitar joins complexos
      const [xpRes, achievementsRes] = await Promise.all([
        supabase
          .from('user_xp')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_achievements')
          .select(`
            achievement_key,
            unlocked_at,
            achievements (*)
          `)
          .eq('user_id', userId)
      ])
      
      if (xpRes.error) {
        console.error('Error fetching XP:', xpRes.error)
        return { total_xp: 0, level: 1, streak_days: 0, progress: 0, xpInCurrentLevel: 0, nextLevelXp: 500, user_achievements: [] }
      }

      const xpData = xpRes.data
      const achievementsData = achievementsRes.data || []

      // Se não existir dados de XP, retorna valores iniciais
      const xpValue = xpData?.total_xp || 0
      const level = Math.floor(xpValue / 500) + 1
      const xpInCurrentLevel = xpValue % 500
      const progress = (xpInCurrentLevel / 500) * 100

      return {
        ...xpData,
        total_xp: xpValue,
        streak_days: xpData?.streak_days || 0,
        level,
        xpInCurrentLevel,
        progress,
        nextLevelXp: 500,
        user_achievements: achievementsData
      }
    },
    staleTime: 0, // Garante que a invalidação force refetch imediato
  })
}
