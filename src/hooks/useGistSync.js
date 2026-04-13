import { useState, useRef } from 'react';

const FILENAME = 'todo-app-tasks.json';
const TOKEN_KEY = 'todo-gist-token';
const GIST_ID_KEY = 'todo-gist-id';

async function ghFetch(token, path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `GitHub API ${res.status}`);
  }
  return res.json();
}

export function useGistSync() {
  const [token, _setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState('');
  const tokenRef = useRef(token);
  const gistIdRef = useRef(localStorage.getItem(GIST_ID_KEY) ?? '');
  const debounceRef = useRef(null);
  const pendingTasksRef = useRef(null);
  const isSavingRef = useRef(false);

  async function waitForSaveIdle() {
    while (isSavingRef.current) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  function setToken(t) {
    const v = t.trim();
    tokenRef.current = v;
    _setToken(v);
    localStorage.setItem(TOKEN_KEY, v);
    if (!v) {
      gistIdRef.current = '';
      localStorage.removeItem(GIST_ID_KEY);
      setSyncStatus('idle');
      setSyncError('');
    }
  }

  async function doSave(tasks) {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    const tok = tokenRef.current;
    try {
      if (!gistIdRef.current) {
        const data = await ghFetch(tok, '/gists', {
          method: 'POST',
          body: JSON.stringify({
            description: 'Todo App Tasks',
            public: false,
            files: { [FILENAME]: { content: JSON.stringify(tasks) } },
          }),
        });
        gistIdRef.current = data.id;
        localStorage.setItem(GIST_ID_KEY, data.id);
      } else {
        await ghFetch(tok, `/gists/${gistIdRef.current}`, {
          method: 'PATCH',
          body: JSON.stringify({
            files: { [FILENAME]: { content: JSON.stringify(tasks) } },
          }),
        });
      }
    } finally {
      isSavingRef.current = false;
    }
  }

  async function discoverGist() {
    const tok = tokenRef.current;
    if (!tok || gistIdRef.current) return;
    try {
      const gists = await ghFetch(tok, '/gists?per_page=100');
      const found = gists.find(g =>
        g.description === 'Todo App Tasks' && g.files['todo-app-tasks.json']
      );
      if (found) {
        gistIdRef.current = found.id;
        localStorage.setItem(GIST_ID_KEY, found.id);
      }
    } catch {
      // Non-fatal — first save will create a new gist if discovery fails
    }
  }

  async function load() {
    const tok = tokenRef.current;
    const id = gistIdRef.current;
    if (!tok || !id) return null;
    setSyncStatus('loading');
    setSyncError('');
    try {
      const data = await ghFetch(tok, `/gists/${id}`);
      const content = data.files[FILENAME]?.content;
      setSyncStatus('synced');
      return content ? JSON.parse(content) : null;
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e.message);
      return null;
    }
  }

  // NOTE: functions are not wrapped in useCallback intentionally — all mutable state
  // goes through refs (tokenRef, gistIdRef), so there are no stale closure issues.
  // App.jsx consumers use eslint-disable-line on deps arrays where needed.
  function scheduleSave(tasks) {
    if (!tokenRef.current) return;
    pendingTasksRef.current = tasks;
    clearTimeout(debounceRef.current);
    setSyncStatus('pending');
    debounceRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      setSyncError('');
      try {
        await doSave(pendingTasksRef.current);
        setSyncStatus('synced');
      } catch (e) {
        setSyncStatus('error');
        setSyncError(e.message);
      }
    }, 1500);
  }

  async function flushSave(tasks) {
    if (!tokenRef.current) return;
    clearTimeout(debounceRef.current);
    await waitForSaveIdle(); // wait for any in-flight save to complete first
    setSyncStatus('syncing');
    setSyncError('');
    try {
      await doSave(tasks);
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e.message);
    }
  }

  return { token, setToken, syncStatus, syncError, load, discoverGist, scheduleSave, flushSave };
}
