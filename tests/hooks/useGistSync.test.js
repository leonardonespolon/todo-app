import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGistSync } from '../../src/hooks/useGistSync';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── setToken ───────────────────────────────────────────────────────────────

describe('setToken', () => {
  it('persists token to localStorage and updates state', () => {
    const { result } = renderHook(() => useGistSync());
    act(() => result.current.setToken('ghp_newtoken'));
    expect(localStorage.getItem('todo-gist-token')).toBe('ghp_newtoken');
    expect(result.current.token).toBe('ghp_newtoken');
  });

  it('trims whitespace from token', () => {
    const { result } = renderHook(() => useGistSync());
    act(() => result.current.setToken('  ghp_abc  '));
    expect(result.current.token).toBe('ghp_abc');
    expect(localStorage.getItem('todo-gist-token')).toBe('ghp_abc');
  });

  it('clears gist ID from localStorage when token set to empty string', () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    const { result } = renderHook(() => useGistSync());
    act(() => result.current.setToken(''));
    expect(localStorage.getItem('todo-gist-id')).toBeNull();
    expect(result.current.token).toBe('');
    expect(result.current.syncStatus).toBe('idle');
  });
});

// ─── load ───────────────────────────────────────────────────────────────────

describe('load', () => {
  it('returns null without fetching when no gist ID', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useGistSync());
    let loaded;
    await act(async () => { loaded = await result.current.load(); });
    expect(loaded).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null without fetching when no token', async () => {
    localStorage.setItem('todo-gist-id', 'gist123');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useGistSync());
    let loaded;
    await act(async () => { loaded = await result.current.load(); });
    expect(loaded).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches from correct URL with Authorization header', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    const tasks = [{ id: '1', text: 'Test', createdAt: 1000, completedAt: null, listId: 'todo' }];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: { 'todo-app-tasks.json': { content: JSON.stringify(tasks) } },
      }),
    });
    const { result } = renderHook(() => useGistSync());
    let loaded;
    await act(async () => { loaded = await result.current.load(); });
    expect(loaded).toEqual(tasks);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists/gist123',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ghp_test' }),
      })
    );
    expect(result.current.syncStatus).toBe('synced');
  });

  it('sets syncStatus to error and returns null on fetch failure', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Bad credentials' }),
    });
    const { result } = renderHook(() => useGistSync());
    let loaded;
    await act(async () => { loaded = await result.current.load(); });
    expect(loaded).toBeNull();
    expect(result.current.syncStatus).toBe('error');
    expect(result.current.syncError).toBe('Bad credentials');
  });
});

// ─── discoverGist ────────────────────────────────────────────────────────────

describe('discoverGist', () => {
  it('finds an existing gist by description and stores its ID', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { id: 'found-id', description: 'Todo App Tasks', files: { 'todo-app-tasks.json': {} } },
        { id: 'other-id', description: 'Other', files: {} },
      ]),
    });
    const { result } = renderHook(() => useGistSync());
    await act(async () => { await result.current.discoverGist(); });
    expect(localStorage.getItem('todo-gist-id')).toBe('found-id');
  });

  it('does nothing when gist ID is already set', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'existing-id');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useGistSync());
    await act(async () => { await result.current.discoverGist(); });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('todo-gist-id')).toBe('existing-id');
  });

  it('does not throw and leaves gist ID unset when no matching gist found', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 'other', description: 'Other', files: {} }]),
    });
    const { result } = renderHook(() => useGistSync());
    await act(async () => { await result.current.discoverGist(); });
    expect(localStorage.getItem('todo-gist-id')).toBeNull();
  });
});

// ─── scheduleSave ────────────────────────────────────────────────────────────

describe('scheduleSave', () => {
  it('does nothing when no token', () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useGistSync());
    act(() => result.current.scheduleSave([{ id: '1', text: 'Task' }]));
    vi.advanceTimersByTime(2000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('PATCHes existing gist after 1500ms debounce', async () => {
    vi.useFakeTimers();
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useGistSync());
    const tasks = [{ id: '1', text: 'Task', createdAt: 1000, completedAt: null, listId: 'todo' }];
    act(() => result.current.scheduleSave(tasks));
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(1500); });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists/gist123',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.current.syncStatus).toBe('synced');
  });

  it('POSTs to create a new gist when no gist ID exists', async () => {
    vi.useFakeTimers();
    localStorage.setItem('todo-gist-token', 'ghp_test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-gist-id' }),
    });

    const { result } = renderHook(() => useGistSync());
    const tasks = [{ id: '1', text: 'Task', createdAt: 1000, completedAt: null, listId: 'todo' }];
    act(() => result.current.scheduleSave(tasks));
    await act(async () => { vi.advanceTimersByTime(1500); });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists',
      expect.objectContaining({ method: 'POST' })
    );
    expect(localStorage.getItem('todo-gist-id')).toBe('new-gist-id');
  });

  it('debounces — only saves once if called multiple times quickly', async () => {
    vi.useFakeTimers();
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useGistSync());
    const tasks = [{ id: '1', text: 'Task', createdAt: 1000, completedAt: null, listId: 'todo' }];
    act(() => result.current.scheduleSave(tasks));
    act(() => result.current.scheduleSave(tasks));
    act(() => result.current.scheduleSave(tasks));
    await act(async () => { vi.advanceTimersByTime(1500); });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── flushSave ───────────────────────────────────────────────────────────────

describe('flushSave', () => {
  it('saves immediately without waiting for debounce', async () => {
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useGistSync());
    const tasks = [{ id: '1', text: 'Task', createdAt: 1000, completedAt: null, listId: 'todo' }];
    await act(async () => { await result.current.flushSave(tasks); });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/gists/gist123',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(result.current.syncStatus).toBe('synced');
  });

  it('cancels pending debounced save before flushing', async () => {
    vi.useFakeTimers();
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useGistSync());
    const tasks = [{ id: '1', text: 'Task', createdAt: 1000, completedAt: null, listId: 'todo' }];
    act(() => result.current.scheduleSave(tasks)); // starts debounce
    await act(async () => { await result.current.flushSave(tasks); }); // flushes immediately
    await act(async () => { vi.advanceTimersByTime(1500); }); // debounce would have fired

    // Only one fetch call (from flushSave, not from the debounce)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useGistSync());
    await act(async () => { await result.current.flushSave([{ id: '1', text: 'Task' }]); });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
