// The owner hands Ren a to-do list (typed, pasted or photographed) and Ren hands it out.
import { runAgent } from './agents/runner.js';
import { log } from './events.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Turn a data: URL from the phone into a Claude image block, or null. */
export function imageBlock(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m || !IMAGE_TYPES.includes(m[1])) return null;
  if (m[2].length > 7_000_000) throw new Error('That photo is too large. Try a smaller one.');
  return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
}

export const TRIAGE = `The owner just handed you their to-do list. Sort every item; skip nothing.

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

export async function intake({ text = '', image = null }) {
  const attachments = [];
  const block = image ? imageBlock(image) : null;
  if (image && !block) throw new Error("That file isn't a photo Ren can read (use JPG or PNG).");
  if (block) attachments.push(block);
  if (!text.trim() && !attachments.length) throw new Error('Give Ren a list first.');
  log('ren', attachments.length ? 'Received your list (photo)' : 'Received your list', 'intake');
  const result = await runAgent({
    staffId: 'ren',
    priority: true,
    effort: 'medium',
    attachments,
    prompt: `${TRIAGE}\n\n${attachments.length ? 'The list is in the attached photo. Read it carefully.' : ''}${text.trim() ? `\n\nTHE LIST\n${text.trim().slice(0, 20000)}` : ''}`,
  });
  return result.ok ? result.text || 'Handled.' : `(${result.text})`;
}
