// Nevermind HQ: the always-on server the iPhone app talks to.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { config, integrations } from './config.js';
import { all, get, run, getSetting, setSetting } from './db.js';
import { STAFF, ACTIVE_STAFF, publicRoster } from './staff.js';
import { addClient, broadcast, ensureStaffRows, allStaffState, staffState, setStaff, log } from './events.js';
import { budgetStatus } from './ai.js';
import { chatWith, interrupt, interruptTask } from './agents/runner.js';
import { writeBriefing } from './briefings.js';
import { startScheduler, washingtonShift, wrenShift, nudge } from './scheduler.js';
import { saveSubscription, vapidPublicKey } from './push.js';
import { syncInbox } from './integrations/gmail.js';
import { progress } from './progress.js';
import { intake } from './intake.js';

if (process.env.NODE_ENV === 'production' && !config.passcode) {
  console.error('APP_PASSCODE must be set in production.');
  process.exit(1);
}

ensureStaffRows();
const app = express();
app.use(express.json({ limit: '10mb' })); // photos of to-do lists

// ---- Auth: one owner, one passcode ----
function passcodeOk(given) {
  if (!config.passcode) return true;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(config.passcode);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res, next) => {
  if (passcodeOk(req.get('x-passcode') || req.query.key)) return next();
  res.status(401).json({ error: 'Wrong passcode' });
});

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

const taskById = (id) => get('SELECT * FROM tasks WHERE id = ?', id);
const reviewById = (id) => get('SELECT * FROM reviews WHERE id = ?', id);

// ---- Overview ----
app.get('/api/state', (req, res) => {
  res.json({
    roster: publicRoster(),
    staff: allStaffState(),
    integrations,
    budget: budgetStatus(),
    companyPaused: getSetting('company_paused', false),
    pendingReviews: get("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'").n,
    unreadBriefings: get('SELECT COUNT(*) AS n FROM briefings WHERE read = 0').n,
    vapidPublicKey,
    timezone: config.timezone,
  });
});

app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  addClient(res);
});

// ---- Staff ----
app.get('/api/staff/:id', (req, res) => {
  const id = req.params.id;
  if (!STAFF[id]) return res.status(404).json({ error: 'No such employee' });
  const state = staffState(id);
  res.json({
    ...publicRoster().find((s) => s.id === id),
    state,
    current: state.task_id ? taskById(state.task_id) : null,
    queue: all("SELECT * FROM tasks WHERE assignee = ? AND status IN ('queued', 'working') ORDER BY status = 'working' DESC, priority, id", id),
    recent: all('SELECT * FROM activity WHERE staff_id = ? ORDER BY id DESC LIMIT 25', id),
    chat: all('SELECT * FROM chat WHERE staff_id = ? ORDER BY id DESC LIMIT 30', id).reverse(),
  });
});

app.post('/api/staff/:id/pause', (req, res) => {
  const id = req.params.id;
  if (!STAFF[id]) return res.status(404).end();
  interrupt(id);
  run("UPDATE tasks SET status = 'queued' WHERE assignee = ? AND status = 'working'", id);
  setStaff(id, { status: 'paused', activity: 'Paused', bubble: 'Paused.' });
  log(id, 'Paused by you', 'control');
  res.json(staffState(id));
});

app.post('/api/staff/:id/resume', (req, res) => {
  const id = req.params.id;
  if (!STAFF[id]) return res.status(404).end();
  setStaff(id, { status: 'idle', activity: '', bubble: 'Back to it.' });
  log(id, 'Resumed by you', 'control');
  nudge();
  res.json(staffState(id));
});

app.post('/api/staff/:id/stop', (req, res) => {
  const id = req.params.id;
  const state = staffState(id);
  if (state?.task_id) {
    run("UPDATE tasks SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", state.task_id);
    broadcast('task', taskById(state.task_id));
  }
  interrupt(id);
  log(id, 'Current work stopped by you', 'control', state?.task_id);
  res.json({ ok: true });
});

app.post('/api/staff/:id/chat', wrap(async (req, res) => {
  const id = req.params.id;
  const text = String(req.body.text || '').trim().slice(0, 4000);
  if (!STAFF[id] || !text) return res.status(400).json({ error: 'Need an employee and a message' });
  if (!STAFF[id].active) {
    return res.json({ reply: `${STAFF[id].name} starts work in Phase 2. Talk to Master Ren for now.` });
  }
  if (!integrations.ai) return res.json({ reply: "(The office isn't connected to its AI yet. Add the Anthropic key in setup.)" });
  res.json({ reply: await chatWith(id, text) });
}));

// ---- Tasks ----
app.get('/api/tasks', (req, res) => {
  const open = req.query.status !== 'all';
  res.json(all(`SELECT * FROM tasks ${open ? "WHERE status IN ('queued', 'working')" : ''} ORDER BY id DESC LIMIT 200`));
});

