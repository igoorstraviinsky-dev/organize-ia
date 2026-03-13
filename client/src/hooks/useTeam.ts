import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role?: string | null;
  theme_color?: string | null;
  experience?: number;
  level?: number;
  total_xp?: number;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  projects?: {
    name: string;
    id: string;
  };
}

export const useTeam = () => {
  const queryClient = useQueryClient()

  const {
    data: profiles = [] as Profile[],
    isLoading: loadingProfiles,
    error: profilesError
  } = useQuery({
    queryKey: ['team-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      if (error) throw error
      return (data || []) as Profile[]
    }
  })

  const {
    data: projectMembers = [] as ProjectMember[],
    isLoading: loadingMembers,
    error: membersError
  } = useQuery({
    queryKey: ['project-members-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('project_id, user_id, projects(name, id)')

      if (error) throw error
      return (data || []) as any as ProjectMember[]
    }
  })

  const assignMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId })

      if (error && error.code !== '23505') throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members-all'] })
    }
  })

  const unassignMutation = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members-all'] })
    }
  })

  const createCollaborator = async ({ fullName, email, password, phone }: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/team/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, password, full_name: fullName, phone })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create collaborator')

      queryClient.invalidateQueries({ queryKey: ['team-profiles'] })
      return { success: true, userId: result.user_id }
    } catch (err: any) {
      console.error('Error creating collaborator:', err)
      return { success: false, error: err.message }
    }
  }

  const updateCollaboratorMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (error) throw error
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-profiles'] })
    }
  })

  return {
    profiles,
    projectMembers,
    loading: loadingProfiles || loadingMembers,
    error: (profilesError as any)?.message || (membersError as any)?.message,
    assignToProject: (projectId: string, userId: string) => assignMutation.mutateAsync({ projectId, userId }),
    unassignFromProject: (projectId: string, userId: string) => unassignMutation.mutateAsync({ projectId, userId }),
    createCollaborator,
    updateCollaborator: (userId: string, updates: Partial<Profile>) => updateCollaboratorMutation.mutateAsync({ userId, updates }),
    deleteCollaborator: async (userId: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/team/delete/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Failed to delete collaborator')

        queryClient.invalidateQueries({ queryKey: ['team-profiles'] })
        return { success: true }
      } catch (err: any) {
        console.error('Error deleting collaborator:', err)
        return { success: false, error: err.message }
      }
    }
  }
}
