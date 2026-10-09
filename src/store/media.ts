/** Object URL cache for artifact blobs. URLs are revoked when their artifact is deleted. */
import { getBlob } from './db';

const urls = new Map<string, Promise<string | null>>();

export function mediaUrl(artifactId: string): Promise<string | null> {
  let url = urls.get(artifactId);
  if (!url) {
    url = getBlob(artifactId).then((blob) => (blob ? URL.createObjectURL(blob) : null));
    urls.set(artifactId, url);
  }
  return url;
}

export function primeMediaUrl(artifactId: string, blob: Blob): void {
  urls.set(artifactId, Promise.resolve(URL.createObjectURL(blob)));
}

export function releaseMediaUrl(artifactId: string): void {
  const url = urls.get(artifactId);
  urls.delete(artifactId);
  void url?.then((u) => u && URL.revokeObjectURL(u));
}
