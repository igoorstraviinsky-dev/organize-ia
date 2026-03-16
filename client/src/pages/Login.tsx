import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react'
import AuthPanelLayout from '../components/layout/AuthPanelLayout'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <AuthPanelLayout
      eyebrow="Painel de acesso"
      title="Entre e retome seu fluxo."
      description="A entrada agora usa o mesmo clima visual do aplicativo, com contraste limpo e sem a camada de fundo que estava quebrando o padrao."
      highlights={[
        { label: 'Visual', value: 'Fundo limpo' },
        { label: 'Leitura', value: 'Campos em destaque' },
        { label: 'Acesso', value: 'Retorno rapido' },
      ]}
      footer={
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Ainda nao tem conta?{' '}
          <Link
            to="/register"
            className="font-black text-cyan-300 transition-colors hover:text-white"
          >
            Criar agora
          </Link>
        </p>
      }
    >
      <div className="flex h-full flex-col">
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="rounded-[22px] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm font-semibold text-rose-200 backdrop-blur-md">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Email
            </label>
            <div className="group relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="dark-neo-recessed w-full px-14 py-5 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/15"
                placeholder="voce@empresa.com"
              />
              <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300">
                <Mail size={18} strokeWidth={1.8} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Senha
            </label>
            <div className="group relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark-neo-recessed w-full px-14 py-5 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/15"
                placeholder="Digite sua senha"
              />
              <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300">
                <Lock size={18} strokeWidth={1.8} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="royal-purple-gradient group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[24px] px-6 py-5 text-[11px] font-black uppercase tracking-[0.34em] text-white shadow-[0_24px_60px_rgba(34,211,238,0.18)] transition-all hover:scale-[1.01] hover:shadow-[0_28px_70px_rgba(139,92,246,0.28)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative z-10 flex items-center gap-3">
              {loading ? 'Entrando...' : 'Entrar na plataforma'}
              {!loading && <ArrowRight size={16} strokeWidth={2.6} />}
            </span>
          </button>
        </form>

        <div className="mt-6 rounded-[22px] border border-emerald-400/10 bg-emerald-400/[0.06] px-4 py-4 text-sm text-slate-300">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
            <ShieldCheck size={14} strokeWidth={2.5} />
            acesso protegido
          </div>
          <p className="mt-3 leading-6 text-slate-400">
            O novo layout prioriza contraste, leitura e orientacao rapida para voce entrar sem ruido visual.
          </p>
        </div>
      </div>
    </AuthPanelLayout>
  )
}
