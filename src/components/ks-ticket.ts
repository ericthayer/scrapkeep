import './ks-ticket.css';
import { h, render } from '../lib/dom';
import { formatDateRange, serialFor, stubDate } from '../lib/format';
import { store } from '../store/store';
import { EVENT_KINDS } from '../types';
import { KsElement } from './ks-element';
import { blobImage } from './media';

/** Renders an event as a perforated admission ticket. Usage: <ks-ticket event-id="…"></ks-ticket> */
export class KsTicket extends KsElement {
  static observedAttributes = ['event-id'];

  attributeChangedCallback(): void {
    this.requestRender();
  }

  protected override renderKey(): string | null {
    const event = store.event(this.getAttribute('event-id') ?? '');
    return event ? `${event.updatedAt}:${store.coverFor(event)?.id ?? ''}` : '';
  }

  protected render(): void {
    const event = store.event(this.getAttribute('event-id') ?? '');
    if (!event) {
      render(this);
      return;
    }
    const cover = store.coverFor(event);
    const kind = EVENT_KINDS.find((k) => k.value === event.kind)?.label ?? '';
    const meta: Array<[string, string]> = [
      ['Date', formatDateRange(event.startDate, event.endDate)],
      ['Venue', event.venue],
      ['City', event.city],
      [event.kind === 'conference' ? 'Badge' : 'Seat', event.admit],
    ];

    render(
      this,
      h(
        'article',
        { class: `ks-ticket${cover ? ' ks-ticket--photo' : ''}`, 'data-theme': event.theme },
        cover && h('div', { class: 'ks-ticket__photo' }, blobImage(cover, cover.caption, 'ks-ticket__img')),
        h(
          'div',
          { class: 'ks-ticket__main' },
          h('p', { class: 'ks-ticket__kicker' }, `Admit one · ${kind}`),
          h('h3', { class: 'ks-ticket__title' }, event.title),
          event.subtitle && h('p', { class: 'ks-ticket__subtitle' }, event.subtitle),
          h(
            'dl',
            { class: 'ks-ticket__meta' },
            meta
              .filter(([, value]) => value)
              .map(([term, value]) =>
                h('div', { class: 'ks-ticket__meta-item' }, h('dt', {}, term), h('dd', {}, value)),
              ),
          ),
        ),
        h(
          'div',
          { class: 'ks-ticket__stub', 'aria-hidden': 'true' },
          h('span', { class: 'ks-ticket__stub-date' }, stubDate(event.startDate)),
          h('span', { class: 'ks-ticket__stub-serial' }, serialFor(event.id)),
          h('span', { class: 'ks-ticket__stub-admit' }, 'Admit one'),
        ),
      ),
    );
  }
}

customElements.define('ks-ticket', KsTicket);

declare global {
  interface HTMLElementTagNameMap {
    'ks-ticket': KsTicket;
  }
}
