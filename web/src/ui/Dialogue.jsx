// The Pokemon-style dialogue box: typewriter text, tap to continue, then a menu with a cursor.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/** Break long text into box-sized pages at word boundaries. */
export function paginate(text, max = 150) {
  const pages = [];
  for (const para of String(text).split(/\n+/)) {
    let rest = para.trim();
    while (rest.length > max) {
      let cut = rest.lastIndexOf('. ', max);
      if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
      if (cut <= 0) cut = max;
      pages.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) pages.push(rest);
  }
  return pages.length ? pages : ['…'];
}

function useTypewriter(text) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), 22);
    return () => clearInterval(id);
  }, [text]);
  return [text.slice(0, n), n >= text.length, () => setN(text.length)];
}

const EMPTY_LINES = {
  ren: 'Welcome back. What matters most today?',
  washington: "Pipeline doesn't build itself. What do you need?",
  milo: 'Ready when you are! Got something for me to make?',
  wren: "Found some businesses that should've done better. Want to see?",
};
const ACK = {
  ren: "Understood. I'll see that it gets done.",
  washington: 'Noted. Consider it handled.',
  milo: "On it! You'll find it at the Printer when it's ready.",
  wren: 'Fine. I will make it less terrible.',
};

function greeting(person, info) {
  const first = person.name.split(' ').pop() === 'Ren' ? 'Ren' : person.name.split(' ')[0];
  if (!person.active) return [`${person.name}, ${person.title}.`, 'Our department opens in Phase 2. For now I\'m getting my desk ready.'];
  const st = info?.state;
  if (st?.status === 'working') {
    return [`${st.activity || 'Working'}…`, info.current ? `Right now: ${info.current.title}.` : `(${first} is busy.)`];
  }
  if (st?.status === 'paused') return ["I'm on pause. Say the word and I'll get back to it."];
  const q = info?.queue?.length || 0;
  if (q) return [`I've got ${q} thing${q > 1 ? 's' : ''} lined up. Next: ${info.queue[0].title}.`];
  return [EMPTY_LINES[person.id] || 'Hey.'];
}

/**
 * target: a roster entry ({id, name, title, active}) or a scripted speaker {id, name, lines}.
 */
export function Dialogue({ person, onClose, notify, openSheet }) {
  const [info, setInfo] = useState(null);
  const [pages, setPages] = useState(person.lines || ['…']);
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState(person.lines ? 'text' : 'loading'); // loading | text | menu | input | waiting
  const [inputFor, setInputFor] = useState(null); // 'talk' | 'task'
  const [draft, setDraft] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef();

  useEffect(() => {
    if (person.lines) return;
    api(`/staff/${person.id}`)
      .then((d) => { setInfo(d); setPages(greeting(person, d)); setMode('text'); })
      .catch(() => { setPages(greeting(person, null)); setMode('text'); });
  }, [person.id]);

  const say = (text, then = 'menu') => { setPages(paginate(text)); setPage(0); setMode('text'); afterText.current = then; };
  const afterText = useRef(person.lines ? 'close' : 'menu');

  const [shown, done, finish] = useTypewriter(mode === 'text' ? pages[page] || '' : mode === 'waiting' ? '…' : '');

  const advance = () => {
    if (mode !== 'text') return;
    if (!done) return finish();
    if (page < pages.length - 1) return setPage(page + 1);
    if (afterText.current === 'close') return onClose();
    setMode('menu');
    setCursor(0);
  };

  const refresh = () => api(`/staff/${person.id}`).then(setInfo).catch(() => {});
  const working = info?.state?.status === 'working';
  const paused = info?.state?.status === 'paused';
  const options = !person.active || person.lines
    ? [{ label: 'OK', run: onClose }]
    : [
        person.id === 'ren' && { label: 'GIVE LIST', run: () => { onClose(); openSheet('list'); } },
        person.id === 'wren' && { label: 'LEAD BOARD', run: () => { onClose(); openSheet('leads'); } },
        { label: 'TALK', run: () => { setInputFor('talk'); setMode('input'); } },
        { label: 'NEW TASK', run: () => { setInputFor('task'); setMode('input'); } },
        { label: 'THEIR WORK', run: () => { onClose(); openSheet('staff', person.id); } },
        working && { label: 'STOP TASK', run: async () => { await api(`/staff/${person.id}/stop`, { method: 'POST' }); refresh(); say('Stopped. Dropping it.'); } },
        paused
          ? { label: 'RESUME', run: async () => { await api(`/staff/${person.id}/resume`, { method: 'POST' }); refresh(); say('Back to it.'); } }
          : { label: 'PAUSE', run: async () => { await api(`/staff/${person.id}/pause`, { method: 'POST' }); refresh(); say("Pausing. I'll be right here."); } },
        { label: 'BYE', run: onClose },
      ].filter(Boolean);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMode('waiting');
    try {
      if (inputFor === 'task') {
        const [title, ...rest] = text.split('\n');
        await api('/tasks', { method: 'POST', body: { assignee: person.id, title: title.slice(0, 200), details: rest.join('\n') || title, priority: 2 } });
        refresh();
        say(ACK[person.id] || 'On it.');
      } else {
        const { reply } = await api(`/staff/${person.id}/chat`, { method: 'POST', body: { text } });
        refresh();
        say(reply || '…');
      }
    } catch (e) {
      say(`(${e.message})`);
    }
  };

  useEffect(() => { if (mode === 'input') setTimeout(() => inputRef.current?.focus(), 50); }, [mode]);

  const speaker = person.name.includes('Ren') ? 'REN' : person.name.split(' ')[0].toUpperCase();

  return (
    <div className="dlg-wrap" onClick={(e) => e.stopPropagation()}>
      {mode === 'menu' && (
        <div className="dlg-menu">
          {options.map((o, i) => (
            <button key={o.label} className={i === cursor ? 'on' : ''} onPointerEnter={() => setCursor(i)} onClick={o.run}>
              <span className="cur">{i === cursor ? '▶' : ''}</span>{o.label}
            </button>
          ))}
        </div>
      )}
      <div className="dlg" onClick={advance}>
        <div className="dlg-name">{speaker}</div>
        {mode === 'input' ? (
          <div className="dlg-input" onClick={(e) => e.stopPropagation()}>
            <div className="dlg-prompt">{inputFor === 'task' ? `What should ${speaker} do?` : `What do you say to ${speaker}?`}</div>
            <textarea
              id="dlg-text"
              ref={inputRef}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={inputFor === 'task' ? 'e.g. Draft a follow-up to Riverside Ford about their March ad results' : 'Say something…'}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <div className="dlg-actions">
              <button className="gb-btn" onClick={() => setMode('menu')}>B BACK</button>
              <button className="gb-btn primary" disabled={!draft.trim()} onClick={send}>A SEND</button>
            </div>
          </div>
        ) : (
          <p className="dlg-text">
            {mode === 'loading' ? '…' : mode === 'menu' ? pages[pages.length - 1] : shown}
            {mode === 'text' && done && <span className="dlg-more">▼</span>}
          </p>
        )}
      </div>
    </div>
  );
}
