import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../src/App';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App resilience to bad localStorage', () => {
  it('still renders when the inactive mode holds corrupt task JSON', () => {
    localStorage.setItem('todo-app-mode', 'personal');
    localStorage.setItem('todo-app-tasks-work', '{not json');
    render(<App />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('still renders when a stored list is not an array', () => {
    localStorage.setItem('todo-app-tasks-work', '{"a":1}');
    localStorage.setItem('todo-app-projects-personal', '"str"');
    render(<App />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });
});

describe('App gist sync', () => {
  it('flushes a pending debounced save on pagehide', async () => {
    vi.useFakeTimers();
    localStorage.setItem('todo-gist-token', 'ghp_test');
    localStorage.setItem('todo-gist-id', 'gist123');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ files: {} }), // initial load: gist has no content
    });

    render(<App />);
    await act(async () => {}); // let init() resolve
    fetchSpy.mockClear();

    // Add a task, which schedules a debounced save.
    const input = screen.getByPlaceholderText('Add a task...');
    await act(async () => {
      const { fireEvent } = await import('@testing-library/react');
      fireEvent.change(input, { target: { value: 'Buy milk' } });
      fireEvent.submit(input.closest('form'));
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    // Leaving the page must push it without waiting for the debounce.
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.github.com/gists/gist123');
    expect(opts.method).toBe('PATCH');
    expect(opts.body).toContain('Buy milk');
  });
});
