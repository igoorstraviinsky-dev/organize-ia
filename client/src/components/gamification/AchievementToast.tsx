import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Zap, Star } from 'lucide-react'

export interface ToastData {
  title?: string
  message: string
  type: 'achievement' | 'penalty' | 'info'
  xp?: number
  duration?: number
}

// Evento global para disparar o toast rigorosamente tipado
export const triggerAchievementToast = (data: ToastData) => {
  const event = new CustomEvent('achievement-toast', { detail: data })
  window.dispatchEvent(event)
}

export default function AchievementToast() {
  const [toast, setToast] = useState<ToastData | null>(null)

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastData>
      setToast(customEvent.detail)
      
      const duration = customEvent.detail.duration || 5000
      setTimeout(() => setToast(null), duration)
    }

    window.addEventListener('achievement-toast', handleEvent)
    return () => window.removeEventListener('achievement-toast', handleEvent)
  }, [])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          // Alinhamento central na borda inferior do viewport, sobrepõe tudo
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-md w-full"
        >
          <div className={`relative bg-[#050505]/95 backdrop-blur-2xl border ${toast.type === 'penalty' ? 'border-red-500/30 shadow-red-500/20' : 'border-yellow-500/30 shadow-yellow-500/20'} rounded-[32px] p-1 shadow-2xl overflow-hidden`}>
             {/* Efeito de brilho interno pululante */}
            <div className={`absolute inset-0 bg-gradient-to-r ${toast.type === 'penalty' ? 'from-red-500/10' : 'from-yellow-500/10'} via-transparent ${toast.type === 'penalty' ? 'to-red-500/10' : 'to-yellow-500/10'} animate-pulse`} />
            
            <div className="relative flex items-center gap-5 p-5">
              
              <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${toast.type === 'penalty' ? 'bg-red-500' : 'bg-yellow-500'} shadow-xl ${toast.type === 'penalty' ? 'shadow-red-500/30' : 'shadow-yellow-500/30'} border border-[#050505]/20`}>
                {toast.type === 'achievement' ? (
                  <Trophy size={26} strokeWidth={2.5} className="text-[#050505] drop-shadow-sm group-hover:rotate-12 transition-transform" />
                ) : toast.type === 'penalty' ? (
                  <Zap size={26} strokeWidth={2.5} className="text-white drop-shadow-sm group-hover:scale-110 transition-transform" />
                ) : (
                  <Star size={26} strokeWidth={2.5} className="text-[#050505] drop-shadow-sm group-hover:scale-110 transition-transform" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-black text-white uppercase tracking-widest truncate">
                  {toast.title || (toast.type === 'penalty' ? 'Atenção' : 'Parabéns!')}
                </h4>
                <p className="text-[12px] text-slate-400 font-semibold leading-snug mt-1">
                  {toast.message}
                </p>
              </div>

              {toast.xp !== undefined && (
                <div className="flex flex-col items-center justify-center pl-5 pr-2 border-l border-white/10 shrink-0">
                  <span className={`text-2xl font-black font-display tracking-tighter drop-shadow-lg ${toast.type === 'penalty' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {toast.type === 'penalty' ? '-' : '+'}{toast.xp}
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                    XP {toast.type === 'penalty' ? 'Perdidos' : 'Ganhos'}
                  </span>
                </div>
              )}

              <button 
                onClick={() => setToast(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-xl transition-all text-slate-500 hover:text-white"
                title="Fechar"
              >
                <div className="rotate-45 relative right-px bottom-px">➕</div> {/* Custom close icon approach */}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
