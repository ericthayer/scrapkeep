import type { Artifact, KeepsakeEvent } from '../types';

const MONTH_DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const WEEKDAY_LONG = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

/** Parse YYYY-MM-DD as a UTC date so formatting never shifts by timezone. */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

export function formatDateRange(start: string, end: string): string {
  const s = parseIsoDate(start);
  if (!s) return '';
  const e = end && end !== start ? parseIsoDate(end) : null;
  const year = s.getUTCFullYear();
  if (!e) return `${MONTH_DAY.format(s)}, ${year}`;
  const sameYear = e.getUTCFullYear() === year;
  return sameYear
    ? `${MONTH_DAY.format(s)} – ${MONTH_DAY.format(e)}, ${year}`
    : `${MONTH_DAY.format(s)}, ${year} – ${MONTH_DAY.format(e)}, ${e.getUTCFullYear()}`;
}

export function yearOf(iso: string): number {
  return parseIsoDate(iso)?.getUTCFullYear() ?? 0;
}

/** Stamp-style numeric date for ticket stubs: 07.12.26 */
export function stubDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}.${String(d.getUTCFullYear()).slice(-2)}`;
}

export function formatTime(takenAt: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(takenAt);
  if (!match) return '';
  return TIME.format(new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2]))));
}

export function formatDayHeading(day: string): string {
  const d = parseIsoDate(day);
  return d ? WEEKDAY_LONG.format(d) : 'Undated';
}

/** Local wall-clock timestamp as YYYY-MM-DDTHH:mm (the format of <input type="datetime-local">). */
export function toLocalDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sortEvents(events: ReadonlyArray<KeepsakeEvent>): KeepsakeEvent[] {
  return [...events].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt - a.createdAt);
}

export function groupEventsByYear(events: ReadonlyArray<KeepsakeEvent>): Array<[number, KeepsakeEvent[]]> {
  const groups = new Map<number, KeepsakeEvent[]>();
  for (const event of sortEvents(events)) {
    const year = yearOf(event.startDate);
    const bucket = groups.get(year) ?? [];
    bucket.push(event);
    groups.set(year, bucket);
  }
  return [...groups.entries()];
}

export interface StoryDay {
  day: string;
  label: string;
  /** 1-based day number relative to the event start, or null when outside the event range. */
  dayNumber: number | null;
  items: Artifact[];
}

/** Order artifacts chronologically and bucket them into days for the story timeline. */
export function groupArtifactsByDay(artifacts: ReadonlyArray<Artifact>, eventStart: string): StoryDay[] {
  const sorted = [...artifacts].sort(
    (a, b) => a.takenAt.localeCompare(b.takenAt) || a.createdAt - b.createdAt,
  );
  const start = parseIsoDate(eventStart);
  const days = new Map<string, StoryDay>();
  for (const artifact of sorted) {
    const day = artifact.takenAt.slice(0, 10);
    let bucket = days.get(day);
    if (!bucket) {
      const date = parseIsoDate(day);
      const offset = start && date ? Math.round((date.getTime() - start.getTime()) / 86_400_000) : -1;
      bucket = { day, label: formatDayHeading(day), dayNumber: offset >= 0 ? offset + 1 : null, items: [] };
      days.set(day, bucket);
    }
    bucket.items.push(artifact);
  }
  return [...days.values()];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** Deterministic pseudo serial number for ticket stubs, derived from the event id. */
export function serialFor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `No. ${String(hash % 1_000_000).padStart(6, '0')}`;
}
