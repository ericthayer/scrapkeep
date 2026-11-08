import './ks-print-sheet.css';
import './ks-poster';
import './ks-ticket';
import { h, render } from '../lib/dom';
import { formatBytes, formatDateRange, formatTime, groupArtifactsByDay } from '../lib/format';
import { hrefFor } from '../lib/router';
import { store } from '../store/store';
import type { Artifact, KeepsakeEvent } from '../types';
import { KsElement } from './ks-element';
import { blobImage, imagesSettled } from './media';

const KIND_LABEL = { video: 'Video', audio: 'Audio', document: 'Document' } as const;

/**
 * Print layout for one event: the poster or ticket as a cover page, then the story as scrapbook
 * pages. Opens the browser print dialog once media has decoded; "Save as PDF" produces the file.
 */
export class KsPrintSheet extends KsElement {
  #printed = false;

  protected override renderKey(): string | null {
    const id = this.getAttribute('event-id') ?? '';
    const parts = store.artifactsFor(id).map((a) => `${a.id}@${a.takenAt}:${a.caption}`);
    return `${store.status}|${store.event(id)?.updatedAt ?? ''}|${parts.sort().join(',')}`;
  }

  protected render(): void {
    if (store.status !== 'ready') return;
    const event = store.event(this.getAttribute('event-id') ?? '');
    if (!event) {
      render(this, h('p', { class: 'ks-print__missing' }, 'This event is not in your scrapbook.'));
      return;
    }
    document.title = `${event.title} · KeepSake`;
    const pages = h('div', { class: 'ks-print__pages' }, this.#cover(event), this.#story(event));
    render(this, this.#toolbar(event), pages);
    if (!this.#printed && !navigator.webdriver) {
      this.#printed = true;
      void imagesSettled(pages).then(() => requestAnimationFrame(() => window.print()));
    }
  }

  #toolbar(event: KeepsakeEvent): HTMLElement {
    return h(
      'div',
      { class: 'ks-print__toolbar', role: 'region', 'aria-label': 'Print options' },
      h('a', { class: 'ks-button ks-button--quiet', href: hrefFor({ name: 'event', id: event.id }) }, '← Back to event'),
      h(
        'p',
        { class: 'ks-print__tip' },
        'To download a PDF, choose “Save as PDF” as the printer. Turn on “Background graphics” to keep the colours.',
      ),
      h('button', { type: 'button', class: 'ks-button ks-button--primary', onclick: () => window.print() }, 'Print or save PDF'),
    );
  }

  #cover(event: KeepsakeEvent): HTMLElement {
    const display =
      event.format === 'poster' ? h('ks-poster', { 'event-id': event.id }) : h('ks-ticket', { 'event-id': event.id });
    return h(
      'section',
      { class: `ks-print__page ks-print__cover ks-print__cover--${event.format}`, 'aria-label': 'Cover' },
      display,
      event.format === 'ticket' &&
        h(
          'header',
          { class: 'ks-print__cover-text' },
          h('h1', {}, event.title),
          h('p', { class: 'ks-eyebrow' }, [formatDateRange(event.startDate, event.endDate), event.venue, event.city].filter(Boolean).join(' · ')),
          event.story && h('p', { class: 'ks-print__intro' }, event.story),
        ),
    );
  }

  #story(event: KeepsakeEvent): HTMLElement | null {
    const days = groupArtifactsByDay(store.artifactsFor(event.id), event.startDate);
    if (days.length === 0) return null;
    return h(
      'section',
      { class: 'ks-print__story', 'aria-label': 'Story' },
      event.format === 'poster' && event.story && h('p', { class: 'ks-print__intro' }, event.story),
      days.map((day) =>
        h(
          'section',
          { class: 'ks-print__day' },
          h('h2', { class: 'ks-print__day-heading' }, day.dayNumber !== null ? `Day ${day.dayNumber} · ${day.label}` : day.label),
          h('div', { class: 'ks-print__grid' }, day.items.map((a) => this.#item(a))),
        ),
      ),
    );
  }

  #item(artifact: Artifact): HTMLElement {
    const time = formatTime(artifact.takenAt);
    const caption = h('figcaption', {}, time && h('span', { class: 'ks-print__time' }, time), artifact.caption);
    if (artifact.kind === 'note') {
      return h('figure', { class: 'ks-print__item ks-print__item--note' }, h('blockquote', {}, artifact.text), caption);
    }
    if (artifact.kind === 'image') {
      return h('figure', { class: 'ks-print__item ks-print__item--image' }, blobImage(artifact, artifact.caption, 'ks-print__img'), caption);
    }
    return h(
      'figure',
      { class: 'ks-print__item ks-print__item--file' },
      h('p', { class: 'ks-print__file' }, `${KIND_LABEL[artifact.kind]}: ${artifact.fileName} (${formatBytes(artifact.size)})`),
      caption,
    );
  }
}

customElements.define('ks-print-sheet', KsPrintSheet);

declare global {
  interface HTMLElementTagNameMap {
    'ks-print-sheet': KsPrintSheet;
  }
}
