// Team huddles: the working staff meet at the table and brainstorm about the owner's life.
// The discussion is real (one Claude call), the office plays it back line by line,
// ideas that are ready get acted on, and the rest go to the owner as a proposal.
import { think, BudgetExceeded } from './ai.js';
import { all, get, run, setSetting, getSetting } from './db.js';
import { STAFF, ACTIVE_STAFF } from './staff.js';
import { broadcast, log, setStaff } from './events.js';
import { nowLabel } from './time.js';

function context() {
  const list = (rows, f) => (rows.length ? rows.map(f).join('\n') : '(none)');
  const notes = all('SELECT topic, content FROM notes ORDER BY updated_at DESC LIMIT 25');
  const done = all("SELECT title, assignee FROM tasks WHERE status = 'done' AND updated_at >= datetime('now', '-7 days') ORDER BY id DESC LIMIT 20");
  const open = all("SELECT title, assignee FROM tasks WHERE status IN ('queued', 'working') LIMIT 20");
  const leads = all("SELECT business, business_type, city, status FROM leads WHERE status != 'dead' ORDER BY id DESC LIMIT 15");
  const clients = all('SELECT name, business_type, stage FROM clients ORDER BY updated_at DESC LIMIT 15');
  const todos = all("SELECT text FROM owner_todos WHERE status = 'open' LIMIT 15");
  const recentIdeas = getSetting('huddle_topics', []);
  return `Time: ${nowLabel()}
Company notes:\n${list(notes, (n) => `- ${n.topic}: ${n.content}`)}
Clients:\n${list(clients, (c) => `- ${c.name} (${c.business_type}, ${c.stage})`)}
Lead board:\n${list(leads, (l) => `- ${l.business} (${l.business_type}, ${l.city}) [${l.status}]`)}
Done this week:\n${list(done, (t) => `- ${t.title} (${t.assignee})`)}
In progress:\n${list(open, (t) => `- ${t.title} (${t.assignee})`)}
The owner's own list:\n${list(todos, (t) => `- ${t.text}`)}
Recent huddle topics (pick something different):\n${recentIdeas.length ? recentIdeas.map((t) => `- ${t}`).join('\n') : '(none)'}`;
}

function parseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON in reply');
  return JSON.parse(text.slice(start, end + 1));
}

export async function huddle({ requested = false, topic = '' } = {}) {
  const participants = ACTIVE_STAFF.slice();
  const cast = participants.map((id) => `- ${id}: ${STAFF[id].name}, ${STAFF[id].title}. Voice: ${STAFF[id].voice}`).join('\n');
  // Only the bubble changes here: the office shows the huddle itself, and real
  // work status stays with whatever each person is actually doing.
  setStaff('ren', { bubble: 'Huddle, everyone. Table, please.' });
  log('ren', 'Called a team huddle', 'meeting');

  let plan;
  try {
    const response = await think(
      'ren',
      {
        system: `You run Nevermind's team huddles. Nevermind is a small company whose only client is its owner; it exists to make the owner's life better (their marketing and ads business for car dealerships, dentist offices and small businesses, their money, their creative ambitions, their family). Reply with ONLY one JSON object, no other text.`,
        messages: [{
          role: 'user',
          content: `Hold a short, useful team huddle.${topic ? ` Topic from the owner: ${topic}` : ' Pick the most valuable topic for the owner right now from the context below (a client, a growth idea, an outreach angle, saving time or money, a creative project).'}

Who's at the table:
${cast}

What the team knows:
${context()}

Write the huddle as it happens: 8 to 12 lines of natural back-and-forth, each line under 140 characters, everyone in their own voice, building on each other, ending with Ren deciding. Then the concrete ideas that came out of it. Don't invent facts about the owner's clients or numbers you don't have.

JSON shape:
{"topic": "short title",
 "lines": [{"speaker": "${participants.join('" | "')}", "text": "..."}],
 "ideas": [{"title": "...", "why": "one sentence", "owner": "${participants.join('" | "')}", "do_now": true, "details": "what exactly to do, enough to start without asking"}]}

do_now = true only for work the team can safely do without the owner (drafting, research, planning, outreach drafts). Anything that needs a decision, money or the owner's time is do_now false.`,
        }],
        output_config: { effort: 'medium' },
      },
      { priority: requested },
    );
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    plan = parseJson(text);
  } catch (err) {
    if (err instanceof BudgetExceeded) throw new Error("No huddle today: the AI budget for today is used up.");
    console.error('huddle failed', err);
    throw new Error('The huddle fell apart. Try again in a bit.');
  }

  const lines = (Array.isArray(plan.lines) ? plan.lines : [])
    .filter((l) => participants.includes(l?.speaker) && l?.text)
    .map((l) => ({ speaker: l.speaker, text: String(l.text).slice(0, 180) }));
  const ideas = (Array.isArray(plan.ideas) ? plan.ideas : []).filter((i) => i?.title).slice(0, 6);
  const topicTitle = String(plan.topic || 'Team huddle').slice(0, 120);
  const meeting = { participants, topic: topicTitle, lines };
  broadcast('meeting', meeting);
  setSetting('last_huddle', { ...meeting, ideas, at: new Date().toISOString() });
  setSetting('huddle_topics', [topicTitle, ...getSetting('huddle_topics', [])].slice(0, 8));

  // Ideas that are ready become work; the rest go to the owner.
  const later = [];
  for (const idea of ideas) {
    const owner = participants.includes(idea.owner) ? idea.owner : 'ren';
    if (idea.do_now) {
      const { lastInsertRowid } = run(
        'INSERT INTO tasks (title, details, assignee, created_by, priority) VALUES (?, ?, ?, ?, 3)',
        String(idea.title).slice(0, 200), `From the team huddle "${topicTitle}". ${idea.why || ''}\n\n${idea.details || ''}`, owner, 'ren',
      );
      broadcast('task', get('SELECT * FROM tasks WHERE id = ?', lastInsertRowid));
    } else {
      later.push(idea);
    }
  }
  if (later.length) {
    const { lastInsertRowid } = run(
      'INSERT INTO reviews (staff_id, kind, title, body, why) VALUES (?, ?, ?, ?, ?)',
      'ren', 'idea', `Huddle ideas: ${topicTitle}`,
      later.map((i) => `${i.title}\n${i.why || ''}\nNext step: ${i.details || ''}`).join('\n\n'),
      `The team brainstormed "${topicTitle}". These need your call.`,
    );
    broadcast('review', get('SELECT * FROM reviews WHERE id = ?', lastInsertRowid));
  }
  log('ren', `Team huddle "${topicTitle}": ${ideas.length} idea${ideas.length === 1 ? '' : 's'} (${ideas.length - later.length} started, ${later.length} for you)`, 'meeting');
  return meeting;
}
