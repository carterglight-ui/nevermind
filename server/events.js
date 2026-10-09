// Live updates to the phone: every state change in the office is pushed over
// Server-Sent Events so characters move the moment real work starts or stops.
import { all, get, run } from './db.js';
import { STAFF } from './staff.js';

const clients = new Set();

export function addClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function broadcast(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

setInterval(() => broadcast('ping', {}), 25_000).unref();

export function ensureStaffRows() {
  for (const id of Object.keys(STAFF)) {
    run('INSERT OR IGNORE INTO staff_state (id) VALUES (?)', id);
  }
}

export function staffState(id) {
  return get('SELECT * FROM staff_state WHERE id = ?', id);
}

export function allStaffState() {
  return all('SELECT * FROM staff_state');
}

export function setStaff(id, patch) {
  const cur = staffState(id);
  const next = { ...cur, ...patch };
  run(
    `UPDATE staff_state SET status = ?, activity = ?, bubble = ?, task_id = ?, updated_at = datetime('now') WHERE id = ?`,
    next.status, next.activity, next.bubble, next.task_id ?? null, id,
  );
  broadcast('staff', staffState(id));
}

export function log(staffId, text, kind = 'info', taskId = null) {
  const { lastInsertRowid } = run(
    'INSERT INTO activity (staff_id, kind, text, task_id) VALUES (?, ?, ?, ?)',
    staffId, kind, text, taskId,
  );
  broadcast('activity', get('SELECT * FROM activity WHERE id = ?', lastInsertRowid));
}
