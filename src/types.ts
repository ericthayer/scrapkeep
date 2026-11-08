/** Domain model for KeepSake. Every record is persisted client-side in IndexedDB. */

export type EventKind = 'concert' | 'conference' | 'gathering' | 'other';
export type DisplayFormat = 'ticket' | 'poster';
export type ThemeId = 'marquee' | 'riso' | 'midnight' | 'garden';

export interface KeepsakeEvent {
  id: string;
  title: string;
  /** Headliner, lineup, tagline, or family name — the poster's second line. */
  subtitle: string;
  kind: EventKind;
  venue: string;
  city: string;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;
  /** ISO date (YYYY-MM-DD); empty for single-day events. */
  endDate: string;
  /** Free-form seat/section/badge text printed on the ticket stub. */
  admit: string;
  story: string;
  format: DisplayFormat;
  theme: ThemeId;
  coverArtifactId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type EventDraft = Omit<KeepsakeEvent, 'id' | 'createdAt' | 'updatedAt' | 'coverArtifactId'>;

export type ArtifactKind = 'image' | 'video' | 'audio' | 'document' | 'note';

interface ArtifactBase {
  id: string;
  eventId: string;
  caption: string;
  /** ISO local datetime (YYYY-MM-DDTHH:mm) used to place the artifact on the story timeline. */
  takenAt: string;
  createdAt: number;
}

export interface MediaArtifact extends ArtifactBase {
  kind: Exclude<ArtifactKind, 'note'>;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface NoteArtifact extends ArtifactBase {
  kind: 'note';
  text: string;
}

export type Artifact = MediaArtifact | NoteArtifact;

export type Route =
  | { name: 'timeline' }
  | { name: 'event'; id: string }
  | { name: 'print'; id: string };

export const EVENT_KINDS: ReadonlyArray<{ value: EventKind; label: string }> = [
  { value: 'concert', label: 'Concert' },
  { value: 'conference', label: 'Conference' },
  { value: 'gathering', label: 'Family gathering' },
  { value: 'other', label: 'Something else' },
];

export const THEMES: ReadonlyArray<{ value: ThemeId; label: string }> = [
  { value: 'marquee', label: 'Marquee (cream & red)' },
  { value: 'riso', label: 'Riso (pink & blue)' },
  { value: 'midnight', label: 'Midnight (black & gold)' },
  { value: 'garden', label: 'Garden (green & paper)' },
];
