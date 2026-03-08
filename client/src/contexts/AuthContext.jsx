import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1. Gerenciar Sessão e Listener
  useEffect(() => {
    let mounted = true

    // Check inicial da sessão
    const checkSession = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (mounted) {
          setSession(s)
          // Se não houver sessão, o carregamento inicial termina aqui
          if (!s) setLoading(false)
        }
      } catch (err) {
        console.error('Initial session check error:', err)
        if (mounted) setLoading(false)
      }
    }

    checkSession()

    // Listener de mudanças na auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (mounted) {
        setSession(s)
        if (event === 'SIGNED_OUT') {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 2. Carregar Perfil quando o ID do usuário mudar
  useEffect(() => {
    if (!session?.user?.id) return

    let mounted = true
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (mounted) {
          if (error) {
            console.warn('Could not fetch profile:', error.message)
          } else {
            setProfile(data)
          }
          // Independente de sucesso ou erro, terminamos o loading se temos uma sessão
          setLoading(false)
        }
      } catch (err) {
        console.error('Fetch profile catch block:', err)
        if (mounted) setLoading(false)
      }
    }

    fetchProfile()
    return () => { mounted = false }
  }, [session?.user?.id])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setLoading(false)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user ? { ...session.user, profile } : null,
    profile,
    loading,
    signOut
  }), [session, profile, loading, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