app.post('/api/tasks', (req, res) => {
  const { assignee, title, details = '', priority = 2 } = req.body;
  if (!ACTIVE_STAFF.includes(assignee) || !title) return res.status(400).json({ error: 'Need an active assignee and a title' });
  const { lastInsertRowid } = run(
    'INSERT INTO tasks (title, details, assignee, created_by, priority) VALUES (?, ?, ?, ?, ?)',
    String(title).slice(0, 200), String(details).slice(0, 20000), assignee, 'owner', Math.min(5, Math.max(1, Number(priority) || 2)),
  );
  const task = taskById(lastInsertRowid);
  broadcast('task', task);
  log(assignee, `Got a new assignment from you: "${task.title}"`, 'handoff', task.id);
  nudge();
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = taskById(req.params.id);
  if (!task) return res.status(404).end();
  if (req.body.priority !== undefined) {
    run("UPDATE tasks SET priority = ?, updated_at = datetime('now') WHERE id = ?", Math.min(5, Math.max(1, Number(req.body.priority))), task.id);
  }
  if (req.body.status === 'cancelled' && ['queued', 'working'].includes(task.status)) {
    run("UPDATE tasks SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", task.id);
    interruptTask(task.id);
    log(task.assignee, `"${task.title}" cancelled by you`, 'control', task.id);
  }
  if (req.body.status === 'queued' && ['cancelled', 'failed'].includes(task.status)) {
    run("UPDATE tasks SET status = 'queued', updated_at = datetime('now') WHERE id = ?", task.id);
    nudge();
  }
  const updated = taskById(task.id);
  broadcast('task', updated);
  res.json(updated);
});

// ---- Review inbox ----
app.get('/api/reviews', (req, res) => {
  const status = req.query.status || 'pending';
  res.json(all('SELECT * FROM reviews WHERE status = ? ORDER BY id DESC LIMIT 100', status));
});

app.patch('/api/reviews/:id', (req, res) => {
  const r = reviewById(req.params.id);
  if (!r) return res.status(404).end();
  for (const f of ['to_addr', 'subject', 'body']) {
    if (typeof req.body[f] === 'string') run(`UPDATE reviews SET ${f} = ? WHERE id = ?`, req.body[f].slice(0, 50000), r.id);
  }
  res.json(reviewById(r.id));
});

app.post('/api/reviews/:id/decide', (req, res) => {
  const r = reviewById(req.params.id);
  if (!r) return res.status(404).end();
  const decision = req.body.decision === 'rejected' ? 'rejected' : 'done';
  const feedback = String(req.body.feedback || '').slice(0, 4000);
  run("UPDATE reviews SET status = ?, feedback = ?, decided_at = datetime('now') WHERE id = ?", decision, feedback, r.id);

  if (decision === 'rejected' && feedback && STAFF[r.staff_id]?.active) {
    // Send it back with notes: the same employee revises it.
    const { lastInsertRowid } = run(
      'INSERT INTO tasks (title, details, assignee, created_by, priority) VALUES (?, ?, ?, ?, ?)',
      `Revise: ${r.subject || r.title}`.slice(0, 200),
      `The owner sent this back with notes. Revise it and resubmit (same tool you used originally).\n\nOwner's notes: ${feedback}\n\nOriginal (${r.kind}):\nTo: ${r.to_addr}\nSubject: ${r.subject}\nTitle: ${r.title}\n\n${r.body}`,
      r.staff_id, 'owner', 2,
    );
    broadcast('task', taskById(lastInsertRowid));
    nudge();
  }
  log(r.staff_id, decision === 'done' ? `You approved "${r.subject || r.title}"` : `You sent back "${r.subject || r.title}"${feedback ? ' with notes' : ''}`, 'review');
  broadcast('review', reviewById(r.id));
  res.json(reviewById(r.id));
});

// ---- Briefings, activity, clients, notes ----
app.get('/api/briefings', (req, res) => res.json(all('SELECT * FROM briefings ORDER BY id DESC LIMIT 60')));
app.post('/api/briefings/read', (req, res) => {
  run('UPDATE briefings SET read = 1');
  res.json({ ok: true });
});
app.post('/api/briefings/now', wrap(async (req, res) => {
  const kind = ['morning', 'evening', 'weekly'].includes(req.body.kind) ? req.body.kind : 'evening';
  res.json(await writeBriefing(kind));
}));

app.get('/api/activity', (req, res) => {
  res.json(all('SELECT * FROM activity ORDER BY id DESC LIMIT ?', Math.min(500, Number(req.query.limit) || 150)));
});
app.get('/api/clients', (req, res) => res.json(all('SELECT * FROM clients ORDER BY stage, name')));
app.get('/api/usage', (req, res) => res.json(budgetStatus()));
app.get('/api/progress', (req, res) => res.json(progress()));

