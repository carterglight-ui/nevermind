import { UNLOCKS } from '../office/Office.jsx';

/** Top of the screen: company level + XP, and today's task bar (Among Us style). */
export function Hud({ progress, onStart, onMap, map, paused }) {
  const c = progress?.company || { level: 1, xp: 0, floor: 0, next: 40 };
  const t = progress?.today || { done: 0, total: 0 };
  const xpPct = Math.min(100, ((c.xp - c.floor) / Math.max(1, c.next - c.floor)) * 100);
  const taskPct = t.total ? (t.done / t.total) * 100 : 0;
  return (
    <header className="hud">
      <div className="hud-left">
        <div className="hud-box">
          <div className="hud-row">
            <span className="hud-name">NEVERMIND INC.</span>
            <span className="hud-lv">LV{c.level}</span>
          </div>
          <div className="xpbar" title={`${c.xp} XP`}><div style={{ width: `${xpPct}%` }} /></div>
        </div>
        <div className="taskbar">
          <div className="taskbar-fill" style={{ width: `${taskPct}%` }} />
          <span>TASKS TODAY {t.done}/{t.total}</span>
        </div>
        {paused && <div className="hud-paused">COMPANY PAUSED</div>}
      </div>
      <div className="hud-right">
        <button className="gb-pill" onClick={onStart}>START</button>
        <button className="gb-pill small" onClick={onMap}>{map ? 'FOLLOW' : 'MAP'}</button>
      </div>
    </header>
  );
}

export function nextUnlock(level) {
  return UNLOCKS.find((u) => u.level > level);
}

/** "NEVERMIND INC. grew to LV 3!" */
export function LevelUp({ level, onDone }) {
  const unlocked = UNLOCKS.find((u) => u.level === level);
  return (
    <div className="levelup" onClick={onDone}>
      <div className="dlg">
        <p className="dlg-text">
          NEVERMIND INC. grew to LV {level}!
          {unlocked && <><br />The office got: {unlocked.name}.</>}
        </p>
      </div>
    </div>
  );
}
