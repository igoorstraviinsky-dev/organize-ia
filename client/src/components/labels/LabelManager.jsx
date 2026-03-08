import { useState } from 'react'
import { Plus, Tag, Trash2, Pencil, X } from 'lucide-react'
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from '../../hooks/useLabels'

const LABEL_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function LabelManager({ onSelectLabel, selectedLabelId }) {
  const { data: labels = [], isLoading } = useLabels()
  const createLabel = useCreateLabel()
  const updateLabel = useUpdateLabel()
  const deleteLabel = useDeleteLabel()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    await createLabel.mutateAsync({ name: newName.trim(), color: newColor })
    setNewName('')
    setShowCreate(false)
  }

  const startEdit = (label) => {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    await updateLabel.mutateAsync({ id: editingId, name: editName.trim(), color: editColor })
    setEditingId(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Etiquetas</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white transition-all shadow-lg shadow-brand-purple/20"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da etiqueta"
            className="w-full text-sm outline-none placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Escape' && setShowCreate(false)}
          />
          <div className="mt-2 flex items-center gap-1">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full border-2 ${newColor === c ? 'border-gray-800' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
              Cancelar
            </button>
            <button type="submit" className="rounded bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600">
              Criar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-8 text-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent mx-auto" /></div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center py-12 rounded-2xl bg-slate-50 border border-slate-100">
          <Tag size={32} strokeWidth={1.5} className="text-slate-300" />
          <p className="mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Vazio</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {labels.map((label) => (
            <div key={label.id}>
              {editingId === label.id ? (
                <form onSubmit={handleEdit} className="premium-card p-3 border border-slate-200 shadow-sm">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent"
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  />
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`h-4 w-4 rounded-full border ${editColor === c ? 'ring-2 ring-slate-200 outline outline-2 outline-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 px-2 py-1">
                      Cancelar
                    </button>
                    <button type="submit" className="rounded-lg bg-brand-purple px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-brand-purple/90 shadow-sm">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => onSelectLabel && onSelectLabel(label.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all border ${
                    selectedLabelId === label.id 
                      ? 'bg-brand-purple/5 border-brand-purple/10 text-brand-purple font-bold' 
                      : 'border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-left text-xs font-semibold">{label.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedLabelId === label.id ? 'bg-brand-purple/20 text-brand-purple' : 'bg-slate-100 text-slate-500'}`}>
                    {label.task_count}
                  </span>
                  <div className="hidden items-center gap-1 group-hover:flex">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(label) }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-navy shadow-sm border border-slate-100"
                    >
                      <Pencil size={12} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLabel.mutate(label.id) }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 shadow-sm border border-slate-100"
                    >
                      <Trash2 size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
