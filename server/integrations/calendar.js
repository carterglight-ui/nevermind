// Google Calendar, read-only, through the calendar's private iCal address.
import ical from 'node-ical';
import { config, integrations } from '../config.js';

let cache = { at: 0, events: [] };

export async function upcomingEvents(days = 7) {
  if (!integrations.calendar) return [];
  if (Date.now() - cache.at > 10 * 60 * 1000) {
    const data = await ical.async.fromURL(config.calendarIcsUrl);
    const horizon = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    const events = [];
    for (const ev of Object.values(data)) {
      if (ev.type !== 'VEVENT') continue;
      if (ev.rrule) {
        for (const start of ev.rrule.between(new Date(Date.now() - 24 * 3600 * 1000), horizon)) {
          const length = ev.end && ev.start ? ev.end - ev.start : 0;
          events.push({ title: ev.summary, start, end: new Date(start.getTime() + length), location: ev.location || '' });
        }
      } else if (ev.start) {
        events.push({ title: ev.summary, start: new Date(ev.start), end: ev.end ? new Date(ev.end) : null, location: ev.location || '' });
      }
    }
    cache = { at: Date.now(), events: events.sort((a, b) => a.start - b.start) };
  }
  const from = Date.now() - 2 * 3600 * 1000;
  const to = Date.now() + days * 24 * 3600 * 1000;
  return cache.events.filter((e) => e.start >= from && e.start <= to);
}

export function formatEvents(events) {
  if (!events.length) return 'No events.';
  return events
    .map((e) =>
      `- ${e.start.toLocaleString('en-US', { timeZone: config.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}: ${e.title}${e.location ? ` (${e.location})` : ''}`,
    )
    .join('\n');
}
