import { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import TaskList from './components/TaskList';
import './App.css';

const DEFAULT_URGENCY = { warning: 24, critical: 48 };

function loadUrgencySettings() {
  try {
    const saved = localStorage.getItem('urgencySettings');
    return saved ? JSON.parse(saved) : DEFAULT_URGENCY;
  } catch {
    return DEFAULT_URGENCY;
  }
}

export default function App() {
  const { tasks, addTask, editTask, deleteTask, completeTask, uncompleteTask, moveTask } = useTasks();
  const [filter, setFilter] = useState('all');
  const [urgencySettings, setUrgencySettings] = useState(loadUrgencySettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(urgencySettings);
  const [settingsError, setSettingsError] = useState('');
  const settingsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  function openSettings() {
    setDraft(urgencySettings);
    setSettingsError('');
    setSettingsOpen(true);
  }

  function saveSettings() {
    const w = Math.max(1, Number(draft.warning) || 24);
    const c = Math.max(1, Number(draft.critical) || 48);
    if (w >= c) {
      setSettingsError('Warning must be less than Critical');
      return;
    }
    const validated = { warning: w, critical: c };
    setUrgencySettings(validated);
    localStorage.setItem('urgencySettings', JSON.stringify(validated));
    setSettingsError('');
    setSettingsOpen(false);
  }

  const completedTasks = tasks.filter(t => t.completedAt !== null);
  const avgCompletionHours = completedTasks.length > 0
    ? (completedTasks.reduce((sum, t) => sum + (t.completedAt - t.createdAt), 0) / completedTasks.length / 3600000).toFixed(1)
    : null;

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1 className="app-title">To Do</h1>
          {avgCompletionHours !== null && (
            <p className="avg-completion">Avg completion: {avgCompletionHours}h</p>
          )}
        </div>
        <div className="settings-wrapper" ref={settingsRef}>
          <button className="settings-btn" onClick={openSettings} aria-label="Settings">
            <Settings size={18} />
          </button>
          {settingsOpen && (
            <div className="settings-dropdown">
              <p className="settings-title">Urgency thresholds</p>
              <label className="settings-label">
                <span>Yellow warning after</span>
                <div className="settings-input-row">
                  <input
                    type="number"
                    min="1"
                    className="settings-input"
                    value={draft.warning}
                    onChange={e => { setDraft(d => ({ ...d, warning: e.target.value })); setSettingsError(''); }}
                  />
                  <span className="settings-unit">hours</span>
                </div>
              </label>
              <label className="settings-label">
                <span>Red critical after</span>
                <div className="settings-input-row">
                  <input
                    type="number"
                    min="1"
                    className="settings-input"
                    value={draft.critical}
                    onChange={e => { setDraft(d => ({ ...d, critical: e.target.value })); setSettingsError(''); }}
                  />
                  <span className="settings-unit">hours</span>
                </div>
              </label>
              {settingsError && <p className="settings-error">{settingsError}</p>}
              <button className="settings-save" onClick={saveSettings}>Save</button>
            </div>
          )}
        </div>
      </div>

      <div className="filters">
        <button
          className={`filter-btn${filter === 'all' ? ' filter-btn--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn${filter === 'today' ? ' filter-btn--active' : ''}`}
          onClick={() => setFilter('today')}
        >
          Today
        </button>
      </div>

      <TaskList
        tasks={tasks}
        filter={filter}
        onAdd={addTask}
        onEdit={editTask}
        onDelete={deleteTask}
        onComplete={completeTask}
        onUncomplete={uncompleteTask}
        onMove={moveTask}
        urgencySettings={urgencySettings}
      />
    </div>
  );
}
