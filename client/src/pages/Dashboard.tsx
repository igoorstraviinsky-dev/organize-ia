import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { List, LayoutGrid, Folder, Plus, ChevronRight, Hash, X, Palette, Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProjects, useCreateProject, useUpdateProject, Project } from "../hooks/useProjects";
import GradientPicker from "../components/projects/GradientPicker";
import { useTasks, Task } from "../hooks/useTasks";
import { useRealtimeTasks } from "../hooks/useRealtimeTasks";
import Sidebar from "../components/layout/Sidebar";
import TaskList from "../components/tasks/TaskList";
import KanbanBoard from "../components/tasks/KanbanBoard";
import Upcoming from "./Upcoming";
import LabelsPage from "./Labels";
import WhatsAppChat from '../components/chat/WhatsAppChat';
import SettingsPage from './SettingsPage';
import { motion, AnimatePresence } from 'framer-motion';
import PomodoroTimer from "../components/focus/PomodoroTimer";
import AchievementToast from "../components/gamification/AchievementToast";
import XPBar from "../components/gamification/XPBar";
import { useSSE } from '../hooks/useSSE';
import { useUazapiLive } from '../hooks/useChatMessages';

interface DashboardProps {
  onSignOut: () => void;
}

export default function Dashboard({ onSignOut }: DashboardProps) {
  const { view, id } = useParams<{ view: string; id: string }>();
  const navigate = useNavigate();
  const { user, loading, session } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [] } = useTasks(null);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#7c3aed");
  const [editingThemeProjectId, setEditingThemeProjectId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const COLORS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#6366f1'];

  useRealtimeTasks();
  useSSE(session?.access_token || ''); // Mantém conexão viva para eventos reais se logado
  useUazapiLive(); // Escuta eventos da UazAPI via EventSource

  const currentView = view || "inbox";
  const currentProjectId = id || null;

  useEffect(() => {
    if (view === undefined) {
      navigate(`/app/today`, { replace: true });
    }
  }, [view, navigate]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      await createProject.mutateAsync({
        name: newProjectName.trim(),
        color: newProjectColor,
      } as any);
      setNewProjectName("");
      setShowNewProjectForm(false);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
    }
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_22%),radial-gradient(circle_at_bottom,rgba(45,212,191,0.14),transparent_26%)]" />
        <div className="jetted-glass relative flex flex-col items-center gap-6 px-10 py-12 text-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20"></div>
            <div className="absolute inset-0 rounded-full border border-white/10"></div>
            <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-cyan-300/70 border-t-transparent shadow-[0_0_22px_rgba(34,211,238,0.28)]"></div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.36em] text-slate-500">organize ia</p>
            <p className="text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase">Preparando workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  const getTitle = () => {
    if (currentView === "today") return "Hoje";
    if (currentView === "inbox") return "Inbox";
    if (currentView === "upcoming") return "Em Breve";
    if (currentView === "labels") return "Filtros e Etiquetas";
    if (currentView === 'chat') return 'Chat WhatsApp';
    if (currentView === 'settings') return 'Configurações';
    if (currentView === 'project') {
      const project = (projects as Project[]).find((p) => p.id === currentProjectId);
      return project?.name || "Projeto";
    }
    return "Tarefas";
  };

  const showViewToggle = currentView === "project" || currentView === "inbox";
  const isFullHeight = currentView === 'chat';

  const ViewToggle = () => (
    <div className="flex rounded-xl border border-white/5 bg-white/5 p-1 backdrop-blur-md shadow-inner">
      <button
        onClick={() => setViewMode("list")}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
          viewMode === "list"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <List size={14} />
        Lista
      </button>
      <button
        onClick={() => setViewMode("board")}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
          viewMode === "board"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/20"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <LayoutGrid size={14} />
        Painel
      </button>
    </div>
  );

  const ProjectsDrawer = () => (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-2xl z-50 flex flex-col border-l border-white/5"
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Meus Projetos</h2>
        <button 
          onClick={() => setIsProjectsOpen(false)}
          className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {(projects as Project[]).filter(p => p.name !== 'Inbox').map((project) => {
          const projectTasksCount = (allTasks as Task[]).filter(t => t.project_id === project.id && t.status !== 'completed').length;
          const isActive = currentProjectId === project.id;

          return (
            <div key={project.id} className="space-y-1">
              <button
                onClick={() => {
                  navigate(`/app/project/${project.id}`);
                  setIsProjectsOpen(false);
                }}
                className={`w-full group flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                  isActive ? 'bg-purple-600/10 border border-purple-500/20' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: project.theme_gradient || `${project.color || '#7c3aed'}20`,
                      color: project.color || '#7c3aed'
                    }}
                  >
                    <Hash size={14} strokeWidth={3} />
                  </div>
                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{project.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {projectTasksCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-400">
                      {projectTasksCount}
                    </span>
                  )}
                  <button
                    type="button"
                    title="Personalizar tema"
                    onClick={(e) => { e.stopPropagation(); setEditingThemeProjectId(editingThemeProjectId === project.id ? null : project.id); }}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-300 hover:text-brand-purple transition-all"
                  >
                    <Palette size={13} />
                  </button>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400" />
                </div>
              </button>
              {editingThemeProjectId === project.id && (
                <div className="px-2 pb-2">
                  <GradientPicker
                    value={project.theme_gradient || ''}
                    onChange={async (grad: string) => {
                      await updateProject.mutateAsync({ id: project.id, theme_gradient: grad });
                      setEditingThemeProjectId(null);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {projects.filter(p => p.name !== 'Inbox').length === 0 && (
          <div className="py-20 text-center">
            <Folder size={40} className="mx-auto text-white/5 mb-4 p-2 rounded-2xl bg-white/5" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Nenhum projeto ainda</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-black/20 border-t border-white/5">
        {showNewProjectForm ? (
          <form onSubmit={handleCreateProject} className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nome do projeto"
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-purple-500/30 transition-all font-bold"
            />
            <div className="flex flex-wrap gap-2 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewProjectColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${newProjectColor === c ? 'border-slate-800 scale-110 shadow-md' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowNewProjectForm(false)}
                className="flex-1 rounded-xl px-4 py-3 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={!newProjectName.trim()}
                className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-[10px] font-black text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 uppercase tracking-widest disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-[10px] font-black text-slate-400 hover:border-purple-500/50 hover:text-purple-400 transition-all uppercase tracking-widest italic overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Plus size={14} strokeWidth={3} />
            Novo Projeto
          </button>
        )}
      </div>
    </motion.div>
  );

  const isBoardMode = viewMode === "board" && showViewToggle;

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent font-sans text-[#e2e8f0]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_22%),radial-gradient(circle_at_bottom,rgba(45,212,191,0.08),transparent_26%)]" />
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <Sidebar
        currentView={currentView}
        onViewChange={(newView) => {
          navigate(`/app/${newView}`);
          setIsMobileMenuOpen(false);
        }}
        onProjectSelect={(projectId) => {
          navigate(`/app/project/${projectId}`);
          setIsMobileMenuOpen(false);
        }}
        currentProjectId={currentProjectId}
        onSignOut={onSignOut}
        role={(user as any)?.profile?.role}
        userId={user?.id}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>
      <main className="relative flex flex-1 flex-col overflow-y-auto p-4 transition-all duration-700 md:pl-44 md:p-10">
        <div className="jetted-glass flex min-h-[calc(100vh-2rem)] flex-1 flex-col border-white/10 bg-white/[0.03] shadow-[0_0_100px_rgba(0,0,0,0.42)] md:min-h-0">
          {currentView === 'project' && (() => {
            const proj = (projects as Project[]).find(p => p.id === currentProjectId);
            return proj?.theme_gradient ? (
              <div className="relative h-2 w-full overflow-hidden rounded-t-[28px]">
                <div
                  style={{ background: proj.theme_gradient }}
                  className="absolute inset-0 w-full h-full opacity-60"
                />
              </div>
            ) : null;
          })()}
          <div className="relative flex items-center justify-between border-b border-white/5 bg-transparent px-8 py-8 md:px-12 md:py-10">
            {currentView === 'project' && (() => {
              const proj = (projects as Project[]).find(p => p.id === currentProjectId);
              return proj?.theme_gradient ? (
                <div 
                  style={{ background: proj.theme_gradient }}
                  className="absolute bottom-0 left-0 w-full h-[2px] opacity-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                />
              ) : null;
            })()}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex items-center justify-center rounded-xl bg-white/5 p-3 text-white transition-all hover:bg-white/10 active:scale-95 md:hidden"
                  >
                    <Menu size={24} />
                  </button>

                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent truncate max-w-[150px] md:max-w-none">
                    {getTitle()}
                  </h1>
                </div>
                
                <div className="flex items-center">
                  <XPBar layout="compact" />
                </div>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                {(currentView === 'inbox' || currentView === 'project') && (
                  <button
                    onClick={() => setIsProjectsOpen(true)}
                    className="flex items-center gap-3 rounded-[24px] dark-neo-recessed bg-[#0a0a0a] px-8 py-4 text-[11px] font-black text-slate-400 hover:text-purple-400 transition-all active:scale-95 uppercase tracking-[0.3em] group border-white/5"
                  >
                    <Folder size={16} className="text-purple-500 group-hover:fill-purple-500/10 transition-all" />
                    Meus Projetos
                    <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-xl bg-purple-950/30 text-[10px] text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      {projects.filter(p => p.name !== 'Inbox').length}
                    </span>
                  </button>
                )}
                {showViewToggle && <ViewToggle />}
              </div>
            </div>
          </div>
          
          <div className={`flex-1 overflow-auto custom-scrollbar ${isFullHeight ? 'p-0' : 'px-16 py-12'}`}>
            {currentView === "upcoming" && <Upcoming />}
            {currentView === "labels" && <LabelsPage />}
            {currentView === "chat" && <WhatsAppChat />}
            {currentView === "settings" && <SettingsPage />}
            {(currentView === "today" || currentView === "inbox" || currentView === "project") && (
              isBoardMode ? (
                <KanbanBoard projectId={(currentView === "today" || currentView === "inbox") ? null : currentProjectId} />
              ) : (
                <TaskList
                  projectId={(currentView === "today" || currentView === "inbox") ? null : (currentProjectId as string | null)}
                  title={getTitle()}
                  filterToday={currentView === "today"}
                />
              )
            )}
            {!["today", "inbox", "project", "upcoming", "labels", "chat", "settings"].includes(currentView) && (
               <Navigate to="/app/today" replace />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isProjectsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProjectsOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              />
              <ProjectsDrawer />
            </>
          )}
        </AnimatePresence>

        <PomodoroTimer />
        <AchievementToast />
      </main>
    </div>
  );
}
