import { useState } from 'react'
import { CalendarDays, Flag, Trash2, Hash, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import TaskDetailModal from './TaskDetailModal'

const PRIORITY_COLORS = {
  1: 'border-red-500 text-red-500',
  2: 'border-orange-500 text-orange-500',
  3: 'border-blue-500 text-blue-500',
  4: 'border-gray-300 text-gray-300',
}

const PRIORITY_LABELS = { 1: 'Urgente', 2: 'Alta', 3: 'Média', 4: 'Normal' }

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((date - today) / 86400000)
  if (diff < 0) return { text: 'Atrasada', className: 'text-red-500' }
  if (diff === 0) return { text: 'Hoje', className: 'text-green-600' }
  if (diff === 1) return { text: 'Amanhã', className: 'text-orange-500' }
  return { text: date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }), className: 'text-gray-500' }
}

function formatTime(timeStr) {
  if (!timeStr) return null
  return timeStr.slice(0, 5)
}

export default function TaskItem({ task }) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [showDetail, setShowDetail] = useState(false)

  const isCompleted = task.status === 'completed'
  const dateInfo = formatDate(task.due_date)
  const time = formatTime(task.due_time)
  const labels = (task.task_labels || []).map((tl) => tl.label).filter(Boolean)
  const subtasks = task.subtasks || []
  const completedSubs = subtasks.filter((s) => s.status === 'completed').length
  const hasSubtasks = subtasks.length > 0

  const toggleComplete = (e) => {
    e.stopPropagation()
    updateTask.mutate({
      id: task.id,
      status: isCompleted ? 'pending' : 'completed',
    })
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    deleteTask.mutate(task.id)
  }

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className={`group relative flex cursor-pointer items-start gap-4 rounded-[24px] p-5 transition-all duration-300 border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-md hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/5 ${isCompleted ? 'opacity-50' : ''}`}
      >
        <button
          onClick={toggleComplete}
          className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${PRIORITY_COLORS[task.priority]} ${isCompleted ? 'bg-current shadow-[0_0_10px_currentColor]' : 'hover:bg-current/10'}`}
        >
          {isCompleted && (
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-white">
              <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <p className={`text-base font-medium tracking-tight ${isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {dateInfo && (
              <span className={`flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs font-medium ${dateInfo.className}`}>
                <CalendarDays size={14} />
                {dateInfo.text}
                {time && (
                  <span className="flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
                    <Clock size={12} />
                    {time}
                  </span>
                )}
              </span>
            )}

            {task.priority < 4 && (
              <span className={`flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs font-medium ${PRIORITY_COLORS[task.priority].split(' ')[1]}`}>
                <Flag size={14} />
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}

            {task.project && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400">
                <Hash size={14} style={{ color: task.project.color }} />
                {task.project.name}
              </span>
            )}

            {labels.length > 0 && (
              <div className="flex items-center gap-1.5">
                {labels.map((label) => (
                  <span
                    key={label.id}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider"
                    style={{ backgroundColor: label.color, boxShadow: `0 0 10px ${label.color}40` }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lista de subtarefas inline */}
          {hasSubtasks && (
            <div className="mt-4 rounded-2xl bg-black/20 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-white/5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-500"
                    style={{ width: `${(completedSubs / subtasks.length) * 100}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold tracking-widest uppercase ${
                  completedSubs === subtasks.length ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {completedSubs}/{subtasks.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
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
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-all hover:bg-white/5"
                    >
                      {done ? (
                        <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-400" />
                      ) : (
                        <Circle size={14} className="flex-shrink-0 text-slate-600" />
                      )}
                      <span className={`text-xs font-medium ${
                        done ? 'text-slate-500 line-through' : 'text-slate-300'
                      }`}>
                        {sub.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleDelete}
          className="mt-1 hidden flex-shrink-0 rounded-xl p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 group-hover:block transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {showDetail && (
        <TaskDetailModal task={task} onClose={() => setShowDetail(false)} />
      )}
    </>
  )
}
