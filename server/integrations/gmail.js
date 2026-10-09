// Gmail, read-only. Nevermind connects over IMAP with a Google "app password".
// There is deliberately no sending code anywhere in this project: drafts go to
// the owner's review inbox and the owner sends them from their own mail app.
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { config, integrations } from '../config.js';
import { get, run, getSetting, setSetting } from '../db.js';

const MAX_BODY = 12_000;

function connect() {
  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: config.gmailAddress, pass: config.gmailAppPassword },
    logger: false,
  });
}

/** Pull new messages from the inbox into the local cache. Costs no AI money. */
export async function syncInbox() {
  if (!integrations.gmail) return { added: 0, skipped: 'not connected' };
  const imap = connect();
  await imap.connect();
  let added = 0;
  try {
    const lock = await imap.getMailboxLock('INBOX', { readOnly: true });
    try {
      const lastUid = getSetting('gmail_last_uid', 0);
      // First run: only look back two weeks so the team isn't buried in history.
      const range = lastUid ? `${lastUid + 1}:*` : { since: new Date(Date.now() - 14 * 24 * 3600 * 1000) };
      let maxUid = lastUid;
      for await (const msg of imap.fetch(range, { uid: true, source: true }, { uid: true })) {
        if (msg.uid <= lastUid) continue;
        maxUid = Math.max(maxUid, msg.uid);
        if (get('SELECT uid FROM emails WHERE uid = ?', msg.uid)) continue;
        const parsed = await simpleParser(msg.source);
        run(
          `INSERT INTO emails (uid, message_id, from_addr, to_addr, subject, date, body) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          msg.uid,
          parsed.messageId || '',
          parsed.from?.text || '',
          parsed.to?.text || '',
          parsed.subject || '(no subject)',
          (parsed.date || new Date()).toISOString(),
          (parsed.text || '').slice(0, MAX_BODY),
        );
        added++;
      }
      setSetting('gmail_last_uid', maxUid);
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout().catch(() => {});
  }
  return { added };
}
