import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Star } from 'lucide-react';

// Criamos um evento global simples para disparar o toast
export const triggerAchievementToast = (data) => {
  const event = new CustomEvent('achievement-toast', { detail: data });
  window.dispatchEvent(event);
};

export default function AchievementToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleEvent = (e) => {
      setToast(e.detail);
      // Auto close após 5 segundos
      setTimeout(() => setToast(null), 5000);
    };

    window.addEventListener('achievement-toast', handleEvent);
    return () => window.removeEventListener('achievement-toast', handleEvent);
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] min-w-[320px]"
        >
          <div className="bg-[#17112E]/90 backdrop-blur-xl border border-yellow-500/30 rounded-3xl p-1 shadow-2xl overflow-hidden">
             {/* Efeito de brilho interno */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/10 animate-pulse" />
            
            <div className="relative flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 shadow-lg shadow-yellow-500/20">
                {toast.type === 'achievement' ? (
                  <Trophy size={24} className="text-[#17112E] group-hover:rotate-12 transition-transform" />
                ) : (
                  <Zap size={24} className="text-[#17112E] group-hover:scale-110 transition-transform" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  {toast.title || 'Parabéns!'}
                </h4>
                <p className="text-xs text-white/60 font-medium">
                  {toast.message}
                </p>
              </div>

              {toast.xp && (
                <div className="flex flex-col items-center justify-center px-4 border-l border-white/10">
                  <span className="text-lg font-black text-yellow-500">+{toast.xp}</span>
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter">XP Ganhos</span>
                </div>
              )}

              <button 
                onClick={() => setToast(null)}
                className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white"
              >
                <Star size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
