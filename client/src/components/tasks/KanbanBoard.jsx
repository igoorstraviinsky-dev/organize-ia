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
  { key: 'pending', label: 'Pendente', gradient: 'bg-slate-100 text-slate-500', iconColor: 'bg-slate-400' },
  { key: 'in_progress', label: 'Em Progresso', gradient: 'bg-brand-purple/10 text-brand-purple', iconColor: 'bg-brand-purple' },
  { key: 'completed', label: 'Concluída', gradient: 'bg-emerald-50 text-emerald-600', iconColor: 'bg-emerald-500' },
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
        className="rounded-2xl border-2 border-dashed border-brand-purple/20 bg-brand-purple/5 opacity-40"
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
      <div className="mb-5 flex items-center gap-3 px-3">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-lg font-bold text-[10px] ${gradient}`}
        >
          {count}
        </div>
        <h3 className="text-xs font-extrabold tracking-widest text-slate-800 uppercase">
          {title}
        </h3>
        <button
          onClick={onAddClick}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-brand-purple"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Corpo da coluna — ref do droppable aqui */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-4 rounded-[24px] p-3 transition-all duration-300 ${
          isOver
            ? 'bg-brand-purple/5 ring-1 ring-brand-purple/20'
            : 'bg-transparent'
        }`}
        style={{ minHeight: '150px' }}
      >
        <div className="flex flex-col gap-4">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
        </div>

        {isAdding && (
          <div className="mt-1">
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
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-sm text-slate-400 transition-all hover:border-brand-purple/30 hover:bg-brand-purple/5 hover:text-brand-purple"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 group-hover:border-brand-purple/20 transition-all">
              <Plus size={20} className="text-slate-400 group-hover:text-brand-purple" />
            </div>
            <span className="font-bold">Adicionar tarefa</span>
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
              gradient="bg-brand-purple/10 text-brand-purple"
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
            <form onSubmit={handleAddSection} className="px-3 pt-1">
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="+ Nova seção..."
                className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-5 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-400 outline-none transition-all placeholder:text-slate-300 focus:border-brand-purple/30 focus:bg-brand-purple/5 focus:text-brand-purple"
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
