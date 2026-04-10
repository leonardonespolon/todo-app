import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import TaskList from '../../src/components/TaskList';

// Capture the onDragEnd handler passed to DndContext on each render.
let capturedOnDragEnd = null;

vi.mock('@dnd-kit/core', async () => {
  return {
    DndContext: ({ children, onDragEnd }) => {
      capturedOnDragEnd = onDragEnd;
      return children;
    },
    useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      isDragging: false,
    }),
    useSensors: (...sensors) => sensors,
    useSensor: () => ({}),
    PointerSensor: class PointerSensor {},
  };
});

beforeEach(() => {
  localStorage.clear();
  capturedOnDragEnd = null;
});

const urgencySettings = { warning: 24, critical: 48 };

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

function renderList(tasks) {
  const onMove = vi.fn();
  render(
    <TaskList
      tasks={tasks}
      filter="all"
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onComplete={vi.fn()}
      onUncomplete={vi.fn()}
      onMove={onMove}
      urgencySettings={urgencySettings}
    />
  );
  return onMove;
}

describe('drag and drop between sections', () => {
  it('dragging a task to Watch calls onMove with watch', () => {
    const task = makeTask({ id: 'task-1', listId: 'todo' });
    const onMove = renderList([task]);
    capturedOnDragEnd({ active: { id: 'task-1' }, over: { id: 'watch' } });
    expect(onMove).toHaveBeenCalledWith('task-1', 'watch');
  });

  it('dragging a task to Later calls onMove with later', () => {
    const task = makeTask({ id: 'task-2', listId: 'watch' });
    const onMove = renderList([task]);
    capturedOnDragEnd({ active: { id: 'task-2' }, over: { id: 'later' } });
    expect(onMove).toHaveBeenCalledWith('task-2', 'later');
  });

  it('dropping on the same section is a no-op', () => {
    const task = makeTask({ id: 'task-3', listId: 'todo' });
    const onMove = renderList([task]);
    capturedOnDragEnd({ active: { id: 'task-3' }, over: { id: 'todo' } });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('dropping with no target (over: null) is a no-op', () => {
    const task = makeTask({ id: 'task-4', listId: 'todo' });
    const onMove = renderList([task]);
    capturedOnDragEnd({ active: { id: 'task-4' }, over: null });
    expect(onMove).not.toHaveBeenCalled();
  });
});
