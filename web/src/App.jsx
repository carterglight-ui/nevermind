import { useCallback, useEffect, useRef, useState } from 'react';
import { api, subscribe, getPasscode, setPasscode, AuthError, PREVIEW } from './api.js';
import { Office } from './office/Office.jsx';
import { StaffPanel } from './ui/StaffPanel.jsx';
import { Inbox } from './ui/Inbox.jsx';
import { Briefings } from './ui/Briefings.jsx';
import { Log } from './ui/Log.jsx';
import { More } from './ui/More.jsx';
import { Sheet } from './ui/Sheet.jsx';
import { Dialogue } from './ui/Dialogue.jsx';
import { Hud, LevelUp } from './ui/Hud.jsx';
import { StartMenu } from './ui/StartMenu.jsx';
import { Team } from './ui/Team.jsx';
import { Mail } from './ui/Mail.jsx';
import { MyList } from './ui/MyList.jsx';
import { Leads } from './ui/Leads.jsx';
import { game, emit, getQuality, saveQuality } from './game.js';

const TUTORIAL_KEY = 'nevermind-tutorial-v2';
const seenTutorial = () => { try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; } };
const markTutorial = () => { try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* fine */ } };

const TUTORIAL = {
  id: 'ren',
  name: 'Master Ren',
  lines: [
    "Welcome to Nevermind. I'm Master Ren. This company works for one client: you.",
    "You don't need to do anything here. Just watch. The team works on your life whether you're looking or not.",
    'If you want something, talk to me. I tell the team. Tap anyone else to ask them something, give them a task, move them, or pause them.',
    'Every morning and evening I tell you what each of them did. Drafts that need you come out of the Printer.',
    'Drag to look around, pinch to zoom. Now, what matters most today?',
  ],
};

