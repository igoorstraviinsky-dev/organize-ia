import { useAuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const { user, loading, signOut, session, profile, refetchProfile } = useAuthContext()
  return { user, loading, signOut, session, profile, refetchProfile }
}
