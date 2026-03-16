import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Lock, Mail, User, UserPlus } from 'lucide-react'
import AuthShell from '../components/layout/AuthShell'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <AuthShell
        heroEyebrow="Conta pronta"
        heroTitle="Seu onboarding agora tem a mesma assinatura visual."
        heroDescription="O cadastro terminou com um estado de confirmacao mais elegante, coerente com o resto da aplicacao e com destaque claro para o proximo passo."
        panelEyebrow="Cadastro concluido"
        panelTitle="Conta criada com sucesso."
        panelDescription="Enviamos um link de confirmacao para o seu email. Depois da validacao, o acesso estara liberado."
      >
        <div className="flex h-full flex-col justify-between">
          <div className="rounded-[28px] border border-emerald-400/15 bg-emerald-400/[0.07] p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-300/15 text-emerald-300 shadow-[0_18px_45px_rgba(16,185,129,0.12)]">
              <CheckCircle2 size={30} strokeWidth={2.1} />
            </div>
            <h3 className="mt-6 text-2xl text-white">Revise sua caixa de entrada.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Assim que o email for confirmado, voce ja pode entrar e continuar a configuracao do seu espaco de trabalho.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-slate-400">
              Dica: se nao encontrar a mensagem principal, vale revisar spam ou promocoes.
            </div>

            <Link
              to="/login"
              className="royal-purple-gradient flex w-full items-center justify-center gap-3 rounded-[24px] px-6 py-5 text-[11px] font-black uppercase tracking-[0.34em] text-white shadow-[0_24px_60px_rgba(34,211,238,0.18)] transition-all hover:scale-[1.01] hover:shadow-[0_28px_70px_rgba(139,92,246,0.28)]"
            >
              Ir para login
              <ArrowRight size={16} strokeWidth={2.6} />
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heroEyebrow="Cadastro"
      heroTitle="Uma entrada mais forte para um produto mais forte."
      heroDescription="Cadastro e login agora compartilham o mesmo sistema visual: fundo ambientado, superficies de vidro escuro e contraste melhor para reforcar a marca."
      panelEyebrow="Criar conta"
      panelTitle="Comece com uma experiencia mais premium."
      panelDescription="Preencha seus dados e prepare o espaco onde tarefas, projetos e automacoes vao ganhar ritmo."
    >
      <div className="flex h-full flex-col">
        <form onSubmit={handleRegister} className="space-y-6">
          {error && (
            <div className="rounded-[22px] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm font-semibold text-rose-200 backdrop-blur-md">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Nome completo
            </label>
            <div className="group relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="dark-neo-recessed w-full px-14 py-5 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/15"
                placeholder="Seu nome"
              />
              <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300">
                <User size={18} strokeWidth={1.8} />
              </div>
            </div>
          </div>

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark-neo-recessed w-full px-14 py-5 text-sm font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/15"
                placeholder="Minimo de 6 caracteres"
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
              {loading ? 'Criando conta...' : 'Criar conta'}
              {!loading && <UserPlus size={16} strokeWidth={2.6} />}
            </span>
          </button>
        </form>

        <div className="mt-6 rounded-[22px] border border-cyan-400/10 bg-cyan-400/[0.05] px-4 py-4 text-sm leading-7 text-slate-400">
          Seu primeiro contato com o produto ja entra no mesmo padrao visual do dashboard, sem quebra de identidade.
        </div>

        <div className="mt-auto pt-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ja tem conta?{' '}
            <Link
              to="/login"
              className="font-black text-cyan-300 transition-colors hover:text-white"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
