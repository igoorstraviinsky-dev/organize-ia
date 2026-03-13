import { useState } from 'react'
import { CalendarDays, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useUpdateTask } from '../../hooks/useTasks'
import TaskDetailModal from './TaskDetailModal'

const PRIORITY_CONFIG = {
  1: { border: 'border-l-red-500', bg: 'bg-red-500/5', shadow: 'shadow-red-500/10', badge: 'bg-red-500/10 text-red-500 border border-red-500/20', label: 'Urgente' },
  2: { border: 'border-l-orange-400', bg: 'bg-orange-500/5', shadow: 'shadow-orange-500/10', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', label: 'Alta' },
  3: { border: 'border-l-blue-400', bg: 'bg-blue-500/5', shadow: 'shadow-blue-500/10', badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', label: 'Média' },
  4: { border: 'border-l-white/10', bg: 'bg-white/5', shadow: 'shadow-black/50', badge: 'bg-white/5 text-slate-500 border border-white/5', label: 'Normal' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((date - today) / 86400000)
  if (diff < 0) return { text: 'Atrasada', className: 'text-red-400 bg-red-500/[0.08] border border-red-500/10', icon: '' }
  if (diff === 0) return { text: 'Hoje', className: 'text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/10', icon: '' }
  if (diff === 1) return { text: 'Amanhã', className: 'text-orange-400 bg-orange-500/[0.08] border border-orange-500/10', icon: '' }
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
  const isCompleted = task.status === 'completed'
  const subtasks = task.subtasks || []
  const completedSubs = subtasks.filter((s) => s.status === 'completed').length
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[4]
  const cardColor = task?.creator?.theme_color || '#7c3aed'

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
          group relative cursor-grab rounded-[24px] border-l-[4px]
          transition-all duration-300 active:cursor-grabbing overflow-hidden border border-white/5
          ${isDraggingOverlay
            ? `shadow-2xl ${priorityConfig.shadow} ring-2 ring-purple-500/20 scale-105 rotate-2 bg-[#1a1a1a]`
            : `shadow-xl ${priorityConfig.shadow} hover:shadow-2xl hover:scale-[1.02] hover:border-white/10`
          }
        `}
        style={{
          borderLeftColor: cardColor,
          backgroundColor: `${cardColor}14`
        }}
      >

        <div className="p-4">
          {/* Top row: checkbox + title */}
          <div className="flex items-start gap-3">
            <button
              onClick={toggleComplete}
              className="mt-0.5 flex-shrink-0 transition-opacity"
            >
              {isCompleted ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : (
                <Circle size={18} className="text-slate-300 hover:text-brand-purple transition-colors" />
              )}
            </button>
            <p
              className={`flex-1 text-[13px] leading-snug font-black tracking-tight ${
                isCompleted
                  ? 'text-slate-600 line-through'
                  : 'text-white'
              }`}
            >
              {task.title}
            </p>
          </div>

          {/* Description preview */}
          {task.description && !isCompleted && (
            <p className="mt-2 ml-[31px] text-xs leading-relaxed text-slate-500 line-clamp-2 font-semibold">
              {task.description}
            </p>
          )}

          {/* Labels */}
          {task.task_labels?.length > 0 && (
            <div className="mt-2.5 ml-[30px] flex flex-wrap gap-1.5">
              {task.task_labels.map((tl) => (
                <span
                  key={tl.id || tl}
                  className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm ring-1 ring-black/5"
                  style={{
                    backgroundColor: tl.color || '#6366f1',
                    boxShadow: `0 2px 4px ${(tl.color || '#6366f1')}40`,
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }}
                >
                  {tl.name || tl}
                </span>
              ))}
            </div>
          )}

          {/* Lista de subtarefas inline */}
          {subtasks.length > 0 && (
            <div className="mt-3 ml-[31px] space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                    style={{ width: `${(completedSubs / subtasks.length) * 100}%` }}
                  />
                </div>
                <span className={`text-[10px] font-black tracking-widest ${
                  completedSubs === subtasks.length ? 'text-emerald-500' : 'text-slate-600'
                }`}>
                  {completedSubs}/{subtasks.length}
                </span>
              </div>
              {!isCompleted && subtasks.map((sub) => {
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
                    className="flex cursor-pointer items-center gap-2 transition-all hover:bg-slate-50 py-0.5"
                  >
                    {done ? (
                      <CheckCircle2 size={12} className="flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle size={12} className="flex-shrink-0 text-slate-300" />
                    )}
                    <span className={`text-[11px] font-semibold leading-tight ${
                      done ? 'text-slate-400 line-through' : 'text-slate-600'
                    }`}>
                      {sub.title}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom bar: metadata */}
          <div className="mt-4 ml-[31px] flex flex-wrap items-center gap-2">
            {/* Date badge */}
            {dateInfo && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-tight ${dateInfo.className}`}
              >
                <CalendarDays size={12} />
                {dateInfo.text}
                {time && (
                  <>
                    <span className="mx-0.5 opacity-30">•</span>
                    <Clock size={11} />
                    {time}
                  </>
                )}
              </span>
            )}

            {/* Priority badge (only for high priorities) */}
            {task.priority < 4 && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${priorityConfig.badge}`}
              >
                {priorityConfig.label}
              </span>
            )}

            {/* Avatares dos Designados */}
            {task.assignments && task.assignments.length > 0 && (
              <div className="flex -space-x-2 ml-auto">
                {task.assignments.map((asg) => (
                  <div 
                    key={asg.user_id}
                    title={asg.profiles?.full_name}
                    className="h-6 w-6 rounded-full border border-white/20 bg-black flex items-center justify-center overflow-hidden transition-all hover:scale-125 hover:z-10 shadow-lg shadow-black/50"
                  >
                    {asg.profiles?.avatar_url ? (
                      <img src={asg.profiles.avatar_url} alt={asg.profiles.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400">
                        {asg.profiles?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
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
