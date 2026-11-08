import './ks-app.css';
import './ks-event-form';
import { h, render } from '../lib/dom';
import { hrefFor, parseRoute } from '../lib/router';
import { store } from '../store/store';
import type { Route } from '../types';
import type { KsEventForm } from './ks-event-form';

/**
 * Application shell: header, routed main region, and the shared event dialog. Route views are
 * code-split and loaded on demand.
 */
export class KsApp extends HTMLElement {
  #main = h('main', { class: 'ks-app__main', id: 'main', tabindex: -1 });
  #form = h('ks-event-form') as KsEventForm;
  #route: Route | null = null;

  connectedCallback(): void {
    render(
      this,
      h('a', { class: 'ks-app__skip', href: '#main', onclick: (e: Event) => this.#skip(e) }, 'Skip to content'),
      h(
        'header',
        { class: 'ks-app__header' },
        h('a', { class: 'ks-app__brand', href: hrefFor({ name: 'timeline' }) }, 'Keep', h('span', {}, 'Sake')),
        h('button', { type: 'button', class: 'ks-button ks-button--primary', onclick: () => this.#form.open() }, 'New event'),
      ),
      this.#main,
      h('footer', { class: 'ks-app__footer' }, 'Your scrapbook is stored privately in this browser.'),
      h('div', { id: 'ks-announcer', class: 'visually-hidden', 'aria-live': 'polite', 'aria-atomic': 'true' }),
      this.#form,
    );

    this.addEventListener('ks-new-event', () => this.#form.open());
    this.addEventListener('ks-edit-event', (e) => {
      const event = store.event((e as CustomEvent<string>).detail);
      if (event) this.#form.open(event);
    });
    window.addEventListener('hashchange', () => void this.#show());
    void this.#show();
    void store.load();
  }

  async #show(): Promise<void> {
    const route = parseRoute(location.hash);
    const first = this.#route === null;
    this.#route = route;
    this.dataset.route = route.name;
    switch (route.name) {
      case 'timeline':
        await import('./ks-timeline');
        document.title = 'KeepSake · Your event scrapbook';
        render(this.#main, h('ks-timeline'));
        break;
      case 'event':
        await import('./ks-event-view');
        render(this.#main, h('ks-event-view', { 'event-id': route.id }));
        break;
      case 'print':
        await import('./ks-print-sheet');
        render(this.#main, h('ks-print-sheet', { 'event-id': route.id }));
        break;
    }
    window.scrollTo({ top: 0 });
    // Move focus to the new view on navigation (not on first load) so screen readers hear the change.
    if (!first) this.#main.focus({ preventScroll: true });
  }

  #skip(e: Event): void {
    e.preventDefault();
    this.#main.focus();
  }
}

customElements.define('ks-app', KsApp);
