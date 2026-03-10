import { useState, useEffect } from 'react'
import { useTasks, TASK_SELECT } from '../../hooks/useTasks'
import { useSections, useCreateSection } from '../../hooks/useSections'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import SectionGroup from './SectionGroup'
import { Loader2, ClipboardList, Plus, Activity, ClockAlert, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function TaskList({ projectId, title, filterToday }) {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks(projectId)
  const queryClient = useQueryClient()
  const { data: sections = [] } = useSections(projectId)
  const createSection = useCreateSection()
  const [newSectionName, setNewSectionName] = useState('')
  const [showNewSection, setShowNewSection] = useState(false)

  let filteredTasks = tasks
  if (filterToday) {
    const today = new Date().toISOString().split('T')[0]
    filteredTasks = tasks.filter((t) => t.due_date === today)
  }

  const pendingTasks = filteredTasks.filter((t) => t.status !== 'completed')
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed')

  const hasSections = sections.length > 0

  // Tarefas sem seção
  const unsectioned = pendingTasks.filter((t) => !t.section_id)
  const completedUnsectioned = completedTasks.filter((t) => !t.section_id)

  // Cálculos de KPI para Inbox/Today
  const isInboxOrToday = title === 'Inbox' || filterToday
  let avgCompletionText = '-'
  let criticalCount = 0
  let assignedCount = 0

  if (isInboxOrToday && tasks.length > 0) {
    const now = Date.now()
    let sumCompletionMs = 0
    let completedCount = 0

    tasks.forEach(t => {
      // Atenção Crítica
      if (t.status !== 'completed') {
        const updatedAt = new Date(t.updated_at || t.created_at).getTime()
        if ((now - updatedAt) / (1000 * 60 * 60) > 48) {
          criticalCount++
        }
      } else if (t.completed_at && t.created_at) {
        // Velocidade
        sumCompletionMs += (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime())
        completedCount++
      }

      // Atribuições a mim (Responsabilidade)
      if (t.status !== 'completed' && user?.id) {
        const hasAssignments = t.assignments && t.assignments.length > 0
        const isAssignedToMe = hasAssignments && t.assignments.some(a => a.user_id === user.id)
        const isCreator = t.creator_id === user.id
        
        if (isAssignedToMe || (!hasAssignments && isCreator)) {
          assignedCount++
        }
      }
    })

    if (completedCount > 0) {
      const avgHours = Math.round(sumCompletionMs / completedCount / (1000 * 60 * 60))
      if (avgHours < 24) avgCompletionText = `${avgHours}h`
      else avgCompletionText = `${Math.round(avgHours / 24)}d`
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

  return (
    <div className="space-y-6">
      {/* KPIs Dashboard */}
      {isInboxOrToday && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center gap-4">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Velocidade Média</p>
              <p className="text-xl font-black text-slate-800 leading-none mt-1">{avgCompletionText}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center gap-4">
            <div className={`rounded-lg p-3 ${criticalCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'}`}>
              <ClockAlert size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atenção Crítica</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="text-xl font-black text-slate-800 leading-none">{criticalCount}</p>
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
                <p className="text-xl font-black text-slate-800 leading-none">{assignedCount || 0}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">para mim</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarefas sem seção */}
      <div className="space-y-3">
        {unsectioned.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>

      <div className="mt-2">
        <TaskForm projectId={projectId} />
      </div>

      {/* Seções */}
      {hasSections && (
        <div className="space-y-8 mt-10">
          {sections.map((section) => {
            const sectionPending = pendingTasks.filter((t) => t.section_id === section.id)
            const sectionCompleted = completedTasks.filter((t) => t.section_id === section.id)
            return (
              <SectionGroup
                key={section.id}
                section={section}
                tasks={[...sectionPending, ...sectionCompleted]}
                projectId={projectId}
              />
            )
          })}
        </div>
      )}

      {/* Adicionar seção */}
      {projectId && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          {showNewSection ? (
            <form onSubmit={handleAddSection} className="flex items-center gap-2">
              <input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Nome da seção"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                onKeyDown={(e) => e.key === 'Escape' && setShowNewSection(false)}
              />
              <button type="submit" className="rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white hover:bg-brand-purple/90 transition-all shadow-md shadow-brand-purple/10">
                Criar
              </button>
              <button type="button" onClick={() => setShowNewSection(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewSection(true)}
              className="flex items-center gap-2 text-xs font-extrabold text-slate-400 hover:text-brand-purple uppercase tracking-widest transition-all"
            >
              <Plus size={14} />
              Adicionar seção
            </button>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {pendingTasks.length === 0 && completedTasks.length === 0 && (
        <div className="mt-20 flex flex-col items-center text-slate-300">
          <ClipboardList size={64} strokeWidth={1} />
          <p className="mt-4 text-sm font-semibold tracking-wide uppercase">Nenhuma tarefa ainda</p>
        </div>
      )}

      {/* Concluídas */}
      {(completedUnsectioned.length > 0 || (hasSections && completedTasks.length > 0)) && (
        <details className="mt-10 group">
          <summary className="cursor-pointer text-xs font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest list-none flex items-center gap-2">
            <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
            Concluídas ({completedTasks.length})
            <div className="h-px bg-slate-100 flex-1 group-open:hidden" />
          </summary>
          <div className="mt-4 space-y-3">
            {completedUnsectioned.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
