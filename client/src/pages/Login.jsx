import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckSquare, LogIn, Mail, Lock } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfdfd] px-4 font-sans relative overflow-hidden">
      {/* Decorative Background Elements - Refined Gradients */}
      <div className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[60%] h-[60%] bg-blue-500/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="jetted-glass p-12 relative overflow-hidden border-white/40">
          {/* Subtle internal shine */}
          <div className="absolute -top-[50%] -right-[50%] w-full h-full bg-white/5 blur-[80px] rotate-45 pointer-events-none" />
          
          <div className="mb-12 text-center relative z-10">
            <div 
              className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] shadow-2xl transition-transform hover:scale-110 duration-500"
              style={{ background: 'linear-gradient(135deg, #17112E 0%, #8E44AD 100%)', boxShadow: '0 20px 40px -10px rgba(142, 68, 173, 0.4)' }}
            >
              <CheckSquare size={40} className="text-white drop-shadow-lg" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-[#17112E] uppercase">
              Organizador
            </h1>
            <p className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
              Painel de Acesso
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8 relative z-10">
            {error && (
              <div className="rounded-2xl bg-red-50/50 backdrop-blur-md border border-red-100 p-4 text-[10px] font-black text-red-500 animate-in fade-in zoom-in duration-300 text-center uppercase tracking-widest">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full dark-neo-recessed px-12 py-5 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500/50 transition-all border border-transparent focus:border-purple-500/30"
                  placeholder="seu@email.com"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Mail size={18} strokeWidth={2} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Senha</label>
              <div className="relative group">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full dark-neo-recessed px-12 py-5 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500/50 transition-all border border-transparent focus:border-purple-500/30"
                  placeholder="••••••••"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock size={18} strokeWidth={2} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="royal-purple-gradient relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl p-5 text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group"
            >
              <span className="relative z-10">{loading ? 'Sincronizando...' : 'Entrar'}</span>
              <LogIn size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </form>

          <div className="mt-12 text-center relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Não tem conta?{' '}
              <Link to="/register" className="font-black text-purple-600 hover:text-[#17112E] transition-all decoration-2 underline-offset-4 hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
