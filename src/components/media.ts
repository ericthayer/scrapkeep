import { h } from '../lib/dom';
import { mediaUrl } from '../store/media';
import type { MediaArtifact } from '../types';

/** An <img> whose blob URL resolves asynchronously from IndexedDB. */
export function blobImage(artifact: MediaArtifact, alt: string, className: string): HTMLImageElement {
  const img = h('img', { class: className, alt, decoding: 'async', loading: 'lazy' });
  void mediaUrl(artifact.id).then((url) => {
    if (url) img.src = url;
  });
  return img;
}

/** Resolves once every image inside `root` has loaded (or failed), so printing never catches blanks. */
export async function imagesSettled(root: ParentNode): Promise<void> {
  const images = [...root.querySelectorAll('img')];
  await Promise.all(
    images.map(async (img) => {
      img.loading = 'eager';
      for (let i = 0; i < 50 && !img.getAttribute('src'); i += 1) {
        await new Promise((r) => setTimeout(r, 20));
      }
      await img.decode().catch(() => undefined);
    }),
  );
}
