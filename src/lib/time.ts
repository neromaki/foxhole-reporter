import { TerritoryHistoryEntry } from '../state/useMapStore';
import { Teams } from '../data/teams';

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
  const diff = Date.now() - Date.parse(iso);
  return Math.max(0, Math.round(diff / 3600000));
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins >= 60) {
    const hours = Math.round(mins / 60);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  return `${mins} min${mins === 1 ? '' : 's'} ago`;
}