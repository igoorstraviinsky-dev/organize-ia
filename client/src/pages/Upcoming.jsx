import { useAllTasks } from '../hooks/useTasks'
import TaskItem from '../components/tasks/TaskItem'
import { CalendarRange, Loader2 } from 'lucide-react'

function getDayLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((date - today) / 86400000)

  if (diff < 0) return 'Atrasadas'
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'

  const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' })
  const formatted = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${formatted}`
}

function groupByDate(tasks) {
  const groups = {}
  const noDate = []

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
      <h1 className="mb-4 text-xl font-bold text-gray-900">Em Breve</h1>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <CalendarRange size={48} strokeWidth={1} />
          <p className="mt-2 text-sm">Nenhuma tarefa programada</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, groupTasks]) => (
            <div key={label}>
              <h2 className={`mb-2 text-sm font-semibold ${label === 'Atrasadas' ? 'text-red-500' : 'text-gray-600'}`}>
                {label}
                <span className="ml-2 text-xs font-normal text-gray-400">{groupTasks.length}</span>
              </h2>
              <div className="space-y-0.5">
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
