// The preview office: the same API the real server offers, run inside the page.
// Work is done for real by Claude (through the viewer's own Claude plan, via the
// artifact's `sample` capability). There's no Gmail or calendar access here, and the
// team only works while the page is open.

const STORE_KEY = 'nevermind-preview-v1';
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const ROSTER = [
  { id: 'ren', name: 'Master Ren', title: 'Director of Life', dept: 'leadership', active: true, reportsTo: 'owner' },
  { id: 'washington', name: 'Washington Mercer', title: 'Chief Career Officer', dept: 'career', active: true, reportsTo: 'ren' },
  { id: 'milo', name: 'Milo Reyes', title: 'Producer & Execution Specialist', dept: 'career', active: true, reportsTo: 'washington' },
  { id: 'felix', name: 'Felix Ledger', title: 'Chief Financial Officer', dept: 'finance', active: false, reportsTo: 'ren' },
  { id: 'ollie', name: 'Ollie Park', title: 'Financial Operations & Systems Analyst', dept: 'finance', active: false, reportsTo: 'felix' },
  { id: 'cleo', name: 'Cleo March', title: 'Chief Creative Officer', dept: 'creative', active: false, reportsTo: 'ren' },
  { id: 'wren', name: 'Wren Vale', title: 'Creative Researcher & Story Developer', dept: 'creative', active: true, reportsTo: 'washington' },
];
const ACTIVE = ['ren', 'washington', 'milo', 'wren'];
const byId = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

const JOBS = {
  ren: { voice: 'Calm, warm, brief. A Shaolin monk who traded mountain solitude for notifications.', job: "You run Nevermind and report directly to the owner. You turn the owner's goals into direction, balance ambition with health, energy and family, and hand work to the right executive with create_task." },
  washington: { voice: 'Stern, clipped former corporate executive. Dry, no-nonsense, secretly proud of the team.', job: "You manage the owner's career: their marketing and advertising clients (car dealerships, dentist offices, small businesses), outreach, proposals and deadlines. You plan the work and hand concrete production work to Milo with create_task." },
  milo: { voice: 'Upbeat agency veteran. Optimistic, energetic, loves a deadline.', job: 'You turn plans into finished work: email drafts (draft_email) and proposals, ad copy, captions, content calendars and outlines (submit_work). You never send or publish anything yourself.' },
  wren: { voice: 'Deadpan goth intern, quietly caring. Her portfolio was titled "Things That Should Have Been Better."', job: "You're on loan to Washington as lead researcher. In this preview office you have NO web access, so you never invent businesses, phone numbers, emails or names. You add leads (add_lead) only for businesses the owner names. For those you work out what their marketing likely lacks, ways to meet them naturally (warm_paths), and draft a short cold email each (draft_email with lead_id). When asked to find leads without names, submit_work a prospecting plan instead: where and how to find them, search queries, and a reusable cold email." },
};

function fresh() {
  const t = now();
  return {
    seq: { task: 1, review: 2, activity: 2, briefing: 2, chat: 1, note: 1, lead: 1, todo: 1 },
    leads: [],
    todos: [],
    staff: Object.fromEntries(ROSTER.map((r) => [r.id, { id: r.id, status: 'idle', activity: '', bubble: '', task_id: null, updated_at: t }])),
    tasks: [],
    reviews: [
      {
        id: 1, task_id: null, staff_id: 'milo', kind: 'email', title: 'EXAMPLE: email to a dealership',
        to_addr: 'gm@example-dealership.com', subject: 'EXAMPLE: Your March ad results',
        body: "This is an example of what Milo's drafts look like. Give Milo a real task and his real draft will show up here.\n\nHi Dan,\n\nQuick recap of March: the spring sales campaign brought in 214 form leads at $18 each, down from $26 in February. The trade-in video did the most work, so I'd like to shift more budget there for April.\n\nWant to grab 15 minutes Thursday to plan it?\n\nThanks,",
        why: 'Example only. Dismiss it whenever you like.', status: 'pending', feedback: '', created_at: t, decided_at: null,
      },
    ],
    activity: [{ id: 1, ts: t, staff_id: 'ren', kind: 'info', text: 'Opened the preview office', task_id: null }],
    briefings: [
      {
        id: 1, ts: t, kind: 'morning', read: 0, title: 'EXAMPLE: How my briefings look',
        body: "Good morning.\n\nThis is an example. In your own office I write one at 7:00 AM and 7:00 PM, and a deeper one on Monday mornings.\n\nDONE OVERNIGHT\n- Milo drafted 2 client follow-ups (waiting at the Printer)\n- Washington updated 3 client files\n\nNEEDS YOU\n- Approve the Riverside Ford recap\n\nTODAY\n- Dentist office proposal due Friday\n- Pick up your daughter at 3:30\n\nTap \"Ask Ren for an update now\" for a real one.",
      },
    ],
    notes: [],
    clients: [],
    chat: [],
    settings: { company_paused: false },
  };
}

