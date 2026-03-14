import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckSquare, UserPlus, Mail, Lock, User } from 'lucide-react'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e) => {
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="premium-card bg-white rounded-[32px] border border-slate-100 p-12 shadow-2xl shadow-slate-200/50">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-500/10">
              <CheckSquare size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 font-display uppercase italic tracking-tight">Conta criada!</h2>
            <p className="mt-4 text-slate-400 text-sm font-semibold leading-relaxed">
              Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada.
            </p>
            <Link
              to="/login"
              className="mt-10 inline-flex items-center justify-center gap-3 rounded-2xl bg-[#17112E] px-10 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-[#17112E]/20 hover:bg-[#8E44AD] hover:scale-[1.05] transition-all"
            >
              Ir para Login
              <CheckSquare size={16} strokeWidth={3} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-purple/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-navy/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        <div className="premium-card bg-white rounded-[32px] border border-slate-100 p-12 shadow-2xl shadow-slate-200/50">
          <div className="mb-12 text-center">
            <div 
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl shadow-brand-purple/20"
              style={{ background: 'linear-gradient(to bottom right, #17112E, #8E44AD)' }}
            >
              <CheckSquare size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black tracking-tight font-display uppercase italic" style={{ color: '#17112E' }}>Organizador</h1>
            <p className="mt-2 text-slate-400 text-xs font-black uppercase tracking-widest">Crie sua conta agora</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-2 duration-300 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome completo</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors">
                  <User size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-12 py-4 text-sm font-bold text-slate-800 outline-none focus:border-brand-purple focus:bg-white focus:ring-4 focus:ring-brand-purple/5 transition-all placeholder:text-slate-300"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors">
                  <Mail size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-12 py-4 text-sm font-bold text-slate-800 outline-none focus:border-brand-purple focus:bg-white focus:ring-4 focus:ring-brand-purple/5 transition-all placeholder:text-slate-300"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-purple transition-colors">
                  <Lock size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-12 py-4 text-sm font-bold text-slate-800 outline-none focus:border-brand-purple focus:bg-white focus:ring-4 focus:ring-brand-purple/5 transition-all placeholder:text-slate-300"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#17112E] p-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-brand-navy/20 transition-all hover:bg-[#8E44AD] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <UserPlus size={18} className="relative z-10" strokeWidth={3} />
              <span className="relative z-10">{loading ? 'Criando...' : 'Criar conta'}</span>
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Já tem conta?{' '}
              <Link to="/login" className="font-black text-brand-purple hover:text-brand-navy transition-colors">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
