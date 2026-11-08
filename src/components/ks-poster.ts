import './ks-poster.css';
import { h, render } from '../lib/dom';
import { formatDateRange, parseIsoDate } from '../lib/format';
import { store } from '../store/store';
import { EVENT_KINDS } from '../types';
import { KsElement } from './ks-element';
import { blobImage } from './media';

/** Renders an event as a gig-style poster. Usage: <ks-poster event-id="…"></ks-poster> */
export class KsPoster extends KsElement {
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
    const start = parseIsoDate(event.startDate);
    const place = [event.venue, event.city].filter(Boolean).join(' · ');

    render(
      this,
      h(
        'article',
        { class: `ks-poster${cover ? ' ks-poster--photo' : ''}`, 'data-theme': event.theme },
        h(
          'div',
          { class: 'ks-poster__art' },
          cover
            ? blobImage(cover, cover.caption, 'ks-poster__img')
            : h('span', { class: 'ks-poster__numeral', 'aria-hidden': 'true' }, start ? String(start.getUTCDate()) : '★'),
        ),
        h(
          'div',
          { class: 'ks-poster__body' },
          h('p', { class: 'ks-poster__kicker' }, [kind, event.city].filter(Boolean).join(' · ')),
          h('h3', { class: 'ks-poster__title' }, event.title),
          event.subtitle && h('p', { class: 'ks-poster__subtitle' }, event.subtitle),
        ),
        h(
          'footer',
          { class: 'ks-poster__footer' },
          h('span', {}, formatDateRange(event.startDate, event.endDate)),
          place && h('span', {}, place),
        ),
      ),
    );
  }
}

customElements.define('ks-poster', KsPoster);

declare global {
  interface HTMLElementTagNameMap {
    'ks-poster': KsPoster;
  }
}
