import { useState } from 'react'
import { useTasks, useGlobalKPIs } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSections, useCreateSection } from '../../hooks/useSections'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import SectionGroup from './SectionGroup'
import { Loader2, Activity, ClockAlert, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'

export default function TaskList({ projectId, title, filterToday }) {
  const { user } = useAuth()
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks(null) // Sempre carrega tudo no Inbox
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  
  const queryClient = useQueryClient()
  const { data: sections = [] } = useSections(projectId)
  const createSection = useCreateSection()
  const [newSectionName, setNewSectionName] = useState('')
  const [showNewSection, setShowNewSection] = useState(false)

  const isInbox = title === 'Inbox' || filterToday
  const isLoading = tasksLoading || projectsLoading

  // Filtragem de tarefas de hoje se necessário
  let tasks = allTasks
  if (filterToday) {
    const today = new Date().toISOString().split('T')[0]
    tasks = allTasks.filter((t) => t.due_date === today)
  }

  // Grupos de tarefas
  const generalTasks = tasks.filter(t => !t.project_id && t.status !== 'completed')
  const generalCompletedTasks = tasks.filter(t => !t.project_id && t.status === 'completed')
  
  // KPIs Globais
  const { data: kpis = { volume_atribuido: 0, atencao_critica: 0, velocidade_media: '-' } } = useGlobalKPIs()

  const data = {
    analytics: {
      velocidade_media: kpis.velocidade_media,
      atencao_critica: kpis.atencao_critica,
      volume_atribuido: kpis.volume_atribuido
    }
  }

  const handleAddSection = async (e) => {
    e.preventDefault()
    if (!newSectionName.trim() || !projectId) return
    await createSection.mutateAsync({
      name: newSectionName.trim(),
      project_id: projectId,
      position: sections.length,
    })
    setNewSectionName('')
    setShowNewSection(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Se estiver em um projeto específico
  if (!isInbox && projectId) {
    const projectTasks = tasks.filter(t => t.project_id === projectId)
    const pending = projectTasks.filter(t => t.status !== 'completed')
    const completed = projectTasks.filter(t => t.status === 'completed')
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="space-y-3">
          {pending.filter(t => !t.section_id).map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          {pending.filter(t => !t.section_id).length === 0 && sections.length === 0 && (
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center py-8">Limpinho! Nenhuma tarefa por aqui.</p>
          )}
        </div>
        <TaskForm projectId={projectId} />
        {sections.length > 0 && (
          <div className="space-y-8 mt-10">
            {sections.map((section) => (
              <SectionGroup
                key={section.id}
                section={section}
                tasks={projectTasks.filter(t => t.section_id === section.id)}
                projectId={projectId}
              />
            ))}
          </div>
        )}
        {completed.length > 0 && (
          <details className="mt-10 group opacity-60 hover:opacity-100 transition-opacity">
            <summary className="cursor-pointer text-xs font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest list-none flex items-center gap-2">
              <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
              Concluídas ({completed.length})
              <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
            </summary>
            <div className="mt-4 space-y-3">
              {completed.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  // Visualização de Inbox / Hoje
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* KPIs Dashboard - Jetted Glass Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="jetted-glass p-6 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={48} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-3">
             <div className="rounded-2xl electric-blue-gradient p-3 text-white shadow-lg shadow-blue-500/30">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Velocidade Média</p>
          </div>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{data.analytics.velocidade_media}</p>
        </div>

        <div className="jetted-glass p-6 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <ClockAlert size={48} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 shadow-lg ${data.analytics.atencao_critica > 0 ? 'bg-orange-500 text-white shadow-orange-500/30' : 'bg-slate-200 text-slate-400 shadow-slate-200/30'}`}>
              <ClockAlert size={20} strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Atenção Crítica</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{data.analytics.atencao_critica}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">frias {'>'} 48h</p>
          </div>
        </div>

        <div className="jetted-glass p-6 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={48} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl royal-purple-gradient p-3 text-white shadow-lg shadow-purple-500/30">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Volume Atribuído</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{data.analytics.volume_atribuido}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">para mim</p>
          </div>
        </div>
      </div>

      {/* Tarefas Gerais (Sem Projeto) */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          {filterToday ? 'Tarefas para Hoje' : 'Tarefas Gerais / Inbox'}
        </h2>
        <div className="space-y-3">
          {generalTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          {generalTasks.length === 0 && (
            <div className="py-12 border-2 border-dashed border-slate-50 rounded-2xl flex flex-col items-center">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Tudo limpo por aqui</p>
            </div>
          )}
          <div className="pt-2">
            <TaskForm projectId={null} />
          </div>
        </div>
      </section>

      {/* Concluídas Gerais */}
      {generalCompletedTasks.length > 0 && (
        <details className="mt-10 group opacity-40 hover:opacity-100 transition-opacity">
          <summary className="cursor-pointer text-xs font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest list-none flex items-center gap-2 px-1">
            <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
            Concluídas ({generalCompletedTasks.length})
            <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
          </summary>
          <div className="mt-4 space-y-3 px-1">
            {generalCompletedTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
