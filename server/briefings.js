// Master Ren's briefings: 7:00 AM every day (deeper on Mondays) and 7:00 PM.
import { think, BudgetExceeded } from './ai.js';
import { config, integrations } from './config.js';
import { all, get, run } from './db.js';
import { STAFF } from './staff.js';
import { broadcast, log, setStaff } from './events.js';
import { notifyOwner } from './push.js';
import { budgetStatus } from './ai.js';
import { upcomingEvents, formatEvents } from './integrations/calendar.js';
import { nowLabel } from './time.js';

const name = (id) => STAFF[id]?.name || id;

async function gather(kind) {
  const hours = kind === 'weekly' ? 7 * 24 : kind === 'morning' ? 12 : 13;
  const since = `-${hours} hours`;
  const done = all(`SELECT title, assignee, substr(result, 1, 500) AS result FROM tasks WHERE status = 'done' AND updated_at >= datetime('now', ?) ORDER BY id`, since);
  const failed = all(`SELECT title, assignee, substr(result, 1, 200) AS result FROM tasks WHERE status = 'failed' AND updated_at >= datetime('now', ?)`, since);
  const open = all(`SELECT title, assignee, status, priority FROM tasks WHERE status IN ('queued', 'working') ORDER BY priority, id LIMIT 25`);
  const pending = all(`SELECT id, kind, title, subject, why, staff_id FROM reviews WHERE status = 'pending' ORDER BY id`);
  const activity = all(`SELECT staff_id, text, ts FROM activity WHERE ts >= datetime('now', ?) ORDER BY id DESC LIMIT 80`, since);
  const followups = all(`SELECT name, stage, next_followup FROM clients WHERE next_followup != '' AND next_followup <= date('now', '+3 days') ORDER BY next_followup`);
  let calendar = 'Calendar not connected.';
  if (integrations.calendar) {
    try { calendar = formatEvents(await upcomingEvents(kind === 'evening' ? 2 : kind === 'weekly' ? 7 : 1)); }
    catch (e) { calendar = `Calendar unavailable (${e.message}).`; }
  }
  const byStaff = {};
  for (const id of Object.keys(STAFF)) {
    const tasks = all(`SELECT title FROM tasks WHERE assignee = ? AND status = 'done' AND updated_at >= datetime('now', ?)`, id, since).map((t) => t.title);
    const made = all(`SELECT kind, COALESCE(NULLIF(subject, ''), title) AS what FROM reviews WHERE staff_id = ? AND created_at >= datetime('now', ?)`, id, since);
    const found = get(`SELECT COUNT(*) AS n FROM leads WHERE found_by = ? AND created_at >= datetime('now', ?)`, id, since).n;
    if (tasks.length || made.length || found) byStaff[id] = { tasks, made, found };
  }
  const huddles = all(`SELECT text FROM activity WHERE kind = 'meeting' AND text LIKE 'Team huddle%' AND ts >= datetime('now', ?)`, since).map((a) => a.text);
  const leads = all(`SELECT business, business_type, city, status FROM leads WHERE created_at >= datetime('now', ?) ORDER BY score DESC`, since);
  const pipeline = all(`SELECT status, COUNT(*) AS n FROM leads GROUP BY status`);
  const ownerTodos = all(`SELECT text, due FROM owner_todos WHERE status = 'open' ORDER BY id LIMIT 30`);
  const ownerDone = get(`SELECT COUNT(*) AS n FROM owner_todos WHERE status = 'done' AND done_at >= datetime('now', ?)`, since).n;
  const newEmails = get(`SELECT COUNT(*) AS n FROM emails WHERE date >= ?`, new Date(Date.now() - hours * 3600e3).toISOString()).n;
  return { byStaff, huddles, hours, done, failed, open, pending, activity, followups, calendar, newEmails, leads, pipeline, ownerTodos, ownerDone, budget: budgetStatus() };
}

function factsText(d) {
  const list = (rows, f) => (rows.length ? rows.map(f).join('\n') : '(none)');
  const people = Object.entries(d.byStaff).map(([id, w]) => {
    const emails = w.made.filter((m) => m.kind === 'email').map((m) => m.what);
    const other = w.made.filter((m) => m.kind !== 'email').map((m) => m.what);
    return `${name(id)}:\n` + [
      w.tasks.length && `  finished ${w.tasks.length} task(s): ${w.tasks.join('; ')}`,
      emails.length && `  drafted ${emails.length} email(s): ${emails.join('; ')}`,
      other.length && `  delivered ${other.length} piece(s) of work/ideas: ${other.join('; ')}`,
      w.found && `  found ${w.found} new lead(s)`,
    ].filter(Boolean).join('\n');
  });
  return `What each employee did:
${people.length ? people.join('\n') : '(nothing recorded yet)'}

Team huddles:
${list(d.huddles, (h) => `- ${h}`)}

Completed work:
${list(d.done, (t) => `- ${t.title} (${name(t.assignee)}): ${t.result}`)}

Could not finish:
${list(d.failed, (t) => `- ${t.title} (${name(t.assignee)}): ${t.result}`)}

Waiting for the owner's review (${d.pending.length}):
${list(d.pending, (r) => `- [${r.kind}] ${r.subject || r.title} (from ${name(r.staff_id)}): ${r.why}`)}

Still in progress / queued:
${list(d.open, (t) => `- ${t.title} -> ${name(t.assignee)} (${t.status})`)}

Client follow-ups due within 3 days:
${list(d.followups, (c) => `- ${c.name} (${c.stage}) due ${c.next_followup}`)}

New leads Wren found (${d.leads.length}):
${list(d.leads.slice(0, 12), (l) => `- ${l.business} (${l.business_type}, ${l.city}) [${l.status}]`)}
Lead pipeline: ${d.pipeline.map((p) => `${p.status} ${p.n}`).join(', ') || 'empty'}

The owner's own list (${d.ownerTodos.length} open, ${d.ownerDone} finished this period):
${list(d.ownerTodos, (t) => `- ${t.text}${t.due ? ` (due ${t.due})` : ''}`)}

Calendar:
${d.calendar}

New emails in this period: ${d.newEmails}
AI spend: $${d.budget.spentMonth.toFixed(2)} of $${d.budget.monthlyBudget} this month.

Office activity log (newest first):
${list(d.activity.slice(0, 50), (a) => `- ${a.ts} ${name(a.staff_id)}: ${a.text}`)}`;
}

