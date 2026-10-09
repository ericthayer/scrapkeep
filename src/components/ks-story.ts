import './ks-story.css';
import './ks-artifact-card';
import { h, render } from '../lib/dom';
import { groupArtifactsByDay } from '../lib/format';
import { store } from '../store/store';
import { KsElement } from './ks-element';

/**
 * The event's story: memories grouped by day in chronological order. Card elements are reused
 * across renders (keyed by artifact id) so media never reloads when the order changes.
 */
export class KsStory extends KsElement {
  #cards = new Map<string, HTMLElement>();

  protected override renderKey(): string | null {
    const id = this.getAttribute('event-id') ?? '';
    const order = store.artifactsFor(id).map((a) => `${a.id}@${a.takenAt}`).sort();
    return `${store.event(id)?.startDate ?? ''}|${order.join(',')}`;
  }

  protected render(): void {
    const event = store.event(this.getAttribute('event-id') ?? '');
    if (!event) return;
    const days = groupArtifactsByDay(store.artifactsFor(event.id), event.startDate);
    const live = new Set(days.flatMap((d) => d.items.map((a) => a.id)));
    for (const id of this.#cards.keys()) if (!live.has(id)) this.#cards.delete(id);

    if (days.length === 0) {
      render(
        this,
        h('p', { class: 'ks-story__empty' }, 'No memories yet. Add photos, clips or a note below and they will appear here in order.'),
      );
      return;
    }

    render(
      this,
      h(
        'ol',
        { class: 'ks-story', role: 'list' },
        days.map((day) =>
          h(
            'li',
            { class: 'ks-story__day' },
            h(
              'h3',
              { class: 'ks-story__day-heading' },
              day.dayNumber !== null && h('span', { class: 'ks-story__day-number' }, `Day ${day.dayNumber}`),
              h('time', { datetime: day.day }, day.label),
            ),
            h('div', { class: 'ks-story__items' }, day.items.map((a) => this.#card(a.id))),
          ),
        ),
      ),
    );
  }

  #card(id: string): HTMLElement {
    let card = this.#cards.get(id);
    if (!card) {
      card = h('ks-artifact-card', { 'artifact-id': id });
      this.#cards.set(id, card);
    }
    return card;
  }
}

customElements.define('ks-story', KsStory);

declare global {
  interface HTMLElementTagNameMap {
    'ks-story': KsStory;
  }
}
