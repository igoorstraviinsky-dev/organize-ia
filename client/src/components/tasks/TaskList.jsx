import { useState } from 'react'
import { useTasks, useGlobalKPIs } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSections, useCreateSection } from '../../hooks/useSections'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import SectionGroup from './SectionGroup'
import { Loader2, ClipboardList, Plus, Activity, ClockAlert, Users, ChevronDown, ChevronRight, Folder } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'

export default function TaskList({ projectId, title, filterToday }) {
  const { user } = useAuth()
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks(null) // Sempre carrega tudo no Inbox
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const [expandedProjectId, setExpandedProjectId] = useState(null)
  
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

  // Se estiver em um projeto específico (ex: clicado via busca ou link direto)
  if (!isInbox && projectId) {
    const projectTasks = tasks.filter(t => t.project_id === projectId)
    const pending = projectTasks.filter(t => t.status !== 'completed')
    const completed = projectTasks.filter(t => t.status === 'completed')
    
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          {pending.filter(t => !t.section_id).map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
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
          <details className="mt-10 group">
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

  return (
    <div className="space-y-10">
      {/* KPIs Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Activity size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Velocidade Média</p>
            <p className="text-xl font-black text-slate-800 leading-none mt-1">{data.analytics.velocidade_media}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className={`rounded-lg p-3 ${data.analytics.atencao_critica > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
            <ClockAlert size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atenção Crítica</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <p className="text-xl font-black text-slate-800 leading-none">{data.analytics.atencao_critica}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">frias {'>'} 48h</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-brand-purple">
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volume Atribuído</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <p className="text-xl font-black text-slate-800 leading-none">{data.analytics.volume_atribuido}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">para mim</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarefas Gerais (Sem Projeto) */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Tarefas Gerais / Inbox
        </h2>
        <div className="space-y-3">
          {generalTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          {generalTasks.length === 0 && (
            <p className="text-xs text-slate-400 italic px-1 pt-1 opacity-70">Nenhuma tarefa geral pendente.</p>
          )}
          <div className="pt-2">
            <TaskForm projectId={null} />
          </div>
        </div>
      </section>

      {/* Seção de Projetos */}
      <section className="space-y-6 pt-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
          Meus Projetos
        </h2>
        
        <div className="space-y-3">
          {projects.filter(p => p.name !== 'Inbox').map((project) => {
            const isExpanded = expandedProjectId === project.id
            const projectTasks = tasks.filter(t => t.project_id === project.id && t.status !== 'completed')
            const projectColor = project.color || '#7c3aed'

            return (
              <div key={project.id} className={`rounded-2xl border transition-all duration-300 ${isExpanded ? 'bg-slate-50/50 border-slate-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}>
                <button
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                  className="w-full flex items-center justify-between p-5 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-2.5 rounded-xl shadow-sm transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${projectColor}15`, color: projectColor }}
                    >
                      <Folder size={18} fill={isExpanded ? projectColor : 'transparent'} className="transition-all" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-700 leading-none">{project.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                        {projectTasks.length} {projectTasks.length === 1 ? 'tarefa' : 'tarefas'}
                      </p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-slate-200 text-slate-600 rotate-180' : 'text-slate-400'}`}>
                    <ChevronDown size={16} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 space-y-3">
                        <div className="h-px bg-slate-200 mb-4" />
                        {projectTasks.length > 0 ? (
                          projectTasks.map((task) => (
                            <TaskItem key={task.id} task={task} />
                          ))
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Nenhuma tarefa neste projeto</p>
                          </div>
                        )}
                        <div className="pt-4 border-t border-slate-100/50">
                          <TaskForm projectId={project.id} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>

      {/* Concluídas Gerais */}
      {generalCompletedTasks.length > 0 && (
        <details className="mt-10 group opacity-60 hover:opacity-100 transition-opacity">
          <summary className="cursor-pointer text-xs font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest list-none flex items-center gap-2">
            <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
            Concluídas Gerais ({generalCompletedTasks.length})
            <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
          </summary>
          <div className="mt-4 space-y-3">
            {generalCompletedTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
