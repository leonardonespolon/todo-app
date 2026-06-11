import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function renderList(tasks, { focusMode = true, mode = 'personal' } = {}) {
  return render(
    <TaskList
      mode={mode}
      focusMode={focusMode}
      tasks={tasks}
      projects={[]}
      onAdd={noop}
      onAddSubTask={noop}
      onEdit={noop}
      onDelete={noop}
      onComplete={noop}
      onUncomplete={noop}
      onMove={noop}
      urgencySettings={urgencySettings}
      onAddProject={noop}
      onRenameProject={noop}
      onMoveProject={noop}
      onCompleteProject={noop}
      onUncompleteProject={noop}
      onDeleteProject={noop}
    />
  );
}

describe('focus mode', () => {
  it('shows at most 3 todo tasks and a "+N more" hint', () => {
    const tasks = [1, 2, 3, 4, 5].map(i => makeTask({ text: `Task ${i}` }));
    renderList(tasks);
    const items = document.querySelectorAll('.task-item');
    expect(items.length).toBe(3);
    expect(screen.getByText('+2 more in Todo')).toBeInTheDocument();
  });

  it('hides Watch, Later, and Completed sections', () => {
    const tasks = [
      makeTask({ listId: 'todo' }),
      makeTask({ listId: 'watch' }),
      makeTask({ listId: 'later' }),
      makeTask({ listId: 'todo', completedAt: Date.now() }),
    ];
    renderList(tasks);
    expect(screen.queryByText('Watch')).not.toBeInTheDocument();
    expect(screen.queryByText('Later')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
  });

  it('does not show watch or later tasks even when todo has fewer than 3', () => {
    const tasks = [
      makeTask({ listId: 'todo', text: 'Only todo' }),
      makeTask({ listId: 'watch', text: 'Watched' }),
    ];
    renderList(tasks);
    expect(screen.getByText(/Only todo/)).toBeInTheDocument();
    expect(screen.queryByText(/Watched/)).not.toBeInTheDocument();
  });

  it('shows an empty state when there is nothing to focus on', () => {
    renderList([]);
    expect(screen.getByText('Nothing to focus on. Add a task above.')).toBeInTheDocument();
  });

  it('renders all sections when focus mode is off', () => {
    renderList([makeTask()], { focusMode: false });
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
  });
});
