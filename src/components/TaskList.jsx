import { useState, useEffect, useRef } from 'react';
import TaskItem from './TaskItem';
import MoveToDropdown from './MoveToDropdown';
import { getUrgency } from '../utils/getUrgency';

const URGENCY_RANK = { red: 2, yellow: 1, null: 0 };
const COLLAPSE_KEY = 'todo-app-section-collapse';

function loadCollapse() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) ?? { watch: false, later: false };
  } catch {
    return { watch: false, later: false };
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
  const [newText, setNewText] = useState('');
  const [collapse, setCollapse] = useState(loadCollapse);
  const [openMoveId, setOpenMoveId] = useState(null);
  const listRef = useRef(null);

  // Persist collapse state.
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapse));
  }, [collapse]);

  // Close any open move-dropdown on outside click.
  useEffect(() => {
    if (!openMoveId) return;
    function handleClick(e) {
      if (listRef.current && !listRef.current.contains(e.target)) {
        setOpenMoveId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMoveId]);

  function handleAdd(e) {
    e.preventDefault();
    if (onAdd) onAdd(newText);
    setNewText('');
  }

  function toggleCollapse(list) {
    setCollapse(prev => ({ ...prev, [list]: !prev[list] }));
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
  function renderItem(task) {
    return (
      <div key={task.id} style={{ position: 'relative' }}>
        <TaskItem
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onMove={onMove ? (listId) => onMove(task.id, listId) : undefined}
          onOpenMoveDropdown={() => setOpenMoveId(task.id)}
          urgencySettings={urgencySettings}
        />
        {openMoveId === task.id && (
          <MoveToDropdown
            listId={task.listId}
            onMove={(listId) => { onMove(task.id, listId); setOpenMoveId(null); }}
            onClose={() => setOpenMoveId(null)}
          />
        )}
      </div>
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
    <div ref={listRef}>
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
          {visibleTodo.length === 0
            ? <p className="empty-state">No tasks. Add one above.</p>
            : visibleTodo.map(renderItem)
          }
        </section>
      )}

      {/* ── WATCH ── */}
      {visibleWatch.length > 0 && (
        <section className="task-section">
          <SectionHeader label="Watch" count={visibleWatch.length} collapsible listKey="watch" />
          {!collapse.watch && visibleWatch.map(renderItem)}
        </section>
      )}

      {/* ── LATER ── */}
      {visibleLater.length > 0 && (
        <section className="task-section">
          <SectionHeader label="Later" count={visibleLater.length} collapsible listKey="later" />
          {!collapse.later && visibleLater.map(renderItem)}
        </section>
      )}

      {/* ── COMPLETED ── */}
      {visibleCompleted.length > 0 && (
        <section className="task-section">
          <SectionHeader label="Completed" count={visibleCompleted.length} collapsible={false} />
          {visibleCompleted.map(renderItem)}
        </section>
      )}
    </div>
  );
}
