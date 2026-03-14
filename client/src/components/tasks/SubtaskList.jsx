import { useState } from 'react'
import { Plus, Circle, CheckCircle2, Trash2, ListChecks } from 'lucide-react'
import { useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks'

export default function SubtaskList({ parentId, projectId, subtasks = [] }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const completed = subtasks.filter((s) => s.status === 'completed').length
  const total = subtasks.length

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        parent_id: parentId,
        project_id: projectId,
      })
      setTitle('')
    } catch (err) {
      setError(err.message || 'Erro ao criar subtarefa')
    }
  }

  const toggleSubtask = (subtask) => {
    updateTask.mutate({
      id: subtask.id,
      status: subtask.status === 'completed' ? 'pending' : 'completed',
    })
  }

  const removeSubtask = (subtaskId) => {
    deleteTask.mutate(subtaskId)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <ListChecks size={14} />
        <span>Subtarefas</span>
        {total > 0 && (
          <span className="text-gray-400">({completed}/{total})</span>
        )}
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-400">
            {total > 0 ? Math.round((completed / total) * 100) : 0}%
          </span>
        </div>
      )}

      {/* Lista de subtarefas */}
      <div className="space-y-0.5">
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white"
          >
            <button
              onClick={() => toggleSubtask(sub)}
              className="flex-shrink-0 text-gray-400 hover:text-indigo-500"
            >
              {sub.status === 'completed' ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <Circle size={16} />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                sub.status === 'completed'
                  ? 'text-gray-400 line-through'
                  : 'text-gray-700'
              }`}
            >
              {sub.title}
            </span>
            <button
              onClick={() => removeSubtask(sub.id)}
              className="hidden flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Form para adicionar subtarefa — sempre visível */}
      {error && (
        <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</div>
      )}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Plus size={16} className="flex-shrink-0 text-gray-300" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Adicionar subtarefa..."
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
        />
        {title.trim() && (
          <button
            type="submit"
            disabled={createTask.isPending}
            className="rounded bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {createTask.isPending ? '...' : 'Criar'}
          </button>
        )}
      </form>
    </div>
  )
}
