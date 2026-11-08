import { describe, expect, it } from 'vitest';
import type { Artifact, KeepsakeEvent } from '../types';
import { formatDateRange, groupArtifactsByDay, groupEventsByYear, stubDate } from './format';
import { parseRoute, hrefFor } from './router';

const note = (id: string, takenAt: string, createdAt = 0): Artifact => ({
  id,
  eventId: 'e',
  kind: 'note',
  caption: '',
  text: id,
  takenAt,
  createdAt,
});

const event = (id: string, startDate: string): KeepsakeEvent => ({
  id,
  title: id,
  subtitle: '',
  kind: 'concert',
  venue: '',
  city: '',
  startDate,
  endDate: '',
  admit: '',
  story: '',
  format: 'ticket',
  theme: 'marquee',
  coverArtifactId: null,
  createdAt: 0,
  updatedAt: 0,
});

describe('formatDateRange', () => {
  it('formats single days and ranges without timezone drift', () => {
    expect(formatDateRange('2026-07-12', '')).toMatch(/12.*2026/);
    expect(formatDateRange('2026-07-12', '2026-07-14')).toMatch(/12.*14, 2026/);
    expect(formatDateRange('2025-12-31', '2026-01-01')).toMatch(/2025.*2026/);
  });

  it('returns empty for an invalid start', () => {
    expect(formatDateRange('', '')).toBe('');
  });
});

describe('stubDate', () => {
  it('prints MM.DD.YY', () => {
    expect(stubDate('2026-07-04')).toBe('07.04.26');
  });
});

describe('groupArtifactsByDay', () => {
  it('orders chronologically and numbers days from the event start', () => {
    const days = groupArtifactsByDay(
      [note('c', '2026-07-13T09:00'), note('a', '2026-07-12T20:00'), note('b', '2026-07-12T21:30')],
      '2026-07-12',
    );
    expect(days.map((d) => [d.day, d.dayNumber, d.items.map((i) => i.id)])).toEqual([
      ['2026-07-12', 1, ['a', 'b']],
      ['2026-07-13', 2, ['c']],
    ]);
  });

  it('leaves days before the event unnumbered', () => {
    const [day] = groupArtifactsByDay([note('a', '2026-07-01T10:00')], '2026-07-12');
    expect(day?.dayNumber).toBeNull();
  });
});

describe('groupEventsByYear', () => {
  it('groups newest first', () => {
    const groups = groupEventsByYear([event('old', '2024-05-01'), event('new', '2026-01-01'), event('mid', '2026-06-01')]);
    expect(groups.map(([y, list]) => [y, list.map((e) => e.id)])).toEqual([
      [2026, ['mid', 'new']],
      [2024, ['old']],
    ]);
  });
});

describe('router', () => {
  it('round-trips routes', () => {
    expect(parseRoute(hrefFor({ name: 'event', id: 'a b' }))).toEqual({ name: 'event', id: 'a b' });
    expect(parseRoute('#/print/x')).toEqual({ name: 'print', id: 'x' });
    expect(parseRoute('#/nope')).toEqual({ name: 'timeline' });
  });
});
