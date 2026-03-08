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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Etiquetas</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
        >
          <Plus size={14} />
          Nova etiqueta
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
        <div className="py-8 text-center text-sm text-gray-400">Carregando...</div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <Tag size={40} strokeWidth={1} />
          <p className="mt-2 text-sm">Nenhuma etiqueta criada</p>
        </div>
      ) : (
        <div className="space-y-1">
          {labels.map((label) => (
            <div key={label.id}>
              {editingId === label.id ? (
                <form onSubmit={handleEdit} className="rounded-lg border border-gray-200 bg-white p-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-sm outline-none"
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  />
                  <div className="mt-2 flex items-center gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`h-4 w-4 rounded-full border-2 ${editColor === c ? 'border-gray-800' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <button type="button" onClick={() => setEditingId(null)} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                      Cancelar
                    </button>
                    <button type="submit" className="rounded bg-indigo-500 px-2 py-1 text-xs text-white hover:bg-indigo-600">
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => onSelectLabel && onSelectLabel(label.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    selectedLabelId === label.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-left">{label.name}</span>
                  <span className="text-xs text-gray-400">{label.task_count}</span>
                  <div className="hidden items-center gap-1 group-hover:flex">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(label) }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLabel.mutate(label.id) }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={12} />
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
