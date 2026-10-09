/**
 * Thin promise wrapper over IndexedDB. Three stores:
 * - events:    KeepsakeEvent, keyed by id
 * - artifacts: Artifact metadata, keyed by id, indexed by eventId
 * - blobs:     raw media Blobs, keyed by artifact id (kept apart so listing metadata never loads media)
 */
import type { Artifact, KeepsakeEvent } from '../types';

const DB_NAME = 'keepsake';
const DB_VERSION = 1;

type StoreName = 'events' | 'artifacts' | 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('artifacts')) {
        db.createObjectStore('artifacts', { keyPath: 'id' }).createIndex('eventId', 'eventId');
      }
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
    };
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error ?? new Error('Could not open the KeepSake database'));
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = (): void => resolve();
    tx.onabort = tx.onerror = (): void => reject(tx.error ?? new Error('Database transaction failed'));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error ?? new Error('Database request failed'));
  });
}

async function tx(stores: StoreName[], mode: IDBTransactionMode): Promise<IDBTransaction> {
  return (await open()).transaction(stores, mode);
}

export async function getAllEvents(): Promise<KeepsakeEvent[]> {
  return result((await tx(['events'], 'readonly')).objectStore('events').getAll() as IDBRequest<KeepsakeEvent[]>);
}

export async function getAllArtifacts(): Promise<Artifact[]> {
  return result((await tx(['artifacts'], 'readonly')).objectStore('artifacts').getAll() as IDBRequest<Artifact[]>);
}

export async function putEvent(event: KeepsakeEvent): Promise<void> {
  const t = await tx(['events'], 'readwrite');
  t.objectStore('events').put(event);
  return done(t);
}

export async function putArtifact(artifact: Artifact, blob?: Blob): Promise<void> {
  const t = await tx(['artifacts', 'blobs'], 'readwrite');
  t.objectStore('artifacts').put(artifact);
  if (blob) t.objectStore('blobs').put(blob, artifact.id);
  return done(t);
}

export async function getBlob(artifactId: string): Promise<Blob | undefined> {
  return result((await tx(['blobs'], 'readonly')).objectStore('blobs').get(artifactId) as IDBRequest<Blob | undefined>);
}

export async function deleteArtifact(id: string): Promise<void> {
  const t = await tx(['artifacts', 'blobs'], 'readwrite');
  t.objectStore('artifacts').delete(id);
  t.objectStore('blobs').delete(id);
  return done(t);
}

/** Delete an event together with every artifact and blob that belongs to it, atomically. */
export async function deleteEventCascade(eventId: string, artifactIds: ReadonlyArray<string>): Promise<void> {
  const t = await tx(['events', 'artifacts', 'blobs'], 'readwrite');
  t.objectStore('events').delete(eventId);
  for (const id of artifactIds) {
    t.objectStore('artifacts').delete(id);
    t.objectStore('blobs').delete(id);
  }
  return done(t);
}

/** Ask the browser not to evict scrapbook media under storage pressure. Best effort. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
