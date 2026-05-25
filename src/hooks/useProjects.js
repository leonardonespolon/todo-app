import { useState, useEffect } from 'react';

const STORAGE_KEY = 'todo-app-projects';

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function useProjects() {
  const [projects, setProjects] = useState(loadProjects);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  }, [projects]);

  function addProject(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = generateId();
    setProjects(prev => [...prev, { id, name: trimmed }]);
    return id;
  }

  function renameProject(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: trimmed } : p));
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  return { projects, addProject, renameProject, deleteProject };
}
