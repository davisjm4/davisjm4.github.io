// Tiny DOM helpers for the requirements component. No framework: plain elements, text set with textContent (never innerHTML).
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
let counter = 0;
export const uid = (prefix = 'mreq') => `${prefix}-${++counter}`;
export const humanize = (id) => String(id).replace(/[-_/]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
/** Replace a node's children. */
export const fill = (node, ...children) => { node.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false).map((c) => (c.nodeType ? c : document.createTextNode(String(c))))); return node; };
