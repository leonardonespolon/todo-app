import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
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


// jsdom does not implement media playback; the delete button plays a sound.
beforeEach(() => {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
});

function seedTask(overrides = {}) {
  return { id: 't1', text: 'Buy milk', createdAt: Date.now(), completedAt: null, listId: 'todo', projectId: null, ...overrides };
}

// dnd-kit renders its own role="status" live region, so find the toast by class.
const toast = () => document.querySelector('.undo-toast');

describe('undo delete', () => {
  it('shows a toast after deleting and Undo restores the task', () => {
    localStorage.setItem('todo-app-tasks-personal', JSON.stringify([seedTask()]));
    render(<App />);
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
    expect(toast()).toHaveTextContent('Deleted “Buy milk”');
    fireEvent.click(within(toast()).getByText('Undo'));
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(toast()).toBeNull();
    expect(JSON.parse(localStorage.getItem('todo-app-tasks-personal'))).toHaveLength(1);
  });

  it('dismisses the toast after 5s and the task stays deleted', () => {
    vi.useFakeTimers();
    localStorage.setItem('todo-app-tasks-personal', JSON.stringify([seedTask()]));
    render(<App />);
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(toast()).not.toBeNull();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(toast()).toBeNull();
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('todo-app-tasks-personal'))).toHaveLength(0);
  });

  it('restores the task at its original position in storage', () => {
    localStorage.setItem('todo-app-tasks-personal', JSON.stringify([
      seedTask({ id: 'a', text: 'Alpha', createdAt: 3000 }),
      seedTask({ id: 'b', text: 'Beta', createdAt: 2000 }),
      seedTask({ id: 'c', text: 'Gamma', createdAt: 1000 }),
    ]));
    render(<App />);
    // Todo is sorted newest first, so the rendered order matches storage order here.
    fireEvent.click(screen.getAllByLabelText('Delete task')[1]); // Beta
    expect(JSON.parse(localStorage.getItem('todo-app-tasks-personal')).map(t => t.id)).toEqual(['a', 'c']);
    fireEvent.click(within(toast()).getByText('Undo'));
    expect(JSON.parse(localStorage.getItem('todo-app-tasks-personal')).map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops the pending undo when switching mode', () => {
    localStorage.setItem('todo-app-tasks-personal', JSON.stringify([seedTask()]));
    render(<App />);
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(toast()).not.toBeNull();
    fireEvent.click(screen.getByText('Work'));
    expect(toast()).toBeNull();
  });
});

describe('sub-task and project consistency', () => {
  it('reopens a completed project when one of its sub-tasks is unchecked', () => {
    const done = Date.now();
    localStorage.setItem('todo-app-projects-personal', JSON.stringify([
      { id: 'p1', name: 'Garden', listId: 'completed', completedAt: done, createdAt: done - 1000 },
    ]));
    localStorage.setItem('todo-app-tasks-personal', JSON.stringify([
      seedTask({ id: 's1', text: 'Buy seeds', projectId: 'p1', listId: undefined, completedAt: done }),
    ]));
    render(<App />);
    // Completed projects start collapsed, so open it to reach the sub-task.
    fireEvent.click(screen.getByLabelText('Expand project'));
    const checkboxes = screen.getAllByRole('checkbox');
    const projectBox = checkboxes[0]; // project header comes first
    const subBox = checkboxes[1];
    expect(projectBox).toBeChecked();
    expect(subBox).toBeChecked();

    fireEvent.click(subBox);

    expect(screen.getByText('Buy seeds')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[0]).not.toBeChecked();
    const projects = JSON.parse(localStorage.getItem('todo-app-projects-personal'));
    expect(projects[0].completedAt).toBeNull();
    expect(projects[0].listId).toBe('todo');
  });
});
