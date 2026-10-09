// All scheduling and "today" math happens in the owner's time zone.
import { config } from './config.js';

const parts = (date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'long', hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );

export function localDay(date = new Date()) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function localMonth(date = new Date()) {
  return localDay(date).slice(0, 7);
}

export function daysLeftInMonth(date = new Date()) {
  const [y, m, d] = localDay(date).split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return daysInMonth - d + 1;
}

export function nowLabel(date = new Date()) {
  return date.toLocaleString('en-US', {
    timeZone: config.timezone,
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function weekday(date = new Date()) {
  return parts(date).weekday;
}
