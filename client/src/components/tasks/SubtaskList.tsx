import React, { useState } from 'react'
import { Plus, Circle, CheckCircle2, Trash2 } from 'lucide-react'
import { useCreateTask, useUpdateTask, useDeleteTask, Task } from '../../hooks/useTasks'

export interface SubtaskListProps {
  parentId: string;
  projectId: string;
  subtasks?: Task[];
}

export default function SubtaskList({ parentId, projectId, subtasks = [] }: SubtaskListProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const completed = subtasks.filter((s) => s.status === 'completed').length
  const total = subtasks.length

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        parent_id: parentId,
        project_id: projectId,
        status: 'pending'
      })
      setTitle('')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar subtarefa')
    }
  }

  const toggleSubtask = (subtask: Task) => {
    updateTask.mutate({
      id: subtask.id,
      status: subtask.status === 'completed' ? 'pending' : 'completed',
    })
  }

  const removeSubtask = (subtaskId: string) => {
    deleteTask.mutate(subtaskId)
  }

  return (
    <div className="space-y-6">
      {total > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Progresso
            </span>
            <span className="text-[10px] font-black text-emerald-500">
              {completed}/{total} • {Math.round((completed / total) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="group flex items-center gap-4 rounded-2xl px-4 py-3 transition-all hover:bg-white/5 border border-transparent hover:border-white/5"
          >
            <button
              onClick={() => toggleSubtask(sub)}
              className="flex-shrink-0 transition-transform active:scale-90"
            >
              {sub.status === 'completed' ? (
                <CheckCircle2 size={20} className="text-emerald-500" />
              ) : (
                <Circle size={20} className="text-slate-600 group-hover:text-purple-400" />
              )}
            </button>
            <span
              className={`flex-1 text-sm font-semibold tracking-tight transition-all ${
                sub.status === 'completed'
                  ? 'text-slate-600 line-through'
                  : 'text-slate-300'
              }`}
            >
              {sub.title}
            </span>
            <button
              onClick={() => removeSubtask(sub.id)}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 rounded-xl p-2 text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="relative pt-2">
        {error && (
          <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-2 text-[10px] font-black text-red-500 uppercase tracking-widest border border-red-500/20">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="group flex items-center gap-4 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 focus-within:border-purple-500/40 focus-within:bg-white/10 transition-all">
          <Plus size={18} className="flex-shrink-0 text-slate-500 group-focus-within:text-purple-400" strokeWidth={3} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ADICIONAR NOVA SUBTAREFA..."
            className="flex-1 bg-transparent py-2 text-[11px] font-black text-white outline-none placeholder:text-slate-700 uppercase tracking-[0.2em]"
          />
          {title.trim() && (
            <button
              type="submit"
              disabled={createTask.isPending}
              className="rounded-xl bg-purple-600 px-4 py-1.5 text-[9px] font-black text-white hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20 uppercase tracking-widest"
            >
              {createTask.isPending ? '...' : 'Adicionar'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
