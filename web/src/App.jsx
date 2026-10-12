import { useCallback, useEffect, useRef, useState } from 'react';
import { api, subscribe, getPasscode, setPasscode, AuthError, PREVIEW } from './api.js';
import { Office } from './office/Office.jsx';
import { StaffPanel } from './ui/StaffPanel.jsx';
import { Inbox } from './ui/Inbox.jsx';
import { Briefings } from './ui/Briefings.jsx';
import { Log } from './ui/Log.jsx';
import { More } from './ui/More.jsx';
import { Sheet } from './ui/Sheet.jsx';
import { Joystick, AButton } from './ui/Controls.jsx';
import { Dialogue } from './ui/Dialogue.jsx';
import { Hud, LevelUp } from './ui/Hud.jsx';
import { StartMenu } from './ui/StartMenu.jsx';
import { Team } from './ui/Team.jsx';
import { Mail } from './ui/Mail.jsx';
import { MyList } from './ui/MyList.jsx';
import { Leads } from './ui/Leads.jsx';
import { game, getQuality, saveQuality } from './game.js';
import { STATIONS } from './office/layout.js';

const TUTORIAL_KEY = 'nevermind-tutorial-done';
const seenTutorial = () => { try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; } };
const markTutorial = () => { try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* fine */ } };

const TUTORIAL = {
  id: 'ren',
  name: 'Master Ren',
  lines: [
    "Welcome to Nevermind. I'm Master Ren. This whole company works for one client: you.",
    'Drag the pad at the bottom left to walk. Walk up to anyone and press A to talk.',
    'Hand me your to-do list any time (START, then MY LIST). I give the team what they can do and keep the rest for you.',
    'Give Washington, Milo or Wren real work. When a draft is ready it comes out of the Printer for you to review.',
    'Every real result earns the company XP. As we level up, so does the office.',
    'Tap START for the team, my briefings and settings. Now, what matters most today?',
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

const SHEET_TITLES = { list: 'MY LIST', leads: "WREN'S LEAD BOARD", review: 'PRINTER · REVIEW', briefings: "REN'S BRIEFINGS", log: 'BULLETIN BOARD', mail: 'MAIL TERMINAL', options: 'OPTIONS', team: 'TEAM', staff: '' };

export function App() {
  const [state, setState] = useState(null);
  const [progress, setProgress] = useState(null);
  const [needsPass, setNeedsPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [sheet, setSheet] = useState(null); // { name, arg }
  const [menu, setMenu] = useState(false);
  const [talk, setTalk] = useState(null); // roster entry or scripted speaker
  const [map, setMap] = useState(false);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');
  const [levelUp, setLevelUp] = useState(null);
  const [quality, setQuality] = useState(getQuality);
  const lastLevel = useRef(null);
  const refreshTimer = useRef();

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api('/state'), api('/progress')]);
      setState(s);
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

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!state || needsPass) return;
    const close = subscribe((type, data) => {
      if (type === 'staff') {
        setState((s) => ({ ...s, staff: s.staff.map((p) => (p.id === data.id ? data : p)) }));
        return;
      }
      if (type === 'company') setState((s) => ({ ...s, companyPaused: data.paused }));
      if (type === 'briefing') setToast(`Ren: ${data.title}`);
      if (type === 'review' && data.status === 'pending') setToast('Something new came out of the Printer.');
      setTick((t) => t + 1);
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, 1200);
    });
    return close;
  }, [Boolean(state), needsPass, load]);

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

  // First visit: Ren explains how to play.
  useEffect(() => {
    if (state && !seenTutorial()) setTalk(TUTORIAL);
  }, [Boolean(state)]);

  // Freeze walking while talking or reading.
  useEffect(() => { game.frozen = Boolean(talk || sheet || menu); }, [talk, sheet, menu]);
  useEffect(() => { game.map = map; }, [map]);

  if (needsPass) return <Gate onDone={load} error={passError} />;
  if (!state) return <div className="gate"><div className="wordmark big">nevermind</div><p className="pixel">LOADING…</p></div>;

  const roster = state.roster;
  const names = Object.fromEntries(roster.map((p) => [p.id, p.name]));
  const notify = (msg) => setToast(msg);
  const openSheet = (name, arg) => { setMenu(false); setTalk(null); setSheet({ name, arg }); };
  const talkTo = (id) => { const p = roster.find((r) => r.id === id); if (p) { setSheet(null); setTalk(p); } };
  const press = (near) => {
    if (near.type === 'staff') talkTo(near.id);
    else openSheet(STATIONS[near.id].opens);
  };
  const closeTalk = () => { if (talk === TUTORIAL) markTutorial(); setTalk(null); };

  const stationBadges = { review: state.pendingReviews, briefing: state.unreadBriefings };
  const menuBadges = { review: state.pendingReviews, briefings: state.unreadBriefings };

  return (
    <div className="app">
      <Office
        roster={roster}
        staff={state.staff}
        selected={null}
        talkingTo={talk && !talk.lines ? talk.id : null}
        onSelect={(id) => id && talkTo(id)}
        level={progress?.company.level || 1}
        stationBadges={stationBadges}
        quality={quality}
      />

      <Hud progress={progress} onStart={() => setMenu(true)} onMap={() => setMap(!map)} map={map} paused={state.companyPaused} />

      {PREVIEW && !talk && !sheet && (
        <div className="preview-tag">PREVIEW OFFICE · real work, no email access yet</div>
      )}
      {!PREVIEW && !state.integrations.ai && !talk && !sheet && (
        <button className="preview-tag" onClick={() => openSheet('options')}>SETUP NEEDED · tap for details</button>
      )}

      {!talk && !sheet && !menu && (
        <>
          <Joystick />
          <AButton names={names} onPress={press} />
        </>
      )}

      {talk && <Dialogue key={talk.id + (talk.lines ? '-script' : '')} person={talk} onClose={closeTalk} notify={notify} openSheet={openSheet} />}

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
