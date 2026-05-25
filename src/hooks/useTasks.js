import { useState, useEffect } from 'react';

// Standalone tasks: listId set, projectId: null
// Sub-tasks: projectId set, no listId

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function storageKey(mode) {
  return `todo-app-tasks-${mode}`;
}

function migrate(tasks) {
  return tasks.map(t => ({
    projectId: null,
    listId: 'todo',
    ...t,
  }));
}

function loadTasks(mode) {
  try {
    return migrate(JSON.parse(localStorage.getItem(storageKey(mode))) ?? []);
  } catch {
    return [];
  }
}

function saveTasks(mode, tasks) {
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(tasks));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

export function useTasks(mode) {
  const [tasks, setTasks] = useState(() => loadTasks(mode));
  const [, setTick] = useState(0);

  useEffect(() => {
    setTasks(loadTasks(mode));
  }, [mode]);

  // Force re-render every 60s so urgency colors update without a page reload.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    saveTasks(mode, tasks);
  }, [tasks, mode]);

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks(prev => [...prev, {
      id: generateId(),
      text: trimmed,
      createdAt: Date.now(),
      completedAt: null,
      listId: 'todo',
      projectId: null,
    }]);
  }

  function addSubTask(text, projectId) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks(prev => [...prev, {
      id: generateId(),
      text: trimmed,
      createdAt: Date.now(),
      completedAt: null,
      projectId,
    }]);
  }

  function editTask(id, newText) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function deleteProjectTasks(projectId) {
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
  }

  function completeTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completedAt: Date.now() } : t));
  }

  function uncompleteTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completedAt: null } : t));
  }

  function moveTask(id, listId) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, listId } : t));
  }

  function resetTasks(newTasks) {
    setTasks(migrate(newTasks ?? []));
  }

  return {
    tasks,
    addTask,
    addSubTask,
    editTask,
    deleteTask,
    deleteProjectTasks,
    completeTask,
    uncompleteTask,
    moveTask,
    resetTasks,
  };
}
