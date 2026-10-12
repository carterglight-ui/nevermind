import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/** Shrink a phone photo before sending it (keeps uploads fast and small). */
function shrink(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error("Couldn't open that photo."));
    img.src = URL.createObjectURL(file);
  });
}

/** Your own list: hand Ren a to-do list, and tick off what only you can do. */
export function MyList({ tick, notify }) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [todos, setTodos] = useState(null);
  const [quick, setQuick] = useState('');
  const fileRef = useRef();

  const load = () => api('/todos').then(setTodos).catch((e) => notify(e.message));
  useEffect(() => { load(); }, [tick]);

  const give = async () => {
    setBusy(true);
    setReply('');
    try {
      const { reply: r } = await api('/intake', { method: 'POST', body: { text, image: photo } });
      setReply(r);
      setText('');
      setPhoto(null);
      load();
    } catch (e) { notify(e.message); }
    setBusy(false);
  };

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setPhoto(await shrink(f)); } catch (err) { notify(err.message); }
  };

  const toggle = async (t) => {
    try { await api(`/todos/${t.id}`, { method: 'PATCH', body: { status: t.status === 'done' ? 'open' : 'done' } }); load(); }
    catch (e) { notify(e.message); }
  };
  const add = async () => {
    if (!quick.trim()) return;
    try { await api('/todos', { method: 'POST', body: { text: quick.trim() } }); setQuick(''); load(); }
    catch (e) { notify(e.message); }
  };

  const open = todos?.filter((t) => t.status === 'open') || [];
  const done = todos?.filter((t) => t.status === 'done') || [];

  return (
    <div>
      <div className="dialog">Hand me your list for the day or the week. I'll give the team what they can do and keep the rest here for you.</div>
      <textarea
        id="ren-list"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Paste or type your list, one per line…\ne.g.\nFollow up with Riverside Ford about April budget\nFind 10 dentist offices to pitch\nCall the bank about the card\nPlan Saturday with the kids'}
      />
      {photo && (
        <div className="photo-chip">
          <img src={photo} alt="Your list" />
          <button className="btn small" onClick={() => setPhoto(null)}>Remove photo</button>
        </div>
      )}
      <input ref={fileRef} id="list-photo" type="file" accept="image/*" hidden onChange={pick} />
      <div className="row wrap">
        <button className="btn primary" disabled={busy || (!text.trim() && !photo)} onClick={give}>{busy ? 'Ren is sorting it…' : 'Give it to Ren'}</button>
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>{photo ? 'Change photo' : 'Add a photo of a list'}</button>
      </div>
      {reply && <div className="msg staff ren-reply"><span className="who">REN</span>{reply}</div>}

      <div className="section">
        <div className="label">Only you can do these ({open.length})</div>
        {todos && !open.length && <p className="muted small">Nothing on your plate. Ren adds things here that need you personally.</p>}
        {open.map((t) => (
          <button key={t.id} className="todo" onClick={() => toggle(t)}>
            <span className="box" />
            <span className="todo-main">
              <span className="todo-text">{t.text}{t.due && <span className="todo-due"> · {t.due}</span>}</span>
              {t.note && <span className="todo-note">{t.note}</span>}
            </span>
          </button>
        ))}
        <div className="row">
          <input id="quick-todo" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add one yourself" />
          <button className="btn" disabled={!quick.trim()} onClick={add}>Add</button>
        </div>
      </div>

      {done.length > 0 && (
        <div className="section">
          <div className="label">Done lately (+10 XP each)</div>
          {done.map((t) => (
            <button key={t.id} className="todo done" onClick={() => toggle(t)}>
              <span className="box">✓</span>
              <span className="todo-main"><span className="todo-text">{t.text}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
