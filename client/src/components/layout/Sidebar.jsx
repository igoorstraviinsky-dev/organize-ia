import { useState } from 'react'
import {
  Inbox,
  Calendar,
  CalendarRange,
  Tag,
  LogOut,
  ChevronDown,
  ChevronRight,
  Hash,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Plug2,
  MessageCircle,
  Users,
} from 'lucide-react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects'
import { useAuth } from '../../hooks/useAuth'
import XPBar from '../gamification/XPBar'

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

export default function Sidebar({ currentView, onViewChange, onProjectSelect, currentProjectId, onSignOut, role, userId }) {
  const { user } = useAuth()
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#6366f1')
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#6366f1')

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    await createProject.mutateAsync({ name: newProjectName.trim(), color: newProjectColor })
    setNewProjectName('')
    setShowNewProject(false)
  }

  const handleStartEdit = (project) => {
    setEditingProjectId(project.id)
    setEditName(project.name)
    setEditColor(project.color)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    await updateProject.mutateAsync({ id: editingProjectId, name: editName.trim(), color: editColor })
    setEditingProjectId(null)
  }

  const handleCancelEdit = () => {
    setEditingProjectId(null)
  }

  const inboxProject = projects.find((p) => p.name?.trim().toLowerCase() === 'inbox')
  const otherProjects = projects.filter((p) => p.name?.trim().toLowerCase() !== 'inbox')

  const isAdmin = role !== 'collaborator'
  const navItems = [
    {
      key: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      onClick: () => {
        if (inboxProject) {
          onViewChange(`inbox/${inboxProject.id}`);
        } else {
          onViewChange('inbox');
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
  ].filter(Boolean)

  return (
    <aside 
      className="flex h-screen w-64 flex-col border-r border-white/5 shadow-2xl relative overflow-hidden"
      style={{ 
        background: 'radial-gradient(circle at 20% 50%, #1e1b2e 0%, #17112E 100%)'
      }}
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <div className="flex items-center gap-3 px-6 py-8 border-b border-white/5">
        <div 
          className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-xl overflow-hidden border border-white/10"
          style={{ backgroundColor: '#8E44AD', boxShadow: '0 10px 15px -3px rgba(142, 68, 173, 0.3)' }}
        >
          {user?.profile?.avatar_url ? (
            <img src={user.profile.avatar_url} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="font-black text-xl text-white italic">
              {user?.profile?.full_name?.charAt(0).toUpperCase() || 'O'}
            </span>
          )}
        </div>
        <span className="text-xl font-black tracking-tight text-white font-display uppercase italic">Organizador</span>
      </div>

      <XPBar />

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-sm transition-all duration-300 relative ${
                isActive 
                  ? 'bg-[#8E44AD] text-white font-bold shadow-lg shadow-[#8E44AD]/20 scale-[1.02]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={`transition-colors ${isActive ? 'text-white' : 'group-hover:text-slate-200'}`} />
              <span className="uppercase font-black text-[11px] tracking-widest">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/5 p-4">
        <button
          onClick={() => onViewChange('settings')}
          className="flex w-full items-center gap-3 px-2 py-3 rounded-2xl transition-all hover:bg-white/5 group border border-transparent hover:border-white/5"
        >
          <div className="h-9 w-9 rounded-full bg-[#8E44AD] flex items-center justify-center overflow-hidden border border-white/10 shadow-sm group-hover:scale-110 transition-transform">
             {user?.profile?.avatar_url ? (
               <img 
                 src={user.profile.avatar_url} 
                 alt="User Profile" 
                 className="h-full w-full object-cover"
               />
             ) : (
               <span className="text-sm font-black text-white italic">
                 {user?.profile?.full_name?.charAt(0).toUpperCase() || 'U'}
               </span>
             )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-white truncate group-hover:text-[#8E44AD] transition-colors">{user?.profile?.full_name || 'Usuário'}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase font-black tracking-widest mt-0.5">Configurações</p>
          </div>
        </button>
      </div>
    </aside>
  )
}
