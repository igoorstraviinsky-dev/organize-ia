import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Square, Timer, X, Maximize2, Minimize2 } from 'lucide-react'
import { useFocus } from '../../hooks/useFocus'

export default function PomodoroTimer() {
  const { activeSession, startFocus, endFocus } = useFocus()
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60)
  const [isActive, setIsActive] = useState<boolean>(false)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)

  useEffect(() => {
    let interval: number | null = null

    if (activeSession && !isActive) {
      setIsActive(true)
      const startMs = new Date(activeSession.start_time).getTime()
      const elapsed = Math.floor((new Date().getTime() - startMs) / 1000)
      setTimeLeft(Math.max(0, 25 * 60 - elapsed))
    } else if (!activeSession && isActive) {
      setIsActive(false)
      setTimeLeft(25 * 60)
    }

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((time) => time - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      handleComplete()
    }
    return () => {
      if (interval !== null) clearInterval(interval)
    }
  }, [isActive, timeLeft, activeSession])

  const handleStart = () => {
    startFocus.mutate({ task_id: null })
  }

  const handleComplete = () => {
    endFocus.mutate({ status: 'completed' })
    setIsActive(false)
    new Audio('/complete.mp3').play().catch(() => {})
  }

  const handleStop = () => {
    endFocus.mutate({ status: 'interrupted' })
    setIsActive(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isActive && !activeSession) {
    return (
      <button 
        onClick={handleStart}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#050505] text-slate-300 shadow-2xl flex items-center justify-center hover:scale-110 hover:text-white transition-all z-50 group hover:shadow-purple-500/20 hover:bg-purple-600 border border-white/10"
        title="Iniciar Pomodoro (25m)"
      >
        <Timer size={24} className="group-hover:rotate-12 transition-transform drop-shadow" strokeWidth={2.5} />
      </button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          width: isMinimized ? '130px' : '280px',
          height: isMinimized ? '52px' : 'auto'
        }}
        className="fixed bottom-8 right-8 bg-[#0a0a0a]/95 backdrop-blur-xl text-white rounded-[24px] shadow-2xl shadow-black z-50 overflow-hidden border border-white/10"
      >
        {!isMinimized ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 border border-white/10 bg-[#050505] px-2.5 py-1 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Focus</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(true)} className="flex h-7 w-7 items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors">
                  <Minimize2 size={14} strokeWidth={3} />
                </button>
                <button onClick={handleStop} className="flex h-7 w-7 items-center justify-center hover:bg-red-500/20 rounded-lg transition-colors text-red-500">
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="text-center py-2">
              <h2 className="text-6xl font-black font-display tracking-tighter tabular-nums drop-shadow-lg text-white">
                {formatTime(timeLeft)}
              </h2>
              <p className="text-[10px] text-purple-400 font-black uppercase mt-3 tracking-[0.2em] px-2 truncate">
                {activeSession?.tasks?.title || 'Sessão Geral'}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleStop}
                className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/50 hover:text-red-500 font-bold text-[11px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 text-slate-400"
              >
                <Square size={14} fill="currentColor" /> PARAR
              </button>
              <button 
                onClick={handleComplete}
                className="flex-1 py-3.5 rounded-2xl bg-purple-600 shadow-xl shadow-purple-600/20 font-black text-[11px] tracking-widest uppercase hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
              >
                <Play size={14} fill="currentColor" /> FEITO
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 h-full gap-3 cursor-pointer group hover:bg-white/5 transition-colors" onClick={() => setIsMinimized(false)}>
            <div className="relative">
              <Timer size={16} strokeWidth={2.5} className="text-purple-500" />
              <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse border border-[#050505]" />
            </div>
            <span className="text-[15px] font-black tabular-nums font-display flex-1 tracking-tight">{formatTime(timeLeft)}</span>
            <Maximize2 size={14} strokeWidth={3} className="text-slate-500 group-hover:text-white transition-colors" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
