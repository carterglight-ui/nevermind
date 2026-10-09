import { useCallback, useEffect, useRef, useState } from 'react';
import { api, subscribe, getPasscode, setPasscode, AuthError } from './api.js';
import { Office } from './office/Office.jsx';
import { StaffPanel } from './ui/StaffPanel.jsx';
import { Inbox } from './ui/Inbox.jsx';
import { Briefings } from './ui/Briefings.jsx';
import { Log } from './ui/Log.jsx';
import { More } from './ui/More.jsx';
import { Sheet } from './ui/Sheet.jsx';

const TABS = [
  { id: 'office', label: 'Office', icon: '▦' },
  { id: 'inbox', label: 'Review', icon: '✉' },
  { id: 'briefings', label: 'Ren', icon: '☯' },
  { id: 'log', label: 'Log', icon: '≡' },
  { id: 'more', label: 'More', icon: '⚙' },
];

function Gate({ onDone, error }) {
  const [value, setValue] = useState('');
  return (
    <div className="gate">
      <div className="wordmark big">nevermind</div>
      <p>Enter your office passcode.</p>
      <form onSubmit={(e) => { e.preventDefault(); setPasscode(value.trim()); onDone(); }}>
        <input autoFocus type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Passcode" />
        <button className="btn primary">Enter</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function App() {
  const [state, setState] = useState(null);
  const [needsPass, setNeedsPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get('tab') || 'office');
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');
  const refreshTimer = useRef();

  const load = useCallback(async () => {
    try {
      setState(await api('/state'));
      setNeedsPass(false);
    } catch (err) {
      if (err instanceof AuthError) {
        setPassError(getPasscode() ? 'That passcode didn\'t work.' : '');
        setNeedsPass(true);
      } else {
        setToast(`Can't reach the office: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates.
  useEffect(() => {
    if (!state || needsPass) return;
    const close = subscribe((type, data) => {
      if (type === 'staff') {
        setState((s) => ({ ...s, staff: s.staff.map((p) => (p.id === data.id ? data : p)) }));
        return;
      }
      if (type === 'company') setState((s) => ({ ...s, companyPaused: data.paused }));
      if (type === 'briefing') setToast(`Ren: ${data.title}`);
      setTick((t) => t + 1);
      // Counts (reviews, briefings, budget) refresh at most every couple of seconds.
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, 1500);
    });
    return close;
  }, [Boolean(state), needsPass, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Reconnect and refresh when the app comes back to the foreground.
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  if (needsPass) return <Gate onDone={load} error={passError} />;
  if (!state) return <div className="gate"><div className="wordmark big">nevermind</div><p>Opening the office…</p></div>;

  const notify = (msg) => setToast(msg);
  const selectStaff = (id) => { setSelected(id); if (id) setTab('office'); };
  const missing = !state.integrations.ai;

  return (
    <div className="app">
      <Office roster={state.roster} staff={state.staff} selected={selected} onSelect={selectStaff} />

      <header className="hud">
        <div className="wordmark">nevermind</div>
        <div className="hud-right">
          <span className="pill" title="AI spend this month">${state.budget.spentMonth.toFixed(2)} / ${state.budget.monthlyBudget}</span>
          {state.companyPaused && <span className="pill warn">Paused</span>}
        </div>
      </header>
      {missing && (
        <button className="banner" onClick={() => setTab('more')}>
          Setup needed: the team's AI isn't connected yet. Tap for details.
        </button>
      )}
      {!missing && state.companyPaused && (
        <button className="banner" onClick={() => setTab('more')}>The whole company is paused. Tap to resume.</button>
      )}

      {tab === 'office' && selected && (
        <Sheet onClose={() => setSelected(null)} compact>
          <StaffPanel id={selected} tick={tick} notify={notify} />
        </Sheet>
      )}
      {tab === 'inbox' && <Sheet onClose={() => setTab('office')} title="Review inbox"><Inbox tick={tick} notify={notify} /></Sheet>}
      {tab === 'briefings' && <Sheet onClose={() => setTab('office')} title="Master Ren's briefings"><Briefings tick={tick} notify={notify} /></Sheet>}
      {tab === 'log' && <Sheet onClose={() => setTab('office')} title="Activity"><Log tick={tick} onSelect={selectStaff} /></Sheet>}
      {tab === 'more' && <Sheet onClose={() => setTab('office')} title="Settings"><More state={state} reload={load} notify={notify} /></Sheet>}

      {toast && <div className="toast" onClick={() => setToast('')}>{toast}</div>}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); if (t.id !== 'office') setSelected(null); }}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'inbox' && state.pendingReviews > 0 && <span className="badge">{state.pendingReviews}</span>}
            {t.id === 'briefings' && state.unreadBriefings > 0 && <span className="badge dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
