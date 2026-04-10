import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskItem from '../../src/components/TaskItem';

const urgencySettings = { warning: 1, critical: 2 }; // 1h/2h so we can test with old tasks

function makeTask(overrides = {}) {
  return {
    id: '1',
    text: 'Test task',
    createdAt: Date.now() - 3 * 3600000, // 3 hours old — critical under 1h/2h settings
    completedAt: null,
    listId: 'todo',
    ...overrides,
  };
}

const noop = () => {};

function renderTask(task) {
  return render(
    <TaskItem
      task={task}
      onEdit={noop}
      onDelete={noop}
      onComplete={noop}
      onUncomplete={noop}
      onMove={noop}
      urgencySettings={urgencySettings}
    />
  );
}

describe('TaskItem urgency', () => {
  it('applies urgency style to a todo task that is old enough', () => {
    const { container } = renderTask(makeTask({ listId: 'todo' }));
    const card = container.querySelector('.task-item');
    // Critical tasks get a red background
    expect(card.style.background).toBeTruthy();
  });

  it('does NOT apply urgency style to a watch task regardless of age', () => {
    const { container } = renderTask(makeTask({ listId: 'watch' }));
    const card = container.querySelector('.task-item');
    expect(card.style.background).toBe('');
  });

  it('does NOT apply urgency style to a later task regardless of age', () => {
    const { container } = renderTask(makeTask({ listId: 'later' }));
    const card = container.querySelector('.task-item');
    expect(card.style.background).toBe('');
  });

  it('does NOT apply urgency style to a completed todo task', () => {
    const { container } = renderTask(makeTask({ listId: 'todo', completedAt: Date.now() }));
    const card = container.querySelector('.task-item');
    expect(card.style.background).toBe('');
  });
});

describe('TaskItem rendering', () => {
  it('renders the task text', () => {
    renderTask(makeTask({ text: 'Buy groceries' }));
    expect(screen.getByText(/Buy groceries/)).toBeInTheDocument();
  });
});
