import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Pause, Timer, X, Maximize2, Minimize2 } from 'lucide-react';
import { useFocus } from '../../hooks/useFocus';

export default function PomodoroTimer() {
  const { activeSession, startFocus, endFocus } = useFocus();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    let interval = null;
    if (activeSession && !isActive) {
        setIsActive(true);
        // Calcula tempo restante baseado no start_time (assumindo 25min padrão)
        const elapsed = Math.floor((new Date() - new Date(activeSession.start_time)) / 1000);
        setTimeLeft(Math.max(0, 25 * 60 - elapsed));
    } else if (!activeSession && isActive) {
        setIsActive(false);
        setTimeLeft(25 * 60);
    }

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, activeSession]);

  const handleStart = () => {
    startFocus.mutate({ task_id: null });
  };

  const handleComplete = () => {
    endFocus.mutate({ status: 'completed' });
    setIsActive(false);
    new Audio('/complete.mp3').play().catch(() => {}); // Fallback silencioso
  };

  const handleStop = () => {
    endFocus.mutate({ status: 'interrupted' });
    setIsActive(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive && !activeSession) {
      return (
          <button 
            onClick={handleStart}
            className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-slate-900 text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 group hover:bg-brand-purple"
          >
              <Timer size={24} className="group-hover:rotate-12 transition-transform" />
          </button>
      );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            width: isMinimized ? '120px' : '280px',
            height: isMinimized ? '48px' : 'auto'
        }}
        className="fixed bottom-8 right-8 bg-slate-900 text-white rounded-3xl shadow-2xl z-50 overflow-hidden border border-white/10"
      >
        {!isMinimized ? (
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Modo Foco</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                            <Minimize2 size={14} />
                        </button>
                        <button onClick={handleStop} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-red-400">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="text-center py-4">
                    <h2 className="text-5xl font-black font-display tracking-tighter tabular-nums">
                        {formatTime(timeLeft)}
                    </h2>
                    <p className="text-[10px] text-white/30 font-bold uppercase mt-2 tracking-widest">
                        {activeSession?.tasks?.title || 'Sessão Geral'}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={handleStop}
                        className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                        <Square size={14} fill="currentColor" /> Parar
                    </button>
                    <button 
                        onClick={handleComplete}
                        className="flex-1 py-3 rounded-2xl bg-brand-purple font-bold text-xs hover:bg-brand-purple/80 transition-colors flex items-center justify-center gap-2"
                    >
                        <Play size={14} fill="currentColor" /> Concluir
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-between px-4 h-full gap-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
                <Timer size={16} className="text-brand-purple" />
                <span className="text-sm font-black font-display flex-1">{formatTime(timeLeft)}</span>
                <Maximize2 size={14} className="text-white/30" />
            </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
