// Talking to Nevermind HQ.
const KEY = 'nevermind-passcode';

export const getPasscode = () => {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};
export const setPasscode = (v) => {
  try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
};

export class AuthError extends Error {}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-passcode': getPasscode() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new AuthError('Wrong passcode');
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export function subscribe(onEvent) {
  const es = new EventSource(`/api/events?key=${encodeURIComponent(getPasscode())}`);
  for (const type of ['staff', 'task', 'review', 'activity', 'briefing', 'chat', 'company']) {
    es.addEventListener(type, (e) => onEvent(type, JSON.parse(e.data)));
  }
  return () => es.close();
}

// Server timestamps are UTC "YYYY-MM-DD HH:MM:SS".
export const parseTs = (ts) => new Date(ts.includes('T') ? ts : `${ts.replace(' ', 'T')}Z`);

export function timeAgo(ts) {
  const s = (Date.now() - parseTs(ts).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return parseTs(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function enablePush(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('On iPhone, first add Nevermind to your Home Screen (Share → Add to Home Screen), then open it from there.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed. You can change this in iPhone Settings → Notifications → Nevermind.');
  const reg = await navigator.serviceWorker.ready;
  const key = Uint8Array.from(atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (vapidPublicKey.length % 4)) % 4)), (c) => c.charCodeAt(0));
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
}