let db = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const base = fresh();
      saved.leads ??= [];
      saved.todos ??= [];
      saved.seq = { ...base.seq, ...saved.seq };
      saved.staff = { ...base.staff, ...saved.staff };
      return saved;
    }
  } catch { /* storage unavailable: start fresh, in memory */ }
  return fresh();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* fine */ }
}

// ---- events ----
const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(type, data) {
  save();
  for (const fn of listeners) fn(type, data);
}
function setStaff(id, patch) {
  db.staff[id] = { ...db.staff[id], ...patch, updated_at: now() };
  emit('staff', db.staff[id]);
}
function log(staff_id, text, kind = 'info', task_id = null) {
  const a = { id: db.seq.activity++, ts: now(), staff_id, kind, text, task_id };
  db.activity.unshift(a);
  db.activity = db.activity.slice(0, 300);
  emit('activity', a);
}
function addTask({ title, details, assignee, created_by, priority = 3 }) {
  const t = { id: db.seq.task++, title, details, assignee, created_by, status: 'queued', priority, result: '', created_at: now(), updated_at: now() };
  db.tasks.unshift(t);
  emit('task', t);
  return t;
}
const task = (id) => db.tasks.find((t) => t.id === Number(id));

// ---- Claude ----
let samplePromise;
const getSample = () => (samplePromise ??= window.claude?.use ? window.claude.use('sample') : Promise.resolve(null));

function notesText() {
  return db.notes.length ? db.notes.map((n) => `- ${n.topic}: ${n.content}`).join('\n') : '(none yet)';
}

