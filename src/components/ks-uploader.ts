import './ks-uploader.css';
import { h, render } from '../lib/dom';
import { field } from '../lib/fields';
import { toLocalDateTime } from '../lib/format';
import { store } from '../store/store';

const ACCEPT = 'image/*,video/*,audio/*,application/pdf';

/** Drop zone + file picker + quick note composer for one event. Usage: <ks-uploader event-id="…"> */
export class KsUploader extends HTMLElement {
  #status = h('p', { class: 'ks-uploader__status', role: 'status' });
  #built = false;

  get eventId(): string {
    return this.getAttribute('event-id') ?? '';
  }

  connectedCallback(): void {
    if (this.#built) return;
    this.#built = true;
    const input = h('input', { type: 'file', multiple: true, accept: ACCEPT, id: 'ks-upload-input', class: 'visually-hidden' });
    input.addEventListener('change', () => {
      void this.#addFiles([...(input.files ?? [])]);
      input.value = '';
    });

    const zone = h(
      'div',
      { class: 'ks-uploader__zone' },
      h('p', { class: 'ks-uploader__lede' }, 'Drop photos, videos, voice memos or scanned stubs here'),
      h('p', { class: 'ks-uploader__hint' }, 'Images, video, audio and PDF. Everything stays in this browser.'),
      input,
      h('label', { for: input.id, class: 'ks-button ks-button--primary' }, 'Choose files'),
    );
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-over');
      void this.#addFiles([...(e.dataTransfer?.files ?? [])]);
    });

    render(this, h('section', { class: 'ks-uploader', 'aria-labelledby': 'ks-uploader-heading' },
      h('h2', { id: 'ks-uploader-heading', class: 'ks-uploader__heading' }, 'Add to the story'),
      zone,
      this.#noteForm(),
      this.#status,
    ));
  }

  #noteForm(): HTMLFormElement {
    const event = store.event(this.eventId);
    const text = h('textarea', { name: 'text', rows: 3, required: true, maxlength: 2000 });
    const when = h('input', {
      type: 'datetime-local',
      name: 'takenAt',
      required: true,
      value: event?.startDate ? `${event.startDate}T20:00` : toLocalDateTime(Date.now()),
    });
    const form = h(
      'form',
      { class: 'ks-uploader__note' },
      field('Write a memory', text, 'A quote, a setlist, who was there, what you ate.'),
      field('When it happened', when),
      h('button', { type: 'submit', class: 'ks-button' }, 'Add note'),
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = text.value.trim();
      if (!value) return;
      void store.addNote(this.eventId, value, when.value).then(() => {
        text.value = '';
        this.#say('Note added to the story.');
      });
    });
    return form;
  }

  async #addFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    this.#say(`Saving ${files.length} ${files.length === 1 ? 'file' : 'files'}…`);
    try {
      const added = await store.addFiles(this.eventId, files);
      const skipped = files.length - added;
      this.#say(
        `Added ${added} ${added === 1 ? 'item' : 'items'} to the story.` +
          (skipped ? ` Skipped ${skipped} unsupported ${skipped === 1 ? 'file' : 'files'}.` : ''),
      );
    } catch (err) {
      const quota = err instanceof DOMException && err.name === 'QuotaExceededError';
      this.#say(quota ? 'This browser is out of storage space for media.' : 'Something went wrong saving those files.');
    }
  }

  #say(message: string): void {
    this.#status.textContent = message;
  }
}

customElements.define('ks-uploader', KsUploader);

declare global {
  interface HTMLElementTagNameMap {
    'ks-uploader': KsUploader;
  }
}
