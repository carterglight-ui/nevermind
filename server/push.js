// Push notifications to the owner's iPhone (works once Nevermind is added to the Home Screen).
import webpush from 'web-push';
import { config, integrations } from './config.js';
import { all, run, getSetting, setSetting } from './db.js';

// Notification keys: taken from the environment if set, otherwise created once and kept in the database.
let keys = config.vapidPublicKey && config.vapidPrivateKey
  ? { publicKey: config.vapidPublicKey, privateKey: config.vapidPrivateKey }
  : getSetting('vapid_keys');
if (!keys) {
  keys = webpush.generateVAPIDKeys();
  setSetting('vapid_keys', keys);
}
webpush.setVapidDetails(config.vapidContact, keys.publicKey, keys.privateKey);
integrations.push = true;

export const vapidPublicKey = keys.publicKey;

export function saveSubscription(sub) {
  run(
    'INSERT INTO push_subscriptions (endpoint, json) VALUES (?, ?) ON CONFLICT(endpoint) DO UPDATE SET json = excluded.json',
    sub.endpoint,
    JSON.stringify(sub),
  );
}

export async function notifyOwner({ title, body, tag, url = '/' }) {
  for (const row of all('SELECT * FROM push_subscriptions')) {
    try {
      await webpush.sendNotification(JSON.parse(row.json), JSON.stringify({ title, body, tag, url }));
    } catch (err) {
      // 404/410 mean the phone unsubscribed; forget it.
      if (err.statusCode === 404 || err.statusCode === 410) run('DELETE FROM push_subscriptions WHERE endpoint = ?', row.endpoint);
      else console.error('push failed', err.statusCode, err.body);
    }
  }
}
