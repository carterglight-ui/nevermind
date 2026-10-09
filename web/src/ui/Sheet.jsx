export function Sheet({ title, onClose, children, compact }) {
  return (
    <div className={`sheet ${compact ? 'compact' : ''}`}>
      <div className="sheet-head">
        <div className="grabber" />
        {title && <h2>{title}</h2>}
        <button className="close" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
