import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { buildApiUrl } from '../lib/api'

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role?: string | null;
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
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

const normalizeRole = (role: string | null | undefined): Profile['role'] => {
  if (role === 'admin') return 'admin'
  if (role === 'collaborator' || role === 'colaborador') return 'collaborator'
  return null
}

const normalizeProfile = (profile: any): Profile => ({
  ...profile,
  role: normalizeRole(profile?.role),
})

const getApprovalSortValue = (profile: Profile) => {
  if (profile.role === 'admin') return 2
  if (profile.approval_status === 'pending' || profile.approval_status == null) return 0
  if (profile.approval_status === 'rejected') return 1
  return 2
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
      return ((data || []).map(normalizeProfile) as Profile[]).sort((a, b) => {
        const approvalDelta = getApprovalSortValue(a) - getApprovalSortValue(b)
        if (approvalDelta !== 0) return approvalDelta
        return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '', 'pt-BR')
      })
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

      const response = await fetch(buildApiUrl('/api/team/create'), {
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

  const setApprovalStatus = async (
    userId: string,
    approvalStatus: 'pending' | 'approved' | 'rejected'
  ) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(buildApiUrl(`/api/team/status/${userId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ approval_status: approvalStatus })
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to update approval status')

    queryClient.invalidateQueries({ queryKey: ['team-profiles'] })
    return result
  }

  return {
    profiles,
    projectMembers,
    loading: loadingProfiles || loadingMembers,
    error: (profilesError as any)?.message || (membersError as any)?.message,
    assignToProject: (projectId: string, userId: string) => assignMutation.mutateAsync({ projectId, userId }),
    unassignFromProject: (projectId: string, userId: string) => unassignMutation.mutateAsync({ projectId, userId }),
    createCollaborator,
    updateCollaborator: (userId: string, updates: Partial<Profile>) => updateCollaboratorMutation.mutateAsync({ userId, updates }),
    setApprovalStatus,
    deleteCollaborator: async (userId: string) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const response = await fetch(buildApiUrl(`/api/team/delete/${userId}`), {
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
