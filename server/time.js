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

/** The UTC timestamp ("YYYY-MM-DD HH:MM:SS") of local midnight today. */
export function localDayStartUtc(date = new Date()) {
  const [y, m, d] = localDay(date).split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  // Offset between the zone and UTC right now, from how the zone renders this instant.
  const p = parts(date);
  const zoned = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute));
  const offset = zoned - Math.floor(date.getTime() / 60000) * 60000;
  return new Date(asUtc - offset).toISOString().slice(0, 19).replace('T', ' ');
}
