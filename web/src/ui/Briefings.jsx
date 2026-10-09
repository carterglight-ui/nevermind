import { useEffect, useState } from 'react';
import { api, parseTs, PREVIEW } from '../api.js';

const KIND = { morning: 'Morning', evening: 'Evening', weekly: 'Weekly' };

export function Briefings({ tick, notify }) {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [asking, setAsking] = useState(false);

  const load = () => api('/briefings').then((b) => { setItems(b); setOpen((o) => o ?? b[0]?.id); }).catch((e) => notify(e.message));
  useEffect(() => { load(); api('/briefings/read', { method: 'POST' }).catch(() => {}); }, [tick]);

  const askNow = async () => {
    setAsking(true);
    try {
      const hour = new Date().getHours();
      const b = await api('/briefings/now', { method: 'POST', body: { kind: hour < 14 ? 'morning' : 'evening' } });
      setOpen(b.id);
      load();
    } catch (e) { notify(e.message); }
    setAsking(false);
  };

  return (
    <div>
      <div className="dialog">
        {PREVIEW
          ? <>In your own office Ren briefs you at <b>7:00 AM</b> (deeper on Mondays) and <b>7:00 PM</b>. Here, ask for one any time.</>
          : <>Ren briefs you at <b>7:00 AM</b> every day (a deeper one on Mondays) and wraps up at <b>7:00 PM</b>.</>}
      </div>
      <button className="btn" disabled={asking} onClick={askNow}>{asking ? 'Ren is writing…' : 'Ask Ren for an update now'}</button>
      {items && !items.length && <p className="muted center">No briefings yet. The first one arrives at the next 7:00.</p>}
      {items?.map((b) => (
        <div key={b.id} className={`card briefing ${open === b.id ? 'open' : ''}`} onClick={() => setOpen(open === b.id ? null : b.id)}>
          <div className="review-meta">
            <span className={`tag ${b.kind}`}>{KIND[b.kind]}</span>
            <span className="muted small">{parseTs(b.ts).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
          <div className="title">{b.title}</div>
          {open === b.id && <div className="briefing-body">{b.body}</div>}
        </div>
      ))}
    </div>
  );
}
