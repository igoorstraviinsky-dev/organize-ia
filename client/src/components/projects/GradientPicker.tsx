import React, { useState } from 'react'
import { Check, Edit3, Paintbrush } from 'lucide-react'

const GRADIENTS = [
  { label: 'Organizador Purple', value: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { label: 'Azul Cyber',        value: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
  { label: 'Verde Fogo',        value: 'linear-gradient(135deg, #10b981, #059669)' },
  { label: 'Rosa Neon',         value: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
  { label: 'Laranja Solar',     value: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { label: 'Abismo',            value: 'linear-gradient(135deg, #050505, #1e1e1e)' },
  { label: 'Ciano Sintético',   value: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' },
  { label: 'Lima Tóxica',       value: 'linear-gradient(135deg, #84cc16, #22c55e)' },
  { label: 'Ouro Corrompido',   value: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  { label: 'Lavanda Profunda',  value: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  { label: 'Crimson',           value: 'linear-gradient(135deg, #be123c, #fb7185)' },
  { label: 'Metal Escuro',      value: 'linear-gradient(135deg, #475569, #1e293b)' },
]

interface GradientPickerProps {
  value: string | undefined | null
  onChange: (gradient: string) => void
}

export default function GradientPicker({ value, onChange }: GradientPickerProps) {
  const [custom, setCustom] = useState('')

  const handleCustomApply = () => {
    if (custom.trim()) {
      onChange(custom.trim())
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5 bg-[#0a0a0a] rounded-[24px] border border-white/5 shadow-2xl">
      <div className="flex items-center gap-3 mb-2">
        <Paintbrush size={18} strokeWidth={2.5} className="text-purple-500" />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Personalidade do Projeto</h3>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {GRADIENTS.map((g) => {
          const isActive = value === g.value
          return (
            <button
              key={g.value}
              type="button"
              title={g.label}
              onClick={() => onChange(g.value)}
              className={`relative h-12 w-full rounded-2xl transition-all duration-300 active:scale-95 border-2 ${
                isActive ? 'border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)] z-10' : 'border-black hover:border-white/50 hover:scale-[1.02]'
              }`}
              style={{ background: g.value }}
            >
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[14px]">
                  <Check size={18} strokeWidth={4} className="text-white drop-shadow-lg" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {value && (
        <div className="flex flex-col gap-2 mt-2">
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 pl-1">
             Identidade Atual
           </span>
           <div
            className="h-16 w-full rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-inner overflow-hidden transition-all duration-500"
            style={{ background: value }}
          >
            <span className="text-[13px] font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mix-blend-overlay opacity-90">
              Preview
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 pl-1 flex items-center gap-2">
           <Edit3 size={12} strokeWidth={3} /> Gradiente Customizado CSS
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ex: linear-gradient(90deg, #000, #333)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomApply() } }}
            className="flex-1 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-xs font-semibold text-white outline-none transition-all placeholder:text-slate-600 focus:border-purple-500 focus:bg-[#050505]"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!custom.trim()}
            className="rounded-xl bg-purple-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-600/20 transition-all hover:bg-purple-500 active:scale-95 disabled:opacity-40"
          >
            USAR
          </button>
        </div>
      </div>
    </div>
  )
}
