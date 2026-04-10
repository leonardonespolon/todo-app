import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskList from '../../src/components/TaskList';

const urgencySettings = { warning: 24, critical: 48 };
const noop = () => {};

function makeTask(overrides = {}) {
  return {
    id: String(Math.random()),
    text: 'Task',
    createdAt: Date.now(),
    completedAt: null,
    listId: 'todo',
    ...overrides,
  };
}

function renderList(tasks, filter = 'all') {
  return render(
    <TaskList
      tasks={tasks}
      filter={filter}
      onEdit={noop}
      onDelete={noop}
      onComplete={noop}
      onUncomplete={noop}
      onMove={noop}
      urgencySettings={urgencySettings}
    />
  );
}

describe('section visibility', () => {
  it('always renders Todo section even when empty', () => {
    renderList([]);
    expect(screen.getByText('Todo')).toBeInTheDocument();
  });

  it('hides Watch section when no watch tasks', () => {
    renderList([makeTask({ listId: 'todo' })]);
    expect(screen.queryByText('Watch')).not.toBeInTheDocument();
  });

  it('hides Later section when no later tasks', () => {
    renderList([makeTask({ listId: 'todo' })]);
    expect(screen.queryByText('Later')).not.toBeInTheDocument();
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

describe('Today filter', () => {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const yesterday = startOfToday - 1000;

  it('hides Todo tasks created before today', () => {
    const old = makeTask({ text: 'Old task', createdAt: yesterday });
    renderList([old], 'today');
    expect(screen.queryByText('Old task')).not.toBeInTheDocument();
  });

  it('shows Todo tasks created today', () => {
    const fresh = makeTask({ text: 'New task', createdAt: startOfToday + 1000 });
    renderList([fresh], 'today');
    expect(screen.getByText('New task')).toBeInTheDocument();
  });

  it('shows Watch tasks regardless of creation date in Today filter', () => {
    const old = makeTask({ text: 'Old watch', listId: 'watch', createdAt: yesterday });
    renderList([old], 'today');
    expect(screen.getByText('Old watch')).toBeInTheDocument();
  });

  it('shows Later tasks regardless of creation date in Today filter', () => {
    const old = makeTask({ text: 'Old later', listId: 'later', createdAt: yesterday });
    renderList([old], 'today');
    expect(screen.getByText('Old later')).toBeInTheDocument();
  });

  it('hides completed tasks from before today in Today filter', () => {
    const old = makeTask({ text: 'Old done', completedAt: yesterday });
    renderList([old], 'today');
    expect(screen.queryByText('Old done')).not.toBeInTheDocument();
  });

  it('shows completed tasks from today in Today filter', () => {
    const fresh = makeTask({ text: 'Done today', completedAt: startOfToday + 1000 });
    renderList([fresh], 'today');
    expect(screen.getByText('Done today')).toBeInTheDocument();
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
