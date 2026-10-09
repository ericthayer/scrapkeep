/**
 * Minimal DOM builder. Text is always assigned via text nodes, never parsed as
 * HTML, so user-supplied content cannot inject markup.
 */
type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined;
type Attrs = Record<string, AttrValue | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: ReadonlyArray<Child | ReadonlyArray<Child>>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') {
      el.addEventListener(key.replace(/^on/, '').toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (value !== false && value !== null && value !== undefined) {
      el.setAttribute(key, String(value));
    }
  }
  append(el, children.flat());
  return el;
}

export function append(parent: Node, children: ReadonlyArray<Child>): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/** Replace all children in one DOM write. */
export function render(parent: Element, ...children: ReadonlyArray<Child | ReadonlyArray<Child>>): void {
  const frag = document.createDocumentFragment();
  append(frag, children.flat());
  parent.replaceChildren(frag);
}

let uid = 0;
export function uniqueId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

/** Announce a message to assistive tech through the app's polite live region. */
export function announce(message: string): void {
  const region = document.getElementById('ks-announcer');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
