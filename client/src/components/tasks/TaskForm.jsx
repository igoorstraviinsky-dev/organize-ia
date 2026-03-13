import { useState, useEffect } from 'react'
import { Plus, CalendarDays, Flag, Clock, Tag, X } from 'lucide-react'
import { useCreateTask } from '../../hooks/useTasks'
import { useProjects } from '../../hooks/useProjects'
import { useSections } from '../../hooks/useSections'
import { useLabels } from '../../hooks/useLabels'

const PRIORITIES = [
  { value: 1, label: 'Urgente', color: 'text-red-500' },
  { value: 2, label: 'Alta', color: 'text-orange-500' },
  { value: 3, label: 'Média', color: 'text-blue-500' },
  { value: 4, label: 'Normal', color: 'text-gray-400' },
]

export default function TaskForm({ projectId, sectionId, parentId, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(4)
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '')
  const [selectedSectionId, setSelectedSectionId] = useState(sectionId || '')
  const [selectedLabelIds, setSelectedLabelIds] = useState([])
  const [showLabels, setShowLabels] = useState(false)
  const [expanded, setExpanded] = useState(!!onClose)
  const [error, setError] = useState(null)

  const createTask = useCreateTask()
  const { data: projects = [] } = useProjects()

  // Sincronizar props com state quando mudar de projeto/seção
  useEffect(() => {
    setSelectedProjectId(projectId || '')
  }, [projectId])

  useEffect(() => {
    setSelectedSectionId(sectionId || '')
  }, [sectionId])

  // Buscar seções do projeto selecionado
  const activeProjectId = selectedProjectId || projectId || ''
  const { data: sections = [] } = useSections(activeProjectId || null)
  const { data: labels = [] } = useLabels()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        due_time: dueTime || null,
        project_id: activeProjectId || null,
        section_id: selectedSectionId || null,
        parent_id: parentId || null,
        label_ids: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setPriority(4)
      setDueDate('')
      setDueTime('')
      setSelectedLabelIds([])
      setError(null)
      if (onClose) onClose()
      else setExpanded(false)
    } catch (err) {
      console.error('Task creation failed:', err)
      setError(err.message || 'Erro ao criar tarefa. Tente novamente.')
    }
  }

  const toggleLabel = (labelId) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-[24px] px-8 py-5 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 transition-all hover:text-purple-400 bg-[#0a0a0a]/40 border border-dashed border-white/10 group dark-neo-recessed"
      >
        <Plus size={18} className="text-purple-500 group-hover:scale-125 transition-transform" />
        <span>Adicionar tarefa</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="jetted-glass p-8 border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-[32px]">
      {/* Glow effect background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-[80px] pointer-events-none" />
      
      {error && (
        <div className="mb-6 rounded-2xl bg-red-500/10 px-5 py-3 text-[11px] font-bold text-red-400 border border-red-500/20 uppercase tracking-widest">{error}</div>
      )}

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que precisa ser feito?"
        className="w-full bg-transparent text-xl font-black text-white outline-none placeholder:text-slate-700 tracking-tight"
        onKeyDown={(e) => e.key === 'Escape' && (onClose ? onClose() : setExpanded(false))}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Adicionar descrição detalhada..."
        className="mt-3 w-full bg-transparent text-[13px] font-medium text-slate-400 outline-none placeholder:text-slate-800"
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 transition-all hover:bg-white/10">
          <CalendarDays size={16} className="text-purple-500" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-transparent text-[11px] font-black text-slate-300 outline-none uppercase tracking-widest cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 transition-all hover:bg-white/10">
          <Clock size={16} className="text-purple-500" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="bg-transparent text-[11px] font-black text-slate-300 outline-none uppercase tracking-widest cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 transition-all hover:bg-white/10">
          <Flag size={16} className="text-purple-500" />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="bg-transparent text-[11px] font-black text-slate-300 outline-none uppercase tracking-widest cursor-pointer"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#1a1a1a] text-white font-bold">{p.label}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
              selectedLabelIds.length > 0 
                ? 'border-purple-500/40 bg-purple-500/10 text-purple-400' 
                : 'border-white/5 bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
            }`}
          >
            <Tag size={16} />
            {selectedLabelIds.length > 0 ? `${selectedLabelIds.length} etiquetas` : 'Etiquetas'}
          </button>
          
          {showLabels && labels.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLabels(false)} />
              <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="max-h-48 custom-scrollbar overflow-y-auto">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-50"
                    >
                      <span
                        className={`h-3 w-3 rounded-full border-2 transition-transform ${selectedLabelIds.includes(label.id) ? 'scale-110 border-transparent' : 'border-slate-200'}`}
                        style={{ backgroundColor: selectedLabelIds.includes(label.id) ? label.color : 'transparent' }}
                      />
                      <span>{label.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 flex justify-end gap-4 pt-6 border-t border-white/5">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : setExpanded(false))}
          className="rounded-2xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 transition-all hover:text-white hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="rounded-2xl bg-purple-600 px-8 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-[0_10px_30px_rgba(126,87,194,0.3)] transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-50"
        >
          {createTask.isPending ? 'Criando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
