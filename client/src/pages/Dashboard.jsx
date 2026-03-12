import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { List, LayoutGrid, Folder, Plus, ChevronRight, Hash, X, Palette } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProjects, useCreateProject, useUpdateProject } from "../hooks/useProjects";
import GradientPicker from "../components/projects/GradientPicker";
import { useTasks } from "../hooks/useTasks";
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

export default function Dashboard({ onSignOut }) {
  const { view, id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [] } = useTasks(null);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'board'
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#7c3aed");
  const [editingThemeProjectId, setEditingThemeProjectId] = useState(null);

  const COLORS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#6366f1'];

  useRealtimeTasks();

  const currentView = view || "inbox";
  const currentProjectId = id || null;

  // Auto-selecionar Inbox ao carregar se estiver na raiz do app
  useEffect(() => {
    if (view === undefined || view === 'app') {
      navigate(`/app/inbox`, { replace: true });
    }
  }, [view, navigate]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      await createProject.mutateAsync({
        name: newProjectName.trim(),
        color: newProjectColor,
      });
      setNewProjectName("");
      setShowNewProjectForm(false);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20"></div>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
          </div>
          <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">Sincronizando...</p>
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
      const project = projects.find((p) => p.id === currentProjectId);
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
      className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100"
    >
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Meus Projetos</h2>
        <button 
          onClick={() => setIsProjectsOpen(false)}
          className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {projects.filter(p => p.name !== 'Inbox').map((project) => {
          const projectTasksCount = allTasks.filter(t => t.project_id === project.id && t.status !== 'completed').length;
          const isActive = currentProjectId === project.id;

          return (
            <div key={project.id} className="space-y-1">
              <button
                onClick={() => {
                  navigate(`/app/project/${project.id}`);
                  setIsProjectsOpen(false);
                }}
                className={`w-full group flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                  isActive ? 'bg-brand-purple/5 border border-brand-purple/10' : 'hover:bg-slate-50'
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
                  <span className={`text-sm font-bold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{project.name}</span>
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
                    onChange={async (grad) => {
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
          <div className="py-12 text-center">
            <Folder size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum projeto ainda</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        {showNewProjectForm ? (
          <form onSubmit={handleCreateProject} className="space-y-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nome do projeto"
              className="w-full bg-slate-50 border-0 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all font-bold"
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
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={!newProjectName.trim()}
                className="flex-1 rounded-xl bg-brand-purple px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-purple/90 transition-all shadow-lg shadow-brand-purple/20 uppercase tracking-widest disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-xs font-black text-slate-400 hover:border-brand-purple hover:text-brand-purple transition-all uppercase tracking-[0.15em]"
          >
            <Plus size={16} />
            Novo Projeto
          </button>
        )}
      </div>
    </motion.div>
  );

  const isBoardMode = viewMode === "board" && showViewToggle;

  return (
    <div className="flex h-screen bg-brand-gray text-slate-900 font-sans relative overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={(newView) => navigate(`/app/${newView}`)}
        onProjectSelect={(projectId) => navigate(`/app/project/${projectId}`)}
        currentProjectId={currentProjectId}
        onSignOut={onSignOut}
        role={user?.profile?.role}
        userId={user?.id}
      />
      <main className="flex-1 overflow-hidden p-8 flex flex-col relative">
        <div className="flex-1 premium-card flex flex-col overflow-hidden">
          {/* Banner de tema do projeto ativo - Premium Vibe */}
          {currentView === 'project' && (() => {
            const proj = projects.find(p => p.id === currentProjectId);
            return proj?.theme_gradient ? (
              <div className="relative h-1.5 w-full overflow-hidden rounded-t-2xl">
                <div
                  style={{ background: proj.theme_gradient }}
                  className="absolute inset-0 w-full h-full opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
              </div>
            ) : null;
          })()}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-10 py-8 relative">
            {/* Sutil brilho do tema no header */}
            {currentView === 'project' && (() => {
              const proj = projects.find(p => p.id === currentProjectId);
              return proj?.theme_gradient ? (
                <div 
                  style={{ background: proj.theme_gradient }}
                  className="absolute bottom-0 left-0 w-full h-[1px] opacity-30 shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                />
              ) : null;
            })()}
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-extrabold tracking-tight font-display uppercase" style={{ color: '#17112E' }}>
                {getTitle()}
              </h1>
              {(currentView === 'inbox' || currentView === 'project') && (
                <button
                  onClick={() => setIsProjectsOpen(true)}
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-5 py-2.5 text-xs font-black text-slate-600 shadow-sm hover:border-brand-purple hover:text-brand-purple hover:shadow-md transition-all active:scale-95 uppercase tracking-widest group"
                >
                  <Folder size={14} className="text-brand-purple group-hover:fill-brand-purple transition-all" />
                  Meus Projetos
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-lg bg-slate-50 text-[10px] text-slate-400 group-hover:bg-brand-purple group-hover:text-white transition-all">
                    {projects.filter(p => p.name !== 'Inbox').length}
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {showViewToggle && <ViewToggle />}
            </div>
          </div>
          
          <div className={`flex-1 overflow-auto custom-scrollbar ${isFullHeight ? '' : 'p-10'}`}>
            {currentView === "upcoming" && <Upcoming />}
            {currentView === "labels" && <LabelsPage />}
            {currentView === "chat" && <WhatsAppChat />}
            {currentView === "settings" && <SettingsPage />}
            {(currentView === "today" || currentView === "inbox" || currentView === "project") && (
              isBoardMode ? (
                <KanbanBoard projectId={(currentView === "today" || currentView === "inbox") ? null : currentProjectId} />
              ) : (
                <TaskList
                  projectId={(currentView === "today" || currentView === "inbox") ? null : currentProjectId}
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

        {/* Overlay do Drawer */}
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
