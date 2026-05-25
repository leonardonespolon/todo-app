import { useState, useEffect } from 'react';

// Completion is derived from completedAt: null = active, timestamp = done.
// List assignment is derived from listId: 'todo' | 'watch' | 'later'.

const STORAGE_KEY = 'todo-app-tasks';

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function migrate(tasks) {
  const needsMigration = tasks.some(t => !t.listId || t.projectId === undefined);
  if (!needsMigration) return tasks;
  return tasks.map(t => ({
    ...t,
    listId: t.listId ?? 'todo',
    projectId: t.projectId !== undefined ? t.projectId : null,
  }));
}

function loadTasks() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    return migrate(raw);
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState(loadTasks);
  const [, setTick] = useState(0);

  // Force re-render every 60s so urgency colors update without a page reload.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Sync to localStorage on every change.
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function addTask(text, projectId = null) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks(prev => [
      ...prev,
      {
        id: generateId(),
        text: trimmed,
        createdAt: Date.now(),
        completedAt: null,
        listId: 'todo',
        projectId,
      },
    ]);
  }

  function editTask(id, newText) {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, text: newText } : t))
    );
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function completeTask(id) {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completedAt: Date.now() } : t
      )
    );
  }

  function uncompleteTask(id) {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completedAt: null } : t
      )
    );
  }

  function moveTask(id, listId) {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, listId } : t))
    );
  }

  function setTaskProject(id, projectId) {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, projectId } : t))
    );
  }

  function orphanProject(projectId) {
    setTasks(prev =>
      prev.map(t => (t.projectId === projectId ? { ...t, projectId: null } : t))
    );
  }

  function resetTasks(newTasks) {
    setTasks(migrate(newTasks));
  }

  return { tasks, addTask, editTask, deleteTask, completeTask, uncompleteTask, moveTask, setTaskProject, orphanProject, resetTasks };
}
