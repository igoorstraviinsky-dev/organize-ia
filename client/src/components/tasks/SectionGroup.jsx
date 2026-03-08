import { useState } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { useDeleteSection, useUpdateSection } from '../../hooks/useSections'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'

export default function SectionGroup({ section, tasks, projectId }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(section.name)
  const [showMenu, setShowMenu] = useState(false)

  const deleteSection = useDeleteSection()
  const updateSection = useUpdateSection()

  const handleRename = (e) => {
    e.preventDefault()
    if (name.trim() && name !== section.name) {
      updateSection.mutate({ id: section.id, name: name.trim() })
    }
    setEditing(false)
  }

  return (
    <div className="mt-4">
      <div className="group flex items-center gap-2 border-b border-gray-200 pb-1">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>

        {editing ? (
          <form onSubmit={handleRename} className="flex-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              className="w-full border-none bg-transparent text-sm font-semibold text-gray-700 outline-none"
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            />
          </form>
        ) : (
          <h3 className="flex-1 text-sm font-semibold text-gray-700">{section.name}</h3>
        )}

        <span className="text-xs text-gray-400">{tasks.length}</span>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="hidden rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 group-hover:block"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => { setEditing(true); setShowMenu(false) }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={12} /> Renomear
                </button>
                <button
                  onClick={() => { deleteSection.mutate({ id: section.id, project_id: projectId }); setShowMenu(false) }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-1">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          <TaskForm projectId={projectId} sectionId={section.id} />
        </div>
      )}
    </div>
  )
}
