// DOM helpers. `el` is the project's existing helper (same API as the other student and teacher pages); `svg` is its SVG twin.
import { el } from '../../../../wpr-games/workplace-readiness/online/dom.mjs';
export { el };
const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, props = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.setAttribute('class', value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.flat().filter(Boolean));
  return node;
}
/** Visually hidden text that screen readers still read. */
export const srOnly = (text) => el('span', { class: 'sr-only', text });
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
