import './ks-event-form.css';
import { announce, h, render } from '../lib/dom';
import { field, radioGroup, select } from '../lib/fields';
import { navigate } from '../lib/router';
import { store } from '../store/store';
import {
  EVENT_KINDS,
  THEMES,
  type DisplayFormat,
  type EventDraft,
  type EventKind,
  type KeepsakeEvent,
  type ThemeId,
} from '../types';

const FORMATS = [
  { value: 'ticket', label: 'Ticket' },
  { value: 'poster', label: 'Poster' },
] as const;

const BLANK: EventDraft = {
  title: '',
  subtitle: '',
  kind: 'concert',
  venue: '',
  city: '',
  startDate: '',
  endDate: '',
  admit: '',
  story: '',
  format: 'ticket',
  theme: 'marquee',
};

/** Modal create/edit form built on native <dialog>. Call `open()` or `open(event)`. */
export class KsEventForm extends HTMLElement {
  #dialog = h('dialog', { class: 'ks-dialog', 'aria-labelledby': 'ks-event-form-title' });
  #editingId: string | null = null;
  #returnFocus: HTMLElement | null = null;

  connectedCallback(): void {
    if (!this.#dialog.isConnected) this.append(this.#dialog);
  }

  open(event?: KeepsakeEvent): void {
    this.#editingId = event?.id ?? null;
    this.#returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.#build(event ?? BLANK);
    this.#dialog.showModal();
    this.#dialog.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  }

  #build(data: EventDraft): void {
    const startInput = h('input', { type: 'date', name: 'startDate', required: true, value: data.startDate });
    const endInput = h('input', { type: 'date', name: 'endDate', value: data.endDate, min: data.startDate });
    startInput.addEventListener('change', () => {
      endInput.min = startInput.value;
    });

    const form = h(
      'form',
      { class: 'ks-form', method: 'dialog', onsubmit: (e: Event) => void this.#submit(e) },
      h(
        'header',
        { class: 'ks-form__header' },
        h('h2', { id: 'ks-event-form-title' }, this.#editingId ? 'Edit event' : 'New event'),
        h('button', { type: 'button', class: 'ks-button ks-button--quiet ks-button--small', onclick: () => this.#close() }, 'Cancel'),
      ),
      h(
        'div',
        { class: 'ks-form__grid' },
        field('Event name', h('input', { name: 'title', required: true, maxlength: 80, value: data.title, autocomplete: 'off' })),
        field(
          'Headliner or tagline',
          h('input', { name: 'subtitle', maxlength: 120, value: data.subtitle, autocomplete: 'off' }),
          'The band, keynote, or family name on the second line.',
        ),
        field('Kind of event', select('kind', EVENT_KINDS, data.kind)),
        field('Seat, section or badge', h('input', { name: 'admit', maxlength: 40, value: data.admit, autocomplete: 'off' })),
        field('First day', startInput),
        field('Last day', endInput, 'Leave empty for a one-day event.'),
        field('Venue', h('input', { name: 'venue', maxlength: 80, value: data.venue })),
        field('City', h('input', { name: 'city', maxlength: 60, value: data.city, autocomplete: 'address-level2' })),
      ),
      field('The story', h('textarea', { name: 'story', rows: 4 }, data.story), 'A few lines that open the scrapbook page.'),
      radioGroup('Display as', 'format', FORMATS, data.format),
      radioGroup('Palette', 'theme', THEMES, data.theme, (value) =>
        h('span', { class: 'ks-swatch', 'data-theme': value, 'aria-hidden': 'true' }),
      ),
      h(
        'footer',
        { class: 'ks-form__footer' },
        h('button', { type: 'submit', class: 'ks-button ks-button--primary' }, this.#editingId ? 'Save changes' : 'Create event'),
      ),
    );
    render(this.#dialog, form);
    this.#dialog.onclose = (): void => this.#returnFocus?.focus();
  }

  async #submit(e: Event): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const text = (key: keyof EventDraft): string => String(data.get(key) ?? '').trim();
    const draft: EventDraft = {
      title: text('title'),
      subtitle: text('subtitle'),
      kind: text('kind') as EventKind,
      venue: text('venue'),
      city: text('city'),
      startDate: text('startDate'),
      endDate: text('endDate') > text('startDate') ? text('endDate') : '',
      admit: text('admit'),
      story: text('story'),
      format: text('format') as DisplayFormat,
      theme: text('theme') as ThemeId,
    };
    if (this.#editingId) {
      await store.updateEvent(this.#editingId, draft);
      announce(`Saved ${draft.title}.`);
      this.#close();
    } else {
      const created = await store.createEvent(draft);
      announce(`Created ${created.title}. Add photos and notes to tell its story.`);
      this.#returnFocus = null;
      this.#close();
      navigate({ name: 'event', id: created.id });
    }
  }

  #close(): void {
    this.#dialog.close();
  }
}

customElements.define('ks-event-form', KsEventForm);

declare global {
  interface HTMLElementTagNameMap {
    'ks-event-form': KsEventForm;
  }
}
