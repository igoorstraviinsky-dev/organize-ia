import React, { useState, useEffect } from 'react'
import {
  X, CalendarDays, Clock, Users, Trash2, Save, Plus,
} from 'lucide-react'
import { useUpdateTask, useDeleteTask, Task } from '../../hooks/useTasks'
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

export interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [dueTime, setDueTime] = useState(task.due_time ? task.due_time.slice(0, 5) : '')
  const [assignEmail, setAssignEmail] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [teamProfiles, setTeamProfiles] = useState<any[]>([])

  // Carregar assignments e profiles do time
  useEffect(() => {
    async function loadData() {
      // Carregar atribuições
      const { data: asgs } = await supabase
        .from('assignments')
        .select('id, user_id, assigned_at, profiles:profiles(full_name, email)')
        .eq('task_id', task.id)
      if (asgs) setAssignments(asgs)

      // Carregar time (mock/simplificado ou via API)
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
      if (profs) setTeamProfiles(profs)
    }
    loadData()
  }, [task.id])

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

  const handleQuickAssign = async (profile: any) => {
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

  const handleUnassign = async (assignmentId: string) => {
    await supabase.from('assignments').delete().eq('id', assignmentId)
    setAssignments(assignments.filter((a) => a.id !== assignmentId))
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      <div className="relative z-10 flex h-full max-h-[90vh] w-full max-w-3xl flex-col bg-[#050505] rounded-[48px] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-white/5 px-10 py-8 bg-[#0a0a0a]/50">
          <div className="flex-1 flex items-center gap-6 min-w-0">
            <div className="h-10 w-px bg-white/10 hidden sm:block" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-0 text-2xl font-black text-white outline-none placeholder:text-slate-800 bg-transparent truncate italic tracking-tight uppercase"
              placeholder="Título da tarefa..."
            />
          </div>
          <div className="flex items-center gap-4">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 text-[10px] font-black text-white hover:bg-purple-700 shadow-xl shadow-purple-600/20 transition-all active:scale-95"
              >
                <Save size={14} strokeWidth={3} />
                SALVAR
              </button>
            )}
            <button
              onClick={handleDelete}
              className="rounded-2xl p-3 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <Trash2 size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={onClose}
              className="group rounded-2xl p-3 text-slate-500 hover:bg-white/5 hover:text-white transition-all"
            >
              <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050505]">
          <div className="space-y-12 p-12">
            <div className="dark-neo-recessed p-10 rounded-[40px] border border-white/5 bg-[#0a0a0a]/40">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-black text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  ✓
                </div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Subtarefas</h3>
              </div>
              <SubtaskList parentId={task.id} projectId={task.project_id || ''} subtasks={(task.subtasks || []) as Task[]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-black text-white outline-none focus:border-purple-600 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#1a1a1a]">{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-2">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-black text-white outline-none focus:border-purple-600 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value} className="bg-[#1a1a1a]">{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-2">Data Limite</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-black text-white outline-none focus:border-purple-600 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pl-2">Horário</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-black text-white outline-none focus:border-purple-600 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-white/5">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-2">
                  <Users size={12} strokeWidth={3} className="text-purple-500" />
                  Equipe Atribuída
                </label>
                
                <div className="flex flex-wrap gap-3">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="group flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 transition-all hover:bg-white/10"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-purple-600 text-[10px] font-black text-white shadow-lg">
                        {(a.profiles?.full_name || a.profiles?.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <p className="text-[10px] font-black text-white uppercase">{a.profiles?.full_name?.split(' ')[0]}</p>
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="rounded-lg p-0.5 text-slate-500 hover:text-red-500 transition-all"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowOptions(!showOptions)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-dashed border-white/20 text-slate-500 hover:border-purple-500/50 hover:text-purple-400 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                    
                    {showOptions && (
                      <div className="absolute left-0 bottom-full z-20 mb-3 w-64 rounded-[24px] border border-white/10 bg-[#0a0a0a] p-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                        <div className="max-h-48 custom-scrollbar overflow-y-auto space-y-2">
                          {teamProfiles
                            .filter(p => !assignments.some(a => a.user_id === p.id))
                            .map(profile => (
                              <button
                                key={profile.id}
                                onClick={() => {
                                  handleQuickAssign(profile)
                                  setShowOptions(false)
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/5 transition-all text-left"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111] text-[10px] font-black text-slate-400 border border-white/5">
                                  {profile.full_name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-white uppercase truncate">{profile.full_name}</p>
                                  <p className="text-[10px] font-bold text-slate-600 truncate">{profile.email}</p>
                                </div>
                              </button>
                            ))
                          }
                          {teamProfiles.filter(p => !assignments.some(a => a.user_id === p.id)).length === 0 && (
                            <p className="p-4 text-center text-[10px] font-black text-slate-600 uppercase italic">Toda equipe atribuída</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Descrição Detalhada</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-[32px] border border-white/5 bg-white/5 px-8 py-6 text-sm font-medium text-slate-300 outline-none focus:border-purple-600/40 focus:bg-white/10 transition-all"
                  placeholder="Instruções e detalhes adicionais..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
