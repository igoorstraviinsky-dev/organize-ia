import React, { useState, FormEvent } from 'react'
import { Plus, Tag, Trash2, Pencil, Check } from 'lucide-react'
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel, Label } from '../../hooks/useLabels'

const LABEL_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface LabelManagerProps {
  onSelectLabel?: (id: string) => void
  selectedLabelId?: string | null
}

export default function LabelManager({ onSelectLabel, selectedLabelId }: LabelManagerProps) {
  const { data: labels = [], isLoading } = useLabels()
  const createLabel = useCreateLabel()
  const updateLabel = useUpdateLabel()
  const deleteLabel = useDeleteLabel()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    await createLabel.mutateAsync({ name: newName.trim(), color: newColor })
    setNewName('')
    setShowCreate(false)
  }

  const startEdit = (label: Label) => {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editName.trim() || !editingId) return
    await updateLabel.mutateAsync({ id: editingId, name: editName.trim(), color: editColor })
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 rounded-[32px] border border-white/5 shadow-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag size={20} className="text-purple-500 hidden sm:block" />
          <h1 className="text-xl font-display font-black text-white uppercase tracking-widest">Etiquetas</h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-xl shadow-purple-600/20 active:scale-95"
          title="Nova etiqueta"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-[24px] border border-purple-500/30 bg-[#0a0a0a] p-5 shadow-inner transition-all animate-in fade-in slide-in-from-top-4">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="NOME DA ETIQUETA..."
            className="w-full text-[13px] font-black tracking-widest uppercase text-white outline-none placeholder:text-slate-600 bg-transparent mb-4 border-b border-white/10 pb-2 focus:border-purple-500 transition-colors"
            onKeyDown={(e) => e.key === 'Escape' && setShowCreate(false)}
          />
          <div className="flex items-center gap-2 mb-6">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`relative h-6 w-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${newColor === c ? 'border-white shadow-lg scale-110 z-10' : 'border-[#0a0a0a]'}`}
                style={{ backgroundColor: c, boxShadow: newColor === c ? '0 0 15px ' + c : 'none' }}
              >
                {newColor === c && <Check size={12} strokeWidth={4} className="text-[#050505] absolute inset-0 m-auto" />}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
              CANCELAR
            </button>
            <button type="submit" disabled={createLabel.isPending} className="rounded-xl bg-purple-600 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50">
              CRIAR
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-purple-600 border-t-transparent shadow-[0_0_15px_rgba(147,51,234,0.5)]" />
        </div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-[32px] bg-white/5 border border-white/5">
          <Tag size={40} strokeWidth={2} className="text-white/10 mb-4" />
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Nenhuma Etiqueta</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
          {labels.map((label) => (
            <div key={label.id}>
              {editingId === label.id ? (
                <form onSubmit={handleEdit} className="rounded-[24px] border border-white/20 bg-white/5 p-5 shadow-2xl backdrop-blur-md animate-in zoom-in-95">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-sm font-black uppercase tracking-widest text-white outline-none bg-transparent border-b border-white/10 pb-2 focus:border-purple-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  />
                  <div className="mt-4 flex items-center gap-2 flex-wrap mb-5">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`relative h-6 w-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${editColor === c ? 'border-white shadow-lg scale-110 z-10' : 'border-transparent'}`}
                        style={{ backgroundColor: c, boxShadow: editColor === c ? '0 0 15px ' + c : 'none' }}
                      >
                         {editColor === c && <Check size={12} strokeWidth={4} className="text-[#050505] absolute inset-0 m-auto" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                      CANCELAR
                    </button>
                    <button type="submit" disabled={updateLabel.isPending} className="rounded-xl bg-purple-600 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-[#050505] hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/30 disabled:opacity-50">
                      SALVAR
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectLabel && onSelectLabel(label.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectLabel && onSelectLabel(label.id)}
                  className={`group relative flex w-full items-center gap-4 rounded-3xl px-5 py-4 transition-all duration-300 border cursor-pointer ${
                    selectedLabelId === label.id 
                      ? 'bg-purple-600/10 border-purple-500/30' 
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div 
                    className="h-4 w-4 rounded-full flex-shrink-0 shadow-lg" 
                    style={{ backgroundColor: label.color, boxShadow: '0 0 10px ' + label.color + '80' }} 
                  />
                  
                  <span className={`flex-1 text-left text-xs font-black uppercase tracking-widest truncate ${selectedLabelId === label.id ? 'text-white' : 'text-slate-300'}`}>
                    {label.name}
                  </span>
                  
                  <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-xl transition-colors ${
                    selectedLabelId === label.id 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' 
                      : 'bg-[#050505] text-slate-500 border border-white/5 group-hover:text-slate-400'
                  }`}>
                    {label.task_count || 0}
                  </span>
                  
                  <div className="absolute right-4 hidden items-center gap-2 group-hover:flex animate-in fade-in bg-[#101010]/80 px-2 py-1.5 rounded-xl backdrop-blur-md border border-white/5">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(label) }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-purple-500/20 hover:text-purple-400 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLabel.mutate(label.id) }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
