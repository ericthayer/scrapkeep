import './ks-event-view.css';
import './ks-poster';
import './ks-ticket';
import './ks-story';
import './ks-uploader';
import { announce, h, render } from '../lib/dom';
import { formatDateRange } from '../lib/format';
import { hrefFor, navigate } from '../lib/router';
import { store } from '../store/store';
import type { KeepsakeEvent } from '../types';
import { KsElement } from './ks-element';

/** One event's scrapbook page: keepsake display + actions on the left, story + uploader on the right. */
export class KsEventView extends KsElement {
  #summary = h('aside', { class: 'ks-event__summary', 'aria-label': 'Event keepsake' });
  #builtFor: string | null = null;

  get eventId(): string {
    return this.getAttribute('event-id') ?? '';
  }

  protected override renderKey(): string | null {
    const event = store.event(this.eventId);
    return `${store.status}|${this.eventId}|${event?.updatedAt ?? 'missing'}`;
  }

  protected render(): void {
    if (store.status !== 'ready') return;
    const event = store.event(this.eventId);
    if (!event) {
      this.#builtFor = null;
      render(
        this,
        h(
          'section',
          { class: 'ks-event__missing' },
          h('h1', {}, 'This event is not in your scrapbook.'),
          h('p', {}, 'It may have been deleted, or it was saved in a different browser.'),
          h('a', { class: 'ks-button', href: hrefFor({ name: 'timeline' }) }, 'Back to all events'),
        ),
      );
      return;
    }
    if (this.#builtFor !== event.id) this.#build(event);
    this.#renderSummary(event);
    document.title = `${event.title} · KeepSake`;
  }

  #build(event: KeepsakeEvent): void {
    this.#builtFor = event.id;
    render(
      this,
      h(
        'div',
        { class: 'ks-event' },
        this.#summary,
        h(
          'section',
          { class: 'ks-event__story', 'aria-labelledby': 'ks-story-heading' },
          h('h2', { id: 'ks-story-heading', class: 'ks-event__story-heading' }, 'The story'),
          h('ks-story', { 'event-id': event.id }),
          h('ks-uploader', { 'event-id': event.id }),
        ),
      ),
    );
  }

  #renderSummary(event: KeepsakeEvent): void {
    const other = event.format === 'poster' ? 'ticket' : 'poster';
    render(
      this.#summary,
      h('a', { class: 'ks-event__back', href: hrefFor({ name: 'timeline' }) }, '← All events'),
      h(
        'header',
        { class: 'ks-event__header' },
        h('p', { class: 'ks-eyebrow' }, formatDateRange(event.startDate, event.endDate)),
        h('h1', { class: 'ks-event__title' }, event.title),
      ),
      h(
        'div',
        { class: `ks-event__display ks-event__display--${event.format}` },
        event.format === 'poster' ? h('ks-poster', { 'event-id': event.id }) : h('ks-ticket', { 'event-id': event.id }),
      ),
      event.story && h('p', { class: 'ks-event__intro' }, event.story),
      h(
        'div',
        { class: 'ks-event__actions', role: 'group', 'aria-label': 'Event actions' },
        h('a', { class: 'ks-button ks-button--primary', href: hrefFor({ name: 'print', id: event.id }) }, 'Print or save PDF'),
        h(
          'button',
          { type: 'button', class: 'ks-button', onclick: () => void this.#switchFormat(event, other) },
          `Show as ${other}`,
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'ks-button',
            onclick: () => this.dispatchEvent(new CustomEvent('ks-edit-event', { bubbles: true, detail: event.id })),
          },
          'Edit details',
        ),
        h('button', { type: 'button', class: 'ks-button ks-button--danger', onclick: () => void this.#delete(event) }, 'Delete'),
      ),
    );
  }

  async #switchFormat(event: KeepsakeEvent, format: KeepsakeEvent['format']): Promise<void> {
    await store.updateEvent(event.id, { format });
    announce(`Now showing as a ${format}.`);
    // The summary was re-rendered; keep keyboard users on the same control.
    requestAnimationFrame(() => {
      [...this.#summary.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Show as'))?.focus();
    });
  }

  async #delete(event: KeepsakeEvent): Promise<void> {
    const count = store.artifactsFor(event.id).length;
    const ok = confirm(
      `Delete “${event.title}” and its ${count} ${count === 1 ? 'memory' : 'memories'}? This cannot be undone.`,
    );
    if (!ok) return;
    await store.deleteEvent(event.id);
    announce(`Deleted ${event.title}.`);
    navigate({ name: 'timeline' });
  }
}

customElements.define('ks-event-view', KsEventView);

declare global {
  interface HTMLElementTagNameMap {
    'ks-event-view': KsEventView;
  }
}
