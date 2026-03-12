import { useState } from 'react';

const GRADIENTS = [
  { label: 'Roxo (Padrão)', value: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { label: 'Azul Oceano',   value: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
  { label: 'Verde Esmeralda', value: 'linear-gradient(135deg, #10b981, #059669)' },
  { label: 'Rosa Neon',     value: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
  { label: 'Laranja Fogo',  value: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { label: 'Meia-noite',    value: 'linear-gradient(135deg, #1e293b, #334155)' },
  { label: 'Ciano',         value: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' },
  { label: 'Lima',          value: 'linear-gradient(135deg, #84cc16, #22c55e)' },
  { label: 'Ouro',          value: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { label: 'Lavanda',       value: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' },
  { label: 'Coral',         value: 'linear-gradient(135deg, #fb7185, #f97316)' },
  { label: 'Ardósia',       value: 'linear-gradient(135deg, #475569, #64748b)' },
];

/**
 * GradientPicker — Seletor visual de tema para projetos.
 * Props:
 *   value: string (gradiente CSS atual)
 *   onChange: (gradient: string) => void
 */
export default function GradientPicker({ value, onChange }) {
  const [custom, setCustom] = useState('');

  return (
    <div className="gradient-picker">
      <div className="gradient-picker__grid">
        {GRADIENTS.map((g) => (
          <button
            key={g.value}
            type="button"
            title={g.label}
            onClick={() => onChange(g.value)}
            className={`gradient-picker__swatch ${value === g.value ? 'active' : ''}`}
            style={{ background: g.value }}
          />
        ))}
      </div>

      {/* Preview do selecionado */}
      {value && (
        <div
          className="gradient-picker__preview"
          style={{ background: value }}
        >
          <span className="gradient-picker__preview-label">Pré-visualização do Tema</span>
        </div>
      )}

      {/* Campo manual para CSS customizado */}
      <div className="gradient-picker__custom">
        <input
          type="text"
          placeholder="CSS customizado, ex: linear-gradient(135deg, #fff, #000)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="gradient-picker__input"
        />
        <button
          type="button"
          onClick={() => { if (custom.trim()) onChange(custom.trim()); }}
          className="gradient-picker__apply-btn"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
