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

export default function Sidebar({ currentView, onViewChange, onProjectSelect, currentProjectId, onSignOut, role, userId, isOpen, onClose }) {
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
      className={`fixed inset-y-0 left-0 z-50 flex w-72 md:w-24 flex-col border-r border-white/5 shadow-2xl bg-[#0a0a0a] transition-all duration-500 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white md:hidden z-20"
      >
        <X size={24} />
      </button>
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(126,87,194,0.1)_0%,transparent_70%)]" />

      <div className="flex flex-col items-center gap-10 px-4 py-12 relative z-10 border-b border-white/5">
        <div 
          className="flex h-14 w-14 items-center justify-center rounded-[20px] shadow-[0_10px_30px_rgba(106,27,154,0.3)] overflow-hidden border border-white/10 group transition-transform hover:scale-110 duration-500"
          style={{ background: 'linear-gradient(135deg, #6a1b9a 0%, #7e57c2 100%)' }}
        >
          {user?.profile?.avatar_url ? (
            <img src={user.profile.avatar_url} alt="Logo" className="h-full w-full object-cover" />
          ) : (
             <CheckSquare size={28} className="text-white drop-shadow-lg" strokeWidth={2.5} />
          )}
        </div>
        <div className="h-4 w-4 rounded-full bg-green-500 border-2 border-[#0a0a0a] -mt-12 ml-10 shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
      </div>

      <XPBar />

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
                  ? 'bg-purple-600/20 text-purple-400 font-bold shadow-lg shadow-purple-600/10 scale-[1.02]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              } justify-start md:justify-center lg:justify-start`}
            >
              <item.icon size={24} strokeWidth={1.5} className={`transition-colors flex-shrink-0 ${isActive ? 'text-purple-400' : 'group-hover:text-slate-200'}`} />
              <span className="uppercase font-black text-[11px] tracking-[0.2em] truncate md:hidden lg:inline-block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/5 p-4">
        <button
          onClick={() => onViewChange('settings')}
          className="flex w-full items-center gap-3 px-2 py-3 rounded-2xl transition-all hover:bg-white/5 group border border-transparent hover:border-white/5 justify-start md:justify-center lg:justify-start"
        >
          <div className="h-10 w-10 rounded-full bg-purple-600/20 flex items-center justify-center overflow-hidden border border-white/5 ring-1 ring-white/5 group-hover:scale-110 transition-transform flex-shrink-0">
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
          <div className="flex-1 min-w-0 text-left md:hidden lg:block">
            <p className="text-sm font-semibold text-white truncate group-hover:text-purple-400 transition-colors">{user?.profile?.full_name || 'Usuário'}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase font-black tracking-widest mt-0.5">Configurações</p>
          </div>
        </button>
      </div>
    </aside>
  )
}
