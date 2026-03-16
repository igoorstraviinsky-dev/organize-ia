import React from 'react'
import { Sparkles } from 'lucide-react'
import BrandLogo from '../branding/BrandLogo'

interface Highlight {
  label: string
  value: string
}

interface AuthPanelLayoutProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  highlights?: Highlight[]
}

const defaultHighlights: Highlight[] = [
  { label: 'Visual', value: 'Mesmo padrao do app' },
  { label: 'Fluxo', value: 'Leitura direta' },
  { label: 'Acesso', value: 'Entrada segura' },
]

export default function AuthPanelLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
  highlights = defaultHighlights,
}: AuthPanelLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-56 w-56 rounded-full bg-fuchsia-500/12 blur-[120px]" />
        <div className="absolute right-[8%] top-[14%] h-64 w-64 rounded-full bg-cyan-400/10 blur-[130px]" />
        <div className="absolute bottom-[6%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/8 blur-[150px]" />
      </div>

      <div className="jetted-glass relative w-full max-w-[560px] overflow-hidden px-6 py-7 shadow-[0_32px_90px_rgba(0,0,0,0.42)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <BrandLogo variant="full" className="h-auto w-[210px] max-w-full" />
              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-slate-200">
                {eyebrow}
              </span>
            </div>
          </div>

          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 sm:inline-flex">
            <Sparkles size={13} className="text-cyan-300" />
            fluxo claro
          </span>
        </div>

        <div className="mt-8">
          <h1 className="text-3xl leading-tight text-white sm:text-[2.5rem]">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-[15px]">{description}</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {highlights.map((highlight) => (
            <div
              key={highlight.label}
              className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                {highlight.label}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-200">{highlight.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">{children}</div>

        {footer && <div className="mt-8 border-t border-white/8 pt-6">{footer}</div>}
      </div>
    </div>
  )
}
