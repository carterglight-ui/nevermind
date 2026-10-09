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

  // Ren's briefings.
  new Cron('0 7 * * *', tz, () => writeBriefing(weekday() === 'Monday' ? 'weekly' : 'morning'));
  new Cron('0 19 * * *', tz, () => writeBriefing('evening'));

  console.log(`Scheduler running in ${config.timezone}.`);
}

/** Wake the queues right away (after the owner assigns something). */
export const nudge = () => setTimeout(workQueues, 200);
