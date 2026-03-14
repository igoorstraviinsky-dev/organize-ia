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
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* KPIs Dashboard - Dark Neomorphic Recessed Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-1 rounded-[22px] border border-white/[0.03] bg-black/10">
        <div className="dark-neo-recessed p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-white/10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-all rotate-12 group-hover:rotate-0 group-hover:scale-110">
            <Activity size={80} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
             <div className="rounded-2xl royal-purple-gradient p-3.5 text-white shadow-[0_10px_30px_rgba(106,27,154,0.3)]">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Velocidade Média</p>
          </div>
          <p className="text-4xl font-black text-white tracking-tighter relative z-10" style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>{data.analytics.velocidade_media}</p>
        </div>

        <div className="dark-neo-recessed p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-white/10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-all rotate-12 group-hover:rotate-0 group-hover:scale-110">
            <ClockAlert size={80} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`rounded-2xl p-3.5 shadow-lg ${data.analytics.atencao_critica > 0 ? 'bg-orange-600 text-white shadow-orange-600/20' : 'bg-[#151515] text-slate-600'}`}>
              <ClockAlert size={22} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Atenção Crítica</p>
          </div>
          <div className="flex items-baseline gap-3 relative z-10">
            <p className="text-4xl font-black text-white tracking-tighter">{data.analytics.atencao_critica}</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">frias {'>'} 48h</p>
          </div>
        </div>

        <div className="dark-neo-recessed p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-white/10 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-all rotate-12 group-hover:rotate-0 group-hover:scale-110">
            <Users size={80} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="rounded-2xl royal-purple-gradient p-3.5 text-white shadow-[0_10px_30px_rgba(106,27,154,0.3)]">
              <Users size={22} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Volume Atribuído</p>
          </div>
          <div className="flex items-baseline gap-3 relative z-10">
            <p className="text-4xl font-black text-white tracking-tighter">{data.analytics.volume_atribuido}</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">para mim</p>
          </div>
        </div>
      </div>

      {/* Tarefas Gerais (Sem Projeto) */}
      <section className="space-y-6">
        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] px-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-600 shadow-[0_0_10px_rgba(126,87,194,0.5)]" />
          {filterToday ? 'Tarefas para Hoje' : 'Mensagens Pendentes'}
        </h2>
        <div className="space-y-4">
          {generalTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          {generalTasks.length === 0 && (
            <div className="py-20 dark-neo-recessed flex flex-col items-center border border-white/5 opacity-40">
              <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Tudo limpo por aqui</p>
            </div>
          )}
          <div className="pt-4">
            <TaskForm projectId={null} />
          </div>
        </div>
      </section>

      {/* Concluídas Gerais */}
      {generalCompletedTasks.length > 0 && (
        <details className="mt-16 group opacity-30 hover:opacity-100 transition-all duration-500">
          <summary className="cursor-pointer text-[11px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-[0.3em] list-none flex items-center gap-4 px-4">
            <div className="h-px bg-white/5 flex-1 group-open:hidden" />
            Concluídas ({generalCompletedTasks.length})
            <div className="h-px bg-white/5 flex-1 group-open:hidden" />
          </summary>
          <div className="mt-6 space-y-4 px-2">
            {generalCompletedTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