function systemText(id) {
  const j = JOBS[id];
  const open = db.tasks.filter((t) => ['queued', 'working'].includes(t.status)).slice(0, 20);
  return `You are ${byId[id].name}, ${byId[id].title} at Nevermind, a small company whose only client is its owner. Nevermind exists to make the owner's life better.

YOUR JOB
${j.job}

RULES
- Nothing is ever sent, posted, purchased or paid by Nevermind. Emails become drafts for the owner (draft_email); other finished work goes to the owner with submit_work.
- In this preview office you cannot see the owner's email or calendar. Work from what the owner tells you and the company notes. If something essential is missing, make a sensible assumption, mark placeholders like [CLIENT NAME], and say what you assumed in "why".
- Your personality (${j.voice}) shows ONLY in the say tool and in chat with the owner. The work itself is neutral, warm, professional, in the owner's own voice. Clients must never see a character.
- Be economical. Prefer one finished, ready-to-use deliverable.

COMPANY NOTES
${notesText()}

OPEN TASKS
${open.length ? open.map((t) => `- #${t.id} ${t.title} -> ${t.assignee} (${t.status})`).join('\n') : '(none)'}

Time: ${new Date().toLocaleString()}`;
}

function toolsFor(id, ctx) {
  const T = {
    say: {
      name: 'say', description: 'Show a short speech bubble over your head in the office (max ~90 chars). Your personality goes here.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      execute: ({ text }) => { setStaff(id, { bubble: String(text).slice(0, 140) }); return 'shown'; },
    },
    create_task: {
      name: 'create_task', description: `Hand a task to a teammate (${ACTIVE.join(', ')}). Include everything they need. Returns the new task id.`,
      inputSchema: { type: 'object', properties: { assignee: { type: 'string', enum: ACTIVE }, title: { type: 'string' }, details: { type: 'string' } }, required: ['assignee', 'title', 'details'] },
      execute: ({ assignee, title, details }) => {
        if (!ACTIVE.includes(assignee)) throw new Error(`${assignee} is not on the clock yet`);
        setStaff(id, { activity: 'Handing off work' });
        const t = addTask({ title: String(title).slice(0, 200), details: String(details), assignee, created_by: id, priority: 2 });
        ctx.handoffs.push(t.id);
        log(id, `Assigned "${t.title}" to ${byId[assignee].name}`, 'handoff', t.id);
        return `task #${t.id} created`;
      },
    },
    save_note: {
      name: 'save_note', description: 'Save a company note everyone can see (owner preferences, client facts). Overwrites the same topic.',
      inputSchema: { type: 'object', properties: { topic: { type: 'string' }, content: { type: 'string' } }, required: ['topic', 'content'] },
      execute: ({ topic, content }) => {
        setStaff(id, { activity: 'Writing notes' });
        const n = db.notes.find((x) => x.topic === topic);
        if (n) Object.assign(n, { content, author: id, updated_at: now() });
        else db.notes.push({ id: db.seq.note++, topic: String(topic), content: String(content), author: id, updated_at: now() });
        save();
        return 'saved';
      },
    },
    upsert_client: {
      name: 'upsert_client', description: 'Add or update a client/prospect by name.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' }, business_type: { type: 'string' }, stage: { type: 'string', enum: ['prospect', 'contacted', 'active', 'paused', 'past'] }, next_followup: { type: 'string' }, notes: { type: 'string' } }, required: ['name'] },
      execute: (input) => {
        setStaff(id, { activity: 'Updating a client file' });
        let c = db.clients.find((x) => x.name === input.name);
        if (!c) { c = { id: db.clients.length + 1, name: String(input.name), business_type: '', stage: 'prospect', next_followup: '', notes: '' }; db.clients.push(c); }
        for (const k of ['business_type', 'stage', 'next_followup', 'notes']) if (input[k] !== undefined) c[k] = String(input[k]);
        log(id, `Updated client file: ${c.name}`, 'info', ctx.taskId);
        return 'saved';
      },
    },
    draft_email: {
      name: 'draft_email', description: "Write an email draft for the owner to review and send themselves. NOT sent. Written in the owner's voice.",
      inputSchema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, why: { type: 'string' } }, required: ['to', 'subject', 'body', 'why'] },
      execute: ({ to, subject, body, why }) => {
        setStaff(id, { activity: 'Drafting an email' });
        const r = { id: db.seq.review++, task_id: ctx.taskId, staff_id: id, kind: 'email', title: `Email to ${to}`, to_addr: String(to), subject: String(subject), body: String(body), why: String(why), status: 'pending', feedback: '', created_at: now(), decided_at: null };
        db.reviews.unshift(r);
        log(id, `Drafted email "${r.subject}" for your review`, 'review', ctx.taskId);
        emit('review', r);
        return `draft #${r.id} is waiting for the owner. Not sent.`;
      },
    },
    submit_work: {
      name: 'submit_work', description: 'Hand finished work (proposal, captions, ad copy, plan, script, research) to the owner for review. Nothing is published.',
      inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['content', 'idea'] }, title: { type: 'string' }, body: { type: 'string' }, why: { type: 'string' } }, required: ['kind', 'title', 'body', 'why'] },
      execute: ({ kind, title, body, why }) => {
        setStaff(id, { activity: 'Finishing a deliverable' });
        const r = { id: db.seq.review++, task_id: ctx.taskId, staff_id: id, kind: kind === 'idea' ? 'idea' : 'content', title: String(title), to_addr: '', subject: '', body: String(body), why: String(why), status: 'pending', feedback: '', created_at: now(), decided_at: null };
        db.reviews.unshift(r);
        log(id, `Submitted "${r.title}" for your review`, 'review', ctx.taskId);
        emit('review', r);
        return `submitted as #${r.id}`;
      },
    },
  };
  T.add_lead = {
    name: 'add_lead', description: 'Save a business the OWNER named to the lead board. Leave phone/email/contact blank (no web access here). Returns the lead id.',
    inputSchema: { type: 'object', properties: { business: { type: 'string' }, business_type: { type: 'string' }, city: { type: 'string' }, opportunity: { type: 'string' }, warm_paths: { type: 'string' }, score: { type: 'integer' } }, required: ['business', 'opportunity'] },
    execute: (input) => {
      setStaff(id, { activity: 'Adding a lead to the board' });
      const dup = db.leads.find((l) => l.business.toLowerCase() === String(input.business).toLowerCase());
      if (dup) return `already lead #${dup.id}`;
      const l = { id: db.seq.lead++, business: String(input.business), business_type: String(input.business_type || ''), city: String(input.city || ''), website: '', phone: '', email: '', contact_name: '', contact_role: '', source_url: '', opportunity: String(input.opportunity || ''), warm_paths: String(input.warm_paths || ''), score: Math.min(5, Math.max(1, Number(input.score) || 3)), status: 'new', found_by: id, created_at: now(), updated_at: now() };
      db.leads.unshift(l);
      log(id, `Added a lead: ${l.business}`, 'lead', ctx.taskId);
      emit('lead', l);
      return `lead #${l.id}`;
    },
  };
  T.add_owner_todo = {
    name: 'add_owner_todo', description: "Put something on the owner's own list: things only they can do (calls, errands, family, decisions).",
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, due: { type: 'string' }, note: { type: 'string' } }, required: ['text'] },
    execute: ({ text, due, note }) => {
      const t = { id: db.seq.todo++, text: String(text), due: String(due || ''), note: String(note || ''), status: 'open', created_at: now(), done_at: null };
      db.todos.push(t);
      log(id, `Put "${t.text}" on your list`, 'todo');
      emit('todo', t);
      return 'added';
    },
  };
  T.draft_email.inputSchema.properties.lead_id = { type: 'integer' };
  const draftEmail = T.draft_email.execute;
  T.draft_email.execute = (input) => {
    const out = draftEmail(input);
    const lead = db.leads.find((l) => l.id === Number(input.lead_id));
    if (lead && lead.status === 'new') { lead.status = 'drafted'; lead.updated_at = now(); emit('lead', lead); }
    return out;
  };
  const names = {
    ren: ['say', 'create_task', 'save_note', 'add_owner_todo', 'submit_work'],
    washington: ['say', 'create_task', 'save_note', 'upsert_client', 'submit_work'],
    milo: ['say', 'create_task', 'save_note', 'draft_email', 'submit_work'],
    wren: ['say', 'create_task', 'save_note', 'add_lead', 'draft_email', 'submit_work'],
  }[id];
  return names.map((n) => T[n]);
}

