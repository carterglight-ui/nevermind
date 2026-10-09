import { useEffect, useState } from 'react';
import { api, timeAgo } from '../api.js';
import { LOOKS } from '../staffLook.js';

const NAME = { ren: 'Ren', washington: 'Washington', milo: 'Milo', felix: 'Felix', ollie: 'Ollie', cleo: 'Cleo', wren: 'Wren' };

export function Log({ tick, onSelect }) {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/activity?limit=200').then(setItems).catch(() => {}); }, [tick]);
  if (!items) return <p className="muted">Loading…</p>;
  if (!items.length) return <p className="muted center">Nothing has happened yet.</p>;
  return (
    <div className="log">
      {items.map((a) => (
        <div key={a.id} className={`log-line kind-${a.kind}`}>
          <button className="who-chip" style={{ background: LOOKS[a.staff_id]?.accent }} onClick={() => onSelect(a.staff_id)}>{NAME[a.staff_id] || a.staff_id}</button>
          <span className="log-text">{a.text}</span>
          <span className="muted small">{timeAgo(a.ts)}</span>
        </div>
      ))}
    </div>
  );
}
