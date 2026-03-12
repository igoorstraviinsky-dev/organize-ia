import { motion } from 'framer-motion';
import { Zap, Trophy } from 'lucide-react';
import { useXP } from '../../hooks/useXP';

export default function XPBar() {
  const { data, isLoading } = useXP();

  // Só mostra skeleton se REALMENTE estiver carregando o primeiro fetch
  if (isLoading && !data) return (
    <div className="px-6 py-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded-[8px] w-full" />
    </div>
  );

  // Fallback se data for nulo por algum motivo
  const stats = data || { level: 1, progress: 0, streak_days: 0, user_achievements: [], xpInCurrentLevel: 0, nextLevelXp: 500 };

  return (
    <div className="px-6 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-500">
            <Zap size={14} fill="currentColor" />
          </div>
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
            Nível {stats.level}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
           <Trophy size={10} className="text-yellow-500" />
           <span className="text-[9px] font-black text-white/70 uppercase">
             {stats?.user_achievements?.length || 0} Conquistas
           </span>
        </div>
      </div>

      <div className="relative">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 shadow-inner">
          <motion.div
            layout
            initial={false}
            animate={{ width: `${stats.progress}%` }}
            transition={{ 
              type: "spring",
              stiffness: 50,
              damping: 15,
              duration: 1.5 
            }}
            className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500"
            style={{
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)',
              backgroundSize: '200% 100%'
            }}
          />
        </div>
        <div className="mt-2 flex justify-between px-0.5">
          <span className="text-[9px] font-bold text-white/40">{Math.round(stats.xpInCurrentLevel)} XP</span>
          <span className="text-[9px] font-bold text-white/40">{stats.nextLevelXp} XP</span>
        </div>
      </div>

      {stats.streak_days > 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20"
        >
          <span className="text-[10px] text-orange-400">🔥</span>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter">
            {stats.streak_days} Dias de Fogo!
          </span>
        </motion.div>
      )}
    </div>
  );
}
