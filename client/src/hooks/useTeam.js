import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useTeam = () => {
  const queryClient = useQueryClient()

  // Busca perfis de todos os colaboradores
  const {
    data: profiles = [],
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
      return data || []
    }
  })

  // Busca membros vinculados aos projetos
  const {
    data: projectMembers = [],
    isLoading: loadingMembers,
    error: membersError
  } = useQuery({
    queryKey: ['project-members-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('project_id, user_id, projects(name, id)')

      if (error) throw error
      return data || []
    }
  })

  const assignMutation = useMutation({
    mutationFn: async ({ projectId, userId }) => {
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
    mutationFn: async ({ projectId, userId }) => {
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

  // Operações via servidor
  const createCollaborator = async ({ fullName, email, password, phone }) => {
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
    } catch (err) {
      console.error('Error creating collaborator:', err)
      return { success: false, error: err.message }
    }
  }

  const updateCollaboratorMutation = useMutation({
    mutationFn: async ({ userId, updates }) => {
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
    error: profilesError?.message || membersError?.message,
    // Compatibilidade com a interface antiga
    fetchProfiles: () => queryClient.invalidateQueries({ queryKey: ['team-profiles'] }),
    fetchProjectMembers: () => queryClient.invalidateQueries({ queryKey: ['project-members-all'] }),
    assignToProject: (projectId, userId) => assignMutation.mutateAsync({ projectId, userId }),
    unassignFromProject: (projectId, userId) => unassignMutation.mutateAsync({ projectId, userId }),
    createCollaborator,
    updateCollaborator: (userId, updates) => updateCollaboratorMutation.mutateAsync({ userId, updates })
  }
}
