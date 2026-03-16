import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { session, loading, signOut } = useAuthContext()

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_bottom,rgba(45,212,191,0.14),transparent_26%)]" />
        <div className="jetted-glass relative flex flex-col items-center gap-6 px-10 py-12 text-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20"></div>
            <div className="absolute inset-0 rounded-full border border-white/10"></div>
            <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-cyan-300/70 border-t-transparent shadow-[0_0_22px_rgba(34,211,238,0.28)]"></div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.36em] text-slate-500">organize ia</p>
            <p className="text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase">Sincronizando experiencia...</p>
          </div>
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
