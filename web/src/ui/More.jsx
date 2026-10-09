import { useEffect, useState } from 'react';
import { api, enablePush, setPasscode, PREVIEW } from '../api.js';
import { resetPreview } from '../preview/backend.js';

const NAME = { ren: 'Ren', washington: 'Washington', milo: 'Milo', felix: 'Felix', ollie: 'Ollie', cleo: 'Cleo', wren: 'Wren' };

function NoteEditor({ topic, label, placeholder, notes, notify }) {
  const existing = notes.find((n) => n.topic === topic)?.content || '';
  const [value, setValue] = useState(existing);
  useEffect(() => setValue(existing), [existing]);
  const save = async () => {
    try { await api('/notes', { method: 'POST', body: { topic, content: value } }); notify('Saved. The whole team can see it.'); }
    catch (e) { notify(e.message); }
  };
  return (
    <div className="section">
      <div className="label">{label}</div>
      <textarea rows={5} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      <button className="btn" disabled={value === existing} onClick={save}>Save</button>
    </div>
  );
}

export function More({ state, reload, notify }) {
  const [notes, setNotes] = useState([]);
  const [clients, setClients] = useState([]);
  useEffect(() => {
    api('/notes').then(setNotes).catch(() => {});
    api('/clients').then(setClients).catch(() => {});
  }, []);

  const call = async (path, msg) => {
    try { await api(path, { method: 'POST' }); notify(msg); reload(); } catch (e) { notify(e.message); }
  };
  const push = async () => {
    try { await enablePush(state.vapidPublicKey); notify('Notifications on. Ren will ping you at 7 AM and 7 PM.'); }
    catch (e) { notify(e.message); }
  };

  const conn = state.integrations;
  const b = state.budget;

  if (PREVIEW) {
    return (
      <div>
        <div className="dialog">
          This is the preview office. The team does real work through your Claude plan while this page is open. To give them your Gmail and calendar and keep them working around the clock, set up your own office (SETUP.md).
        </div>
        <NoteEditor topic="owner: about me" label="About you (the team reads this)" placeholder="Your name, what you do, your clients, how you like to sound in emails…" notes={notes} notify={notify} />
        <NoteEditor topic="owner: ground rules" label="Ground rules" placeholder="e.g. Keep client emails under 150 words…" notes={notes} notify={notify} />
        <div className="section">
          <div className="row wrap">
            {state.companyPaused
              ? <button className="btn primary" onClick={() => call('/company/resume', 'Everyone is back to work.')}>Resume company</button>
              : <button className="btn danger" onClick={() => call('/company/pause', 'Everyone has stopped.')}>Pause everyone</button>}
            <button className="btn ghost" onClick={() => { resetPreview(); location.reload(); }}>Start the preview over</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section">
        <div className="label">Connections</div>
        <div className="conn"><span className={conn.ai ? 'ok' : 'no'} />Team AI (Anthropic)</div>
        <div className="conn"><span className={conn.gmail ? 'ok' : 'no'} />Gmail (read-only)</div>
        <div className="conn"><span className={conn.calendar ? 'ok' : 'no'} />Google Calendar (read-only)</div>
        <div className="conn"><span className={conn.push ? 'ok' : 'no'} />Notifications</div>
        {!(conn.ai && conn.gmail && conn.calendar && conn.push) && (
          <p className="muted small">Anything not connected is set up on the server. See SETUP.md in the project.</p>
        )}
        {conn.push && <button className="btn" onClick={push}>Turn on notifications on this phone</button>}
      </div>

      <div className="section">
        <div className="label">Budget</div>
        <div className="meter"><div style={{ width: `${Math.min(100, (b.spentMonth / b.monthlyBudget) * 100)}%` }} /></div>
        <p className="small">${b.spentMonth.toFixed(2)} of ${b.monthlyBudget} this month · ${b.spentToday.toFixed(2)} today (daily share ${b.dailyAllowance.toFixed(2)})</p>
        {b.byStaff.map((s) => <div key={s.staff_id} className="small muted">{NAME[s.staff_id]}: ${s.cost.toFixed(2)}</div>)}
        {!b.routineAllowed && <p className="small warn-text">Today's share is used up. Routine work resumes tomorrow; your direct requests and briefings still go through.</p>}
      </div>

      <div className="section">
        <div className="label">Company</div>
        <div className="row wrap">
          {state.companyPaused
            ? <button className="btn primary" onClick={() => call('/company/resume', 'Everyone is back to work.')}>Resume company</button>
            : <button className="btn danger" onClick={() => call('/company/pause', 'Everyone has stopped.')}>Pause everyone</button>}
          <button className="btn" disabled={!conn.ai} onClick={() => call('/shift/washington', 'Washington is starting a shift.')}>Run Washington's shift now</button>
          <button className="btn" disabled={!conn.gmail} onClick={() => call('/inbox/sync', 'Inbox synced.')}>Check email now</button>
        </div>
      </div>

      <NoteEditor
        topic="owner: about me"
        label="About you (the team reads this)"
        placeholder="Your name, what you do, your business, family, goals, how you like to sound in emails…"
        notes={notes}
        notify={notify}
      />
      <NoteEditor
        topic="owner: ground rules"
        label="Ground rules"
        placeholder="e.g. Never contact clients on Sundays. Keep emails under 120 words. Always CC my business partner…"
        notes={notes}
        notify={notify}
      />

      <div className="section">
        <div className="label">Clients ({clients.length})</div>
        {!clients.length && <p className="muted small">Washington builds this list from your inbox. You can also tell him about clients directly.</p>}
        {clients.map((c) => (
          <div key={c.id} className="client">
            <div className="title">{c.name}</div>
            <div className="small muted">{[c.business_type, c.stage, c.next_followup && `follow up ${c.next_followup}`].filter(Boolean).join(' · ')}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <button className="btn ghost" onClick={() => { setPasscode(''); location.reload(); }}>Lock this phone</button>
      </div>
    </div>
  );
}
