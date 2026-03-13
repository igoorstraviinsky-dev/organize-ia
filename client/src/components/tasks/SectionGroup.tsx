import React, { useState } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { useDeleteSection, useUpdateSection, Section } from '../../hooks/useSections'
import { Task } from '../../hooks/useTasks'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'

export interface SectionGroupProps {
  section: Section;
  tasks: Task[];
  projectId: string;
}

export default function SectionGroup({ section, tasks, projectId }: SectionGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(section.name)
  const [showMenu, setShowMenu] = useState(false)

  const deleteSection = useDeleteSection()
  const updateSection = useUpdateSection()

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && name !== section.name) {
      updateSection.mutate({ id: section.id, name: name.trim() })
    }
    setEditing(false)
  }

  return (
    <div className="mt-8">
      <div className="group flex items-center gap-3 border-b border-white/5 pb-2 mb-4">
        <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-purple-400 transition-all">
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>

        {editing ? (
          <form onSubmit={handleRename} className="flex-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              className="w-full border-none bg-transparent text-sm font-bold text-white outline-none"
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            />
          </form>
        ) : (
          <h3 className="flex-1 text-sm font-extrabold text-white uppercase tracking-widest">{section.name}</h3>
        )}

        <span className="text-[10px] font-bold bg-white/5 text-slate-500 px-2 py-0.5 rounded-full">{tasks.length}</span>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-slate-700 bg-slate-900 py-1.5 shadow-xl">
                <button
                  onClick={() => { setEditing(true); setShowMenu(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  <Pencil size={14} /> Renomear
                </button>
                <button
                  onClick={() => { deleteSection.mutate({ id: section.id, project_id: projectId }); setShowMenu(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Excluir seção
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-2 space-y-3">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          <div className="pt-2">
            <TaskForm projectId={projectId} sectionId={section.id} />
          </div>
        </div>
      )}
    </div>
  )
}
