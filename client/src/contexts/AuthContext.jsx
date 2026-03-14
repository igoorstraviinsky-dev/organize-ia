import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
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
      return data
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: false, // não polling — o perfil só muda quando o usuário edita
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
    user: session?.user ? { ...session.user, profile } : null,
    profile,
    loading,
    signOut,
    refetchProfile
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
