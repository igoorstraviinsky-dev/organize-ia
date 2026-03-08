import { useState, useEffect } from "react";
import { List, LayoutGrid } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useProjects } from "../hooks/useProjects";
import { useRealtimeTasks } from "../hooks/useRealtimeTasks";
import Sidebar from "../components/layout/Sidebar";
import TaskList from "../components/tasks/TaskList";
import KanbanBoard from "../components/tasks/KanbanBoard";
import Upcoming from "./Upcoming";
import LabelsPage from "./Labels";
import WhatsAppChat from '../components/chat/WhatsAppChat';
import SettingsPage from './SettingsPage';

export default function Dashboard({ onSignOut }) {
  const { user, loading } = useAuth();
  const { data: projects = [] } = useProjects();
  const [currentView, setCurrentView] = useState("inbox");
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'board'

  useRealtimeTasks();

  // Auto-selecionar Inbox ao carregar
  useEffect(() => {
    if (currentView === "inbox" && !currentProjectId && projects.length > 0) {
      const inbox = projects.find((p) => p.name === "Inbox");
      if (inbox) setCurrentProjectId(inbox.id);
    }
  }, [projects, currentView, currentProjectId]);

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
    const project = projects.find((p) => p.id === currentProjectId);
    return project?.name || "Tarefas";
  };

  const showViewToggle = currentView === "project" || currentView === "inbox";
  const isFullHeight = currentView === 'chat';

  const renderContent = () => {
    if (currentView === 'upcoming') return <Upcoming />
    if (currentView === 'labels') return <LabelsPage />
    if (currentView === 'chat') return <WhatsAppChat />
    if (currentView === 'settings') return <SettingsPage />

    return (
      <TaskList
        projectId={currentView === 'today' ? null : currentProjectId}
        title={getTitle()}
        filterToday={currentView === 'today'}
      />
    )
  }

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

  // No modo board: usar largura total para as colunas caberem na tela
  const isBoardMode = viewMode === "board" && showViewToggle;

  return (
    <div className="flex h-screen bg-brand-gray text-slate-900 font-sans">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setViewMode("list");
        }}
        onProjectSelect={setCurrentProjectId}
        currentProjectId={currentProjectId}
        onSignOut={onSignOut}
        role={user?.profile?.role}
        userId={user?.id}
      />
      <main className="flex-1 overflow-hidden p-8 flex flex-col">
        {/* Main Content Card */}
        <div className="flex-1 premium-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-10 py-8">
            <h1 className="text-3xl font-extrabold tracking-tight font-display uppercase" style={{ color: '#17112E' }}>
              {getTitle()}
            </h1>
            <div className="flex items-center gap-4">
              {showViewToggle && <ViewToggle />}
            </div>
          </div>
          
          <div className={`flex-1 overflow-auto custom-scrollbar ${isFullHeight ? '' : 'p-10'}`}>
            {isBoardMode ? <KanbanBoard projectId={currentProjectId} /> : renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
