import './ks-artifact-card.css';
import { announce, h, render, uniqueId } from '../lib/dom';
import { formatBytes, formatTime } from '../lib/format';
import { mediaUrl } from '../store/media';
import { store } from '../store/store';
import type { Artifact, MediaArtifact } from '../types';

/**
 * One memory on the story timeline. Built once; later store changes patch values in place so an
 * in-progress caption edit never loses focus. Usage: <ks-artifact-card artifact-id="…">
 */
export class KsArtifactCard extends HTMLElement {
  #built = false;
  #caption = h('textarea', { class: 'ks-card__caption', rows: 2, maxlength: 500, placeholder: 'Add a caption…' });
  #when = h('input', { type: 'datetime-local', class: 'ks-input ks-card__when' });
  #time = h('time', { class: 'ks-card__time' });
  #coverButton = h('button', { type: 'button', class: 'ks-button ks-button--quiet ks-button--small' });
  #unsubscribe: (() => void) | null = null;

  get artifactId(): string {
    return this.getAttribute('artifact-id') ?? '';
  }

  connectedCallback(): void {
    const artifact = store.artifact(this.artifactId);
    if (!artifact) return;
    if (!this.#built) this.#build(artifact);
    this.#unsubscribe = store.subscribe(() => this.#sync());
    this.#sync();
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
  }

  #build(artifact: Artifact): void {
    this.#built = true;
    const captionId = uniqueId('ks-caption');
    const whenId = uniqueId('ks-when');
    this.#caption.id = captionId;
    this.#when.id = whenId;
    // Commit on blur rather than per keystroke/segment so the card does not re-sort mid-edit.
    this.#caption.addEventListener('blur', () => {
      const current = store.artifact(this.artifactId);
      const value = this.#caption.value.trim();
      if (current && value !== current.caption) void store.updateArtifact(this.artifactId, { caption: value });
    });
    this.#when.addEventListener('blur', () => {
      const current = store.artifact(this.artifactId);
      if (current && this.#when.value && this.#when.value !== current.takenAt) {
        void store.updateArtifact(this.artifactId, { takenAt: this.#when.value });
      }
    });
    this.#coverButton.addEventListener('click', () => void this.#toggleCover());

    const details = h(
      'details',
      { class: 'ks-card__edit' },
      h('summary', {}, 'Edit time'),
      h('label', { for: whenId, class: 'ks-field__label' }, 'When it happened'),
      this.#when,
    );

    render(
      this,
      h(
        'figure',
        { class: `ks-card ks-card--${artifact.kind}` },
        this.#media(artifact),
        h(
          'figcaption',
          { class: 'ks-card__body' },
          this.#time,
          h('label', { for: captionId, class: 'visually-hidden' }, 'Caption'),
          this.#caption,
          h(
            'div',
            { class: 'ks-card__actions' },
            artifact.kind === 'image' && this.#coverButton,
            h('button', { type: 'button', class: 'ks-button ks-button--quiet ks-button--small', onclick: () => void this.#remove() }, 'Remove'),
          ),
          details,
        ),
      ),
    );
  }

  #media(artifact: Artifact): HTMLElement {
    if (artifact.kind === 'note') {
      return h('blockquote', { class: 'ks-card__note' }, artifact.text);
    }
    const holder = h('div', { class: 'ks-card__media' });
    const label = artifact.caption || artifact.fileName;
    let el: HTMLElement;
    switch (artifact.kind) {
      case 'image':
        el = h('img', { alt: artifact.caption, loading: 'lazy', decoding: 'async' });
        break;
      case 'video':
        el = h('video', { controls: true, preload: 'metadata', playsinline: true, 'aria-label': label });
        break;
      case 'audio':
        el = h('audio', { controls: true, preload: 'metadata', 'aria-label': label });
        break;
      case 'document':
        el = h('a', { class: 'ks-card__doc', target: '_blank', rel: 'noopener' }, `Open ${artifact.fileName} (${formatBytes(artifact.size)})`);
        break;
    }
    void mediaUrl(artifact.id).then((url) => {
      if (!url) return;
      if (el instanceof HTMLAnchorElement) el.href = url;
      else el.setAttribute('src', url);
    });
    holder.append(el);
    return holder;
  }

  #sync(): void {
    const artifact = store.artifact(this.artifactId);
    if (!artifact) return;
    const time = formatTime(artifact.takenAt);
    this.#time.dateTime = artifact.takenAt;
    this.#time.textContent = time;
    if (document.activeElement !== this.#caption) this.#caption.value = artifact.caption;
    if (document.activeElement !== this.#when) this.#when.value = artifact.takenAt;
    const img = this.querySelector('img');
    if (img) img.alt = artifact.caption;
    const event = store.event(artifact.eventId);
    const isCover = !!event && store.coverFor(event)?.id === artifact.id;
    this.#coverButton.textContent = isCover ? 'Cover photo (current)' : 'Use as cover';
  }

  async #toggleCover(): Promise<void> {
    const artifact = store.artifact(this.artifactId) as MediaArtifact | undefined;
    if (!artifact) return;
    await store.updateEvent(artifact.eventId, { coverArtifactId: artifact.id });
    announce('Cover photo updated.');
  }

  async #remove(): Promise<void> {
    if (!confirm('Remove this memory from the story? This cannot be undone.')) return;
    await store.deleteArtifact(this.artifactId);
    announce('Memory removed.');
  }
}

customElements.define('ks-artifact-card', KsArtifactCard);

declare global {
  interface HTMLElementTagNameMap {
    'ks-artifact-card': KsArtifactCard;
  }
}