app.get('/api/notes', (req, res) => res.json(all('SELECT * FROM notes ORDER BY topic')));
app.post('/api/notes', (req, res) => {
  const topic = String(req.body.topic || '').trim().slice(0, 120);
  if (!topic) return res.status(400).end();
  const content = String(req.body.content || '').slice(0, 8000);
  if (!content.trim()) run('DELETE FROM notes WHERE topic = ?', topic);
  else run(
    `INSERT INTO notes (topic, content, author) VALUES (?, ?, 'owner')
     ON CONFLICT(topic) DO UPDATE SET content = excluded.content, author = 'owner', updated_at = datetime('now')`,
    topic, content,
  );
  res.json({ ok: true });
});

// ---- Company controls ----
app.post('/api/company/pause', (req, res) => {
  setSetting('company_paused', true);
  for (const id of Object.keys(STAFF)) interrupt(id);
  run("UPDATE tasks SET status = 'queued' WHERE status = 'working'");
  log('ren', 'You paused the whole company', 'control');
  broadcast('company', { paused: true });
  res.json({ paused: true });
});
app.post('/api/company/resume', (req, res) => {
  setSetting('company_paused', false);
  log('ren', 'You resumed the company', 'control');
  broadcast('company', { paused: false });
  nudge();
  res.json({ paused: false });
});
app.post('/api/shift/washington', (req, res) => {
  washingtonShift('requested').catch((e) => console.error(e));
  res.json({ ok: true });
});
// ---- Your list: hand Ren a to-do list; see what's left for you ----
app.post('/api/intake', wrap(async (req, res) => {
  if (!integrations.ai) return res.status(400).json({ error: "Ren can't read lists until the team's AI is connected." });
  const reply = await intake({ text: String(req.body.text || ''), image: req.body.image || null });
  nudge();
  res.json({ reply });
}));
app.get('/api/todos', (req, res) => {
  res.json(all("SELECT * FROM owner_todos WHERE status = 'open' OR done_at >= datetime('now', '-2 days') ORDER BY status = 'done', id"));
});
app.post('/api/todos', (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 300);
  if (!text) return res.status(400).end();
  const { lastInsertRowid } = run('INSERT INTO owner_todos (text, due) VALUES (?, ?)', text, String(req.body.due || '').slice(0, 60));
  const todo = get('SELECT * FROM owner_todos WHERE id = ?', lastInsertRowid);
  broadcast('todo', todo);
  res.json(todo);
});
app.patch('/api/todos/:id', (req, res) => {
  const t = get('SELECT * FROM owner_todos WHERE id = ?', req.params.id);
  if (!t) return res.status(404).end();
  const status = ['open', 'done', 'dropped'].includes(req.body.status) ? req.body.status : t.status;
  run(`UPDATE owner_todos SET status = ?, done_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE NULL END WHERE id = ?`, status, status, t.id);
  if (status === 'done' && t.status !== 'done') log('ren', `You finished "${t.text}"`, 'owner');
  const todo = get('SELECT * FROM owner_todos WHERE id = ?', t.id);
  broadcast('todo', todo);
  res.json(todo);
});

// ---- Leads ----
app.get('/api/leads', (req, res) => res.json(all('SELECT * FROM leads ORDER BY status IN (\'won\', \'dead\'), score DESC, id DESC LIMIT 300')));
app.patch('/api/leads/:id', (req, res) => {
  const lead = get('SELECT * FROM leads WHERE id = ?', req.params.id);
  if (!lead) return res.status(404).end();
  const STAGES = ['new', 'drafted', 'contacted', 'meeting', 'won', 'dead'];
  if (STAGES.includes(req.body.status) && req.body.status !== lead.status) {
    run("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?", req.body.status, lead.id);
    log(lead.found_by, `${lead.business}: you marked it "${req.body.status}"`, 'lead');
  }
  const updated = get('SELECT * FROM leads WHERE id = ?', lead.id);
  broadcast('lead', updated);
  res.json(updated);
});
app.post('/api/shift/wren', (req, res) => {
  wrenShift('requested').catch((e) => console.error(e));
  res.json({ ok: true });
});

app.post('/api/inbox/sync', wrap(async (req, res) => res.json(await syncInbox())));

app.post('/api/push/subscribe', (req, res) => {
  if (!req.body?.endpoint) return res.status(400).end();
  saveSubscription(req.body);
  res.json({ ok: true });
});

// ---- The app itself ----
const webDist = path.resolve('web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist, { index: false, maxAge: '1h', setHeaders: (res, p) => p.endsWith('sw.js') && res.set('Cache-Control', 'no-cache') }));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`Nevermind HQ open on port ${config.port}.`);
  console.log('Connected:', Object.entries(integrations).filter(([, v]) => v).map(([k]) => k).join(', ') || 'nothing yet');
  if (!config.passcode) console.warn('No APP_PASSCODE set: anyone who can reach this server can use it. Fine on your own computer only.');
  startScheduler();
  // Anything left "working" from before a restart goes back in the queue.
  run("UPDATE tasks SET status = 'queued' WHERE status = 'working'");
  for (const s of allStaffState()) if (s.status === 'working') setStaff(s.id, { status: 'idle', activity: '', task_id: null });
  nudge();
});
