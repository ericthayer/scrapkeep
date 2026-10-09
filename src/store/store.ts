/**
 * Application state. Holds every event and artifact's metadata in memory (blobs stay in IndexedDB)
 * and emits a `change` event after each mutation. Components subscribe with `store.subscribe`.
 */
import { createId } from '../lib/id';
import { toLocalDateTime } from '../lib/format';
import type { Artifact, ArtifactKind, EventDraft, KeepsakeEvent, MediaArtifact, NoteArtifact } from '../types';
import * as db from './db';
import { primeMediaUrl, releaseMediaUrl } from './media';

export type StoreStatus = 'loading' | 'ready' | 'error';

class KeepsakeStore extends EventTarget {
  #events = new Map<string, KeepsakeEvent>();
  #artifacts = new Map<string, Artifact>();
  #status: StoreStatus = 'loading';
  #error: string | null = null;

  get status(): StoreStatus {
    return this.#status;
  }

  get error(): string | null {
    return this.#error;
  }

  async load(): Promise<void> {
    try {
      const [events, artifacts] = await Promise.all([db.getAllEvents(), db.getAllArtifacts()]);
      this.#events = new Map(events.map((e) => [e.id, e]));
      this.#artifacts = new Map(artifacts.map((a) => [a.id, a]));
      this.#status = 'ready';
      void db.requestPersistence();
    } catch (err) {
      this.#status = 'error';
      this.#error = err instanceof Error ? err.message : String(err);
    }
    this.#emit();
  }

  subscribe(listener: () => void): () => void {
    this.addEventListener('change', listener);
    return () => this.removeEventListener('change', listener);
  }

  events(): KeepsakeEvent[] {
    return [...this.#events.values()];
  }

  event(id: string): KeepsakeEvent | undefined {
    return this.#events.get(id);
  }

  artifactsFor(eventId: string): Artifact[] {
    return [...this.#artifacts.values()].filter((a) => a.eventId === eventId);
  }

  artifact(id: string): Artifact | undefined {
    return this.#artifacts.get(id);
  }

  /** The cover image: the chosen cover, else the earliest image on the timeline. */
  coverFor(event: KeepsakeEvent): MediaArtifact | null {
    const chosen = event.coverArtifactId ? this.#artifacts.get(event.coverArtifactId) : undefined;
    if (chosen && chosen.kind === 'image') return chosen;
    const images = this.artifactsFor(event.id)
      .filter((a): a is MediaArtifact => a.kind === 'image')
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    return images[0] ?? null;
  }

  async createEvent(draft: EventDraft): Promise<KeepsakeEvent> {
    const now = Date.now();
    const event: KeepsakeEvent = { ...draft, id: createId(), coverArtifactId: null, createdAt: now, updatedAt: now };
    await db.putEvent(event);
    this.#events.set(event.id, event);
    this.#emit();
    return event;
  }

  async updateEvent(id: string, patch: Partial<EventDraft> & { coverArtifactId?: string | null }): Promise<void> {
    const current = this.#events.get(id);
    if (!current) return;
    const next: KeepsakeEvent = { ...current, ...patch, updatedAt: Date.now() };
    await db.putEvent(next);
    this.#events.set(id, next);
    this.#emit();
  }

  async deleteEvent(id: string): Promise<void> {
    const owned = this.artifactsFor(id).map((a) => a.id);
    await db.deleteEventCascade(id, owned);
    this.#events.delete(id);
    for (const artifactId of owned) {
      this.#artifacts.delete(artifactId);
      releaseMediaUrl(artifactId);
    }
    this.#emit();
  }

  async addFiles(eventId: string, files: ReadonlyArray<File>): Promise<number> {
    let added = 0;
    for (const file of files) {
      const kind = kindForMime(file.type);
      if (!kind) continue;
      const artifact: MediaArtifact = {
        id: createId(),
        eventId,
        kind,
        caption: '',
        takenAt: this.#defaultTakenAt(eventId, file.lastModified),
        createdAt: Date.now(),
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      };
      await db.putArtifact(artifact, file);
      primeMediaUrl(artifact.id, file);
      this.#artifacts.set(artifact.id, artifact);
      added += 1;
    }
    this.#emit();
    return added;
  }

  async addNote(eventId: string, text: string, takenAt: string): Promise<void> {
    const note: NoteArtifact = { id: createId(), eventId, kind: 'note', caption: '', text, takenAt, createdAt: Date.now() };
    await db.putArtifact(note);
    this.#artifacts.set(note.id, note);
    this.#emit();
  }

  async updateArtifact(id: string, patch: { caption?: string; takenAt?: string; text?: string }): Promise<void> {
    const current = this.#artifacts.get(id);
    if (!current) return;
    const next = { ...current, ...patch } as Artifact;
    await db.putArtifact(next);
    this.#artifacts.set(id, next);
    this.#emit();
  }

  async deleteArtifact(id: string): Promise<void> {
    const artifact = this.#artifacts.get(id);
    if (!artifact) return;
    await db.deleteArtifact(id);
    this.#artifacts.delete(id);
    releaseMediaUrl(id);
    const owner = this.#events.get(artifact.eventId);
    if (owner?.coverArtifactId === id) await this.updateEvent(owner.id, { coverArtifactId: null });
    else this.#emit();
  }

  /**
   * A file's lastModified is usually when the photo was taken. If that falls outside the event's
   * dates (e.g. a scanned ticket), pin it to the event's first day so it still lands in the story.
   */
  #defaultTakenAt(eventId: string, lastModified: number): string {
    const event = this.#events.get(eventId);
    const stamp = toLocalDateTime(lastModified || Date.now());
    if (!event?.startDate) return stamp;
    const day = stamp.slice(0, 10);
    const end = event.endDate || event.startDate;
    return day >= event.startDate && day <= end ? stamp : `${event.startDate}T12:00`;
  }

  #emit(): void {
    this.dispatchEvent(new Event('change'));
  }
}

export function kindForMime(mime: string): Exclude<ArtifactKind, 'note'> | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'document';
  return null;
}

export const store = new KeepsakeStore();
