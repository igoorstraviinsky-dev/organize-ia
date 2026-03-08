import { useState } from 'react'
import LabelManager from '../components/labels/LabelManager'
import { useTasksByLabel } from '../hooks/useTasks'
import TaskItem from '../components/tasks/TaskItem'
import { Tag } from 'lucide-react'

export default function LabelsPage() {
  const [selectedLabelId, setSelectedLabelId] = useState(null)
  const { data: tasks = [] } = useTasksByLabel(selectedLabelId)

  return (
    <div className="flex gap-8">
      <div className="w-64 flex-shrink-0">
        <LabelManager onSelectLabel={setSelectedLabelId} selectedLabelId={selectedLabelId} />
      </div>

      <div className="flex-1">
        {selectedLabelId ? (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Tarefas com esta etiqueta
            </h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma tarefa com esta etiqueta</p>
            ) : (
              <div className="space-y-0.5">
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Tag size={40} strokeWidth={1} />
            <p className="mt-2 text-sm">Selecione uma etiqueta para ver as tarefas</p>
          </div>
        )}
      </div>
    </div>
  )
}
