import { useState, useEffect } from 'react'
import { useTasks, TASK_SELECT } from '../../hooks/useTasks'
import { useSections, useCreateSection } from '../../hooks/useSections'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'
import SectionGroup from './SectionGroup'
import { Loader2, ClipboardList, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function TaskList({ projectId, title, filterToday }) {
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
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">{title}</h1>

      {/* Tarefas sem seção */}
      <div className="space-y-0.5">
        {unsectioned.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>

      <div className="mt-2">
        <TaskForm projectId={projectId} />
      </div>

      {/* Seções */}
      {hasSections && sections.map((section) => {
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

      {/* Adicionar seção */}
      {projectId && (
        <div className="mt-4">
          {showNewSection ? (
            <form onSubmit={handleAddSection} className="flex items-center gap-2">
              <input
                autoFocus
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Nome da seção"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                onKeyDown={(e) => e.key === 'Escape' && setShowNewSection(false)}
              />
              <button type="submit" className="rounded bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-600">
                Criar
              </button>
              <button type="button" onClick={() => setShowNewSection(false)} className="rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewSection(true)}
              className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-indigo-500"
            >
              <Plus size={14} />
              Adicionar seção
            </button>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {pendingTasks.length === 0 && completedTasks.length === 0 && (
        <div className="mt-8 flex flex-col items-center text-gray-400">
          <ClipboardList size={48} strokeWidth={1} />
          <p className="mt-2 text-sm">Nenhuma tarefa ainda</p>
        </div>
      )}

      {/* Concluídas */}
      {(completedUnsectioned.length > 0 || (hasSections && completedTasks.length > 0)) && (
        <details className="mt-6">
          <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600">
            Concluídas ({completedTasks.length})
          </summary>
          <div className="mt-2 space-y-0.5">
            {completedUnsectioned.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
