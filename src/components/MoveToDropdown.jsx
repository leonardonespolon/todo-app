const LIST_LABELS = { todo: 'Todo', watch: 'Watch', later: 'Later' };
const ALL_LISTS = ['todo', 'watch', 'later'];

export default function MoveToDropdown({ listId, onMove, onClose }) {
  const options = ALL_LISTS.filter(l => l !== listId);

  return (
    <div className="move-dropdown" role="menu">
      {options.map(target => (
        <button
          key={target}
          className="move-dropdown-item"
          role="menuitem"
          onClick={() => { onMove(target); onClose(); }}
        >
          Move to {LIST_LABELS[target]}
        </button>
      ))}
    </div>
  );
}
