import { useState } from 'react'
import { CalendarDays, Flag, Trash2, Hash, Clock, CheckCircle2, Circle, MessageSquare } from 'lucide-react'
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks'
import TaskDetailModal from './TaskDetailModal'
import { useAuth } from '../../hooks/useAuth'

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
  if (diff < 0) return { text: 'Atrasada', className: 'text-red-400' }
  if (diff === 0) return { text: 'Hoje', className: 'text-emerald-400' }
  if (diff === 1) return { text: 'Amanhã', className: 'text-orange-400' }
  return { text: date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }), className: 'text-slate-400' }
}

function formatTime(timeStr) {
  if (!timeStr) return null
  return timeStr.slice(0, 5)
}

function getRelativeTime(dateStr) {
  if (!dateStr) return ''
  const diffHours = Math.floor((Date.now() - new Date(dateStr)) / (1000 * 60 * 60))
  if (diffHours < 1) return 'Atualizada agora'
  if (diffHours < 24) return `Atualizada há ${diffHours}h`
  return `Atualizada há ${Math.floor(diffHours / 24)}d`
}

export default function TaskItem({ task }) {
  const { user } = useAuth()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [showDetail, setShowDetail] = useState(false)

  const isCompleted = task.status === 'completed'
  const dateInfo = formatDate(task.due_date)
  const time = formatTime(task.due_time)
  const relativeUpdate = getRelativeTime(task.updated_at || task.created_at)
  const subtasks = task.subtasks || []
  const completedSubs = subtasks.filter((s) => s.status === 'completed').length
  const hasSubtasks = subtasks.length > 0

  const isCold = !isCompleted && ((Date.now() - new Date(task.updated_at || task.created_at)) / (1000 * 60 * 60) > 48)
  const cardColor = task?.creator?.theme_color || '#7c3aed'
  const commentsCount = task.comments?.length || 0
  
  let originBadge = null;
  if (user?.id) {
    const isCreator = task.creator_id === user.id;
    const hasAssignments = task.assignments && task.assignments.length > 0;
    const isAssignedToMe = hasAssignments && task.assignments.some(a => a.user_id === user.id);

    if (isAssignedToMe && isCreator) originBadge = 'De: Mim';
    else if (isAssignedToMe && !isCreator) originBadge = 'Para: Mim';
    else if (!hasAssignments && isCreator) originBadge = 'De: Mim';
  }

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
        className={`group relative flex cursor-pointer items-start gap-4 md:gap-8 rounded-[24px] md:rounded-[32px] p-4 md:p-8 transition-all duration-500 overflow-hidden border
        ${isCompleted ? 'opacity-30 grayscale border-white/5' : isCold ? 'bg-orange-950/20 ring-1 ring-orange-500/30 border-orange-500/40' : 'dark-neo-recessed bg-[#0a0a0a]/40 shadow-[inset_8px_8px_16px_#000000,inset_-8px_-8px_16px_#151515]'}`}
        style={!isCompleted ? {
          borderColor: `${cardColor}33`,
          borderLeft: `6px solid ${cardColor}`,
          boxShadow: `0 10px 30px -15px ${cardColor}20`
        } : {}}
      >
        <button
          onClick={toggleComplete}
          className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${PRIORITY_COLORS[task.priority]} ${isCompleted ? 'bg-current' : 'hover:bg-current/10'}`}
        >
          {isCompleted && (
            <svg width="10" height="10" viewBox="0 0 12 12" className="text-white">
              <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="space-y-1">
            <p className={`text-base font-semibold tracking-tight ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
              {task.title}
            </p>

            {task.description && (
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
            )}

            {hasSubtasks && (
              <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                <CheckCircle2 size={12} className={completedSubs === subtasks.length ? 'text-brand-green' : 'text-slate-400'} />
                <span className="text-[11px] font-semibold">
                  {completedSubs}/{subtasks.length} subtarefas
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {dateInfo && (
              <span className={`flex items-center gap-1 rounded-lg bg-white/5 border border-white/5 px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${dateInfo.className}`}>
                <CalendarDays size={13} />
                {dateInfo.text}
                {time && (
                  <span className="flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
                    <Clock size={11} />
                    {time}
                  </span>
                )}
              </span>
            )}

            {task.priority < 4 && (
              <span className={`flex items-center gap-1 rounded-lg bg-white/5 border border-white/5 px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[task.priority].split(' ')[1]}`}>
                <Flag size={13} />
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}

            {commentsCount > 0 && (
              <span className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/5 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-purple-400 transition-colors">
                <MessageSquare size={13} />
                {commentsCount}
              </span>
            )}

            {task.project && (
              <span className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/5 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white/50">
                <Hash size={13} style={{ color: task.project.color }} />
                {task.project.name}
              </span>
            )}

            {commentsCount > 0 && (
              <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-400 border border-slate-100">
                <MessageSquare size={12} />
                {commentsCount}
              </span>
            )}

            {/* Avatares dos Designados */}
            {task.assignments && task.assignments.length > 0 && (
              <div className="flex -space-x-2 ml-1">
                {task.assignments.map((asg) => (
                  <div 
                    key={asg.user_id}
                    title={asg.profiles?.full_name}
                    className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden transition-transform hover:scale-110"
                  >
                    {asg.profiles?.avatar_url ? (
                      <img src={asg.profiles.avatar_url} alt={asg.profiles.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-500">
                        {asg.profiles?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {task.task_labels?.length > 0 && (
              <div className="flex items-center gap-1">
                {task.task_labels.map((tl) => (
                  <span
                    key={tl.id || tl}
                    className="rounded-lg px-2.5 py-1 text-[9px] font-black text-white uppercase tracking-widest ring-1 ring-black/5"
                    style={{ 
                      backgroundColor: tl.color || '#6366f1',
                      textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                    }}
                  >
                    {tl.name || tl}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            {originBadge && (
              <span 
                className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
                style={
                  originBadge === 'De: Mim' 
                    ? { backgroundColor: `${cardColor}1A`, color: cardColor }
                    : { backgroundColor: '#ecfdf5', color: '#059669' }
                }
              >
                {originBadge}
              </span>
            )}
            {relativeUpdate && !isCompleted && (
              <span className="text-[10px] font-semibold text-slate-400">
                {relativeUpdate}
              </span>
            )}
          </div>


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
