import { useState, useEffect } from 'react';

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function storageKey(mode) {
  return `todo-app-projects-${mode}`;
}

function migrate(projects) {
  return projects.map(p => ({
    listId: 'todo',
    completedAt: null,
    createdAt: Date.now(),
    ...p,
  }));
}

function loadProjects(mode) {
  try {
    return migrate(JSON.parse(localStorage.getItem(storageKey(mode))) ?? []);
  } catch {
    return [];
  }
}

export function useProjects(mode) {
  const [projects, setProjects] = useState(() => loadProjects(mode));

  useEffect(() => {
    setProjects(loadProjects(mode));
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(mode), JSON.stringify(projects));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  }, [projects, mode]);

  function addProject(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = generateId();
    setProjects(prev => [...prev, { id, name: trimmed, listId: 'todo', completedAt: null, createdAt: Date.now() }]);
    return id;
  }

  function renameProject(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: trimmed } : p));
  }

  function moveProject(id, listId) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, listId } : p));
  }

  function completeProject(id) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, listId: 'completed', completedAt: Date.now() } : p));
  }

  function uncompleteProject(id) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, listId: 'todo', completedAt: null } : p));
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  function resetProjects(newProjects) {
    setProjects(migrate(newProjects ?? []));
  }

  return { projects, addProject, renameProject, moveProject, completeProject, uncompleteProject, deleteProject, resetProjects };
}
