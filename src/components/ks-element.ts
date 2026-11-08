import { store } from '../store/store';

/**
 * Base class for store-driven custom elements. Renders are coalesced into one microtask and
 * skipped when `renderKey()` is unchanged, so unrelated store changes never thrash the DOM.
 */
export abstract class KsElement extends HTMLElement {
  #unsubscribe: (() => void) | null = null;
  #queued = false;
  #lastKey: string | null = null;

  connectedCallback(): void {
    this.#unsubscribe = store.subscribe(() => this.requestRender());
    this.requestRender();
  }

  disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  requestRender(force = false): void {
    if (force) this.#lastKey = null;
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (!this.isConnected) return;
      const key = this.renderKey();
      if (key !== null && key === this.#lastKey) return;
      this.#lastKey = key;
      this.render();
    });
  }

  /** Return a string that changes whenever the output should change, or null to always render. */
  protected renderKey(): string | null {
    return null;
  }

  protected abstract render(): void;
}
