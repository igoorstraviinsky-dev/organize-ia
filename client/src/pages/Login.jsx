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
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 font-sans relative overflow-hidden">
      {/* Texture overlay for the whole background */}
      <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      
      {/* Ambient Glows */}
      <div className="absolute top-[-20%] right-[-20%] w-[70%] h-[70%] bg-purple-600/10 blur-[180px] rounded-full" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%] bg-[#7e57c2]/5 blur-[180px] rounded-full" />

      <div className="w-full max-w-md relative z-10 px-4">
        {/* Browser Chrome Simulation for Context (Optional, but matching UI Presentation) */}
        <div className="jetted-glass p-8 md:p-12 relative overflow-hidden border-white/5 bg-[#0a0a0a]/80 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          {/* Internal gradient shine */}
          <div className="absolute -top-[30%] -right-[30%] w-full h-full bg-purple-500/5 blur-[100px] pointer-events-none" />
          
          <div className="mb-14 text-center relative z-10">
            <div 
              className="mx-auto mb-10 flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-[24px] md:rounded-[28px] shadow-[0_20px_50px_rgba(106,27,154,0.4)] transition-all hover:scale-110 duration-700 group"
              style={{ background: 'linear-gradient(135deg, #6a1b9a 0%, #7e57c2 100%)' }}
            >
              <CheckSquare size={40} className="text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:rotate-12 transition-transform md:hidden" strokeWidth={1.5} />
              <CheckSquare size={48} className="hidden md:block text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-purple-600 uppercase font-display" style={{ textShadow: '0 0 30px rgba(126, 87, 194, 0.3)' }}>
              Organizador
            </h1>
            <p className="mt-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
              Painel de Acesso
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-10 relative z-10">
            {error && (
              <div className="rounded-2xl bg-red-950/20 backdrop-blur-md border border-red-900/40 p-5 text-[10px] font-black text-red-400 animate-in fade-in zoom-in duration-300 text-center uppercase tracking-widest ring-1 ring-red-500/20">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-3">Email ou Usuário</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full dark-neo-recessed px-14 py-6 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500/30 transition-all border border-transparent focus:border-purple-600/40 placeholder:text-slate-700"
                  placeholder="igoorstraviinsky@gmail.com"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-500 transition-colors">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-3">Senha</label>
              <div className="relative group">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full dark-neo-recessed px-14 py-6 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-purple-500/30 transition-all border border-transparent focus:border-purple-600/40 placeholder:text-slate-700"
                  placeholder="••••••••"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-500 transition-colors">
                  <Lock size={20} strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="royal-purple-gradient relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-[24px] p-6 text-[12px] font-black uppercase tracking-[0.3em] text-white shadow-[0_25px_60px_-15px_rgba(106,27,154,0.6)] transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 group mt-4"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'Sincronizando...' : '→ Entrar'}
              </span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
            </button>
          </form>

          <div className="mt-14 text-center relative z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Não tem conta?{' '}
              <Link to="/register" className="font-black text-purple-500 hover:text-white transition-all decoration-1 underline-offset-8 hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
