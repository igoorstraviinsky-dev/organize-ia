import { useState, useEffect } from 'react'
import {
  X, CalendarDays, Clock, Flag, Users, Trash2, Save,
} from 'lucide-react'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import { useTeam } from '../../hooks/useTeam'
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
  const [showOptions, setShowOptions] = useState(false)
  const { profiles } = useTeam()

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

  const handleQuickAssign = async (profile) => {
    setAssignError(null)
    const alreadyAssigned = assignments.some((a) => a.user_id === profile.id)
    if (alreadyAssigned) return

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
  }

  const handleUnassign = async (assignmentId) => {
    await supabase.from('assignments').delete().eq('id', assignmentId)
    setAssignments(assignments.filter((a) => a.id !== assignmentId))
  }

  // Fechar com Escape e Clique Fora
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const clickOutside = (e) => {
      if (showOptions && !e.target.closest('.assign-container')) {
        setShowOptions(false)
      }
    }
    document.addEventListener('keydown', handler)
    document.addEventListener('mousedown', clickOutside)
    return () => {
      document.removeEventListener('keydown', handler)
      document.removeEventListener('mousedown', clickOutside)
    }
  }, [onClose, showOptions])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[#17112E]/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Card Central */}
      <div className="relative z-10 flex h-full max-h-[85vh] w-full max-w-2xl flex-col bg-white rounded-[40px] shadow-2xl shadow-purple-900/20 overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 bg-slate-50/50">
          <div className="flex-1 flex items-center gap-6 min-w-0 mr-4">
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 whitespace-nowrap">Detalhes da Tarefa</h2>
              <div className="h-1 w-8 bg-[#8E44AD] rounded-full" />
            </div>
            
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-0 text-xl font-black text-[#17112E] outline-none placeholder:text-slate-300 bg-transparent truncate italic tracking-tight font-display"
              placeholder="Título da tarefa..."
            />
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-xl bg-[#8E44AD] px-4 py-2 text-xs font-bold text-white hover:bg-[#7D3C96] shadow-lg shadow-[#8E44AD]/20 transition-all active:scale-95"
              >
                <Save size={14} strokeWidth={2.5} />
                SALVAR
              </button>
            )}
            <button
              onClick={handleDelete}
              className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Excluir Tarefa"
            >
              <Trash2 size={18} strokeWidth={2.5} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-10 p-10">

            {/* Subtarefas */}
            <div className="rounded-[32px] border border-slate-100 bg-brand-purple/5 p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#8E44AD] text-[10px] font-black text-white shadow-sm">
                  ✓
                </div>
                <h3 className="text-[11px] font-black text-[#17112E] uppercase tracking-widest">Subtarefas</h3>
              </div>
              <SubtaskList parentId={task.id} projectId={task.project_id} subtasks={subtasks} />
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent" />

            {/* Grid de campos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#8E44AD] transition-all appearance-none cursor-pointer hover:bg-slate-50"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#8E44AD] transition-all appearance-none cursor-pointer hover:bg-slate-50"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CalendarDays size={12} strokeWidth={3} className="text-[#8E44AD]" /> Data
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#8E44AD] transition-all cursor-pointer"
                />
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} strokeWidth={3} className="text-[#8E44AD]" /> Hora
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-[#8E44AD] transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Seção Inferior: Labels e Designados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-slate-50/30 p-8 rounded-[32px] border border-dashed border-slate-200">
              {/* Labels */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Etiquetas</label>
                {task.task_labels?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {task.task_labels.map((tl) => (
                      <span
                        key={tl.label_id || tl.labels?.id}
                        className="rounded-xl px-3 py-1.5 text-xs font-black text-white shadow-sm ring-1 ring-black/5"
                        style={{ 
                          backgroundColor: tl.labels?.color || '#6366f1', 
                          textShadow: '0 1px 2px rgba(0,0,0,0.2)' 
                        }}
                      >
                        {(tl.labels?.name || tl.label || 'Sem Nome').toUpperCase()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-300 italic">Nenhuma etiqueta...</p>
                )}
              </div>

              {/* Designados */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={12} strokeWidth={3} className="text-[#8E44AD]" /> Designados
                  </label>
                  {profiles.length > 0 && assignments.length < profiles.length && (
                    <button 
                      onClick={async () => {
                        for (const p of profiles) {
                          if (!assignments.some(a => a.user_id === p.id)) {
                            const { data } = await supabase.from('assignments').insert({ task_id: task.id, user_id: p.id }).select('id, user_id, assigned_at').single()
                            if (data) setAssignments(prev => [...prev, { ...data, profiles: p }])
                          }
                        }
                      }}
                      className="text-[9px] font-black text-[#8E44AD] uppercase tracking-widest hover:underline"
                    >
                      Atribuir Toda Equipe
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {assignments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {assignments.map((a) => (
                        <div
                          key={a.id}
                          className="group flex items-center gap-2 rounded-full border border-slate-100 bg-white px-2 py-1 transition-all hover:shadow-sm"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#17112E] to-[#8E44AD] text-[8px] font-black text-white">
                            {(a.profiles?.full_name || a.profiles?.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <p className="text-[10px] font-black text-[#17112E] pr-1">{a.profiles?.full_name?.split(' ')[0]}</p>
                          <button
                            onClick={() => handleUnassign(a.id)}
                            className="rounded-full p-0.5 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <div className="relative">
                      <input
                        value={assignEmail}
                        onChange={(e) => { setAssignEmail(e.target.value); setAssignError(null); setShowOptions(true) }}
                        onFocus={() => setShowOptions(true)}
                        placeholder="Pesquisar colaborador..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium outline-none focus:border-[#8E44AD] focus:ring-4 focus:ring-[#8E44AD]/5 transition-all"
                      />
                      <Users size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    </div>

                    {showOptions && assignEmail.trim() && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
                        {profiles
                          .filter(p => 
                            (p.full_name?.toLowerCase().includes(assignEmail.toLowerCase()) || p.email?.toLowerCase().includes(assignEmail.toLowerCase())) &&
                            !assignments.some(a => a.user_id === p.id)
                          )
                          .map(profile => (
                            <button
                              key={profile.id}
                              onClick={() => {
                                handleQuickAssign(profile)
                                setAssignEmail('')
                                setShowOptions(false)
                              }}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                                {profile.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#17112E] truncate">{profile.full_name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
                              </div>
                            </button>
                          ))
                        }
                        {profiles.filter(p => (p.full_name?.toLowerCase().includes(assignEmail.toLowerCase()) || p.email?.toLowerCase().includes(assignEmail.toLowerCase())) && !assignments.some(a => a.user_id === p.id)).length === 0 && (
                          <p className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase italic">Nenhum resultado...</p>
                        )}
                      </div>
                    )}
                  </div>
                  {assignError && (
                    <p className="mt-1 text-[10px] font-black text-red-500 uppercase">{assignError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-5 py-4 text-base font-medium text-slate-700 outline-none focus:border-[#8E44AD] focus:ring-4 focus:ring-[#8E44AD]/5 transition-all shadow-sm"
                placeholder="Adicione detalhes sobre esta tarefa..."
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
