import { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, BarChart2 } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { useGistSync } from './hooks/useGistSync';
import TaskList from './components/TaskList';
import './App.css';
import WrappedModal from './components/WrappedModal';

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
  const { tasks, addTask, editTask, deleteTask, completeTask, uncompleteTask, moveTask, resetTasks } = useTasks();
  const { token, setToken, syncStatus, syncError, load, discoverGist, scheduleSave, flushSave } = useGistSync();
  const [filter, setFilter] = useState('all');
  const [urgencySettings, setUrgencySettings] = useState(loadUrgencySettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(urgencySettings);
  const [settingsError, setSettingsError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [gistReady, setGistReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const [syncVisible, setSyncVisible] = useState(false);
  const settingsRef = useRef(null);
  const syncTimerRef = useRef(null);
  const justLoadedRef = useRef(false);

  // Close settings panel on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  // Load from Gist on mount; set gistReady when done
  useEffect(() => {
    async function init() {
      if (token) {
        const remote = await load();
        if (remote) {
          justLoadedRef.current = true;
          resetTasks(remote);
        }
      }
      setGistReady(true);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only init; token/load/resetTasks are stable

  // Auto-save to Gist on task changes (skip the load that just happened)
  useEffect(() => {
    if (!gistReady) return;
    if (justLoadedRef.current) { justLoadedRef.current = false; return; }
    scheduleSave(tasks);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps -- gistReady/scheduleSave intentionally omitted; tasks is the sole trigger

  // Sync status visibility — "Synced ✓" fades after 3s
  useEffect(() => {
    clearTimeout(syncTimerRef.current);
    if (syncStatus === 'synced') {
      setSyncVisible(true);
      syncTimerRef.current = setTimeout(() => setSyncVisible(false), 3000);
    } else {
      setSyncVisible(syncStatus !== 'idle');
    }
    return () => clearTimeout(syncTimerRef.current);
  }, [syncStatus]);

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

  async function handleConnect() {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    setConnecting(true);
    setToken(trimmed);
    setTokenInput('');
    setGistReady(false);
    await discoverGist();
    const remote = await load();
    if (remote) {
      justLoadedRef.current = true;
      resetTasks(remote);
    }
    setGistReady(true);
    setSettingsOpen(false);
    setConnecting(false);
  }

  function handleDisconnect() {
    setToken('');
    setSyncVisible(false);
    setSettingsOpen(false);
  }

  async function handlePull() {
    await discoverGist();
    const remote = await load();
    if (remote) {
      justLoadedRef.current = true;
      resetTasks(remote);
    }
  }

  const completedTasks = tasks.filter(t => t.completedAt !== null);
  const avgCompletionHours = completedTasks.length > 0
    ? (completedTasks.reduce((sum, t) => sum + (t.completedAt - t.createdAt), 0) / completedTasks.length / 3600000).toFixed(1)
    : null;

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const todayCount = completedTasks.filter(t => t.completedAt >= startOfToday).length;

  const syncLabel = (() => {
    if (!token || !syncVisible) return null;
    if (syncStatus === 'loading') return { text: 'Loading from Gist…', error: false };
    if (syncStatus === 'pending' || syncStatus === 'syncing') return { text: 'Syncing…', error: false };
    if (syncStatus === 'synced') return { text: 'Synced ✓', error: false };
    if (syncStatus === 'error') return { text: `Sync failed: ${syncError}`, error: true };
    return null;
  })();

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1 className="app-title">To Do</h1>
          {todayCount > 0 && (
            <p className="streak-count">🔥 {todayCount} task{todayCount !== 1 ? 's' : ''} done today</p>
          )}
          {avgCompletionHours !== null && (
            <p className="avg-completion">Avg completion: {avgCompletionHours}h</p>
          )}
          {syncLabel && (
            <p className={`sync-status${syncLabel.error ? ' sync-status--error' : ''}`}>
              {syncLabel.text}
            </p>
          )}
        </div>
        <div className="header-actions">
          {completedTasks.length > 0 && (
            <button
              className="wrapped-btn"
              onClick={() => setWrappedOpen(true)}
              aria-label="View your Wrapped"
            >
              <BarChart2 size={18} />
            </button>
          )}
          {token && (
            <button
              className="pull-btn"
              onClick={handlePull}
              aria-label="Pull from Gist"
              disabled={syncStatus === 'loading' || syncStatus === 'syncing'}
            >
              <RefreshCw size={18} />
            </button>
          )}
          <div className="settings-wrapper" ref={settingsRef}>
            <button className="settings-btn" onClick={openSettings} aria-label="Settings" aria-expanded={settingsOpen}>
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

                <hr className="settings-divider" />
                <p className="settings-title">Gist Sync</p>
                {token ? (
                  <div className="settings-gist-row">
                    <span className="settings-gist-badge">● Connected</span>
                    <button className="settings-gist-disconnect" onClick={handleDisconnect}>
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="settings-label">
                      <span>GitHub token</span>
                      <input
                        type="password"
                        className="settings-token-input"
                        placeholder="ghp_..."
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        autoComplete="off"
                      />
                    </label>
                    <a
                      className="settings-link"
                      href="https://github.com/settings/tokens/new?scopes=gist&description=Todo+App"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Create token (gist scope) ↗
                    </a>
                    <button
                      className="settings-save"
                      onClick={handleConnect}
                      disabled={!tokenInput.trim() || connecting}
                    >
                      {connecting ? 'Connecting…' : 'Connect'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
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
      {wrappedOpen && (
        <WrappedModal tasks={tasks} onClose={() => setWrappedOpen(false)} />
      )}
    </div>
  );
}
