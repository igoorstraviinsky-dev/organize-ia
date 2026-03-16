import React from 'react'
import { Clock3, Loader2, LogOut, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuthPanelLayout from '../components/layout/AuthPanelLayout'

export default function PendingApproval() {
  const { profile, signOut, refetchProfile, loading } = useAuth()
  const approvalStatus = profile?.approval_status ?? 'pending'
  const isRejected = approvalStatus === 'rejected'

  return (
    <AuthPanelLayout
      eyebrow={isRejected ? 'Acesso recusado' : 'Aguardando aprovacao'}
      title={
        isRejected
          ? 'Seu cadastro nao foi aprovado.'
          : 'Seu cadastro foi recebido e esta em analise.'
      }
      description={
        isRejected
          ? 'Um administrador recusou o acesso desta conta. Se precisar revisar o cadastro, entre em contato com a equipe responsavel.'
          : 'Sua conta ja foi criada, mas o acesso ao sistema sera liberado somente depois da aprovacao de um administrador.'
      }
      highlights={[
        { label: 'Conta', value: profile?.email || 'Cadastro em processamento' },
        { label: 'Status', value: isRejected ? 'Recusado' : 'Pendente' },
        { label: 'Proximo passo', value: isRejected ? 'Contatar o admin' : 'Aguardar liberacao' },
      ]}
    >
      <div className="space-y-6">
        <div
          className={`rounded-[28px] border px-6 py-6 ${
            isRejected
              ? 'border-rose-400/15 bg-rose-400/[0.06]'
              : 'border-amber-400/15 bg-amber-400/[0.06]'
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${
              isRejected ? 'bg-rose-300/15 text-rose-300' : 'bg-amber-300/15 text-amber-300'
            }`}
          >
            {isRejected ? <XCircle size={26} strokeWidth={2} /> : <Clock3 size={26} strokeWidth={2} />}
          </div>

          <h2 className="mt-5 text-2xl text-white">
            {isRejected ? 'Acesso bloqueado no momento.' : 'Falta apenas a aprovacao administrativa.'}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {isRejected
              ? 'Se o cadastro foi recusado por engano, o administrador pode revisar seu status e liberar uma nova tentativa.'
              : 'Assim que o admin aprovar sua conta, este mesmo login passa a funcionar normalmente no painel.'}
          </p>
        </div>

        <div className="rounded-[22px] border border-cyan-400/10 bg-cyan-400/[0.05] px-4 py-4 text-sm text-slate-300">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <ShieldCheck size={14} strokeWidth={2.5} />
            controle administrativo
          </div>
          <p className="mt-3 leading-6 text-slate-400">
            Esse bloqueio evita que contas novas entrem no workspace antes da validacao manual.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetchProfile()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-[24px] border border-cyan-400/10 bg-cyan-400/[0.05] px-6 py-5 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200 transition-all hover:bg-cyan-400/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} strokeWidth={2.2} className="animate-spin" /> : <RefreshCw size={16} strokeWidth={2.2} />}
          Verificar liberacao
        </button>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] px-6 py-5 text-[11px] font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-white/[0.08]"
        >
          <LogOut size={16} strokeWidth={2.2} />
          Sair
        </button>
      </div>
    </AuthPanelLayout>
  )
}
