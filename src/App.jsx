import { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import { useGistSync } from './hooks/useGistSync';
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

function loadMode() {
  return localStorage.getItem('todo-app-mode') === 'work' ? 'work' : 'personal';
}

export default function App() {
  const [mode, setMode] = useState(loadMode);
  const { tasks, addTask, addSubTask, editTask, deleteTask, deleteProjectTasks, completeTask, uncompleteTask, moveTask, resetTasks } = useTasks(mode);
  const { projects, addProject, renameProject, moveProject, completeProject, uncompleteProject, deleteProject, resetProjects } = useProjects(mode);
  const { token, setToken, syncStatus, syncError, load, discoverGist, scheduleSave, flushSave } = useGistSync();
  const [urgencySettings, setUrgencySettings] = useState(loadUrgencySettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(urgencySettings);
  const [settingsError, setSettingsError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [gistReady, setGistReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncVisible, setSyncVisible] = useState(false);
  const settingsRef = useRef(null);
  const syncTimerRef = useRef(null);
  const justLoadedRef = useRef(false);

  function switchMode(next) {
    setMode(next);
    localStorage.setItem('todo-app-mode', next);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  function buildPayload() {
    return {
      personal: {
        tasks: JSON.parse(localStorage.getItem('todo-app-tasks-personal') ?? '[]'),
        projects: JSON.parse(localStorage.getItem('todo-app-projects-personal') ?? '[]'),
      },
      work: {
        tasks: JSON.parse(localStorage.getItem('todo-app-tasks-work') ?? '[]'),
        projects: JSON.parse(localStorage.getItem('todo-app-projects-work') ?? '[]'),
      },
    };
  }

  function applyRemote(remote, currentMode) {
    const m = currentMode ?? mode;
    const other = m === 'personal' ? 'work' : 'personal';
    localStorage.setItem(`todo-app-tasks-${other}`, JSON.stringify(remote[other]?.tasks ?? []));
    localStorage.setItem(`todo-app-projects-${other}`, JSON.stringify(remote[other]?.projects ?? []));
    resetTasks(remote[m]?.tasks ?? []);
    resetProjects(remote[m]?.projects ?? []);
  }

  useEffect(() => {
    async function init() {
      if (token) {
        const remote = await load();
        if (remote) {
          justLoadedRef.current = true;
          applyRemote(remote);
        }
      }
      setGistReady(true);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gistReady) return;
    if (justLoadedRef.current) { justLoadedRef.current = false; return; }
    scheduleSave(buildPayload());
  }, [tasks, projects]); // eslint-disable-line react-hooks/exhaustive-deps

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
      applyRemote(remote);
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
      applyRemote(remote);
    }
  }

  function handleDeleteProject(id) {
    deleteProjectTasks(id);
    deleteProject(id);
  }

  const completedTasks = tasks.filter(t => t.completedAt !== null && !t.projectId);
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
          {syncLabel && (
            <p className={`sync-status${syncLabel.error ? ' sync-status--error' : ''}`}>
              {syncLabel.text}
            </p>
          )}
        </div>
        <div className="header-actions">
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

      <div className="mode-toggle">
        <button
          className={`mode-btn${mode === 'personal' ? ' mode-btn--active' : ''}`}
          onClick={() => switchMode('personal')}
        >
          Personal
        </button>
        <button
          className={`mode-btn${mode === 'work' ? ' mode-btn--active' : ''}`}
          onClick={() => switchMode('work')}
        >
          Work
        </button>
      </div>

      <TaskList
        mode={mode}
        tasks={tasks}
        projects={projects}
        onAdd={addTask}
        onAddSubTask={addSubTask}
        onEdit={editTask}
        onDelete={deleteTask}
        onComplete={completeTask}
        onUncomplete={uncompleteTask}
        onMove={moveTask}
        urgencySettings={urgencySettings}
        todayCount={todayCount}
        onAddProject={addProject}
        onRenameProject={renameProject}
        onMoveProject={moveProject}
        onCompleteProject={completeProject}
        onUncompleteProject={uncompleteProject}
        onDeleteProject={handleDeleteProject}
      />
    </div>
  );
}
