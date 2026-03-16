import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './contexts/AuthContext'
import AuthPanelLayout from './components/layout/AuthPanelLayout'
import BrandLogo from './components/branding/BrandLogo'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PendingApproval from './pages/PendingApproval'

export default function App() {
  const { session, loading, signOut, profile } = useAuthContext()
  const approvalStatus = session
    ? profile?.role === 'admin'
      ? 'approved'
      : profile?.approval_status ?? 'pending'
    : null
  const requiresApprovalGate = approvalStatus === 'pending' || approvalStatus === 'rejected'

  if (loading) {
    return (
      <AuthPanelLayout
        eyebrow="Inicializando"
        title="Preparando seu acesso."
        description="A interface esta sincronizando sessao e perfil para abrir o fluxo correto sem misturar o visual antigo durante o carregamento."
        highlights={[
          { label: 'Sessao', value: 'Validando' },
          { label: 'Perfil', value: 'Carregando' },
          { label: 'Acesso', value: 'Direcionando' },
        ]}
      >
        <div className="flex flex-col items-center gap-6 py-4 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.03] p-3">
            <div className="absolute inset-0 animate-ping rounded-[26px] bg-cyan-400/10" />
            <BrandLogo variant="mark" className="relative h-full w-full object-contain" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.36em] text-slate-500">taskwise ai</p>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
              Sincronizando experiencia...
            </p>
          </div>
        </div>
      </AuthPanelLayout>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!session ? <Login /> : <Navigate to={requiresApprovalGate ? '/pending-approval' : '/app/today'} replace />}
      />
      <Route
        path="/register"
        element={!session ? <Register /> : <Navigate to={requiresApprovalGate ? '/pending-approval' : '/app/today'} replace />}
      />
      <Route
        path="/pending-approval"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : requiresApprovalGate ? (
            <PendingApproval />
          ) : (
            <Navigate to="/app/today" replace />
          )
        }
      />
      <Route
        path="/app"
        element={
          session ? (
            <Navigate to={requiresApprovalGate ? '/pending-approval' : '/app/today'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/app/:view?/:id?"
        element={
          session ? (
            requiresApprovalGate ? <Navigate to="/pending-approval" replace /> : <Dashboard onSignOut={signOut} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={<Navigate to={session ? (requiresApprovalGate ? '/pending-approval' : '/app/today') : '/login'} replace />}
      />
    </Routes>
  )
}
