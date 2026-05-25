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

// Defined outside TaskList so React doesn't remount it on every parent render.
function ProjectGroup({ projectId, label, tasks, collapsed, onToggleCollapse, onAdd, onRename, onDelete, showHeader, renderItem }) {
  const [newText, setNewText] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (onAdd) onAdd(newText, projectId);
    setNewText('');
  }

  function startRename() {
    setRenameText(label);
    setRenaming(true);
  }

  function commitRename() {
    if (renameText.trim()) onRename(renameText.trim());
    setRenaming(false);
  }

  return (
    <div className="project-group">
      {showHeader && (
        <div className="project-group-header">
          <div className="project-group-left">
            {renaming ? (
              <input
                className="project-name-input"
                value={renameText}
                onChange={e => setRenameText(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenaming(false);
                }}
                autoFocus
              />
            ) : (
              <>
                <span
                  className="project-group-name"
                  onDoubleClick={onRename ? startRename : undefined}
                  title={onRename ? 'Double-click to rename' : undefined}
                >
                  {label}
                </span>
                {tasks.length > 0 && <span className="section-count">{tasks.length}</span>}
              </>
            )}
          </div>
          {!renaming && (
            <div className="project-group-controls">
              {onDelete && (
                <button
                  className="project-delete-btn"
                  onClick={onDelete}
                  aria-label={`Delete ${label}`}
                >
                  ×
                </button>
              )}
              <button
                className="section-collapse-btn"
                onClick={onToggleCollapse}
                aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
              >
                {collapsed ? '▸' : '▾'}
              </button>
            </div>
          )}
        </div>
      )}
      {!collapsed && (
        <>
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
          {tasks.length === 0
            ? <p className="empty-state">{projectId === null ? 'No tasks. Add one above.' : 'No tasks in this project.'}</p>
            : tasks.map(t => renderItem(t, true))
          }
        </>
      )}
    </div>
  );
}

function NewProjectRow({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  if (!adding) {
    return (
      <button className="new-project-btn" onClick={() => setAdding(true)}>
        + New project
      </button>
    );
  }

  return (
    <form
      className="new-project-form"
      onSubmit={e => {
        e.preventDefault();
        if (text.trim()) { onAdd(text); setText(''); }
        setAdding(false);
      }}
    >
      <input
        className="new-project-input"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Project name..."
        autoFocus
        onBlur={() => { setAdding(false); setText(''); }}
        onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setText(''); } }}
      />
    </form>
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
  onSetProject,
  urgencySettings,
  todayCount,
  projects,
  onAddProject,
  onRenameProject,
  onDeleteProject,
}) {
  const { warning, critical } = urgencySettings;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [collapse, setCollapse] = useState(loadCollapse);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapse));
  }, [collapse]);

  function toggleCollapse(key) {
    setCollapse(prev => ({ ...prev, [key]: !prev[key] }));
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

  const todoTasks = active.filter(t => t.listId === 'todo');
  const watchTasks = active.filter(t => t.listId === 'watch');
  const laterTasks = active.filter(t => t.listId === 'later');

  // Group todo tasks by project
  const inboxTasks = todoTasks.filter(t => !t.projectId);
  const projectTaskMap = {};
  for (const p of projects) {
    projectTaskMap[p.id] = todoTasks.filter(t => t.projectId === p.id);
  }

  // Apply today filter and sort within each group
  function filterAndSort(list) {
    const filtered = filter === 'today' ? list.filter(t => t.createdAt >= startOfToday) : list;
    return sortByUrgency(filtered, warning, critical);
  }

  const sortedInbox = filterAndSort(inboxTasks);
  const sortedProjects = projects.map(p => ({ ...p, tasks: filterAndSort(projectTaskMap[p.id] ?? []) }));

  const visibleWatch = sortByCreated(watchTasks);
  const visibleLater = sortByCreated(laterTasks);

  const visibleCompleted = filter === 'today'
    ? [...completed.filter(t => t.completedAt >= startOfToday)].sort((a, b) => b.completedAt - a.completedAt)
    : [...completed].sort((a, b) => b.completedAt - a.completedAt);

  const totalTodo = sortedInbox.length + sortedProjects.reduce((s, p) => s + p.tasks.length, 0);
  const showTodo = filter !== 'today' || totalTodo > 0;

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
          onSetProject={onSetProject}
          urgencySettings={urgencySettings}
          todayCount={todayCount}
          projects={projects}
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
            <SectionHeader label="Todo" count={totalTodo} collapsible={false} />
            <DroppableSection id="todo">
              <ProjectGroup
                key="inbox"
                projectId={null}
                label="Inbox"
                tasks={sortedInbox}
                collapsed={!!collapse.inbox}
                onToggleCollapse={() => toggleCollapse('inbox')}
                onAdd={onAdd}
                showHeader={projects.length > 0}
                renderItem={renderItem}
              />
              {sortedProjects.map(project => (
                <ProjectGroup
                  key={project.id}
                  projectId={project.id}
                  label={project.name}
                  tasks={project.tasks}
                  collapsed={!!collapse[`project-${project.id}`]}
                  onToggleCollapse={() => toggleCollapse(`project-${project.id}`)}
                  onAdd={onAdd}
                  onRename={name => onRenameProject(project.id, name)}
                  onDelete={() => onDeleteProject(project.id)}
                  showHeader={true}
                  renderItem={renderItem}
                />
              ))}
            </DroppableSection>
            <NewProjectRow onAdd={onAddProject} />
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
