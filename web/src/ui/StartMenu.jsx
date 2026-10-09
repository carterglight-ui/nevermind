const ITEMS = [
  { id: 'team', label: 'TEAM' },
  { id: 'review', label: 'REVIEW' },
  { id: 'briefings', label: 'BRIEFINGS' },
  { id: 'log', label: 'LOG' },
  { id: 'mail', label: 'MAIL' },
  { id: 'options', label: 'OPTIONS' },
  { id: 'exit', label: 'EXIT' },
];

export function StartMenu({ onPick, badges }) {
  return (
    <div className="start-scrim" onClick={() => onPick('exit')}>
      <nav className="start-menu" onClick={(e) => e.stopPropagation()}>
        {ITEMS.map((it) => (
          <button key={it.id} onClick={() => onPick(it.id)}>
            <span className="cur">▶</span>
            {it.label}
            {badges[it.id] ? <span className="menu-badge">{badges[it.id]}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
