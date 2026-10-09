import { useEffect, useState } from 'react';
import { api, timeAgo } from '../api.js';

const WHO = { ren: 'Master Ren', washington: 'Washington', milo: 'Milo', felix: 'Felix', ollie: 'Ollie', cleo: 'Cleo', wren: 'Wren' };
const KIND = { email: 'Email draft', content: 'Deliverable', idea: 'Idea' };

function ReviewCard({ item, notify, onChanged }) {
  const [draft, setDraft] = useState({ to_addr: item.to_addr, subject: item.subject, body: item.body });
  const [feedback, setFeedback] = useState('');
  const [sendBack, setSendBack] = useState(false);
  const dirty = draft.to_addr !== item.to_addr || draft.subject !== item.subject || draft.body !== item.body;

  const save = async () => {
    if (dirty) await api(`/reviews/${item.id}`, { method: 'PATCH', body: draft });
  };
  const decide = async (decision) => {
    try {
      await save();
      await api(`/reviews/${item.id}/decide`, { method: 'POST', body: { decision, feedback } });
      notify(decision === 'done' ? 'Marked done.' : feedback ? 'Sent back for a revision.' : 'Dismissed.');
      onChanged();
    } catch (e) { notify(e.message); }
  };
  const copy = async () => {
    const text = item.kind === 'email' ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;
    try { await navigator.clipboard.writeText(text); notify('Copied.'); } catch { notify('Copy failed; select the text and copy it.'); }
  };
  const q = (s) => encodeURIComponent(s || '');
  const gmailLink = `googlegmail://co?to=${q(draft.to_addr)}&subject=${q(draft.subject)}&body=${q(draft.body)}`;
  const mailLink = `mailto:${q(draft.to_addr)}?subject=${q(draft.subject)}&body=${q(draft.body)}`;

  return (
    <div className="card review">
      <div className="review-meta">
        <span className={`tag ${item.kind}`}>{KIND[item.kind] || item.kind}</span>
        <span className="muted small">from {WHO[item.staff_id] || item.staff_id} · {timeAgo(item.created_at)}</span>
      </div>
      {item.kind !== 'email' && <div className="title">{item.title}</div>}
      {item.why && <div className="why">{item.why}</div>}

      {item.kind === 'email' && (
        <>
          <label>To<input value={draft.to_addr} onChange={(e) => setDraft({ ...draft, to_addr: e.target.value })} onBlur={save} /></label>
          <label>Subject<input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} onBlur={save} /></label>
        </>
      )}
      <textarea className="body" rows={item.kind === 'email' ? 9 : 12} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} onBlur={save} />

      {item.kind === 'email' ? (
        <div className="row wrap">
          <a className="btn primary" href={gmailLink} onClick={save}>Open in Gmail</a>
          <a className="btn" href={mailLink} onClick={save}>Mail app</a>
          <button className="btn" onClick={copy}>Copy</button>
        </div>
      ) : (
        <div className="row wrap"><button className="btn" onClick={copy}>Copy</button></div>
      )}
      <p className="muted small">Nevermind never sends anything. Open it in your mail app, check it, and send it yourself.</p>

      {sendBack ? (
        <div className="section">
          <textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What should change? (They'll revise and resubmit.)" />
          <div className="row">
            <button className="btn primary" disabled={!feedback.trim()} onClick={() => decide('rejected')}>Send back</button>
            <button className="btn" onClick={() => setSendBack(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="row">
          <button className="btn good" onClick={() => decide('done')}>{item.kind === 'email' ? 'I sent it ✓' : 'Approve ✓'}</button>
          <button className="btn" onClick={() => setSendBack(true)}>Request changes</button>
          <button className="btn ghost" onClick={() => decide('rejected')}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export function Inbox({ tick, notify }) {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState(null);
  const load = () => api(`/reviews?status=${status}`).then(setItems).catch((e) => notify(e.message));
  useEffect(() => { load(); }, [status, tick]);

  return (
    <div>
      <div className="seg">
        {['pending', 'done', 'rejected'].map((s) => (
          <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
            {{ pending: 'Waiting', done: 'Approved', rejected: 'Sent back' }[s]}
          </button>
        ))}
      </div>
      {!items && <p className="muted">Loading…</p>}
      {items && !items.length && <p className="muted center">{status === 'pending' ? 'Nothing waiting for you. Enjoy it.' : 'Nothing here yet.'}</p>}
      {items?.map((item) =>
        status === 'pending' ? (
          <ReviewCard key={item.id} item={item} notify={notify} onChanged={load} />
        ) : (
          <div key={item.id} className="card">
            <div className="title">{item.subject || item.title}</div>
            <div className="muted small">{WHO[item.staff_id]} · {timeAgo(item.decided_at || item.created_at)}</div>
            {item.feedback && <div className="why">Your notes: {item.feedback}</div>}
          </div>
        ),
      )}
    </div>
  );
}
