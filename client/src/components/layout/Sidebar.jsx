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

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

export default function Sidebar({ currentView, onViewChange, onProjectSelect, currentProjectId, onSignOut, role, userId }) {
  const { data: projects = [] } = useProjects()
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

  const inboxProject = projects.find((p) => p.name === 'Inbox')
  const otherProjects = projects.filter((p) => p.name !== 'Inbox')

  const isAdmin = role !== 'collaborator'
  const navItems = [
    {
      key: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      onClick: () => { onViewChange('inbox'); inboxProject && onProjectSelect(inboxProject.id) },
    },
    {
      key: 'today',
      icon: Calendar,
      label: 'Hoje',
      onClick: () => { onViewChange('today'); onProjectSelect(null) },
    },
    {
      key: 'upcoming',
      icon: CalendarRange,
      label: 'Em Breve',
      onClick: () => { onViewChange('upcoming'); onProjectSelect(null) },
    },
    {
      key: 'labels',
      icon: Tag,
      label: 'Filtros e Etiquetas',
      onClick: () => { onViewChange('labels'); onProjectSelect(null) },
    },
    isAdmin && {
      key: 'integrations',
      icon: Plug2,
      label: 'Integrações',
      onClick: () => { onViewChange('integrations'); onProjectSelect(null) },
    },
    isAdmin && {
      key: 'team',
      icon: Users,
      label: 'Equipe',
      onClick: () => { onViewChange('team'); onProjectSelect(null) },
    },
    isAdmin && {
      key: 'chat',
      icon: MessageCircle,
      label: 'Chat WhatsApp',
      onClick: () => { onViewChange('chat'); onProjectSelect(null) },
    },
  ].filter(Boolean)

  return (
    <aside className="relative flex h-screen w-64 flex-col border-r border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-white/5 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20">
          <span className="font-bold text-sm tracking-tighter">O</span>
        </div>
        <span className="text-sm font-bold tracking-tight text-white/90 font-display">Organizador</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 relative overflow-hidden ${
                isActive 
                  ? 'text-white font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-100" />
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-purple-500 to-blue-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
              )}
              <item.icon size={18} className={`relative z-10 transition-colors ${isActive ? 'text-purple-400' : 'group-hover:text-slate-200'}`} />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}

        <div className="mt-8">
          <div
            className="flex w-full cursor-pointer items-center gap-1 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => setProjectsOpen(!projectsOpen)}
            role="button"
          >
            {projectsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Projetos
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewProject(true) }}
              className="ml-auto rounded-lg p-1 hover:bg-white/10 text-slate-500 hover:text-white transition-all shadow-sm"
            >
              <Plus size={14} />
            </button>
          </div>

          {projectsOpen && (
            <div className="mt-2 px-1 space-y-0.5">
              {otherProjects.map((project) => {
                const isActive = currentProjectId === project.id && currentView === 'project';
                const canEdit = isAdmin || project.owner_id === userId;

                if (editingProjectId === project.id) {
                  return (
                    <form key={project.id} onSubmit={handleSaveEdit} className="mx-2 mt-1 mb-1 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome do projeto"
                        className="w-full bg-transparent border-0 px-0 py-1 text-sm text-white placeholder-slate-500 outline-none"
                        onKeyDown={(e) => e.key === 'Escape' && handleCancelEdit()}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={`h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 ${editColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={handleCancelEdit} className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                          Cancelar
                        </button>
                        <button type="submit" className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 hover:scale-105 transition-all">
                          Salvar
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div key={project.id} className="group flex items-center px-1">
                    <button
                      onClick={() => { onViewChange('project'); onProjectSelect(project.id) }}
                      className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all relative overflow-hidden ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {isActive && <div className="absolute inset-0 bg-white/5 opacity-100" />}
                      <Hash size={16} className="relative z-10" style={{ color: project.color }} />
                      <span className="truncate relative z-10">{project.name}</span>
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleStartEdit(project)}
                        className="ml-1 hidden rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-slate-300 group-hover:block transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => deleteProject.mutate(project.id)}
                        className="ml-1 hidden rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 group-hover:block transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {showNewProject && (
                <form onSubmit={handleCreateProject} className="mx-2 mt-2 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nome do projeto"
                    className="w-full bg-transparent border-0 px-0 py-1 text-sm text-white placeholder-slate-500 outline-none"
                    onKeyDown={(e) => e.key === 'Escape' && setShowNewProject(false)}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewProjectColor(c)}
                        className={`h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 ${newProjectColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewProject(false)}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/20 hover:scale-105 transition-all"
                    >
                      Criar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-white/5 p-4">
        <button
          onClick={onSignOut}
          className="group flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          Sair
        </button>
      </div>
    </aside>
  )
}
