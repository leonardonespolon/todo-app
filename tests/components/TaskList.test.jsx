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

describe('projects in every mode', () => {
  function renderWithProjects(tasks, projects) {
    return render(
      <TaskList
        tasks={tasks}
        projects={projects}
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

  it('renders the new-project row without a mode prop', () => {
    renderWithProjects([], []);
    expect(screen.getByPlaceholderText('New project...')).toBeInTheDocument();
  });

  it('renders project cards with their sub-tasks regardless of mode', () => {
    const project = { id: 'p1', name: 'Garden', listId: 'todo', completedAt: null, createdAt: Date.now() };
    const sub = makeTask({ text: 'Buy seeds', projectId: 'p1', listId: undefined });
    renderWithProjects([sub], [project]);
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText('Buy seeds')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
  });

  it('counts todo projects in the Todo section count', () => {
    const project = { id: 'p1', name: 'Garden', listId: 'todo', completedAt: null, createdAt: Date.now() };
    renderWithProjects([makeTask()], [project]);
    expect(screen.getByText('Todo').querySelector('.section-count')).toHaveTextContent('2');
  });
});

describe('project rename button', () => {
  it('opens the rename field when the Rename button is clicked', () => {
    const project = { id: 'p1', name: 'Garden', listId: 'todo', completedAt: null, createdAt: Date.now() };
    render(
      <TaskList
        tasks={[]}
        projects={[project]}
        onAdd={noop} onAddSubTask={noop} onEdit={noop} onDelete={noop}
        onComplete={noop} onUncomplete={noop} onMove={noop}
        urgencySettings={urgencySettings}
        onAddProject={noop} onRenameProject={noop} onMoveProject={noop}
        onCompleteProject={noop} onUncompleteProject={noop} onDeleteProject={noop}
      />
    );
    fireEvent.click(screen.getByLabelText('Rename project'));
    expect(screen.getByDisplayValue('Garden')).toBeInTheDocument();
  });
});

describe('project collapse', () => {
  const PROJECT_COLLAPSE_KEY = 'todo-app-project-collapse';

  function makeProject(overrides = {}) {
    return { id: 'p1', name: 'Garden', listId: 'todo', completedAt: null, createdAt: 1000, ...overrides };
  }

  function renderProjects(projects, tasks = []) {
    return render(
      <TaskList
        tasks={tasks}
        projects={projects}
        onAdd={noop} onAddSubTask={noop} onEdit={noop} onDelete={noop}
        onComplete={noop} onUncomplete={noop} onMove={noop}
        urgencySettings={urgencySettings}
        onAddProject={noop} onRenameProject={noop} onMoveProject={noop}
        onCompleteProject={noop} onUncompleteProject={noop} onDeleteProject={noop}
      />
    );
  }

  const stored = () => JSON.parse(localStorage.getItem(PROJECT_COLLAPSE_KEY));

  it('starts an active project expanded', () => {
    renderProjects([makeProject()]);
    expect(screen.getByPlaceholderText('Add sub-task...')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse project')).toBeInTheDocument();
  });

  it('starts a completed project collapsed', () => {
    const done = 5000;
    const project = makeProject({ listId: 'completed', completedAt: done });
    const sub = makeTask({ id: 's1', text: 'Buy seeds', projectId: 'p1', completedAt: done });
    renderProjects([project], [sub]);
    expect(screen.queryByText('Buy seeds')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand project')).toBeInTheDocument();
  });

  it('persists a collapse toggle to localStorage', () => {
    renderProjects([makeProject()]);
    fireEvent.click(screen.getByLabelText('Collapse project'));
    expect(screen.queryByPlaceholderText('Add sub-task...')).not.toBeInTheDocument();
    expect(stored()).toEqual({ p1: true });
  });

  it('restores a stored collapsed state on mount', () => {
    localStorage.setItem(PROJECT_COLLAPSE_KEY, JSON.stringify({ p1: true }));
    renderProjects([makeProject()]);
    expect(screen.queryByPlaceholderText('Add sub-task...')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Expand project')).toBeInTheDocument();
  });

  it('respects an explicit expand on a completed project', () => {
    const done = 5000;
    localStorage.setItem(PROJECT_COLLAPSE_KEY, JSON.stringify({ p1: false }));
    const project = makeProject({ listId: 'completed', completedAt: done });
    const sub = makeTask({ id: 's1', text: 'Buy seeds', projectId: 'p1', completedAt: done });
    renderProjects([project], [sub]);
    expect(screen.getByText('Buy seeds')).toBeInTheDocument();
  });

  it('prunes entries for projects that no longer exist', () => {
    localStorage.setItem(PROJECT_COLLAPSE_KEY, JSON.stringify({ p1: true, gone: true }));
    renderProjects([makeProject()]);
    expect(stored()).toEqual({ p1: true });
  });

  it('keeps stored entries when there are no projects to compare against', () => {
    localStorage.setItem(PROJECT_COLLAPSE_KEY, JSON.stringify({ p1: true }));
    renderProjects([]);
    expect(stored()).toEqual({ p1: true });
  });

  it('keeps the collapse chevron outside the hover-fading controls group', () => {
    // The edit/move/delete group fades in on hover; collapse must not, so it
    // has to live outside .project-card-controls.
    renderProjects([makeProject()]);
    const chevron = screen.getByLabelText('Collapse project');
    expect(chevron.closest('.project-card-controls')).toBeNull();
    expect(chevron.closest('.project-card-actions')).not.toBeNull();
    expect(screen.getByLabelText('Delete project').closest('.project-card-controls')).not.toBeNull();
  });

  it('ignores a corrupt stored value', () => {
    localStorage.setItem(PROJECT_COLLAPSE_KEY, '{not json');
    renderProjects([makeProject()]);
    expect(screen.getByPlaceholderText('Add sub-task...')).toBeInTheDocument();
  });
});
