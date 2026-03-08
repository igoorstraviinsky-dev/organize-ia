import { useState, useEffect } from 'react'
import {
  X, CalendarDays, Clock, Flag, Users, Trash2, Save,
} from 'lucide-react'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import SubtaskList from './SubtaskList'
import { supabase } from '../../lib/supabase'

const PRIORITIES = [
  { value: 1, label: 'P1 — Urgente', color: 'bg-red-500', dot: 'bg-red-500' },
  { value: 2, label: 'P2 — Alta', color: 'bg-orange-500', dot: 'bg-orange-500' },
  { value: 3, label: 'P3 — Média', color: 'bg-blue-500', dot: 'bg-blue-500' },
  { value: 4, label: 'P4 — Normal', color: 'bg-gray-300', dot: 'bg-gray-400' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
]

export default function TaskDetailModal({ task, onClose }) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [dueTime, setDueTime] = useState(task.due_time ? task.due_time.slice(0, 5) : '')
  const [assignEmail, setAssignEmail] = useState('')
  const [assignError, setAssignError] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

  const subtasks = task.subtasks || []
  const labels = (task.task_labels || []).map((tl) => tl.label).filter(Boolean)

  // Carregar assignments
  useEffect(() => {
    async function loadAssignments() {
      const { data } = await supabase
        .from('assignments')
        .select('id, user_id, assigned_at, profiles:profiles(full_name, email)')
        .eq('task_id', task.id)
      if (data) setAssignments(data)
    }
    loadAssignments()
  }, [task.id])

  // Detectar mudanças
  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || '') ||
      priority !== task.priority ||
      status !== task.status ||
      dueDate !== (task.due_date || '') ||
      dueTime !== (task.due_time ? task.due_time.slice(0, 5) : '')
    setHasChanges(changed)
  }, [title, description, priority, status, dueDate, dueTime, task])

  const handleSave = async () => {
    await updateTask.mutateAsync({
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status,
      due_date: dueDate || null,
      due_time: dueTime || null,
    })
    setHasChanges(false)
  }

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id)
    onClose()
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assignEmail.trim()) return
    setAssignError(null)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', assignEmail.trim())
      .single()

    if (!profile) {
      setAssignError('Usuário não encontrado')
      return
    }

    const alreadyAssigned = assignments.some((a) => a.user_id === profile.id)
    if (alreadyAssigned) {
      setAssignError('Já atribuído a este usuário')
      return
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({ task_id: task.id, user_id: profile.id })
      .select('id, user_id, assigned_at')
      .single()

    if (error) {
      setAssignError(error.message)
      return
    }

    setAssignments([...assignments, { ...data, profiles: profile }])
    setAssignEmail('')
  }

  const handleUnassign = async (assignmentId) => {
    await supabase.from('assignments').delete().eq('id', assignmentId)
    setAssignments(assignments.filter((a) => a.id !== assignmentId))
  }

  // Fechar com Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Painel lateral */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-500">Detalhes da Tarefa</h2>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
              >
                <Save size={12} />
                Salvar
              </button>
            )}
            <button
              onClick={handleDelete}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">

            {/* Título */}
            <div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                placeholder="Título da tarefa"
              />
            </div>

            {/* Descrição */}
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500"
                placeholder="Adicionar descrição..."
              />
            </div>

            {/* Grid de campos */}
            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <CalendarDays size={12} /> Data
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              {/* Hora */}
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                  <Clock size={12} /> Hora
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Labels */}
            {labels.length > 0 && (
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-500">Etiquetas</label>
                <div className="flex flex-wrap gap-1">
                  {labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Designados */}
            <div>
              <label className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-500">
                <Users size={12} /> Designados
              </label>

              {assignments.length > 0 && (
                <div className="mb-2 space-y-1">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="group flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                        {(a.profiles?.full_name || a.profiles?.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{a.profiles?.full_name}</p>
                        <p className="text-xs text-gray-400">{a.profiles?.email}</p>
                      </div>
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="hidden rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAssign} className="flex items-center gap-2">
                <input
                  value={assignEmail}
                  onChange={(e) => { setAssignEmail(e.target.value); setAssignError(null) }}
                  placeholder="Email do usuário..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                {assignEmail.trim() && (
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
                  >
                    Atribuir
                  </button>
                )}
              </form>
              {assignError && (
                <p className="mt-1 text-xs text-red-500">{assignError}</p>
              )}
            </div>

            {/* Subtarefas */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <SubtaskList parentId={task.id} projectId={task.project_id} subtasks={subtasks} />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
