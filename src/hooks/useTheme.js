import { useState, useEffect } from 'react';

const THEME_KEY = 'todo-app-theme';
const VALID = ['light', 'dark', 'retro', 'system'];

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  return VALID.includes(saved) ? saved : 'system';
}

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function resolve(theme) {
  return theme === 'system' ? systemTheme() : theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState(loadTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(loadTheme()));

  useEffect(() => {
    function apply() {
      const resolved = resolve(theme);
      document.documentElement.dataset.theme = resolved;
      setResolvedTheme(resolved);
    }
    apply();

    if (theme !== 'system') return;
    let media;
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', apply);
    } catch {
      return;
    }
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  function setTheme(next) {
    if (!VALID.includes(next)) return;
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
  }

  return { theme, setTheme, resolvedTheme };
}
