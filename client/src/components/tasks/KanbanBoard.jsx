import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks, useUpdateTask } from '../../hooks/useTasks'
import { useSections, useCreateSection } from '../../hooks/useSections'
import KanbanCard from './KanbanCard'
import TaskForm from './TaskForm'

const STATUS_COLUMNS = [
  { key: 'pending', label: 'Pendente', gradient: 'from-slate-500/50 to-slate-600/50', iconColor: 'bg-slate-500' },
  { key: 'in_progress', label: 'Em Progresso', gradient: 'from-purple-500/50 to-blue-600/50', iconColor: 'bg-purple-500' },
  { key: 'completed', label: 'Concluída', gradient: 'from-emerald-500/50 to-teal-600/50', iconColor: 'bg-emerald-500' },
]

// Prefixo para IDs das colunas — evita conflito com UUIDs de tasks
const COL_PREFIX = 'col::'

function SortableCard({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task, columnId: task._columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 opacity-40"
      >
        <KanbanCard task={task} isPlaceholder />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <KanbanCard task={task} dragListeners={listeners} />
    </div>
  )
}

function DroppableColumn({
  columnId,
  title,
  gradient,
  count,
  taskIds,
  children,
  onAddClick,
  isAdding,
  projectId,
  sectionId,
  onCloseAdd,
  isOver,
}) {
  // Registra a coluna como área droppable no @dnd-kit
  const { setNodeRef } = useDroppable({
    id: COL_PREFIX + columnId,
    data: { type: 'column', columnId },
  })

  return (
    <div className="flex w-[320px] flex-shrink-0 flex-col">
      {/* Header da coluna */}
      <div className="mb-4 flex items-center gap-3 px-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-lg shadow-lg ${gradient} backdrop-blur-md`}
        >
          <span className="text-[10px] font-bold text-white leading-none">{count}</span>
        </div>
        <h3 className="text-xs font-bold tracking-[0.1em] text-white/70 uppercase">
          {title}
        </h3>
        <button
          onClick={onAddClick}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition-all hover:bg-white/5 hover:text-purple-400"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Corpo da coluna — ref do droppable aqui */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 rounded-[24px] p-3 border transition-all duration-300 ${
          isOver
            ? 'bg-purple-500/10 border-purple-500/30'
            : 'glass-surface bg-[#0A0A0A]/40 border-white/5 shadow-2xl shadow-black/20'
        }`}
        style={{ minHeight: '150px' }}
      >
        <div className="flex flex-col gap-3">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
        </div>

        {isAdding && (
          <div className="mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
            <TaskForm
              projectId={projectId}
              sectionId={sectionId}
              onClose={onCloseAdd}
            />
          </div>
        )}

        {!isAdding && count === 0 && (
          <button
            onClick={onAddClick}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] px-4 py-10 text-sm text-white/20 transition-all hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white/40"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
              <Plus size={16} />
            </div>
            <span className="font-medium">Adicionar tarefa</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ projectId }) {
  const { data: tasks = [] } = useTasks(projectId)
  const { data: sections = [] } = useSections(projectId)
  const createSection = useCreateSection()
  const updateTask = useUpdateTask()

  const [addingToColumn, setAddingToColumn] = useState(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [activeTask, setActiveTask] = useState(null)
  const [overColumnId, setOverColumnId] = useState(null)

  const parentTasks = useMemo(
    () => tasks.filter((t) => !t.parent_id),
    [tasks]
  )

  const hasSections = sections.length > 0

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Mapeia task → coluna
  const taskColumnMap = useMemo(() => {
    const map = {}
    parentTasks.forEach((t) => {
      if (hasSections) {
        map[t.id] = t.section_id || '__unsectioned__'
      } else {
        map[t.id] = t.status
      }
    })
    return map
  }, [parentTasks, hasSections])

  // Resolve o columnId real a partir de um over.id (pode ser um card ou uma coluna)
  function resolveTargetColumn(overId, overData) {
    if (!overId) return null

    const overIdStr = String(overId)

    // Se começa com prefixo, é uma coluna
    if (overIdStr.startsWith(COL_PREFIX)) {
      return overIdStr.slice(COL_PREFIX.length)
    }

    // Se o data diz que é coluna
    if (overData?.type === 'column') {
      return overData.columnId
    }

    // Senão é um card — busca a coluna dele
    return taskColumnMap[overId] || null
  }

  function handleDragStart(event) {
    const task = parentTasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragOver(event) {
    const { over } = event
    if (!over) {
      setOverColumnId(null)
      return
    }
    const col = resolveTargetColumn(over.id, over.data?.current)
    setOverColumnId(col)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveTask(null)
    setOverColumnId(null)

    if (!over || !active) return

    const activeId = active.id
    const targetColumnId = resolveTargetColumn(over.id, over.data?.current)
    if (!targetColumnId) return

    const sourceColumnId = taskColumnMap[activeId]
    if (sourceColumnId === targetColumnId) return

    // Atualiza a task no Supabase
    if (hasSections) {
      const newSectionId = targetColumnId === '__unsectioned__' ? null : targetColumnId
      updateTask.mutate({ id: activeId, section_id: newSectionId })
    } else {
      updateTask.mutate({ id: activeId, status: targetColumnId })
    }
  }

  function handleDragCancel() {
    setActiveTask(null)
    setOverColumnId(null)
  }

  // Agrupa tasks por coluna, adicionando _columnId a cada task
  function getColumnTasks(columnId) {
    return parentTasks
      .filter((t) => taskColumnMap[t.id] === columnId)
      .map((t) => ({ ...t, _columnId: columnId }))
  }

  const dragOverlayContent = activeTask ? (
    <div className="rotate-[2deg] scale-105">
      <KanbanCard task={activeTask} isDraggingOverlay />
    </div>
  ) : null

  // ─── Modo por seções ──────────────────────────────────────
  if (hasSections) {
    const unsectionedTasks = getColumnTasks('__unsectioned__')

    const handleAddSection = async (e) => {
      e.preventDefault()
      if (!newSectionName.trim()) return
      await createSection.mutateAsync({
        name: newSectionName.trim(),
        project_id: projectId,
        position: sections.length,
      })
      setNewSectionName('')
    }

    const allColumns = [
      ...(unsectionedTasks.length > 0
        ? [{ id: '__unsectioned__', name: 'Sem seção', tasks: unsectionedTasks }]
        : []),
      ...sections.map((s) => ({
        id: s.id,
        name: s.name,
        tasks: getColumnTasks(s.id),
      })),
    ]

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar px-2">
          {allColumns.map((col) => (
            <DroppableColumn
              key={col.id}
              columnId={col.id}
              title={col.name}
              gradient="from-indigo-500 to-indigo-600"
              count={col.tasks.length}
              taskIds={col.tasks.map((t) => t.id)}
              isOver={overColumnId === col.id}
              onAddClick={() =>
                setAddingToColumn(addingToColumn === col.id ? null : col.id)
              }
              isAdding={addingToColumn === col.id}
              projectId={projectId}
              sectionId={col.id === '__unsectioned__' ? null : col.id}
              onCloseAdd={() => setAddingToColumn(null)}
            >
              {col.tasks.map((task) => (
                <SortableCard key={task.id} task={task} />
              ))}
            </DroppableColumn>
          ))}

          <div className="w-[320px] flex-shrink-0">
            <form onSubmit={handleAddSection} className="px-2">
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="+ Nova seção..."
                className="w-full rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] px-5 py-4 text-sm font-semibold tracking-wide text-white/40 outline-none transition-all placeholder:text-white/20 focus:border-purple-500/40 focus:bg-purple-500/5 focus:text-white/70"
              />
            </form>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {dragOverlayContent}
        </DragOverlay>
      </DndContext>
    )
  }

  // ─── Modo por status ──────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar px-2">
        {STATUS_COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.key)
          return (
            <DroppableColumn
              key={col.key}
              columnId={col.key}
              title={col.label}
              gradient={col.gradient}
              count={colTasks.length}
              taskIds={colTasks.map((t) => t.id)}
              isOver={overColumnId === col.key}
              onAddClick={() =>
                setAddingToColumn(addingToColumn === col.key ? null : col.key)
              }
              isAdding={addingToColumn === col.key}
              projectId={projectId}
              sectionId={null}
              onCloseAdd={() => setAddingToColumn(null)}
            >
              {colTasks.map((task) => (
                <SortableCard key={task.id} task={task} />
              ))}
            </DroppableColumn>
          )
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {dragOverlayContent}
      </DragOverlay>
    </DndContext>
  )
}
