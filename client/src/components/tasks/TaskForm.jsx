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
        className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-slate-50 hover:text-brand-purple border border-dashed border-slate-200"
      >
        <Plus size={18} className="text-brand-purple" />
        <span>Adicionar tarefa</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="premium-card p-5 border border-slate-200">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-500 border border-red-100">{error}</div>
      )}

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que precisa ser feito?"
        className="w-full bg-transparent text-base font-bold text-slate-800 outline-none placeholder:text-slate-300"
        onKeyDown={(e) => e.key === 'Escape' && (onClose ? onClose() : setExpanded(false))}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Adicionar descrição..."
        className="mt-2 w-full bg-transparent text-sm font-semibold text-slate-500 outline-none placeholder:text-slate-300"
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 transition-all hover:border-slate-200">
          <CalendarDays size={14} className="text-slate-400" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-slate-600 outline-none uppercase tracking-wide"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 transition-all hover:border-slate-200">
          <Clock size={14} className="text-slate-400" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-slate-600 outline-none uppercase tracking-wide"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 transition-all hover:border-slate-200">
          <Flag size={14} className="text-slate-400" />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="bg-transparent text-[11px] font-bold text-slate-600 outline-none uppercase tracking-wide cursor-pointer"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value} className="bg-white text-slate-800">{p.label}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
              selectedLabelIds.length > 0 
                ? 'border-brand-purple/20 bg-brand-purple/5 text-brand-purple' 
                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
            }`}
          >
            <Tag size={14} />
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

      <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-50">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : setExpanded(false))}
          className="rounded-xl px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="rounded-xl bg-brand-purple px-6 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg shadow-brand-purple/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {createTask.isPending ? 'Criando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
