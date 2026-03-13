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
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTasks, useUpdateTask, Task } from '../../hooks/useTasks'
import { useSections, useCreateSection } from '../../hooks/useSections'
import KanbanCard from './KanbanCard'
import TaskForm from './TaskForm'

const STATUS_COLUMNS = [
  { key: 'pending', label: 'Pendente', gradient: 'bg-slate-500/10 text-slate-400', iconColor: 'bg-slate-500' },
  { key: 'in_progress', label: 'Em Progresso', gradient: 'bg-purple-500/10 text-purple-400', iconColor: 'bg-purple-500' },
  { key: 'completed', label: 'Concluída', gradient: 'bg-emerald-500/10 text-emerald-400', iconColor: 'bg-emerald-500' },
]

const COL_PREFIX = 'col::'

interface SortableCardProps {
  task: Task & { _columnId?: string };
}

function SortableCard({ task }: SortableCardProps) {
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
        className="rounded-[24px] border-2 border-dashed border-purple-500/20 bg-purple-500/5 opacity-40 h-24"
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

interface DroppableColumnProps {
  columnId: string;
  title: string;
  gradient: string;
  count: number;
  taskIds: string[];
  children: React.ReactNode;
  onAddClick: () => void;
  isAdding: boolean;
  projectId: string;
  sectionId: string | null;
  onCloseAdd: () => void;
  isOver: boolean;
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
}: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: COL_PREFIX + columnId,
    data: { type: 'column', columnId },
  })

  return (
    <div className="flex w-[320px] flex-shrink-0 flex-col">
      <div className="mb-6 flex items-center gap-4 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-lg font-black text-[10px] shadow-lg ${gradient}`}
        >
          {count}
        </div>
        <h3 className="text-[11px] font-black tracking-[0.3em] text-slate-300 uppercase">
          {title}
        </h3>
        <button
          onClick={onAddClick}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-white/10 hover:text-purple-400 active:scale-90"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-4 rounded-[24px] p-3 transition-all duration-300 ${
          isOver
            ? 'bg-purple-600/5 ring-1 ring-purple-600/20'
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
              sectionId={sectionId || undefined}
              onClose={onCloseAdd}
            />
          </div>
        )}

        {!isAdding && count === 0 && (
          <button
            onClick={onAddClick}
            className="group flex flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-white/5 bg-white/[0.02] px-6 py-16 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 transition-all hover:border-purple-500/30 hover:bg-white/[0.05] hover:text-purple-400 dark-neo-recessed"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:scale-110 group-hover:border-purple-500/40 transition-all shadow-2xl">
              <Plus size={24} strokeWidth={3} className="text-slate-500 group-hover:text-purple-500" />
            </div>
            <span>Adicionar tarefa</span>
          </button>
        )}
      </div>
    </div>
  )
}

export interface KanbanBoardProps {
  projectId: string;
}

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { data: tasks = [] } = useTasks(projectId)
  const { data: sections = [] } = useSections(projectId)
  const createSection = useCreateSection()
  const updateTask = useUpdateTask()

  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

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

  const taskColumnMap = useMemo(() => {
    const map: Record<string, string> = {}
    parentTasks.forEach((t) => {
      if (hasSections) {
        map[t.id] = t.section_id || '__unsectioned__'
      } else {
        map[t.id] = t.status
      }
    })
    return map
  }, [parentTasks, hasSections])

  function resolveTargetColumn(overId: any, overData: any) {
    if (!overId) return null

    const overIdStr = String(overId)

    if (overIdStr.startsWith(COL_PREFIX)) {
      return overIdStr.slice(COL_PREFIX.length)
    }

    if (overData?.type === 'column') {
      return overData.columnId
    }

    return taskColumnMap[overId] || null
  }

  function handleDragStart(event: DragStartEvent) {
    const task = parentTasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) {
      setOverColumnId(null)
      return
    }
    const col = resolveTargetColumn(over.id, over.data?.current)
    setOverColumnId(col)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    setOverColumnId(null)

    if (!over || !active) return

    const activeId = active.id as string
    const targetColumnId = resolveTargetColumn(over.id, over.data?.current)
    if (!targetColumnId) return

    const sourceColumnId = taskColumnMap[activeId]
    if (sourceColumnId === targetColumnId) return

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

  function getColumnTasks(columnId: string) {
    return parentTasks
      .filter((t) => taskColumnMap[t.id] === columnId)
      .map((t) => ({ ...t, _columnId: columnId }))
  }

  const dragOverlayContent = activeTask ? (
    <div className="rotate-[2deg] scale-105">
      <KanbanCard task={activeTask} isDraggingOverlay />
    </div>
  ) : null

  if (hasSections) {
    const unsectionedTasks = getColumnTasks('__unsectioned__')

    const handleAddSection = async (e: React.FormEvent) => {
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
              gradient="bg-purple-600/10 text-purple-400"
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
            <form onSubmit={handleAddSection} className="px-3">
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="+ Nova seção..."
                className="w-full rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-5 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 outline-none transition-all placeholder:text-slate-800 focus:border-purple-500/40 focus:bg-white/5 focus:text-purple-400 dark-neo-recessed"
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
