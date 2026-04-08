import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { getUrgency } from '../utils/getUrgency';

function formatTimestamp(ts) {
  const d = new Date(ts);
  const isToday = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + time;
}

const URGENCY_STYLES = {
  red: { background: '#F8D7DA', color: '#721c24', borderColor: '#f5c6cb' },
  yellow: { background: '#FFF3CD', color: '#856404', borderColor: '#ffeeba' },
};

export default function TaskItem({ task, onEdit, onDelete, onComplete, onUncomplete, urgencySettings }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [completing, setCompleting] = useState(false);
  const completeTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(completeTimerRef.current), []);

  const isDone = task.completedAt !== null;
  const { warning, critical } = urgencySettings ?? { warning: 24, critical: 48 };
  const urgency = isDone ? null : getUrgency(task.createdAt, warning, critical);
  const urgencyStyle = urgency ? URGENCY_STYLES[urgency] : {};

  function startEdit() {
    setEditText(task.text);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit(task.id, trimmed);
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditText(task.text);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }

  function handleBlur(e) {
    // If the user clicked the delete button, skip saving — delete fires next.
    if (e.relatedTarget?.dataset.action === 'delete') {
      setEditing(false);
      return;
    }
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit(task.id, trimmed);
    }
    setEditing(false);
  }

  function handleCheck() {
    if (isDone) {
      clearTimeout(completeTimerRef.current);
      setCompleting(false);
      onUncomplete(task.id);
    } else {
      clearTimeout(completeTimerRef.current);
      setCompleting(true);
      completeTimerRef.current = setTimeout(() => {
        setCompleting(false);
        onComplete(task.id);
      }, 600);
    }
  }

  return (
    <div className={`task-item${completing ? ' task-item--completing' : ''}`} style={urgencyStyle}>
      <input
        type="checkbox"
        checked={isDone || completing}
        onChange={handleCheck}
        className="task-checkbox"
      />
      {editing ? (
        <input
          className="task-edit-input"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <span
          className={`task-text${isDone ? ' task-text--completed' : ''}`}
          onClick={isDone ? undefined : startEdit}
          title={isDone ? undefined : 'Click to edit'}
        >
          {task.text}
          <span className="task-timestamp">{formatTimestamp(task.createdAt)}</span>
          {task.completedAt && (
            <span className="task-timestamp"> · done {formatTimestamp(task.completedAt)} · {(( task.completedAt - task.createdAt) / 3600000).toFixed(1)}h</span>
          )}
        </span>
      )}
      <button
        className="task-delete"
        data-action="delete"
        onClick={() => onDelete(task.id)}
        aria-label="Delete task"
        tabIndex={0}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
