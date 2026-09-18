import { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Crosshair, Sun, Moon, Gamepad2, Monitor, Check } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import { useGistSync } from './hooks/useGistSync';
import { useTheme } from './hooks/useTheme';
import TaskList from './components/TaskList';
import './App.css';

const DEFAULT_URGENCY = { warning: 24, critical: 48 };
const UNDO_MS = 5000;

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'retro', label: 'Retro', Icon: Gamepad2 },
  { id: 'system', label: 'System', Icon: Monitor },
];

function loadUrgencySettings() {
  try {
    const saved = localStorage.getItem('urgencySettings');
    return saved ? JSON.parse(saved) : DEFAULT_URGENCY;
  } catch {
    return DEFAULT_URGENCY;
  }
}

// Reads a JSON array from localStorage. A missing or corrupt entry yields []
// rather than throwing, so bad data in one key can never take down the app.
function readStoredList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadMode() {
  return localStorage.getItem('todo-app-mode') === 'work' ? 'work' : 'personal';
}

export default function App() {
  const [mode, setMode] = useState(loadMode);
  const { tasks, addTask, addSubTask, editTask, deleteTask, restoreTask, deleteProjectTasks, completeTask, uncompleteTask, moveTask, resetTasks } = useTasks(mode);
  const { projects, addProject, renameProject, moveProject, completeProject, uncompleteProject, deleteProject, resetProjects } = useProjects(mode);
  const { token, setToken, syncStatus, syncError, load, discoverGist, scheduleSave, flushSave } = useGistSync();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('todo-app-focus') === 'true');
  const [urgencySettings, setUrgencySettings] = useState(loadUrgencySettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(urgencySettings);
  const [settingsError, setSettingsError] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [gistReady, setGistReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncVisible, setSyncVisible] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [pendingUndo, setPendingUndo] = useState(null); // { task, index }
  const settingsRef = useRef(null);
  const themeRef = useRef(null);
  const syncTimerRef = useRef(null);
  const justLoadedRef = useRef(false);
  const undoTimerRef = useRef(null);

  function toggleFocusMode() {
    setFocusMode(prev => {
      localStorage.setItem('todo-app-focus', String(!prev));
      return !prev;
    });
  }

  function switchMode(next) {
    dismissUndo(); // the deleted task belongs to the mode we are leaving
    setMode(next);
    localStorage.setItem('todo-app-mode', next);
  }

  function dismissUndo() {
    clearTimeout(undoTimerRef.current);
    setPendingUndo(null);
  }

  // Delete immediately but keep the task around for a few seconds so the
  // toast can put it back. A second delete replaces the first undo slot.
  function handleDeleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;
    const task = tasks[index];
    deleteTask(id);
    clearTimeout(undoTimerRef.current);
    setPendingUndo({ task, index });
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), UNDO_MS);
  }

  function handleUndoDelete() {
    if (!pendingUndo) return;
    restoreTask(pendingUndo.task, pendingUndo.index);
    dismissUndo();
  }

  useEffect(() => () => clearTimeout(undoTimerRef.current), []);

  // Un-checking a sub-task of a completed project reopens the project, so a
  // project is never shown as done while it has active work.
  function handleUncompleteTask(id) {
    uncompleteTask(id);
    const task = tasks.find(t => t.id === id);
    if (!task?.projectId) return;
    const project = projects.find(p => p.id === task.projectId);
    if (project && project.completedAt !== null) uncompleteProject(project.id);
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeOpen(false);
      }
    }
    if (themeOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [themeOpen]);

  function buildPayload() {
    return {
      personal: {
        tasks: readStoredList('todo-app-tasks-personal'),
        projects: readStoredList('todo-app-projects-personal'),
      },
      work: {
        tasks: readStoredList('todo-app-tasks-work'),
        projects: readStoredList('todo-app-projects-work'),
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

  // Push any debounced save before the page goes away so an edit made in the
  // last 1.5s is not lost. pagehide also fires on mobile tab switches, where
  // beforeunload does not.
  useEffect(() => {
    function flushOnHide() { flushSave(); }
    window.addEventListener('pagehide', flushOnHide);
    return () => window.removeEventListener('pagehide', flushOnHide);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const otherMode = mode === 'personal' ? 'work' : 'personal';
  const otherTasks = readStoredList(`todo-app-tasks-${otherMode}`);
  const todayCount = [...tasks, ...otherTasks].filter(t => t.completedAt !== null && t.completedAt >= startOfToday).length;

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
            resolvedTheme === 'retro' ? (
              <p className="streak-count streak-count--score">SCORE {String(todayCount * 100).padStart(6, '0')}</p>
            ) : (
              <p className="streak-count">🔥 {todayCount} task{todayCount !== 1 ? 's' : ''} done today</p>
            )
          )}
          {syncLabel && (
            <p className={`sync-status${syncLabel.error ? ' sync-status--error' : ''}`}>
              {syncLabel.text}
            </p>
          )}
        </div>
        <div className="header-actions">
          <button
            className={`pull-btn${focusMode ? ' focus-btn--active' : ''}`}
            onClick={toggleFocusMode}
            aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            aria-pressed={focusMode}
            title={focusMode ? 'Exit focus mode' : 'Focus mode: top 3 tasks only'}
          >
            <Crosshair size={18} />
          </button>
          <div className="theme-wrapper" ref={themeRef}>
            <button
              className="pull-btn"
              onClick={() => setThemeOpen(o => !o)}
              aria-label="Theme"
              aria-expanded={themeOpen}
              title="Theme"
            >
              {(() => {
                const { Icon } = THEME_OPTIONS.find(o => o.id === theme) ?? THEME_OPTIONS[3];
                return <Icon size={18} />;
              })()}
            </button>
            {themeOpen && (
              <div className="theme-dropdown" role="menu">
                {THEME_OPTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    className={`theme-option${theme === id ? ' theme-option--active' : ''}`}
                    role="menuitemradio"
                    aria-checked={theme === id}
                    onClick={() => { setTheme(id); setThemeOpen(false); }}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    {theme === id && <Check size={14} className="theme-option-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
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
        focusMode={focusMode}
        tasks={tasks}
        projects={projects}
        onAdd={addTask}
        onAddSubTask={addSubTask}
        onEdit={editTask}
        onDelete={handleDeleteTask}
        onComplete={completeTask}
        onUncomplete={handleUncompleteTask}
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

      {pendingUndo && (
        <div className="undo-toast" role="status" aria-live="polite">
          <span className="undo-toast-text">Deleted “{pendingUndo.task.text}”</span>
          <button className="undo-toast-btn" onClick={handleUndoDelete}>Undo</button>
        </div>
      )}
    </div>
  );
}
