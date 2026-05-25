import { useState, useEffect, useRef } from 'react';
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

// Project card for Work mode — shows sub-tasks inline, has its own completion checkbox
function ProjectCard({
  project,
  subTasks,
  onAddSubTask,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
  onUncompleteTask,
  onRename,
  onDelete,
  onMove,
  onComplete,
  onUncomplete,
  urgencySettings,
  todayCount,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [newSubTask, setNewSubTask] = useState('');
  const [moveOpen, setMoveOpen] = useState(false);
  const moveRef = useRef(null);

  useEffect(() => {
    if (!moveOpen) return;
    function handleClickOutside(e) {
      if (moveRef.current && !moveRef.current.contains(e.target)) setMoveOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moveOpen]);

  const activeSubs = subTasks.filter(t => !t.completedAt);
  const doneSubs = subTasks.filter(t => t.completedAt);
  const allDone = subTasks.length > 0 && activeSubs.length === 0;
  const isDone = project.completedAt !== null;

  function startRename() {
    setRenameText(project.name);
    setRenaming(true);
  }

  function commitRename() {
    if (renameText.trim()) onRename(renameText.trim());
    setRenaming(false);
  }

  function handleAddSub(e) {
    e.preventDefault();
    onAddSubTask(newSubTask, project.id);
    setNewSubTask('');
  }

  const SECTION_LABELS = { todo: 'Todo', watch: 'Watch', later: 'Later' };
  const moveTargets = ['todo', 'watch', 'later'].filter(l => l !== project.listId);

  return (
    <div className={`project-card${isDone ? ' project-card--done' : ''}`}>
      <div className="project-card-header">
        <div className="project-card-left">
          <input
            type="checkbox"
            className="task-checkbox"
            checked={isDone}
            disabled={!allDone && !isDone}
            title={!allDone && !isDone ? 'Complete all sub-tasks first' : undefined}
            onChange={() => isDone ? onUncomplete(project.id) : onComplete(project.id)}
          />
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
            <span
              className={`project-card-name${isDone ? ' project-card-name--done' : ''}`}
              onDoubleClick={!isDone ? startRename : undefined}
              title={!isDone ? 'Double-click to rename' : undefined}
            >
              {project.name}
              {subTasks.length > 0 && (
                <span className="project-card-progress">
                  {doneSubs.length}/{subTasks.length}
                </span>
              )}
            </span>
          )}
        </div>

        {!renaming && (
          <div className="project-card-controls">
            {!isDone && (
              <div ref={moveRef} style={{ position: 'relative' }}>
                <button
                  className="project-card-action"
                  onClick={() => setMoveOpen(o => !o)}
                  aria-label="Move project"
                >
                  ↗
                </button>
                {moveOpen && (
                  <div className="move-dropdown" role="menu">
                    {moveTargets.map(target => (
                      <button
                        key={target}
                        className="move-dropdown-item"
                        role="menuitem"
                        onClick={() => { onMove(project.id, target); setMoveOpen(false); }}
                      >
                        Move to {SECTION_LABELS[target]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              className="project-card-action project-card-action--delete"
              onClick={() => {
                if (window.confirm(`Delete "${project.name}"? All its tasks will be removed.`)) {
                  onDelete(project.id);
                }
              }}
              aria-label="Delete project"
            >
              ×
            </button>
            <button
              className="section-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand project' : 'Collapse project'}
            >
              {collapsed ? '▸' : '▾'}
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="project-card-body">
          {activeSubs.map(t => (
            <TaskItem
              key={t.id}
              task={t}
              isSubTask
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onComplete={onCompleteTask}
              onUncomplete={onUncompleteTask}
              urgencySettings={urgencySettings}
              todayCount={todayCount}
            />
          ))}
          {doneSubs.map(t => (
            <TaskItem
              key={t.id}
              task={t}
              isSubTask
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onComplete={onCompleteTask}
              onUncomplete={onUncompleteTask}
              urgencySettings={urgencySettings}
              todayCount={todayCount}
            />
          ))}
          {!isDone && (
            <form className="add-form add-form--inline add-form--subtask" onSubmit={handleAddSub}>
              <input
                className="add-input"
                type="text"
                placeholder="Add sub-task..."
                value={newSubTask}
                onChange={e => setNewSubTask(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="add-btn">Add</button>
            </form>
          )}
          {subTasks.length === 0 && isDone === false && (
            <p className="empty-state empty-state--sm">No sub-tasks yet.</p>
          )}
        </div>
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
  mode,
  tasks,
  projects,
  filter,
  onAdd,
  onAddSubTask,
  onEdit,
  onDelete,
  onComplete,
  onUncomplete,
  onMove,
  urgencySettings,
  todayCount,
  onAddProject,
  onRenameProject,
  onMoveProject,
  onCompleteProject,
  onUncompleteProject,
  onDeleteProject,
}) {
  const { warning, critical } = urgencySettings;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [newText, setNewText] = useState('');
  const [collapse, setCollapse] = useState(loadCollapse);

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

  const startOfToday = new Date().setHours(0, 0, 0, 0);

  // Standalone tasks only (no sub-tasks)
  const standaloneTasks = tasks.filter(t => !t.projectId);
  const active = standaloneTasks.filter(t => !t.completedAt);
  const completedStandalone = standaloneTasks.filter(t => t.completedAt !== null);

  const todoTasks = active.filter(t => t.listId === 'todo');
  const watchTasks = active.filter(t => t.listId === 'watch');
  const laterTasks = active.filter(t => t.listId === 'later');

  function filterAndSort(list) {
    const filtered = filter === 'today' ? list.filter(t => t.createdAt >= startOfToday) : list;
    return sortByUrgency(filtered, warning, critical);
  }

  const visibleTodo = filterAndSort(todoTasks);
  const visibleWatch = sortByCreated(watchTasks);
  const visibleLater = sortByCreated(laterTasks);

  const visibleCompleted = filter === 'today'
    ? [...completedStandalone.filter(t => t.completedAt >= startOfToday)].sort((a, b) => b.completedAt - a.completedAt)
    : [...completedStandalone].sort((a, b) => b.completedAt - a.completedAt);

  // Work mode: projects bucketed by section
  const subTaskMap = {};
  if (mode === 'work') {
    for (const t of tasks.filter(t => t.projectId)) {
      if (!subTaskMap[t.projectId]) subTaskMap[t.projectId] = [];
      subTaskMap[t.projectId].push(t);
    }
  }

  const activeProjects = (mode === 'work' ? projects : []).filter(p => !p.completedAt);
  const completedProjects = (mode === 'work' ? projects : []).filter(p => p.completedAt !== null);

  const todoProjects = activeProjects.filter(p => p.listId === 'todo');
  const watchProjects = activeProjects.filter(p => p.listId === 'watch');
  const laterProjects = activeProjects.filter(p => p.listId === 'later');

  const totalTodo = visibleTodo.length + todoProjects.length;
  const showTodo = filter !== 'today' || totalTodo > 0;

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

  function renderTask(task, draggable = false) {
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
          todayCount={todayCount}
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

  function renderProjectCard(project) {
    return (
      <ProjectCard
        key={project.id}
        project={project}
        subTasks={subTaskMap[project.id] ?? []}
        onAddSubTask={onAddSubTask}
        onEditTask={onEdit}
        onDeleteTask={onDelete}
        onCompleteTask={onComplete}
        onUncompleteTask={onUncomplete}
        onRename={name => onRenameProject(project.id, name)}
        onDelete={onDeleteProject}
        onMove={onMoveProject}
        onComplete={onCompleteProject}
        onUncomplete={onUncompleteProject}
        urgencySettings={urgencySettings}
        todayCount={todayCount}
      />
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div>
        {/* ── TODO ── */}
        {showTodo && (
          <section className="task-section">
            <SectionHeader label="Todo" count={totalTodo} collapsible={false} />
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
              {visibleTodo.map(t => renderTask(t, true))}
              {mode === 'work' && todoProjects.map(renderProjectCard)}
              {totalTodo === 0 && <p className="empty-state">No tasks. Add one above.</p>}
            </DroppableSection>
            {mode === 'work' && <NewProjectRow onAdd={onAddProject} />}
          </section>
        )}

        {/* ── WATCH ── */}
        <section className="task-section">
          <SectionHeader
            label="Watch"
            count={visibleWatch.length + watchProjects.length}
            collapsible
            listKey="watch"
          />
          <DroppableSection id="watch">
            {!collapse.watch && (
              visibleWatch.length === 0 && watchProjects.length === 0
                ? <p className="empty-state">Move tasks here to keep an eye on them.</p>
                : <>
                    {visibleWatch.map(t => renderTask(t, true))}
                    {mode === 'work' && watchProjects.map(renderProjectCard)}
                  </>
            )}
          </DroppableSection>
        </section>

        {/* ── LATER ── */}
        <section className="task-section">
          <SectionHeader
            label="Later"
            count={visibleLater.length + laterProjects.length}
            collapsible
            listKey="later"
          />
          <DroppableSection id="later">
            {!collapse.later && (
              visibleLater.length === 0 && laterProjects.length === 0
                ? <p className="empty-state">Move tasks here to tackle another time.</p>
                : <>
                    {visibleLater.map(t => renderTask(t, true))}
                    {mode === 'work' && laterProjects.map(renderProjectCard)}
                  </>
            )}
          </DroppableSection>
        </section>

        {/* ── COMPLETED ── */}
        {(visibleCompleted.length > 0 || completedProjects.length > 0) && (
          <section className="task-section">
            <SectionHeader
              label="Completed"
              count={visibleCompleted.length + completedProjects.length}
              collapsible
              listKey="completed"
            />
            {!collapse.completed && (
              <>
                {visibleCompleted.map(t => renderTask(t, false))}
                {mode === 'work' && completedProjects.map(renderProjectCard)}
              </>
            )}
          </section>
        )}
      </div>
    </DndContext>
  );
}
