import { useAllTasks, Task } from '../hooks/useTasks'
import TaskItem from '../components/tasks/TaskItem'
import { CalendarRange, Loader2 } from 'lucide-react'

function getDayLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000)

  if (diff < 0) return 'Atrasadas'
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'

  const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  const formatted = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${formatted}`
}

function groupByDate(tasks: Task[]) {
  const groups: Record<string, Task[]> = {}
  const noDate: Task[] = []

  for (const task of tasks) {
    if (!task.due_date) {
      noDate.push(task)
      continue
    }
    const label = getDayLabel(task.due_date)
    if (!groups[label]) groups[label] = []
    groups[label].push(task)
  }

  const sorted = Object.entries(groups).sort((a, b) => {
    const aDate = a[1][0]?.due_date || ''
    const bDate = b[1][0]?.due_date || ''
    return aDate.localeCompare(bDate)
  })

  if (noDate.length > 0) {
    sorted.push(['Sem data', noDate])
  }

  return sorted
}

export default function Upcoming() {
  const { data: tasks = [], isLoading } = useAllTasks()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const grouped = groupByDate(tasks)

  return (
    <div>
      <div className="border-b border-slate-100 pb-6 mb-8">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Em Breve</h1>
        <p className="text-sm font-semibold text-slate-400 mt-1">Visualize suas próximas tarefas organizadas cronologicamente.</p>
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-3xl bg-white border border-slate-100 shadow-sm">
          <CalendarRange size={48} strokeWidth={1.5} className="text-slate-200" />
          <p className="mt-4 text-sm font-bold text-slate-400">Tudo em dia! Nenhuma tarefa programada para os próximos dias.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([label, groupTasks]) => (
            <div key={label}>
              <div className="flex items-center gap-3 mb-4 border-b border-slate-50 pb-2">
                <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${label === 'Atrasadas' ? 'text-red-500' : 'text-slate-400'}`}>
                  {label}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${label === 'Atrasadas' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                  {groupTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {groupTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