const running = new Map(); // staffId -> AbortController
let chain = Promise.resolve();

const ERRORS = {
  not_granted: 'You need to allow this page to use Claude (it asks the first time).',
  sampling_disabled: "Claude isn't available on this account.",
  rate_limited: 'Too many requests right now. Try again in a minute.',
  tools_unavailable: "This view can't run the team's tools. Open the link in the Claude app or claude.ai.",
};

async function think(id, prompt, { taskId = null, images } = {}) {
  const sample = await getSample();
  if (!sample) throw new Error('The preview team needs Claude. Open this link in claude.ai or the Claude app.');
  const ctl = new AbortController();
  running.set(id, ctl);
  const ctx = { taskId, handoffs: [] };
  setStaff(id, { status: 'working', activity: 'Thinking it through', task_id: taskId });
  try {
    const tools = toolsFor(id, ctx);
    const canUseTools = Boolean((await sample.limits().catch(() => null))?.tools);
    if (canUseTools) {
      const { text } = await sample(`${systemText(id)}\n\n---\n\n${prompt}`, { tools, signal: ctl.signal, modelTier: 'default', ...(images ? { images } : {}) });
      return { text, handoffs: ctx.handoffs };
    }
    // This Claude app can't run page tools: ask for the same actions as one JSON plan, then apply them.
    const plan = await sample.json(
      `${systemText(id)}\n\n---\n\n${prompt}\n\nYou can't call tools directly. Reply with ONLY a JSON object of the actions to take:\n` +
        `{"actions": [{"tool": "<one of: ${tools.map((t) => t.name).join(', ')}>", "input": {...}}], "reply": "<what you say back, 1-3 sentences>"}\n` +
        `Tool inputs:\n${tools.map((t) => `- ${t.name}: ${t.description} Fields: ${Object.keys(t.inputSchema.properties).join(', ')}`).join('\n')}`,
      { signal: ctl.signal, modelTier: 'default', cache: false, ...(images ? { images } : {}) },
    );
    for (const a of Array.isArray(plan?.actions) ? plan.actions : []) {
      const tool = tools.find((t) => t.name === a?.tool);
      if (tool) { try { tool.execute(a.input || {}); } catch { /* skip a bad action */ } }
    }
    return { text: String(plan?.reply || 'Done.'), handoffs: ctx.handoffs };
  } catch (e) {
    if (e?.code === 'cancelled') return { text: '', stopped: true, handoffs: ctx.handoffs };
    throw new Error(ERRORS[e?.code] || e?.message || 'Claude could not finish this.');
  } finally {
    running.delete(id);
    if (db.staff[id].status !== 'paused') setStaff(id, { status: 'idle', activity: '', task_id: null });
  }
}

/** Work a task now, then any hand-offs it created (one level deep), one at a time. */
function work(taskId, depth = 0) {
  chain = chain.then(async () => {
    const t = task(taskId);
    if (!t || t.status !== 'queued' || db.settings.company_paused || db.staff[t.assignee].status === 'paused') return;
    t.status = 'working'; t.updated_at = now();
    emit('task', t);
    log(t.assignee, `Started "${t.title}"`, 'start', t.id);
    const from = t.created_by === 'owner' ? 'the owner' : byId[t.created_by]?.name;
    let result;
    try {
      result = await think(t.assignee, `Your task #${t.id} from ${from}:\n${t.title}\n\n${t.details}\n\nDo the work now using your tools, then reply with a one-sentence summary of what you did.`, { taskId: t.id });
    } catch (e) {
      t.status = 'failed'; t.result = e.message; t.updated_at = now();
      emit('task', t);
      log(t.assignee, `Couldn't finish "${t.title}": ${e.message}`, 'error', t.id);
      return;
    }
    if (t.status === 'working') {
      t.status = result.stopped ? 'cancelled' : 'done';
      t.result = result.text.slice(0, 2000);
      t.updated_at = now();
      emit('task', t);
      if (t.status === 'done') log(t.assignee, `Finished "${t.title}"`, 'done', t.id);
    }
    if (depth < 1) for (const h of result.handoffs) work(h, depth + 1);
  });
  return chain;
}

