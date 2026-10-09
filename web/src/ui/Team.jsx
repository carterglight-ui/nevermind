import { LOOKS } from '../staffLook.js';

const STATUS = { working: 'WORKING', paused: 'PAUSED', idle: 'READY' };

/** Like the Pokemon party screen: everyone, their level, and how they're doing. */
export function Team({ roster, staff, progress, onPick }) {
  const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
  return (
    <div className="team">
      {roster.map((p) => {
        const s = byId[p.id];
        const pr = progress?.staff?.[p.id] || { level: 1, xp: 0, floor: 0, next: 40, done: 0, approved: 0 };
        const pct = Math.min(100, ((pr.xp - pr.floor) / Math.max(1, pr.next - pr.floor)) * 100);
        return (
          <button key={p.id} className={`team-row ${p.active ? '' : 'off'}`} onClick={() => onPick(p.id)}>
            <span className="team-icon" style={{ background: LOOKS[p.id].accent }} />
            <span className="team-main">
              <span className="team-top">
                <span className="team-name">{p.name.toUpperCase()}</span>
                <span className="team-lv">LV{pr.level}</span>
              </span>
              <span className="xpbar"><span style={{ width: `${pct}%` }} /></span>
              <span className="team-sub">
                {p.active ? (s?.status === 'working' ? s.activity || STATUS.working : STATUS[s?.status] || STATUS.idle) : 'PHASE 2'}
                {p.active && ` · ${pr.done} done · ${pr.approved} approved`}
              </span>
            </span>
          </button>
        );
      })}
      <p className="small muted">XP comes only from real results: +20 for a finished task, +50 when you approve their work, +10 per briefing.</p>
    </div>
  );
}
