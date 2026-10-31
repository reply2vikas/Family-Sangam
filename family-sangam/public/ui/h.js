// Tiny DOM builder. It only ever creates text nodes and elements, never parses HTML,
// so user-supplied or AI-supplied text cannot become markup.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * h('button', { class: 'primary', onclick: fn, 'aria-label': 'Go' }, 'Text', childNode)
 * Props starting with "on" are event listeners; true sets an empty attribute;
 * false / null / undefined skips it.
 */
export function h(tag, props = {}, ...children) {
  const svg = tag === 'svg' || props.svg;
  const el = svg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'svg' || value === false || value == null) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function field(label, id, props) {
  return [h('label', { for: id }, label), h('input', { id, ...props })];
}

export const svgEl = (tag, props = {}, ...kids) => h(tag, { ...props, svg: true }, ...kids);