// ---- progress (same rules as the server) ----
const levelFor = (xp) => {
  const level = Math.floor(Math.sqrt(xp / 40)) + 1;
  return { level, floor: 40 * (level - 1) ** 2, next: 40 * level ** 2 };
};
function progress() {
  const staff = Object.fromEntries(ROSTER.map((r) => [r.id, { xp: 0, done: 0, approved: 0 }]));
  for (const t of db.tasks) if (t.status === 'done' && staff[t.assignee]) { staff[t.assignee].done++; staff[t.assignee].xp += 20; }
  for (const r of db.reviews) {
    if (!staff[r.staff_id] || r.title.startsWith('EXAMPLE')) continue;
    if (r.status === 'done') { staff[r.staff_id].approved++; staff[r.staff_id].xp += 50; }
    if (r.status === 'rejected') staff[r.staff_id].xp += 5;
  }
  staff.ren.xp += db.briefings.filter((b) => !b.title.startsWith('EXAMPLE')).length * 10;
  const reach = { contacted: 10, meeting: 50, won: 250 };
  for (const l of db.leads) if (reach[l.status] && staff[l.found_by]) staff[l.found_by].xp += reach[l.status];
  const ownerDone = db.todos.filter((t) => t.status === 'done').length;
  for (const s of Object.values(staff)) Object.assign(s, levelFor(s.xp));
  const xp = Object.values(staff).reduce((a, s) => a + s.xp, 0) + ownerDone * 10;
  const today = new Date().toDateString();
  const isToday = (ts) => new Date(`${ts.replace(' ', 'T')}Z`).toDateString() === today;
  const relevant = db.tasks.filter((t) => t.status !== 'cancelled' && (isToday(t.created_at) || isToday(t.updated_at) || ['queued', 'working'].includes(t.status)));
  return { company: { xp, ...levelFor(xp) }, today: { done: relevant.filter((t) => t.status === 'done').length, total: relevant.length }, staff };
}

// Same instructions as server/intake.js.
const TRIAGE = `The owner just handed you their to-do list. Sort every item; skip nothing.

For each item decide:
- The team can do it (drafting, research, planning, outreach, proposals, content, follow-ups): create_task for the right person with full context.
  - Washington: anything about clients, the owner's marketing business, career, deals, the owner's website.
  - Milo: concrete production (emails, proposals, captions, ad copy, presentations, content plans).
  - Wren: finding prospects and leads, researching businesses or people.
  - Money or creative items: Felix and Cleo aren't on the clock yet, so create the task for yourself (ren) and handle the thinking and planning part.
- Only the owner can do it (calls, errands, appointments, family, signing, paying, decisions): add_owner_todo, with a one-line tip that makes it easier where you can.
- Mixed: split it. The team prepares (e.g. Milo drafts the email), the owner does the last step (sends it).

Keep due dates the owner gave. Note lasting facts you learn (clients, preferences, deadlines) with save_note.
Then reply to the owner in your own voice, briefly: how many items went where, and anything you need from them.`;

