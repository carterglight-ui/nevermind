// The company clock. Employees work in shifts so they run around the clock
// without burning the monthly budget on idle thinking.
import { Cron } from 'croner';
import { config, integrations } from './config.js';
import { get, getSetting, setSetting } from './db.js';
import { ACTIVE_STAFF } from './staff.js';
import { log } from './events.js';
import { syncInbox } from './integrations/gmail.js';
import { runAgent, workNextTask, isBusy } from './agents/runner.js';
import { writeBriefing } from './briefings.js';
import { budgetStatus } from './ai.js';
import { weekday } from './time.js';
import { huddle } from './huddle.js';

const tz = { timezone: config.timezone, protect: true };

export async function washingtonShift(reason = 'scheduled') {
  if (!integrations.ai || isBusy('washington') || getSetting('company_paused', false)) return;
  if (!budgetStatus().routineAllowed) return;
  setSetting('washington_last_shift', Date.now());
  const unseen = get('SELECT COUNT(*) AS n FROM emails WHERE seen_by_staff = 0').n;
  log('washington', `Started a ${reason} shift`, 'shift');
  await runAgent({
    staffId: 'washington',
    effort: 'medium',
    prompt: `Shift check (${reason}). ${unseen} email(s) in the inbox haven't been looked at by the team.

1. Skim new emails (search_inbox with unread_by_team_only). Open only the ones that matter for the owner's business or life; ignore newsletters and promotions.
2. Check the calendar for the next few days and the client list for follow-ups that are due or overdue.
3. Decide what is worth doing. For concrete production work (replies, follow-ups, proposals, captions, content plans) create a task for Milo with full context. Keep client files current with upsert_client. Note anything the whole team should know with save_note.
4. Don't duplicate open tasks. If nothing needs doing, stop; an empty shift is fine.

Finish with one or two sentences summarising the shift.`,
  });
  workQueues();
}

/** Wren's prospecting shift: new verified leads, a cold email each, and warm paths. */
export async function wrenShift(reason = 'scheduled') {
  if (!integrations.ai || isBusy('wren') || getSetting('company_paused', false)) return;
  if (reason === 'scheduled' && !budgetStatus().routineAllowed) return;
  log('wren', `Started a ${reason} prospecting shift`, 'shift');
  await runAgent({
    staffId: 'wren',
    effort: 'medium',
    priority: reason !== 'scheduled',
    prompt: `Prospecting shift (${reason}). Find ${config.leadsPerShift} new leads: ${config.leadTargets} in or near ${config.leadArea}.

1. list_leads first so you don't repeat anyone.
2. web_search, then web_fetch their site, to verify each business is real and open, and collect its public details. Prefer businesses whose marketing visibly lags: dated website, no clear offer, weak reviews response, inactive social, no ads presence.
3. add_lead for each, with a specific opportunity and 2-4 warm paths (events, chambers, networking groups, sponsorships, causes they support, their social posts to engage with, mutual connections, being a customer first).
4. draft_email for each lead (with lead_id): short, specific to what you found, no hype, one easy next step, in the owner's voice. If you found no public email, address it to the business and say in "why" which contact form or phone number to use.
5. If there's a local event or group that would put the owner in a room with several of these businesses, record it with save_note (topic "networking ideas") so Washington and Ren see it.

Never invent a phone number, email or name. End with a one-sentence summary.`,
  });
  workQueues();
}

/** Weekly: each working executive looks for ways the owner's situation could be better. */
async function improvementReview() {
  if (!integrations.ai || getSetting('company_paused', false)) return;
  log('washington', 'Started the weekly "how could this be better" review', 'shift');
  await runAgent({
    staffId: 'washington',
    effort: 'high',
    prompt: `Weekly improvement review of the owner's career and marketing business. Look at the client list, the lead board, recent tasks and reviews, company notes and the calendar.
Find the 2-4 highest-leverage improvements: clients at risk, pricing or packaging, follow-up gaps, services to add, ways to get referrals, time sinks to cut. Research where it helps.
For each, either do the groundwork now (create_task for Milo or Wren) or, if it needs the owner's decision, write it up. Submit one concise "Weekly improvements" report with submit_work (kind "idea"): each item with the why, the expected payoff, and the single next step.`,
  });
  workQueues();
}

/** Weekly: a look at the owner's own website. */
async function websiteReview() {
  if (!integrations.ai || !config.websiteUrl || getSetting('company_paused', false)) return;
  log('washington', 'Started the weekly website review', 'shift');
  await runAgent({
    staffId: 'washington',
    effort: 'medium',
    prompt: `Weekly review of the owner's own website: ${config.websiteUrl}
web_fetch the home page and the most important pages linked from it. Check: is the offer clear in 5 seconds, is there an obvious way to get in touch, broken or outdated content, speed and mobile red flags you can infer, SEO basics (titles, headings, local keywords), trust signals (reviews, results, logos).
Submit a short "Website report" with submit_work (kind "idea"): what's working, the top 3 fixes in priority order, and exact suggested copy for any text change. If a fix needs production work, create_task for Milo to draft it.`,
  });
  workQueues();
}

function workQueues() {
  if (!integrations.ai || getSetting('company_paused', false)) return;
  for (const id of ACTIVE_STAFF) {
    if (!isBusy(id)) workNextTask(id).catch((err) => console.error('queue', id, err));
  }
}

export function startScheduler() {
  // Inbox sync costs nothing; new mail can wake Washington early.
  new Cron('*/10 * * * *', tz, async () => {
    try {
      const { added } = await syncInbox();
      const last = getSetting('washington_last_shift', 0);
      if (added > 0 && Date.now() - last > 60 * 60 * 1000) washingtonShift('new mail');
    } catch (err) {
      console.error('inbox sync failed:', err.message);
    }
  });

  // Regular shifts around the clock, and one just before the morning briefing.
  new Cron('0 1,10,13,16,22 * * *', tz, () => washingtonShift('scheduled'));
  new Cron('30 6 * * *', tz, () => washingtonShift('pre-briefing'));

  // Staff pick up queued work.
  new Cron('*/2 * * * *', tz, workQueues);

  // Wren prospects on weekday mornings and afternoons.
  new Cron('15 10,15 * * 1-5', tz, () => wrenShift('scheduled'));

  // Weekly reviews: improvements on Sunday evening (ready for Monday's deep briefing), website on Wednesday.
  new Cron('0 17 * * 0', tz, improvementReview);
  new Cron('0 11 * * 3', tz, websiteReview);

  // A team huddle after lunch on weekdays.
  new Cron('30 13 * * 1-5', tz, async () => {
    if (!integrations.ai || getSetting('company_paused', false) || !budgetStatus().routineAllowed) return;
    try { await huddle(); workQueues(); } catch (err) { console.error(err.message); }
  });

  // Ren's briefings.
  new Cron('0 7 * * *', tz, () => writeBriefing(weekday() === 'Monday' ? 'weekly' : 'morning'));
  new Cron('0 19 * * *', tz, () => writeBriefing('evening'));

  console.log(`Scheduler running in ${config.timezone}.`);
}

/** Wake the queues right away (after the owner assigns something). */
export const nudge = () => setTimeout(workQueues, 200);
