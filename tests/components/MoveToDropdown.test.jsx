import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoveToDropdown from '../../src/components/MoveToDropdown';

function renderDropdown(listId, onMove = vi.fn(), onClose = vi.fn()) {
  return render(
    <MoveToDropdown listId={listId} onMove={onMove} onClose={onClose} />
  );
}

describe('MoveToDropdown', () => {
  it('shows Watch and Later options for a todo task', () => {
    renderDropdown('todo');
    expect(screen.getByText('Move to Watch')).toBeInTheDocument();
    expect(screen.getByText('Move to Later')).toBeInTheDocument();
  });

  it('does NOT show Todo option for a todo task', () => {
    renderDropdown('todo');
    expect(screen.queryByText('Move to Todo')).not.toBeInTheDocument();
  });

  it('shows Todo and Later options for a watch task', () => {
    renderDropdown('watch');
    expect(screen.getByText('Move to Todo')).toBeInTheDocument();
    expect(screen.getByText('Move to Later')).toBeInTheDocument();
    expect(screen.queryByText('Move to Watch')).not.toBeInTheDocument();
  });

  it('shows Todo and Watch options for a later task', () => {
    renderDropdown('later');
    expect(screen.getByText('Move to Todo')).toBeInTheDocument();
    expect(screen.getByText('Move to Watch')).toBeInTheDocument();
    expect(screen.queryByText('Move to Later')).not.toBeInTheDocument();
  });

  it('calls onMove with correct listId when clicking Watch', () => {
    const onMove = vi.fn();
    renderDropdown('todo', onMove);
    fireEvent.click(screen.getByText('Move to Watch'));
    expect(onMove).toHaveBeenCalledWith('watch');
  });

  it('calls onMove with correct listId when clicking Later', () => {
    const onMove = vi.fn();
    renderDropdown('todo', onMove);
    fireEvent.click(screen.getByText('Move to Later'));
    expect(onMove).toHaveBeenCalledWith('later');
  });

  it('calls onMove with todo when clicking Todo', () => {
    const onMove = vi.fn();
    renderDropdown('watch', onMove);
    fireEvent.click(screen.getByText('Move to Todo'));
    expect(onMove).toHaveBeenCalledWith('todo');
  });
});
