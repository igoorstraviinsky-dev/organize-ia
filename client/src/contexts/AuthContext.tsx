import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'collaborator' | null;
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
  phone?: string | null;
  theme_color?: string | null;
  created_at?: string;
}

export interface AuthContextType {
  session: Session | null;
  user: (User & { profile: Profile | null }) | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const normalizeRole = (role: string | null | undefined): Profile['role'] => {
  if (role === 'admin') return 'admin'
  if (role === 'collaborator' || role === 'colaborador') return 'collaborator'
  return null
}

const normalizeProfile = (profile: any): Profile => ({
  ...profile,
  role: normalizeRole(profile?.role),
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const queryClient = useQueryClient()

  // 1. Gerenciar Sessão e Listener
  useEffect(() => {
    let mounted = true

    // Check inicial da sessão
    const checkSession = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (mounted) {
          setSession(s)
          setIsSessionLoading(false)
        }
      } catch (err) {
        console.error('Initial session check error:', err)
        if (mounted) setIsSessionLoading(false)
      }
    }

    checkSession()

    // Listener de mudanças na auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (mounted) {
        setSession(s)
        if (event === 'SIGNED_OUT') {
          setIsSessionLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Carregar Perfil usando React Query
  const { 
    data: profile, 
    isLoading: isProfileLoading,
    refetch: refetchProfile 
  } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (error) {
        console.warn('Could not fetch profile:', error.message)
        return null
      }
      return normalizeProfile(data)
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      queryClient.clear()
      setSession(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }, [queryClient])

  const loading = isSessionLoading || (!!session?.user?.id && isProfileLoading)

  const value = useMemo(() => ({
    session,
    user: session?.user ? { ...session.user, profile: profile || null } : null,
    profile: profile || null,
    loading,
    signOut,
    refetchProfile: () => { refetchProfile() }
  }), [session, profile, loading, signOut, refetchProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
