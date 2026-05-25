const LIST_LABELS = { todo: 'Todo', watch: 'Watch', later: 'Later' };
const ALL_LISTS = ['todo', 'watch', 'later'];

export default function MoveToDropdown({ listId, projectId, projects, onMove, onMoveToProject, onClose }) {
  const listOptions = ALL_LISTS.filter(l => l !== listId);

  const projectOptions = listId === 'todo' && projects?.length > 0
    ? [{ id: null, name: 'Inbox' }, ...projects].filter(p => p.id !== projectId)
    : [];

  return (
    <div className="move-dropdown" role="menu">
      {listOptions.map(target => (
        <button
          key={target}
          className="move-dropdown-item"
          role="menuitem"
          onClick={() => { onMove(target); onClose(); }}
        >
          Move to {LIST_LABELS[target]}
        </button>
      ))}
      {projectOptions.length > 0 && (
        <>
          <div className="move-dropdown-divider" />
          {projectOptions.map(p => (
            <button
              key={p.id ?? 'inbox'}
              className="move-dropdown-item"
              role="menuitem"
              onClick={() => { onMoveToProject(p.id); onClose(); }}
            >
              {p.id === null ? 'Move to Inbox' : `Move to ${p.name}`}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
