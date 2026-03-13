import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AgentSettings {
  user_id: string;
  morning_summary_enabled: boolean;
  morning_summary_times: string[];
  timezone: string;
}

export function useAgentSettings() {
  const queryClient = useQueryClient();

  const query = useQuery<AgentSettings | null>({
    queryKey: ['agent-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('ai_agent_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return {
          user_id: user.id,
          morning_summary_enabled: false,
          morning_summary_times: ['08:00'],
          timezone: 'America/Sao_Paulo'
        } as AgentSettings;
      }
      
      return data as AgentSettings;
    }
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<AgentSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ai_agent_settings')
        .upsert(
          { user_id: user.id, ...updates },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as AgentSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-settings'] });
    }
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending
  };
}