function Gate({ onDone, error }) {
  const [value, setValue] = useState('');
  return (
    <div className="gate">
      <div className="wordmark big">nevermind</div>
      <p>Enter your office passcode.</p>
      <form onSubmit={(e) => { e.preventDefault(); setPasscode(value.trim()); onDone(); }}>
        <input id="passcode" autoFocus type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Passcode" />
        <button className="btn primary">Enter</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

const SHEET_TITLES = {
  list: 'MY LIST', leads: "WREN'S LEAD BOARD", review: 'PRINTER · REVIEW', briefings: "REN'S BRIEFINGS",
  log: 'BULLETIN BOARD', mail: 'MAIL TERMINAL', options: 'OPTIONS', team: 'TEAM', staff: '',
};

const LINE_MS = 4200; // how long each line of a huddle stays up
const GATHER_MS = 5000; // time to walk to the table before talking

export function App() {
  const [state, setState] = useState(null);
  const [progress, setProgress] = useState(null);
  const [needsPass, setNeedsPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [sheet, setSheet] = useState(null); // { name, arg }
  const [menu, setMenu] = useState(false);
  const [talk, setTalk] = useState(null); // roster entry or scripted speaker
  const [moving, setMoving] = useState(null); // id waiting for a floor tap
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');
  const [levelUp, setLevelUp] = useState(null);
  const [quality, setQuality] = useState(getQuality);
  const lastLevel = useRef(null);
  const refreshTimer = useRef();
  const meetingTimer = useRef();
  const rosterRef = useRef([]);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api('/state'), api('/progress')]);
      setState(s);
      rosterRef.current = s.roster;
      setProgress(p);
      if (lastLevel.current && p.company.level > lastLevel.current) setLevelUp(p.company.level);
      lastLevel.current = p.company.level;
      setNeedsPass(false);
    } catch (err) {
      if (err instanceof AuthError) {
        setPassError(getPasscode() ? "That passcode didn't work." : '');
        setNeedsPass(true);
      } else {
        setToast(`Can't reach the office: ${err.message}`);
      }
    }
  }, []);

  /** A team huddle: everyone walks to the table, then the real discussion plays out in bubbles. */
  const playMeeting = useCallback((m) => {
    clearTimeout(meetingTimer.current);
    const lines = (m.lines || []).filter((l) => l.speaker && l.text);
    if (!lines.length) return;
    game.meeting = { participants: m.participants, lines, speaking: null, line: '' };
    emit();
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        game.meeting = null;
        emit();
        return;
      }
      game.meeting.speaking = lines[i].speaker;
      game.meeting.line = lines[i].text.slice(0, 160);
      emit();
      i += 1;
      meetingTimer.current = setTimeout(next, LINE_MS);
    };
    meetingTimer.current = setTimeout(next, GATHER_MS);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!state || needsPass) return;
    const close = subscribe((type, data) => {
      if (type === 'staff') {
        setState((s) => ({ ...s, staff: s.staff.map((p) => (p.id === data.id ? data : p)) }));
        return;
      }
      if (type === 'meeting') { playMeeting(data); return; }
      if (type === 'task' && !game.meeting && data.status === 'queued' && data.created_by !== 'owner' && data.created_by !== data.assignee && rosterRef.current.some((r) => r.id === data.created_by)) {
        // Someone handing work to a teammate walks over to deliver it.
        game.visits[data.created_by] = { to: data.assignee, line: `Got one for you: ${data.title}`.slice(0, 120), until: Date.now() + 12000 };
        emit();
      }
      if (type === 'company') setState((s) => ({ ...s, companyPaused: data.paused }));
      if (type === 'briefing') setToast(`Ren: ${data.title}`);
      if (type === 'review' && data.status === 'pending') setToast('Something new came out of the Printer.');
      setTick((t) => t + 1);
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, 1200);
    });
    return close;
  }, [Boolean(state), needsPass, load, playMeeting]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && !PREVIEW && load();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  // First visit: Ren explains how it works.
  useEffect(() => {
    if (state && !seenTutorial()) setTalk(TUTORIAL);
  }, [Boolean(state)]);

  useEffect(() => { game.moveMode = moving; }, [moving]);

  if (needsPass) return <Gate onDone={load} error={passError} />;
  if (!state) return <div className="gate"><div className="wordmark big">nevermind</div><p className="pixel">LOADING…</p></div>;

  const roster = state.roster;
  const notify = (msg) => setToast(msg);
  const openSheet = (name, arg) => { setMenu(false); setTalk(null); setMoving(null); setSheet({ name, arg }); };
  const talkTo = (id) => {
    const p = roster.find((r) => r.id === id);
    if (!p || moving) return;
    setSheet(null);
    setMenu(false);
    setTalk(p);
  };
  const closeTalk = () => { if (talk === TUTORIAL) markTutorial(); setTalk(null); };
  const sendTo = (spot) => {
    if (!moving) return;
    game.orders[moving] = { to: spot, until: Date.now() + 45000 };
    const who = roster.find((r) => r.id === moving)?.name.split(' ')[0];
    setMoving(null);
    notify(`${who} is on the way. They'll go back to work in a bit.`);
  };
  const huddle = async () => {
    notify('Ren is calling everyone to the table…');
    try {
      const m = await api('/huddle', { method: 'POST' });
      if (m?.lines) playMeeting(m);
    } catch (e) { notify(e.message); }
  };

  const stationBadges = { review: state.pendingReviews, briefing: state.unreadBriefings };
  const menuBadges = { review: state.pendingReviews, briefings: state.unreadBriefings };
  const ren = roster.find((r) => r.id === 'ren');

  return (
    <div className="app">
      <Office
        roster={roster}
        staff={state.staff}
        onSelect={talkTo}
        onFloor={sendTo}
        onStation={(name) => openSheet(name)}
        level={progress?.company.level || 1}
        stationBadges={stationBadges}
        quality={quality}
      />

      <Hud progress={progress} onStart={() => { setTalk(null); setMenu(true); }} paused={state.companyPaused} />

      {moving && (
        <div className="move-hint">
          <span>Tap where {roster.find((r) => r.id === moving)?.name.split(' ')[0]} should go</span>
          <button className="gb-btn" onClick={() => setMoving(null)}>CANCEL</button>
        </div>
      )}

      {!talk && !sheet && !menu && !moving && (
        <>
          {PREVIEW && <div className="preview-tag">PREVIEW OFFICE · real work, no email access yet</div>}
          {!PREVIEW && !state.integrations.ai && (
            <button className="preview-tag" onClick={() => openSheet('options')}>SETUP NEEDED · tap for details</button>
          )}
          <button className="ren-btn" onClick={() => setTalk(ren)}>
            <span className="ren-face" aria-hidden="true">◡‿◡</span>
            TALK TO REN
            {state.unreadBriefings > 0 && <span className="menu-badge">NEW</span>}
          </button>
        </>
      )}

      {talk && (
        <Dialogue
          key={talk.id + (talk.lines ? '-script' : '')}
          person={talk}
          onClose={closeTalk}
          notify={notify}
          openSheet={openSheet}
          onMove={(id) => setMoving(id)}
          onHuddle={huddle}
        />
      )}

      {menu && (
        <StartMenu
          badges={menuBadges}
          onPick={(id) => { setMenu(false); if (id !== 'exit') openSheet(id); }}
        />
      )}

      {sheet && (
        <Sheet title={SHEET_TITLES[sheet.name]} onClose={() => setSheet(null)}>
          {sheet.name === 'staff' && <StaffPanel id={sheet.arg} tick={tick} notify={notify} />}
          {sheet.name === 'team' && <Team roster={roster} staff={state.staff} progress={progress} onPick={(id) => openSheet('staff', id)} />}
          {sheet.name === 'list' && <MyList tick={tick} notify={notify} />}
          {sheet.name === 'leads' && <Leads tick={tick} notify={notify} />}
          {sheet.name === 'review' && <Inbox tick={tick} notify={notify} />}
          {sheet.name === 'briefings' && <Briefings tick={tick} notify={notify} />}
          {sheet.name === 'log' && <Log tick={tick} onSelect={(id) => openSheet('staff', id)} />}
          {sheet.name === 'mail' && <Mail state={state} notify={notify} />}
          {sheet.name === 'options' && (
            <>
              <div className="section">
                <div className="label">Graphics</div>
                <div className="seg">
                  {[['high', 'Full quality'], ['saver', 'Battery saver']].map(([q, label]) => (
                    <button key={q} className={quality === q ? 'on' : ''} onClick={() => { setQuality(q); saveQuality(q); }}>{label}</button>
                  ))}
                </div>
              </div>
              <More state={state} reload={load} notify={notify} />
            </>
          )}
        </Sheet>
      )}

      {levelUp && <LevelUp level={levelUp} onDone={() => setLevelUp(null)} />}
      {toast && <div className="toast" onClick={() => setToast('')}>{toast}</div>}
    </div>
  );
}
