import TaskItem from './TaskItem';
import { getUrgency } from '../utils/getUrgency';

const URGENCY_RANK = { red: 2, yellow: 1, null: 0 };

function sortByUrgency(tasks, warningHours, criticalHours) {
  return [...tasks].sort((a, b) => {
    const ra = URGENCY_RANK[getUrgency(a.createdAt, warningHours, criticalHours)] ?? 0;
    const rb = URGENCY_RANK[getUrgency(b.createdAt, warningHours, criticalHours)] ?? 0;
    if (rb !== ra) return rb - ra; // higher urgency first
    return b.createdAt - a.createdAt; // newer first within same urgency group
  });
}

function applyFilter(tasks, filter) {
  if (filter === 'today') {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    return tasks.filter(t => t.createdAt >= startOfToday);
  }
  return tasks;
}

export default function TaskList({ tasks, filter, onEdit, onDelete, onComplete, onUncomplete, urgencySettings }) {
  const { warning, critical } = urgencySettings;
  const incomplete = tasks.filter(t => t.completedAt === null);
  const completed = tasks.filter(t => t.completedAt !== null);

  const visibleIncomplete = sortByUrgency(applyFilter(incomplete, filter), warning, critical);
  const visibleCompleted = [...completed].sort(
    (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)
  );

  return (
    <>
      <section className="task-section">
        <h2 className="section-heading">Tasks</h2>
        {visibleIncomplete.length === 0 ? (
          <p className="empty-state">No tasks yet. Add one above.</p>
        ) : (
          visibleIncomplete.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              urgencySettings={urgencySettings}
            />
          ))
        )}
      </section>

      <section className="task-section">
        <h2 className="section-heading">Completed</h2>
        {visibleCompleted.length === 0 ? (
          <p className="empty-state">Nothing completed yet.</p>
        ) : (
          visibleCompleted.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              urgencySettings={urgencySettings}
            />
          ))
        )}
      </section>
    </>
  );
}
