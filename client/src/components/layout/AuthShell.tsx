import React from 'react'
import { ArrowUpRight, CheckSquare, ShieldCheck, Sparkles, Zap } from 'lucide-react'

interface AuthShellProps {
  heroEyebrow: string
  heroTitle: string
  heroDescription: string
  panelEyebrow: string
  panelTitle: string
  panelDescription: string
  children: React.ReactNode
}

const metrics = [
  { label: 'Ambiente', value: 'Visual coeso' },
  { label: 'Fluxo', value: 'Mais foco' },
  { label: 'Acesso', value: 'Entrada clara' },
]

const features = [
  {
    icon: Sparkles,
    title: 'Interface refinada',
    description: 'Camadas, contraste e brilho sutil para deixar a entrada no mesmo nivel do painel.',
  },
  {
    icon: ShieldCheck,
    title: 'Presenca segura',
    description: 'Tipografia forte, inputs mais legiveis e uma hierarquia que guia o proximo passo.',
  },
  {
    icon: Zap,
    title: 'Ritmo mais rapido',
    description: 'A tela reduz ruido visual e destaca o que importa para voce voltar ao trabalho.',
  },
]

export default function AuthShell({
  heroEyebrow,
  heroTitle,
  heroDescription,
  panelEyebrow,
  panelTitle,
  panelDescription,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-hero">
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="auth-pill">
                <Sparkles size={14} />
                designer elevado
              </span>
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 lg:inline-flex">
                sistema visual
                <ArrowUpRight size={13} className="text-cyan-300" />
              </span>
            </div>

            <div className="mt-12 flex items-start gap-4 sm:gap-5">
              <div className="royal-purple-gradient flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[24px] shadow-[0_18px_45px_rgba(59,130,246,0.2)] sm:h-20 sm:w-20 sm:rounded-[28px]">
                <CheckSquare size={34} className="text-white sm:hidden" strokeWidth={1.8} />
                <CheckSquare size={40} className="hidden text-white sm:block" strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.45em] text-white/45 sm:text-[11px]">
                  {heroEyebrow}
                </p>
                <h1 className="mt-4 max-w-xl text-4xl leading-none text-white sm:text-5xl xl:text-[3.7rem]">
                  {heroTitle}
                </h1>
              </div>
            </div>

            <p className="mt-8 max-w-2xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
              {heroDescription}
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="auth-metric">
                  <span className="auth-metric__label">{metric.label}</span>
                  <span className="auth-metric__value">{metric.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto grid gap-4 pt-10 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                    <feature.icon size={18} strokeWidth={2.3} />
                  </div>
                  <h3 className="mt-5 text-lg text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="relative z-10 flex h-full flex-col">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.38em] text-slate-500 sm:text-[11px]">
                {panelEyebrow}
              </p>
              <h2 className="mt-4 text-3xl leading-tight text-white sm:text-[2.25rem]">{panelTitle}</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-400 sm:text-[15px]">
                {panelDescription}
              </p>
            </div>

            <div className="mt-10 flex-1">{children}</div>
          </div>
        </section>
      </div>
    </div>
  )
}
