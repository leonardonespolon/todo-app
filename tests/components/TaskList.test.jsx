import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskList from '../../src/components/TaskList';

beforeEach(() => {
  localStorage.clear();
});

const urgencySettings = { warning: 24, critical: 48 };
const noop = () => {};

function makeTask(overrides = {}) {
  return {
    id: String(Math.random()),
    text: 'Task',
    createdAt: Date.now(),
    completedAt: null,
    listId: 'todo',
    projectId: null,
    ...overrides,
  };
}

function renderList(tasks) {
  return render(
    <TaskList
      tasks={tasks}
      onAdd={noop}
      onEdit={noop}
      onDelete={noop}
      onComplete={noop}
      onUncomplete={noop}
      onMove={noop}
      onSetProject={noop}
      urgencySettings={urgencySettings}
      projects={[]}
      onAddProject={noop}
      onRenameProject={noop}
      onDeleteProject={noop}
    />
  );
}

describe('section visibility', () => {
  it('always renders Todo section even when empty', () => {
    renderList([]);
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('shows Watch section with empty state when no watch tasks', () => {
    renderList([makeTask({ listId: 'todo' })]);
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.getByText('Move tasks here to keep an eye on them.')).toBeInTheDocument();
  });

  it('shows Later section with empty state when no later tasks', () => {
    renderList([makeTask({ listId: 'todo' })]);
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.getByText('Move tasks here to tackle another time.')).toBeInTheDocument();
  });

  it('shows Watch section when there are watch tasks', () => {
    renderList([makeTask({ listId: 'watch', text: 'Watch this' })]);
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.getByText('Watch this')).toBeInTheDocument();
  });

  it('shows Later section when there are later tasks', () => {
    renderList([makeTask({ listId: 'later', text: 'Do later' })]);
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.getByText('Do later')).toBeInTheDocument();
  });

  it('shows Completed section when there are completed tasks', () => {
    renderList([makeTask({ completedAt: Date.now(), text: 'Done task' })]);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('hides Completed section when no completed tasks', () => {
    renderList([makeTask()]);
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });
});

describe('collapsible Completed section', () => {
  it('Completed section is expanded by default', () => {
    const tasks = [makeTask({ text: 'Done task', completedAt: Date.now() })];
    renderList(tasks);
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('clicking the collapse button hides completed tasks', () => {
    const tasks = [makeTask({ text: 'Done task', completedAt: Date.now() })];
    renderList(tasks);
    const btn = screen.getByLabelText('Collapse Completed');
    fireEvent.click(btn);
    expect(screen.queryByText('Done task')).not.toBeInTheDocument();
  });

  it('clicking collapse button again re-shows completed tasks', () => {
    const tasks = [makeTask({ text: 'Done task', completedAt: Date.now() })];
    renderList(tasks);
    fireEvent.click(screen.getByLabelText('Collapse Completed'));
    fireEvent.click(screen.getByLabelText('Expand Completed'));
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('persists collapsed state to localStorage', () => {
    const tasks = [makeTask({ text: 'Done task', completedAt: Date.now() })];
    renderList(tasks);
    const btn = screen.getByLabelText('Collapse Completed');
    fireEvent.click(btn);
    const saved = JSON.parse(localStorage.getItem('todo-app-section-collapse'));
    expect(saved.completed).toBe(true);
  });
});

describe('section ordering', () => {
  it('renders sections in Todo → Watch → Later → Completed order', () => {
    const tasks = [
      makeTask({ text: 'Todo task', listId: 'todo' }),
      makeTask({ text: 'Watch task', listId: 'watch' }),
      makeTask({ text: 'Later task', listId: 'later' }),
      makeTask({ text: 'Done task', completedAt: Date.now() }),
    ];
    const { container } = renderList(tasks);
    const headings = [...container.querySelectorAll('.section-heading')]
      .map(h => h.textContent.replace(/\s*\d+$/, '').trim()); // strip count badge
    expect(headings[0]).toMatch(/Todo/);
    expect(headings[1]).toMatch(/Watch/);
    expect(headings[2]).toMatch(/Later/);
    expect(headings[3]).toMatch(/Completed/);
  });
});
