import { useState } from 'react'
import LabelManager from '../components/labels/LabelManager'
import { useTasksByLabel } from '../hooks/useTasks'
import TaskItem from '../components/tasks/TaskItem'
import { Tag } from 'lucide-react'

export default function LabelsPage() {
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const { data: tasks = [] } = useTasksByLabel(selectedLabelId || '')

  return (
    <div className="flex gap-8">
      <div className="w-64 flex-shrink-0">
        <LabelManager onSelectLabel={setSelectedLabelId} selectedLabelId={selectedLabelId} />
      </div>

      <div className="flex-1">
        {selectedLabelId ? (
          <div>
            <h2 className="mb-6 text-xl font-extrabold text-slate-800 tracking-tight">
              Tarefas com esta etiqueta
            </h2>
            {tasks.length === 0 ? (
              <div className="p-12 text-center rounded-2xl dark-neo-recessed bg-[#0a0a0a]/40 border border-white/10 shadow-lg">
                <p className="text-sm font-semibold text-slate-400">Nenhuma tarefa encontrada com esta etiqueta.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 rounded-3xl dark-neo-recessed bg-[#0a0a0a]/40 border-2 border-dashed border-white/10">
            <Tag size={48} strokeWidth={1} className="text-purple-500/50" />
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Selecione uma etiqueta ao lado para ver as tarefas associadas.</p>
          </div>
        )}
      </div>
    </div>
  )
}
