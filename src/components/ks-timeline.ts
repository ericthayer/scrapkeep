import './ks-timeline.css';
import './ks-ticket';
import './ks-poster';
import { h, render } from '../lib/dom';
import { formatDateRange, groupEventsByYear } from '../lib/format';
import { hrefFor } from '../lib/router';
import { store } from '../store/store';
import type { KeepsakeEvent } from '../types';
import { KsElement } from './ks-element';

/** Home view: every event on a year-by-year spine, each rendered as its ticket or poster. */
export class KsTimeline extends KsElement {
  protected override renderKey(): string | null {
    const covers = store.events().map((e) => `${e.id}@${e.updatedAt}:${store.coverFor(e)?.id ?? ''}`);
    return `${store.status}|${covers.join(',')}`;
  }

  protected render(): void {
    if (store.status === 'loading') {
      render(this, h('p', { class: 'ks-timeline__status', role: 'status' }, 'Opening your scrapbook…'));
      return;
    }
    if (store.status === 'error') {
      render(
        this,
        h(
          'p',
          { class: 'ks-timeline__status', role: 'alert' },
          `Your scrapbook could not be opened in this browser. ${store.error ?? ''}`,
        ),
      );
      return;
    }

    const groups = groupEventsByYear(store.events());
    render(
      this,
      h(
        'header',
        { class: 'ks-timeline__intro' },
        h('p', { class: 'ks-eyebrow' }, 'The archive'),
        h('h1', { class: 'ks-timeline__heading' }, 'Every show, summit & reunion worth keeping.'),
      ),
      groups.length === 0 ? this.#empty() : groups.map(([year, events]) => this.#year(year, events)),
    );
  }

  #empty(): HTMLElement {
    return h(
      'section',
      { class: 'ks-timeline__empty', 'aria-labelledby': 'ks-empty-heading' },
      h('h2', { id: 'ks-empty-heading' }, 'Start with one night you never want to forget.'),
      h(
        'p',
        {},
        'Create an event, then drop in photos, videos, voice memos, scanned ticket stubs and notes. ' +
          'KeepSake lays them out as a story and turns the event into a poster or ticket you can print.',
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'ks-button ks-button--primary',
          onclick: () => this.dispatchEvent(new CustomEvent('ks-new-event', { bubbles: true })),
        },
        'Create your first event',
      ),
    );
  }

  #year(year: number, events: KeepsakeEvent[]): HTMLElement {
    const headingId = `ks-year-${year}`;
    return h(
      'section',
      { class: 'ks-timeline__year', 'aria-labelledby': headingId },
      h('h2', { class: 'ks-timeline__year-label', id: headingId }, year ? String(year) : 'Undated'),
      h('ol', { class: 'ks-timeline__list', role: 'list' }, events.map((event) => this.#item(event))),
    );
  }

  #item(event: KeepsakeEvent): HTMLElement {
    const dates = formatDateRange(event.startDate, event.endDate);
    const count = store.artifactsFor(event.id).length;
    return h(
      'li',
      { class: `ks-timeline__item ks-timeline__item--${event.format}` },
      h(
        'p',
        { class: 'ks-timeline__when' },
        h('time', { datetime: event.startDate }, dates),
        h('span', { class: 'ks-timeline__count' }, `${count} ${count === 1 ? 'memory' : 'memories'}`),
      ),
      h(
        'a',
        {
          class: 'ks-timeline__link',
          href: hrefFor({ name: 'event', id: event.id }),
          'aria-label': `${event.title}, ${dates}. ${count} ${count === 1 ? 'memory' : 'memories'}.`,
        },
        event.format === 'poster'
          ? h('ks-poster', { 'event-id': event.id })
          : h('ks-ticket', { 'event-id': event.id }),
      ),
    );
  }
}

customElements.define('ks-timeline', KsTimeline);

declare global {
  interface HTMLElementTagNameMap {
    'ks-timeline': KsTimeline;
  }
}
