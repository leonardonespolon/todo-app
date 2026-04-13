import { useState, useEffect } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core';
import TaskItem from './TaskItem';
import { getUrgency } from '../utils/getUrgency';

function DraggableTask({ task, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : {}),
    ...(isDragging ? { opacity: 0.5, zIndex: 999 } : {}),
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

function DroppableSection({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={isOver ? { outline: '2px dashed #ccc', borderRadius: 6 } : undefined}>
      {children}
    </div>
  );
}

const URGENCY_RANK = { red: 2, yellow: 1, null: 0 };
const COLLAPSE_KEY = 'todo-app-section-collapse';

function loadCollapse() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) ?? { watch: false, later: false, completed: false };
  } catch {
    return { watch: false, later: false, completed: false };
  }
}

function sortByUrgency(tasks, warningHours, criticalHours) {
  return [...tasks].sort((a, b) => {
    const ra = URGENCY_RANK[getUrgency(a.createdAt, warningHours, criticalHours)] ?? 0;
    const rb = URGENCY_RANK[getUrgency(b.createdAt, warningHours, criticalHours)] ?? 0;
    if (rb !== ra) return rb - ra;
    return b.createdAt - a.createdAt;
  });
}

function sortByCreated(tasks) {
  return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
}

export default function TaskList({
  tasks,
  filter,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  onUncomplete,
  onMove,
  urgencySettings,
}) {
  const { warning, critical } = urgencySettings;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [newText, setNewText] = useState('');
  const [collapse, setCollapse] = useState(loadCollapse);

  // Persist collapse state.
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapse));
  }, [collapse]);

  function handleAdd(e) {
    e.preventDefault();
    if (onAdd) onAdd(newText);
    setNewText('');
  }

  function toggleCollapse(list) {
    setCollapse(prev => ({ ...prev, [list]: !prev[list] }));
  }

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const task = tasks.find(t => t.id === active.id);
    if (!task || task.listId === over.id) return;
    onMove(active.id, over.id);
  }

  // ─── filtering ────────────────────────────────────────────────────────────
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  const active = tasks.filter(t => t.completedAt === null);
  const completed = tasks.filter(t => t.completedAt !== null);

  // Today filter: scoped to Todo and Completed only; Watch/Later always show all.
  const todoTasks = active.filter(t => t.listId === 'todo');
  const watchTasks = active.filter(t => t.listId === 'watch');
  const laterTasks = active.filter(t => t.listId === 'later');

  const visibleTodo = filter === 'today'
    ? sortByUrgency(todoTasks.filter(t => t.createdAt >= startOfToday), warning, critical)
    : sortByUrgency(todoTasks, warning, critical);

  const visibleWatch = sortByCreated(watchTasks); // always unfiltered
  const visibleLater = sortByCreated(laterTasks); // always unfiltered

  const visibleCompleted = filter === 'today'
    ? [...completed.filter(t => t.completedAt >= startOfToday)].sort((a, b) => b.completedAt - a.completedAt)
    : [...completed].sort((a, b) => b.completedAt - a.completedAt);

  // In Today view, hide Todo section when empty (unlike All view where it always shows).
  const showTodo = filter !== 'today' || visibleTodo.length > 0;

  // ─── render helpers ───────────────────────────────────────────────────────
  function renderItem(task, draggable = false) {
    const inner = (
      <div key={task.id} style={{ position: 'relative' }}>
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onMove={onMove}
          urgencySettings={urgencySettings}
        />
      </div>
    );
    if (!draggable) return inner;
    return (
      <DraggableTask key={task.id} task={task}>
        {inner}
      </DraggableTask>
    );
  }

  function SectionHeader({ label, count, collapsible, listKey }) {
    return (
      <div className="section-header-row">
        <h2 className="section-heading">
          {label}
          {count > 0 && <span className="section-count">{count}</span>}
        </h2>
        {collapsible && (
          <button
            className="section-collapse-btn"
            onClick={() => toggleCollapse(listKey)}
            aria-label={collapse[listKey] ? `Expand ${label}` : `Collapse ${label}`}
          >
            {collapse[listKey] ? '▸' : '▾'}
          </button>
        )}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
        {/* ── TODO ── */}
        {showTodo && (
          <section className="task-section">
            <SectionHeader label="Todo" count={visibleTodo.length} collapsible={false} />
            <form className="add-form add-form--inline" onSubmit={handleAdd}>
              <input
                className="add-input"
                type="text"
                placeholder="Add a task..."
                value={newText}
                onChange={e => setNewText(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="add-btn">Add</button>
            </form>
            <DroppableSection id="todo">
              {visibleTodo.length === 0
                ? <p className="empty-state">No tasks. Add one above.</p>
                : visibleTodo.map(t => renderItem(t, true))
              }
            </DroppableSection>
          </section>
        )}

        {/* ── WATCH ── */}
        <section className="task-section">
          <SectionHeader label="Watch" count={visibleWatch.length} collapsible listKey="watch" />
          <DroppableSection id="watch">
            {!collapse.watch && (
              visibleWatch.length === 0
                ? <p className="empty-state">Move tasks here to keep an eye on them.</p>
                : visibleWatch.map(t => renderItem(t, true))
            )}
          </DroppableSection>
        </section>

        {/* ── LATER ── */}
        <section className="task-section">
          <SectionHeader label="Later" count={visibleLater.length} collapsible listKey="later" />
          <DroppableSection id="later">
            {!collapse.later && (
              visibleLater.length === 0
                ? <p className="empty-state">Move tasks here to tackle another time.</p>
                : visibleLater.map(t => renderItem(t, true))
            )}
          </DroppableSection>
        </section>

        {/* ── COMPLETED ── */}
        {visibleCompleted.length > 0 && (
          <section className="task-section">
            <SectionHeader label="Completed" count={visibleCompleted.length} collapsible listKey="completed" />
            {!collapse.completed && visibleCompleted.map(t => renderItem(t, false))}
          </section>
        )}
      </div>
    </DndContext>
  );
}
