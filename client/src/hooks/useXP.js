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
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching XP:', error)
        // Retorna fallback em caso de erro para não travar a UI
        return { total_xp: 0, level: 1, streak_days: 0, progress: 0, xpInCurrentLevel: 0, nextLevelXp: 500 }
      }

      // Se não existir dados, retorna valores iniciais
      const xpValue = data?.total_xp || 0
      const level = Math.floor(xpValue / 500) + 1
      const xpInCurrentLevel = xpValue % 500
      const progress = (xpInCurrentLevel / 500) * 100

      return {
        ...data,
        total_xp: xpValue,
        streak_days: data?.streak_days || 0,
        level,
        xpInCurrentLevel,
        progress,
        nextLevelXp: 500
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
