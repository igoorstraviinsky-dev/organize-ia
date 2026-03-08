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
import IntegrationsPage from '../components/integrations/IntegrationsPage';
import WhatsAppChat from '../components/chat/WhatsAppChat';
import TeamPage from './TeamPage';

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
    if (currentView === 'integrations') return 'Integrações';
    if (currentView === 'team') return 'Equipe';
    if (currentView === 'chat') return 'Chat WhatsApp';
    const project = projects.find((p) => p.id === currentProjectId);
    return project?.name || "Tarefas";
  };

  const showViewToggle = currentView === "project" || currentView === "inbox";
  const isFullHeight = currentView === 'chat';

  const renderContent = () => {
    if (currentView === 'upcoming') return <Upcoming />
    if (currentView === 'labels') return <LabelsPage />
    if (currentView === 'integrations') return <IntegrationsPage />
    if (currentView === 'team') return <TeamPage />
    if (currentView === 'chat') return <WhatsAppChat />

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
    <div className="flex h-screen bg-[#020617] text-slate-100 font-sans selection:bg-purple-500/30">
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
      <main className="flex-1 overflow-hidden relative">
        {/* Decorative Gradients */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

        <div className="relative flex h-full flex-col">
          {isBoardMode || isFullHeight ? (
             <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/5 bg-[#0A0A0A]/40 backdrop-blur-md px-10 py-6">
                <h1 className="text-2xl font-bold tracking-tight text-white font-display uppercase">{getTitle()}</h1>
                {showViewToggle && <ViewToggle />}
              </div>
              <div className={`flex-1 overflow-auto ${isFullHeight ? 'p-6' : 'px-10 py-8'}`}>
                {isBoardMode ? <KanbanBoard projectId={currentProjectId} /> : renderContent()}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="mx-auto max-w-5xl px-10 py-12">
                <div className="mb-12 flex items-center justify-between">
                  <h1 className="text-4xl font-bold tracking-tight text-white font-display uppercase">
                    {getTitle()}
                  </h1>
                  {showViewToggle && <ViewToggle />}
                </div>
                {renderContent()}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
