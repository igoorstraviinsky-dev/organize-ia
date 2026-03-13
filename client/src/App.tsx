import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { session, loading, signOut } = useAuthContext()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20"></div>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
          </div>
          <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Sincronizando...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!session ? <Login /> : <Navigate to="/app/today" replace />}
      />
      <Route
        path="/register"
        element={!session ? <Register /> : <Navigate to="/app/today" replace />}
      />
      <Route
        path="/app/:view?/:id?"
        element={session ? <Dashboard onSignOut={signOut} /> : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to="/app/today" replace />} />
    </Routes>
  )
}
