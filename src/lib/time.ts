import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TerritoryHistoryEntry } from '../state/useMapStore';
import { Teams } from '../data/teams';

dayjs.extend(relativeTime);

export function getTimeSinceLastCapture(events: TerritoryHistoryEntry[]): number | null {
  if (events.length === 0) return null;
  const latestEvent = getLatestCaptureEvent(events);
  if (!latestEvent) return null;
  return getHoursAgo(latestEvent.at) ?? -1;
}

export function getLatestCaptureEvent(events: TerritoryHistoryEntry[]): TerritoryHistoryEntry | null {
  return events.find((event) => event.owner != Teams.Neutral) || null;
}

export function getHoursAgo(iso: string): number {
  const diff = dayjs().diff(dayjs(iso), 'hours');
  return Math.max(0, diff);
}

export function formatDuration(ts: string | Date | number, format = '{D} days, {H} hours, {M} minutes', reference?: string | Date | number): string {
  const start = dayjs(ts);
  const end = reference ? dayjs(reference) : dayjs();
  let totalSeconds = end.diff(start, 'second');
  if (totalSeconds < 0) totalSeconds = 0; // clamp future timestamps

  const secondsPerDay = 24 * 60 * 60;
  const days = Math.floor(totalSeconds / secondsPerDay);
  const hours = Math.floor((totalSeconds % secondsPerDay) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const tokens: Record<string, string> = {
    '{DD}': days.toString().padStart(2, '0'),
    '{D}': days.toString(),
    '{HH}': hours.toString().padStart(2, '0'),
    '{H}': hours.toString(),
    '{MM}': minutes.toString().padStart(2, '0'),
    '{M}': minutes.toString(),
    '{SS}': seconds.toString().padStart(2, '0'),
    '{S}': seconds.toString(),
  };

  const replaced = format.replace(/\{DD\}|\{D\}|\{HH\}|\{H\}|\{MM\}|\{M\}|\{SS\}|\{S\}/g, (token) => tokens[token]);

  // Light singularization for common English units when the value is 1
  return replaced
    .replace(/\b1 days\b/g, '1 day')
    .replace(/\b1 hours\b/g, '1 hour')
    .replace(/\b1 minutes\b/g, '1 minute')
    .replace(/\b1 seconds\b/g, '1 second');
}
