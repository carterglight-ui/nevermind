import { useEffect, useRef, useState } from 'react';
import { api, timeAgo } from '../api.js';
import { LOOKS } from '../staffLook.js';

const PRIORITY = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low', 5: 'Someday' };

export function StaffPanel({ id, tick, notify }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEnd = useRef();

  const load = () => api(`/staff/${id}`).then(setData).catch((e) => notify(e.message));
  useEffect(() => { setData(null); load(); }, [id]);
  useEffect(() => { if (data) load(); }, [tick]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [data?.chat?.length]);

  if (!data) return <p className="muted">Loading…</p>;
  const { state, current, queue, recent, chat } = data;
  const paused = state.status === 'paused';
  const look = LOOKS[id];

  const act = async (path, msg) => {
    try { await api(path, { method: 'POST' }); notify(msg); load(); } catch (e) { notify(e.message); }
  };
  const patchTask = async (taskId, body) => {
    try { await api(`/tasks/${taskId}`, { method: 'PATCH', body }); load(); } catch (e) { notify(e.message); }
  };

  const talk = async () => {
    if (!text.trim()) return;
    setSending(true);
    const msg = text;
    setText('');
    try {
      await api(`/staff/${id}/chat`, { method: 'POST', body: { text: msg } });
      load();
    } catch (e) { notify(e.message); setText(msg); }
    setSending(false);
  };

  const assign = async () => {
    if (!text.trim()) return;
    const [title, ...rest] = text.trim().split('\n');
    try {
      await api('/tasks', { method: 'POST', body: { assignee: id, title: title.slice(0, 200), details: rest.join('\n') || title, priority: 2 } });
      setText('');
      notify(`Assigned to ${data.name}.`);
      load();
    } catch (e) { notify(e.message); }
  };

  return (
    <div className="staff-panel">
      <div className="staff-head">
        <div className="avatar" style={{ background: look.accent }}>{data.name.split(' ').map((w) => w[0]).join('')}</div>
        <div>
          <h2>{data.name}</h2>
          <div className="muted">{data.title}</div>
        </div>
      </div>

      {!data.active ? (
        <div className="dialog">This department opens in Phase 2. For now {data.name.split(' ')[0]} is getting the office ready.</div>
      ) : (
        <>
          <div className={`status-line ${state.status}`}>
            <span className="dot" />
            {state.status === 'working' ? state.activity || 'Working' : paused ? 'Paused' : 'Available'}
          </div>

          {current && (
            <div className="card">
              <div className="label">Working on</div>
              <div className="title">{current.title}</div>
              <button className="btn danger small" onClick={() => act(`/staff/${id}/stop`, 'Stopped.')}>Stop this</button>
            </div>
          )}

          <div className="row">
            {paused ? (
              <button className="btn primary" onClick={() => act(`/staff/${id}/resume`, `${data.name} is back to work.`)}>Resume</button>
            ) : (
              <button className="btn" onClick={() => act(`/staff/${id}/pause`, `${data.name} is paused.`)}>Pause {data.name.split(' ')[0]}</button>
            )}
          </div>

          <div className="section">
            <div className="label">Talk or redirect</div>
            <div className="chat">
              {chat.map((m) => (
                <div key={m.id} className={`msg ${m.role}`}>
                  {m.role === 'staff' && <span className="who">{data.name.split(' ')[0]}</span>}
                  {m.text}
                </div>
              ))}
              {sending && <div className="msg staff"><span className="who">{data.name.split(' ')[0]}</span>…</div>}
              <div ref={chatEnd} />
            </div>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${data.name.split(' ')[0]}… (e.g. "Drop the dentist proposal, focus on Riverside Ford")`}
            />
            <div className="row">
              <button className="btn primary" disabled={sending || !text.trim()} onClick={talk}>Say it</button>
              <button className="btn" disabled={!text.trim()} onClick={assign}>Assign as task</button>
            </div>
          </div>

          <div className="section">
            <div className="label">Queue ({queue.length})</div>
            {!queue.length && <p className="muted">Nothing queued.</p>}
            {queue.map((t) => (
              <div key={t.id} className="task">
                <div className="task-main">
                  <div className="title">{t.title}</div>
                  <div className="muted small">{t.status === 'working' ? 'In progress' : PRIORITY[t.priority]} · from {t.created_by === 'owner' ? 'you' : t.created_by}</div>
                </div>
                <div className="task-actions">
                  <button className="icon" disabled={t.priority <= 1} onClick={() => patchTask(t.id, { priority: t.priority - 1 })} aria-label="Raise priority">▲</button>
                  <button className="icon" disabled={t.priority >= 5} onClick={() => patchTask(t.id, { priority: t.priority + 1 })} aria-label="Lower priority">▼</button>
                  <button className="icon danger" onClick={() => patchTask(t.id, { status: 'cancelled' })} aria-label="Cancel">✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section">
        <div className="label">Recent</div>
        {!recent.length && <p className="muted">No activity yet.</p>}
        {recent.slice(0, 12).map((a) => (
          <div key={a.id} className="log-line"><span className="muted small">{timeAgo(a.ts)}</span> {a.text}</div>
        ))}
      </div>
    </div>
  );
}
