import { useState } from 'react'
import { CalendarDays, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useUpdateTask } from '../../hooks/useTasks'
import TaskDetailModal from './TaskDetailModal'

const PRIORITY_CONFIG = {
  1: { border: 'border-l-red-500', bg: 'bg-red-500/10', shadow: 'shadow-red-500/20', badge: 'bg-red-500/20 text-red-400', label: 'Urgente' },
  2: { border: 'border-l-orange-400', bg: 'bg-orange-500/10', shadow: 'shadow-orange-500/20', badge: 'bg-orange-500/20 text-orange-400', label: 'Alta' },
  3: { border: 'border-l-blue-400', bg: 'bg-blue-500/10', shadow: 'shadow-blue-500/20', badge: 'bg-blue-500/20 text-blue-400', label: 'Média' },
  4: { border: 'border-l-white/10', bg: 'bg-white/5', shadow: 'shadow-black/20', badge: 'bg-white/10 text-slate-400', label: 'Normal' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((date - today) / 86400000)
  if (diff < 0) return { text: 'Atrasada', className: 'text-red-400 bg-red-500/10 border border-red-500/20', icon: '🔴' }
  if (diff === 0) return { text: 'Hoje', className: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20', icon: '' }
  if (diff === 1) return { text: 'Amanhã', className: 'text-amber-400 bg-amber-500/10 border border-amber-500/20', icon: '' }
  return {
    text: date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
    className: 'text-slate-400 bg-white/5 border border-white/5',
    icon: '',
  }
}

function formatTime(timeStr) {
  if (!timeStr) return null
  return timeStr.slice(0, 5)
}

export default function KanbanCard({ task, dragListeners, isDraggingOverlay, isPlaceholder }) {
  const updateTask = useUpdateTask()
  const [showDetail, setShowDetail] = useState(false)

  const dateInfo = formatDate(task.due_date)
  const time = formatTime(task.due_time)
  const labels = (task.task_labels || []).map((tl) => tl.label).filter(Boolean)
  const isCompleted = task.status === 'completed'
  const subtasks = task.subtasks || []
  const completedSubs = subtasks.filter((s) => s.status === 'completed').length
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[4]

  const toggleComplete = (e) => {
    e.stopPropagation()
    updateTask.mutate({
      id: task.id,
      status: isCompleted ? 'pending' : 'completed',
    })
  }

  if (isPlaceholder) {
    return <div className="h-24 rounded-xl" />
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    if (!isDraggingOverlay) setShowDetail(true)
  }

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        {...dragListeners}
        className={`
          group relative cursor-grab rounded-[20px] border-l-[4px] backdrop-blur-md
          transition-all duration-300 active:cursor-grabbing
          ${priorityConfig.border}
          ${isDraggingOverlay
            ? `bg-white/10 shadow-2xl ${priorityConfig.shadow} ring-2 ring-white/20 scale-105 rotate-2`
            : `bg-white/[0.03] border-white/5 shadow-lg ${priorityConfig.shadow} hover:bg-white/[0.06] hover:scale-[1.02] hover:border-white/10`
          }
        `}
      >

        <div className="p-3 pl-4">
          {/* Top row: checkbox + title */}
          <div className="flex items-start gap-2.5">
            <button
              onClick={toggleComplete}
              className="mt-0.5 flex-shrink-0 transition-all hover:scale-110 active:scale-95"
            >
              {isCompleted ? (
                <CheckCircle2 size={18} className="text-emerald-400" />
              ) : (
                <Circle size={18} className="text-white/20 hover:text-purple-400 transition-colors" />
              )}
            </button>
            <p
              className={`flex-1 text-[13px] leading-snug font-semibold tracking-tight ${
                isCompleted
                  ? 'text-slate-500 line-through'
                  : 'text-white/90'
              }`}
            >
              {task.title}
            </p>
          </div>

          {/* Description preview */}
          {task.description && !isCompleted && (
            <p className="mt-2 ml-[30px] text-xs leading-relaxed text-slate-400 line-clamp-2 font-medium">
              {task.description}
            </p>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <div className="mt-2.5 ml-[30px] flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-sm"
                  style={{
                    backgroundColor: label.color,
                    boxShadow: `0 1px 3px ${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Lista de subtarefas inline */}
          {subtasks.length > 0 && (
            <div className="mt-3 ml-[30px] space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    style={{ width: `${(completedSubs / subtasks.length) * 100}%` }}
                  />
                </div>
                <span className={`text-[9px] font-bold tracking-tighter ${
                  completedSubs === subtasks.length ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {completedSubs}/{subtasks.length}
                </span>
              </div>
              {subtasks.map((sub) => {
                const done = sub.status === 'completed'
                return (
                  <div
                    key={sub.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      updateTask.mutate({
                        id: sub.id,
                        status: done ? 'pending' : 'completed',
                      })
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-all hover:bg-white/5 active:scale-95"
                  >
                    {done ? (
                      <CheckCircle2 size={12} className="flex-shrink-0 text-emerald-400" />
                    ) : (
                      <Circle size={12} className="flex-shrink-0 text-white/20" />
                    )}
                    <span className={`text-[11px] font-medium leading-tight ${
                      done ? 'text-slate-500 line-through' : 'text-slate-300'
                    }`}>
                      {sub.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom bar: metadata */}
          <div className="mt-2.5 ml-[30px] flex flex-wrap items-center gap-2">
            {/* Date badge */}
            {dateInfo && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${dateInfo.className}`}
              >
                <CalendarDays size={10} />
                {dateInfo.text}
                {time && (
                  <>
                    <span className="mx-0.5 text-[8px] opacity-40">•</span>
                    <Clock size={9} />
                    {time}
                  </>
                )}
              </span>
            )}

            {/* Priority badge (only for high priorities) */}
            {task.priority < 4 && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${priorityConfig.badge}`}
              >
                {priorityConfig.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {showDetail && (
        <TaskDetailModal task={task} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}
