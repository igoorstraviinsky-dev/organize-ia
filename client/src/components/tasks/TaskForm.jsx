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
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:text-indigo-500"
      >
        <Plus size={18} className="text-indigo-500" />
        <span>Adicionar tarefa</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-[#0A0A0A]/80 p-4 backdrop-blur-xl shadow-xl">
      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-medium text-red-400 border border-red-500/20">{error}</div>
      )}

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que precisa ser feito?"
        className="w-full bg-transparent text-[13px] font-semibold text-white outline-none placeholder:text-white/20"
        onKeyDown={(e) => e.key === 'Escape' && (onClose ? onClose() : setExpanded(false))}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Adicionar descrição..."
        className="mt-1.5 w-full bg-transparent text-[11px] font-medium text-slate-400 outline-none placeholder:text-white/10"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2 py-1 transition-all hover:bg-white/10">
          <CalendarDays size={12} className="text-slate-400" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-slate-300 outline-none uppercase tracking-tighter"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2 py-1 transition-all hover:bg-white/10">
          <Clock size={12} className="text-slate-400" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-slate-300 outline-none uppercase tracking-tighter"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2 py-1 transition-all hover:bg-white/10">
          <Flag size={12} className="text-slate-400" />
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="bg-transparent text-[10px] font-bold text-slate-300 outline-none uppercase tracking-tighter cursor-pointer"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value} className="bg-slate-900 text-white">{p.label}</option>
            ))}
          </select>
        </div>

        {!projectId && (
          <select
            value={selectedProjectId}
            onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedSectionId('') }}
            className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-500"
          >
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {sections.length > 0 && !sectionId && (
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-500"
          >
            <option value="">Sem seção</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-tighter transition-all hover:bg-white/10 ${
              selectedLabelIds.length > 0 
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' 
                : 'border-white/5 bg-white/5 text-slate-400'
            }`}
          >
            <Tag size={12} />
            {selectedLabelIds.length > 0 ? `${selectedLabelIds.length} etiquetas` : 'Etiquetas'}
          </button>
          {showLabels && labels.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLabels(false)} />
              <div className="absolute left-0 z-20 mt-2 w-56 rounded-[20px] border border-white/10 bg-[#0A0A0A]/95 p-2 backdrop-blur-xl shadow-2xl">
                <div className="max-h-48 custom-scrollbar overflow-y-auto">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-300 transition-all hover:bg-white/5"
                    >
                      <span
                        className={`h-3 w-3 rounded-full border-2 transition-transform ${selectedLabelIds.includes(label.id) ? 'scale-110 border-transparent shadow-[0_0_8px]' : 'border-white/20'}`}
                        style={{ 
                          backgroundColor: selectedLabelIds.includes(label.id) ? label.color : 'transparent',
                          borderColor: selectedLabelIds.includes(label.id) ? 'transparent' : undefined,
                          boxShadow: selectedLabelIds.includes(label.id) ? `0 0 12px ${label.color}60` : undefined
                        }}
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

      {selectedLabelIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedLabelIds.map((id) => {
            const label = labels.find((l) => l.id === id)
            if (!label) return null
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                <button type="button" onClick={() => toggleLabel(id)}>
                  <X size={10} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={() => (onClose ? onClose() : setExpanded(false))}
          className="rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 transition-all hover:bg-white/5 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {createTask.isPending ? 'Criando...' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