// ---- routes ----
export async function handle(path, method, body = {}) {
  const [route, query = ''] = path.split('?');
  const q = new URLSearchParams(query);
  const seg = route.split('/').filter(Boolean);
  const M = method.toUpperCase();

  if (route === '/state') {
    return {
      roster: ROSTER,
      staff: Object.values(db.staff),
      integrations: { ai: true, gmail: false, calendar: false, push: false },
      budget: { monthlyBudget: 0, spentMonth: 0, spentToday: 0, dailyAllowance: 0, byStaff: [], routineAllowed: true, priorityAllowed: true },
      companyPaused: db.settings.company_paused,
      pendingReviews: db.reviews.filter((r) => r.status === 'pending').length,
      unreadBriefings: db.briefings.filter((b) => !b.read).length,
      vapidPublicKey: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preview: true,
    };
  }
  if (route === '/progress') return progress();

  if (seg[0] === 'staff') {
    const id = seg[1];
    if (!byId[id]) throw new Error('No such employee');
    if (M === 'GET') {
      const s = db.staff[id];
      return {
        ...byId[id], state: s,
        current: s.task_id ? task(s.task_id) : null,
        queue: db.tasks.filter((t) => t.assignee === id && ['queued', 'working'].includes(t.status)),
        recent: db.activity.filter((a) => a.staff_id === id).slice(0, 25),
        chat: db.chat.filter((c) => c.staff_id === id).slice(-30),
      };
    }
    const action = seg[2];
    if (action === 'pause') { running.get(id)?.abort(); setStaff(id, { status: 'paused', activity: 'Paused', bubble: 'Paused.' }); log(id, 'Paused by you', 'control'); return db.staff[id]; }
    if (action === 'resume') {
      setStaff(id, { status: 'idle', activity: '', bubble: 'Back to it.' });
      log(id, 'Resumed by you', 'control');
      for (const t of db.tasks.filter((x) => x.assignee === id && x.status === 'queued')) work(t.id);
      return db.staff[id];
    }
    if (action === 'stop') {
      const tid = db.staff[id].task_id;
      if (tid && task(tid)) { task(tid).status = 'cancelled'; emit('task', task(tid)); }
      running.get(id)?.abort();
      log(id, 'Current work stopped by you', 'control', tid);
      return { ok: true };
    }
    if (action === 'chat') {
      const text = String(body.text || '').trim();
      if (!byId[id].active) return { reply: `${byId[id].name} starts work in Phase 2. Talk to Master Ren for now.` };
      db.chat.push({ id: db.seq.chat++, ts: now(), staff_id: id, role: 'owner', text });
      emit('chat', {});
      const past = db.chat.filter((c) => c.staff_id === id).slice(-13, -1).map((c) => `${c.role === 'owner' ? 'Owner' : byId[id].name}: ${c.text}`).join('\n');
      let reply;
      let handoffs = [];
      try {
        const r = await think(id, `The owner walked up to you in the office and said something.${past ? `\n\nEarlier:\n${past}` : ''}\n\nOwner: ${text}\n\nReply in your own voice in 2-4 short sentences (it shows in a retro game dialogue box). If they want work done, queue it with create_task (for yourself or a teammate) and say so. Don't do long work inside this reply.`);
        reply = r.text || '…';
        handoffs = r.handoffs;
      } catch (e) {
        reply = `(${e.message})`;
      }
      db.chat.push({ id: db.seq.chat++, ts: now(), staff_id: id, role: 'staff', text: reply });
      setStaff(id, { bubble: reply.slice(0, 140) });
      for (const h of handoffs) work(h);
      return { reply };
    }
  }

  if (route === '/tasks') {
    if (M === 'GET') return q.get('status') === 'all' ? db.tasks : db.tasks.filter((t) => ['queued', 'working'].includes(t.status));
    const { assignee, title, details = '', priority = 2 } = body;
    if (!ACTIVE.includes(assignee) || !title) throw new Error('Need an active assignee and a title');
    const t = addTask({ title: String(title).slice(0, 200), details: String(details), assignee, created_by: 'owner', priority: Number(priority) || 2 });
    log(assignee, `Got a new assignment from you: "${t.title}"`, 'handoff', t.id);
    work(t.id);
    return t;
  }
  if (seg[0] === 'tasks' && seg[1]) {
    const t = task(seg[1]);
    if (!t) throw new Error('No such task');
    if (body.priority !== undefined) t.priority = Math.min(5, Math.max(1, Number(body.priority)));
    if (body.status === 'cancelled' && ['queued', 'working'].includes(t.status)) {
      t.status = 'cancelled';
      if (db.staff[t.assignee].task_id === t.id) running.get(t.assignee)?.abort();
      log(t.assignee, `"${t.title}" cancelled by you`, 'control', t.id);
    }
    if (body.status === 'queued' && ['cancelled', 'failed'].includes(t.status)) { t.status = 'queued'; work(t.id); }
    t.updated_at = now();
    emit('task', t);
    return t;
  }

  if (route === '/reviews') return db.reviews.filter((r) => r.status === (q.get('status') || 'pending'));
  if (seg[0] === 'reviews' && seg[1]) {
    const r = db.reviews.find((x) => x.id === Number(seg[1]));
    if (!r) throw new Error('No such item');
    if (seg[2] === 'decide') {
      r.status = body.decision === 'rejected' ? 'rejected' : 'done';
      r.feedback = String(body.feedback || '');
      r.decided_at = now();
      if (r.status === 'rejected' && r.feedback && ACTIVE.includes(r.staff_id)) {
        const t = addTask({
          title: `Revise: ${r.subject || r.title}`.slice(0, 200),
          details: `The owner sent this back with notes. Revise it and resubmit with the same tool.\n\nNotes: ${r.feedback}\n\nOriginal (${r.kind}):\nTo: ${r.to_addr}\nSubject: ${r.subject}\nTitle: ${r.title}\n\n${r.body}`,
          assignee: r.staff_id, created_by: 'owner', priority: 2,
        });
        work(t.id);
      }
      log(r.staff_id, r.status === 'done' ? `You approved "${r.subject || r.title}"` : `You sent back "${r.subject || r.title}"`, 'review');
      emit('review', r);
      return r;
    }
    for (const f of ['to_addr', 'subject', 'body']) if (typeof body[f] === 'string') r[f] = body[f];
    save();
    return r;
  }

  if (route === '/briefings') return db.briefings;
  if (route === '/briefings/read') { db.briefings.forEach((b) => { b.read = 1; }); save(); return { ok: true }; }
  if (route === '/briefings/now') {
    const facts = `Finished: ${db.tasks.filter((t) => t.status === 'done').slice(0, 15).map((t) => `${t.title} (${byId[t.assignee].name})`).join('; ') || 'nothing yet'}
Waiting for the owner: ${db.reviews.filter((r) => r.status === 'pending' && !r.title.startsWith('EXAMPLE')).map((r) => r.subject || r.title).join('; ') || 'nothing'}
In progress: ${db.tasks.filter((t) => ['queued', 'working'].includes(t.status)).map((t) => t.title).join('; ') || 'nothing'}
Company notes:\n${notesText()}`;
    setStaff('ren', { status: 'working', activity: 'Preparing your briefing' });
    let text;
    try {
      const sample = await getSample();
      if (!sample) throw new Error('Open this link in claude.ai or the Claude app to get a real briefing.');
      ({ text } = await sample(`You are Master Ren, Director of Life at Nevermind, briefing the company's only client (the owner). Calm and warm; one short opening line in your voice, then plain, skimmable sections with "-" bullets: what got done, what needs the owner, what's next. Never invent work that isn't in the facts. If almost nothing has happened yet, say so kindly and suggest two concrete first tasks to give Washington or Milo. Under 180 words. First line is the title.\n\nIt is ${new Date().toLocaleString()}.\n\nFACTS\n${facts}`, { cache: false }));
    } catch (e) {
      setStaff('ren', { status: 'idle', activity: '' });
      throw new Error(ERRORS[e?.code] || e?.message || 'Ren could not write a briefing.');
    }
    setStaff('ren', { status: 'idle', activity: '', bubble: 'Your briefing is ready.' });
    const [first, ...rest] = text.trim().split('\n');
    const b = { id: db.seq.briefing++, ts: now(), kind: body.kind || 'evening', read: 0, title: first.replace(/^#+\s*/, ''), body: rest.join('\n').trim() };
    db.briefings.unshift(b);
    log('ren', 'Delivered a briefing', 'briefing');
    emit('briefing', b);
    return b;
  }

  if (route === '/intake') {
    const text = String(body.text || '').trim();
    let images;
    if (body.image) {
      const [head, data] = String(body.image).split(',');
      const bytes = Uint8Array.from(atob(data || ''), (c) => c.charCodeAt(0));
      images = [new Blob([bytes], { type: /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg' })];
    }
    if (!text && !images) throw new Error('Give Ren a list first.');
    log('ren', images ? 'Received your list (photo)' : 'Received your list', 'intake');
    const prompt = `${TRIAGE}${images ? '\n\nThe list is in the attached photo. Read it carefully.' : ''}${text ? `\n\nTHE LIST\n${text.slice(0, 20000)}` : ''}`;
    let reply;
    let handoffs = [];
    try {
      const r = await think('ren', prompt, { images });
      reply = r.text || 'Handled.';
      handoffs = r.handoffs;
    } catch (e) {
      if (/image/i.test(e.message)) throw new Error("Photos don't work in this view. Type or paste the list instead.");
      throw e;
    }
    for (const h of handoffs) work(h);
    return { reply };
  }
  if (route === '/todos') {
    if (M === 'GET') return db.todos.filter((t) => t.status === 'open' || t.status === 'done').slice(-80);
    const t = { id: db.seq.todo++, text: String(body.text || '').slice(0, 300), due: String(body.due || ''), note: '', status: 'open', created_at: now(), done_at: null };
    db.todos.push(t);
    emit('todo', t);
    return t;
  }
  if (seg[0] === 'todos' && seg[1]) {
    const t = db.todos.find((x) => x.id === Number(seg[1]));
    if (!t) throw new Error('No such item');
    if (['open', 'done', 'dropped'].includes(body.status)) {
      if (body.status === 'done' && t.status !== 'done') log('ren', `You finished "${t.text}"`, 'owner');
      t.status = body.status;
      t.done_at = body.status === 'done' ? now() : null;
    }
    emit('todo', t);
    return t;
  }
  if (route === '/leads') return db.leads;
  if (seg[0] === 'leads' && seg[1]) {
    const l = db.leads.find((x) => x.id === Number(seg[1]));
    if (!l) throw new Error('No such lead');
    if (['new', 'drafted', 'contacted', 'meeting', 'won', 'dead'].includes(body.status)) { l.status = body.status; l.updated_at = now(); log(l.found_by, `${l.business}: you marked it "${l.status}"`, 'lead'); }
    emit('lead', l);
    return l;
  }

  if (route === '/huddle') {
    const sample = await getSample();
    if (!sample) throw new Error('Open this link in claude.ai or the Claude app for a team huddle.');
    const cast = ACTIVE.map((id) => `- ${id}: ${byId[id].name}, ${byId[id].title}. Voice: ${JOBS[id].voice}`).join('\n');
    setStaff('ren', { bubble: 'Huddle, everyone. Table, please.' });
    let plan;
    try {
      plan = await sample.json(`You run Nevermind's team huddles. Nevermind is a small company whose only client is its owner (a marketing and ads pro for car dealerships, dentist offices and small businesses, with money and creative goals and a family).

Hold a short, useful huddle about the most valuable topic for the owner right now.
At the table:\n${cast}

What the team knows:
Notes:\n${notesText()}
Open tasks: ${db.tasks.filter((t) => ['queued', 'working'].includes(t.status)).map((t) => t.title).join('; ') || 'none'}
Leads: ${db.leads.map((l) => l.business).join('; ') || 'none'}
Owner's list: ${db.todos.filter((t) => t.status === 'open').map((t) => t.text).join('; ') || 'none'}

8 to 12 lines of natural back-and-forth, each under 140 characters, everyone in their own voice, ending with Ren deciding. Then the concrete ideas. Don't invent facts or numbers about the owner.
Reply with ONLY: {"topic": "...", "lines": [{"speaker": "${ACTIVE.join('|')}", "text": "..."}], "ideas": [{"title": "...", "why": "...", "owner": "${ACTIVE.join('|')}", "do_now": true, "details": "..."}]}
do_now true only for work the team can safely do without the owner (drafting, research, planning).`, { cache: false });
    } catch (e) {
      throw new Error(ERRORS[e?.code] || 'The huddle fell apart. Try again in a bit.');
    }
    const lines = (plan?.lines || []).filter((l) => ACTIVE.includes(l?.speaker) && l?.text).map((l) => ({ speaker: l.speaker, text: String(l.text).slice(0, 180) }));
    const topic = String(plan?.topic || 'Team huddle');
    const later = [];
    for (const idea of (plan?.ideas || []).filter((i) => i?.title).slice(0, 6)) {
      const owner = ACTIVE.includes(idea.owner) ? idea.owner : 'ren';
      if (idea.do_now) {
        const t = addTask({ title: String(idea.title).slice(0, 200), details: `From the huddle "${topic}". ${idea.why || ''}\n\n${idea.details || ''}`, assignee: owner, created_by: 'ren', priority: 3 });
        work(t.id);
      } else later.push(idea);
    }
    if (later.length) {
      const r = { id: db.seq.review++, task_id: null, staff_id: 'ren', kind: 'idea', title: `Huddle ideas: ${topic}`, to_addr: '', subject: '', body: later.map((i) => `${i.title}\n${i.why || ''}\nNext step: ${i.details || ''}`).join('\n\n'), why: `The team brainstormed "${topic}". These need your call.`, status: 'pending', feedback: '', created_at: now(), decided_at: null };
      db.reviews.unshift(r);
      emit('review', r);
    }
    log('ren', `Team huddle "${topic}": ${(plan?.ideas || []).length} ideas`, 'meeting');
    return { participants: ACTIVE, topic, lines };
  }

  if (route === '/activity') return db.activity.slice(0, Number(q.get('limit')) || 150);
  if (route === '/clients') return db.clients;
  if (route === '/notes') {
    if (M === 'GET') return db.notes;
    const topic = String(body.topic || '').trim();
    const content = String(body.content || '');
    db.notes = db.notes.filter((n) => n.topic !== topic);
    if (content.trim()) db.notes.push({ id: db.seq.note++, topic, content, author: 'owner', updated_at: now() });
    save();
    return { ok: true };
  }
  if (route === '/company/pause') { db.settings.company_paused = true; for (const c of running.values()) c.abort(); emit('company', { paused: true }); return { paused: true }; }
  if (route === '/company/resume') { db.settings.company_paused = false; emit('company', { paused: false }); for (const t of db.tasks.filter((x) => x.status === 'queued')) work(t.id); return { paused: false }; }
  if (route === '/usage') return { monthlyBudget: 0, spentMonth: 0, spentToday: 0, dailyAllowance: 0, byStaff: [], routineAllowed: true, priorityAllowed: true };
  if (route === '/shift/washington' || route === '/inbox/sync' || route === '/shift/wren') throw new Error('Email is not connected in the preview office.');
  throw new Error(`Not available in the preview: ${route}`);
}

/** Start over: clears the preview office. */
export function resetPreview() {
  db = fresh();
  save();
}