const INSTRUCTIONS = {
  morning: `Write the owner's MORNING briefing. Start with "What everyone did": one short block per employee who did something, their name then bullets of concrete results with counts (e.g. "3 new leads", "drafted 2 follow-ups"), including what they came up with together in huddles. Then cover: what the team did overnight (including new leads), what needs the owner's approval (most important first), today's calendar, the owner's own list for today, and the 2-4 priorities for today. Under 320 words.`,
  weekly: `Write the owner's MONDAY WEEKLY briefing, a deeper look back over the past 7 days. Start with "What everyone did this week": one block per employee with concrete results and counts, including huddle ideas. Then cover: results by department, client pipeline status, what needs approval, problems or risks, this week's calendar, and the plan for the week with clear priorities. Also one honest sentence on balance (energy, family, rest). Under 550 words.`,
  evening: `Write the owner's EVENING wrap-up. Start with "What everyone did today": one short block per employee who did something, their name then bullets of concrete results with counts, including huddle ideas. Then cover: what was accomplished today, what's still waiting on the owner, anything that didn't go well, and what the team will work on tomorrow/overnight. Under 300 words.`,
};

function fallbackBriefing(kind, d) {
  const title = { morning: 'Morning briefing', weekly: 'Weekly briefing', evening: 'Evening wrap-up' }[kind];
  return { title, body: `Ren could not write today's note (AI unavailable), so here are the facts.\n\n${factsText(d)}` };
}

export async function writeBriefing(kind) {
  const d = await gather(kind);
  let briefing;
  if (!integrations.ai) {
    briefing = fallbackBriefing(kind, d);
  } else {
    setStaff('ren', { status: 'working', activity: 'Preparing your briefing' });
    try {
      const response = await think(
        'ren',
        {
          system: `You are Master Ren, Director of Life at Nevermind, writing a briefing for the company's only client, the owner${config.ownerName !== 'the client' ? ` (${config.ownerName})` : ''}. You are calm and warm; you may open with one short line in your own voice, but the rest is clear, plain, skimmable and factual. Use short sections with plain-text headings and "-" bullets. Never invent work that isn't in the facts. Mention items needing approval by what they are, not by id numbers. First line of your answer is the title (no "Title:" prefix), then a blank line, then the body.`,
          messages: [{ role: 'user', content: `${INSTRUCTIONS[kind]}\n\nIt is ${nowLabel()}.\n\nFACTS\n${factsText(d)}` }],
          output_config: { effort: kind === 'weekly' ? 'high' : 'medium' },
        },
        { priority: true },
      );
      const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (response.stop_reason === 'refusal' || !text) throw new Error('empty briefing');
      const [first, ...rest] = text.split('\n');
      briefing = { title: first.replace(/^#+\s*/, '').trim(), body: rest.join('\n').trim() };
    } catch (err) {
      if (!(err instanceof BudgetExceeded)) console.error('briefing failed', err);
      briefing = fallbackBriefing(kind, d);
    } finally {
      setStaff('ren', { status: 'idle', activity: '' });
    }
  }

  const { lastInsertRowid } = run('INSERT INTO briefings (kind, title, body) VALUES (?, ?, ?)', kind, briefing.title, briefing.body);
  const saved = get('SELECT * FROM briefings WHERE id = ?', lastInsertRowid);
  broadcast('briefing', saved);
  log('ren', `Delivered the ${kind === 'weekly' ? 'weekly' : kind} briefing`, 'briefing');
  setStaff('ren', { bubble: kind === 'evening' ? 'Your evening report is ready.' : 'Good morning. Your briefing is ready.' });
  await notifyOwner({
    title: `Ren: ${briefing.title}`,
    body: d.pending.length ? `${d.pending.length} item${d.pending.length === 1 ? '' : 's'} waiting for your review.` : 'Tap to read.',
    tag: `briefing-${saved.id}`,
    url: '/?tab=briefings',
  });
  return saved;
}
