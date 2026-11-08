import { h, uniqueId } from './dom';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Label + control (+ optional hint) with explicit for/id and aria-describedby wiring. */
export function field(label: string, control: Control, hint?: string): HTMLElement {
  control.id ||= uniqueId('ks-field');
  control.classList.add('ks-input');
  let hintEl: HTMLElement | null = null;
  if (hint) {
    hintEl = h('span', { class: 'ks-field__hint', id: `${control.id}-hint` }, hint);
    control.setAttribute('aria-describedby', hintEl.id);
  }
  return h('div', { class: 'ks-field' }, h('label', { class: 'ks-field__label', for: control.id }, label), control, hintEl);
}

export function select(name: string, options: ReadonlyArray<{ value: string; label: string }>, value: string): HTMLSelectElement {
  const el = h('select', { name });
  for (const option of options) {
    el.append(h('option', { value: option.value, selected: option.value === value }, option.label));
  }
  return el;
}

/** Native radio group in a fieldset/legend. `decorate` can add a visual swatch next to each label. */
export function radioGroup(
  legend: string,
  name: string,
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
  decorate?: (value: string) => Node,
): HTMLFieldSetElement {
  return h(
    'fieldset',
    { class: 'ks-fieldset' },
    h('legend', { class: 'ks-fieldset__legend' }, legend),
    h(
      'div',
      { class: 'ks-choices' },
      options.map((option) => {
        const id = uniqueId(`ks-${name}`);
        return h(
          'div',
          { class: 'ks-choice' },
          h('input', { type: 'radio', name, id, value: option.value, checked: option.value === value, class: 'ks-choice__input' }),
          h('label', { for: id, class: 'ks-choice__label' }, decorate?.(option.value), option.label),
        );
      }),
    ),
  );
}
