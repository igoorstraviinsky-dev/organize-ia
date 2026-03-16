import React from 'react'
import {
  Calendar,
  CalendarRange,
  CheckSquare,
  Inbox,
  MessageCircle,
  Power,
  Settings,
  Tag,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useProjects } from '../../hooks/useProjects'

export interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  onProjectSelect: (projectId: string) => void
  currentProjectId: string | null
  onSignOut: () => void
  role: string | null
  userId: string | undefined
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({
  currentView,
  onViewChange,
  onSignOut,
  role,
  isOpen,
  onClose,
}: SidebarProps) {
  const { user } = useAuth()
  const { data: projects = [] } = useProjects()

  const inboxProject = projects.find((p) => p.name?.trim().toLowerCase() === 'inbox')
  const isAdmin = role !== 'collaborator'

  const navItems = [
    {
      key: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      onClick: () => {
        if (inboxProject) {
          onViewChange(`inbox/${inboxProject.id}`)
        } else {
          onViewChange('inbox')
        }
      },
    },
    {
      key: 'today',
      icon: Calendar,
      label: 'Hoje',
      onClick: () => onViewChange('today'),
    },
    {
      key: 'upcoming',
      icon: CalendarRange,
      label: 'Em Breve',
      onClick: () => onViewChange('upcoming'),
    },
    {
      key: 'labels',
      icon: Tag,
      label: 'Filtros e Etiquetas',
      onClick: () => onViewChange('labels'),
    },
    isAdmin && {
      key: 'chat',
      icon: MessageCircle,
      label: 'Chat WhatsApp',
      onClick: () => onViewChange('chat'),
    },
  ].filter(Boolean) as Array<{
    key: string
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
    label: string
    onClick: () => void
  }>

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(11,13,22,0.94),rgba(6,8,14,0.9))] shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-500 md:w-24 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <button
        onClick={onClose}
        className="absolute right-6 top-6 z-20 p-2 text-slate-500 transition-colors hover:text-white md:hidden"
      >
        <X size={24} />
      </button>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(126,87,194,0.12)_0%,transparent_62%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.08)_0%,transparent_54%)]" />

      <div className="relative z-10 flex flex-col items-center gap-10 border-b border-white/5 px-4 py-12">
        <div className="royal-purple-gradient flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 shadow-[0_16px_40px_rgba(34,211,238,0.18)] transition-transform duration-500 group hover:scale-110">
          {user?.profile?.avatar_url ? (
            <img src={user.profile.avatar_url} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <CheckSquare size={28} className="text-white drop-shadow-lg" strokeWidth={2.5} />
          )}
        </div>
        <div className="-mt-12 ml-10 h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const isActive = currentView === item.key

          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`group relative flex w-full items-center justify-start gap-4 rounded-2xl px-4 py-3.5 text-sm transition-all duration-300 md:justify-center lg:justify-start ${
                isActive
                  ? 'scale-[1.02] border border-white/10 bg-gradient-to-r from-violet-500/20 to-cyan-400/10 font-bold text-violet-200 shadow-lg shadow-violet-500/10'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <item.icon
                size={24}
                strokeWidth={1.5}
                className={`flex-shrink-0 transition-colors ${isActive ? 'text-cyan-300' : 'group-hover:text-slate-200'}`}
              />
              <span className="truncate text-[11px] font-black uppercase tracking-[0.2em] md:hidden lg:inline-block">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3 border-t border-white/5 p-4">
        <button
          onClick={() => onViewChange('settings')}
          className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-lg shadow-cyan-900/20 transition-all hover:border-cyan-300 hover:bg-cyan-400 active:scale-90"
          title="Configuracoes"
        >
          <Settings size={20} className="text-cyan-300 transition-colors group-hover:text-slate-950" />
        </button>

        <button
          onClick={onSignOut}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent text-slate-500 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 active:scale-90"
          title="Sair"
        >
          <Power size={20} />
        </button>
      </div>
    </aside>
  )
}
