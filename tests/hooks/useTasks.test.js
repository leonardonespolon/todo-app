import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from '../../src/hooks/useTasks';

const STORAGE_KEY = 'todo-app-tasks';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ─── addTask ────────────────────────────────────────────────────────────────

describe('addTask', () => {
  it('creates a task with listId: todo', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Buy milk'));
    expect(result.current.tasks[0].listId).toBe('todo');
  });

  it('empty string is a no-op', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('   '));
    expect(result.current.tasks).toHaveLength(0);
  });

  it('persists new task to localStorage', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Buy milk'));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved[0].listId).toBe('todo');
  });
});

// ─── moveTask ───────────────────────────────────────────────────────────────

describe('moveTask', () => {
  it('moves a task to watch', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Review PR'));
    const id = result.current.tasks[0].id;
    act(() => result.current.moveTask(id, 'watch'));
    expect(result.current.tasks[0].listId).toBe('watch');
  });

  it('moves a task to later', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Read book'));
    const id = result.current.tasks[0].id;
    act(() => result.current.moveTask(id, 'later'));
    expect(result.current.tasks[0].listId).toBe('later');
  });

  it('moves a task back to todo', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Read book'));
    const id = result.current.tasks[0].id;
    act(() => result.current.moveTask(id, 'later'));
    act(() => result.current.moveTask(id, 'todo'));
    expect(result.current.tasks[0].listId).toBe('todo');
  });

  it('persists the new listId to localStorage', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Review PR'));
    const id = result.current.tasks[0].id;
    act(() => result.current.moveTask(id, 'watch'));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved[0].listId).toBe('watch');
  });
});

// ─── completeTask / uncompleteTask ──────────────────────────────────────────

describe('completeTask', () => {
  it('sets completedAt without changing listId', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Ship it'));
    const id = result.current.tasks[0].id;
    act(() => result.current.moveTask(id, 'watch'));
    act(() => result.current.completeTask(id));
    const task = result.current.tasks[0];
    expect(task.completedAt).not.toBeNull();
    expect(task.listId).toBe('watch');
  });

  it('sets completedAt to a number', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Ship it'));
    const id = result.current.tasks[0].id;
    act(() => result.current.completeTask(id));
    expect(typeof result.current.tasks[0].completedAt).toBe('number');
  });

  it('does NOT add a completed boolean field', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Ship it'));
    const id = result.current.tasks[0].id;
    act(() => result.current.completeTask(id));
    expect(result.current.tasks[0]).not.toHaveProperty('completed');
  });
});

describe('uncompleteTask', () => {
  it('sets completedAt to null and preserves listId', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Ship it'));
    const id = result.current.tasks[0].id;
    act(() => result.current.moveTask(id, 'watch'));
    act(() => result.current.completeTask(id));
    act(() => result.current.uncompleteTask(id));
    const task = result.current.tasks[0];
    expect(task.completedAt).toBeNull();
    expect(task.listId).toBe('watch');
  });
});

// ─── migration ──────────────────────────────────────────────────────────────

describe('migration', () => {
  it('assigns listId:todo to existing tasks that have none', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: '1', text: 'Old task', createdAt: 1000, completedAt: null },
    ]));
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks[0].listId).toBe('todo');
  });

  it('preserves existing listId on tasks that already have one', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: '1', text: 'Watch task', createdAt: 1000, completedAt: null, listId: 'watch' },
    ]));
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks[0].listId).toBe('watch');
  });

  it('migration is idempotent — safe to run twice (StrictMode)', () => {
    // Simulates React StrictMode double-invocation: same localStorage, two hook mounts.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: '1', text: 'Old task', createdAt: 1000, completedAt: null },
    ]));
    renderHook(() => useTasks()); // first mount (discarded in StrictMode)
    const { result } = renderHook(() => useTasks()); // second mount (kept)
    expect(result.current.tasks[0].listId).toBe('todo');
  });
});

// ─── localStorage round-trip ────────────────────────────────────────────────

describe('localStorage round-trip', () => {
  it('tasks survive a simulated reload', () => {
    const { result: r1 } = renderHook(() => useTasks());
    act(() => r1.current.addTask('Survive reload'));
    const id = r1.current.tasks[0].id;
    act(() => r1.current.moveTask(id, 'later'));

    // Simulate reload: new hook instance reads from localStorage
    const { result: r2 } = renderHook(() => useTasks());
    expect(r2.current.tasks[0].listId).toBe('later');
    expect(r2.current.tasks[0].text).toBe('Survive reload');
  });
});

// ─── generateId fallback ────────────────────────────────────────────────────

describe('generateId fallback', () => {
  it('falls back to Math.random when crypto.randomUUID throws', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('not supported');
    });
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Fallback id task'));
    expect(result.current.tasks[0].id).toBeTruthy();
    expect(typeof result.current.tasks[0].id).toBe('string');
  });
});

// ─── resetTasks ─────────────────────────────────────────────────────────────

describe('resetTasks', () => {
  it('replaces all tasks with the provided array', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Old task'));
    const replacement = [
      { id: 'r1', text: 'Remote task', createdAt: 9000, completedAt: null, listId: 'watch' },
    ];
    act(() => result.current.resetTasks(replacement));
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('r1');
    expect(result.current.tasks[0].listId).toBe('watch');
  });

  it('persists the reset tasks to localStorage', () => {
    const { result } = renderHook(() => useTasks());
    act(() => result.current.addTask('Old task'));
    const replacement = [
      { id: 'r1', text: 'Remote task', createdAt: 9000, completedAt: null, listId: 'later' },
    ];
    act(() => result.current.resetTasks(replacement));
    const saved = JSON.parse(localStorage.getItem('todo-app-tasks'));
    expect(saved[0].id).toBe('r1');
    expect(saved[0].listId).toBe('later');
  });
});
