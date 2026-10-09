// The game layer: the company and each employee gain XP only from real outcomes.
//   task finished          +20 to whoever did it
//   draft/deliverable you approved   +50 to whoever made it
//   draft you sent back for changes  +5 (they learn from it)
//   briefing delivered     +10 to Ren
import { all, get } from './db.js';
import { STAFF } from './staff.js';
import { localDayStartUtc } from './time.js';

export const XP = { task: 20, approved: 50, revised: 5, briefing: 10 };

export function levelFor(xp) {
  const level = Math.floor(Math.sqrt(xp / 40)) + 1;
  return { level, floor: 40 * (level - 1) ** 2, next: 40 * level ** 2 };
}

export function progress() {
  const staff = {};
  for (const id of Object.keys(STAFF)) staff[id] = { xp: 0, done: 0, approved: 0 };
  for (const r of all("SELECT assignee AS id, COUNT(*) AS n FROM tasks WHERE status = 'done' GROUP BY assignee")) {
    if (staff[r.id]) { staff[r.id].done = r.n; staff[r.id].xp += r.n * XP.task; }
  }
  for (const r of all("SELECT staff_id AS id, status, COUNT(*) AS n FROM reviews WHERE status IN ('done', 'rejected') GROUP BY staff_id, status")) {
    if (!staff[r.id]) continue;
    if (r.status === 'done') { staff[r.id].approved += r.n; staff[r.id].xp += r.n * XP.approved; }
    else staff[r.id].xp += r.n * XP.revised;
  }
  staff.ren.xp += get('SELECT COUNT(*) AS n FROM briefings').n * XP.briefing;
  for (const s of Object.values(staff)) Object.assign(s, levelFor(s.xp));

  const companyXp = Object.values(staff).reduce((a, s) => a + s.xp, 0);
  const since = localDayStartUtc();
  const today = get(
    `SELECT SUM(status = 'done') AS done, COUNT(*) AS total FROM tasks
     WHERE status != 'cancelled' AND (created_at >= ? OR (status IN ('queued', 'working')) OR updated_at >= ?)`,
    since, since,
  );
  return {
    company: { xp: companyXp, ...levelFor(companyXp) },
    today: { done: today.done || 0, total: today.total || 0 },
    staff,
  };
}
