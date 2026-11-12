// One skill, drawn once. The same art is used in the area map, the legend, and the list view, so the symbols always agree.
// State is never carried by colour alone: every state has its own glyph, its own ring pattern, and a text label.
import { ICON_PATHS } from '../icons.mjs';
import { nodeParts } from '../copy.mjs';
import { STATES } from '../states.mjs';
import { el, svg } from './dom.mjs';

const R = 31, C = 2 * Math.PI * R;
/** @returns {SVGSVGElement} 72x72 drawing for a state. `ring` is {fraction} for a requirement arc, or null. */
export function nodeArt({ state, optional = false, ring = null, order = null, size = 72, label = null }) {
  const glyph = STATES[state]?.glyph ?? 'number';
  const body = optional
    ? svg('rect', { class: 'body', x: -20, y: -20, width: 40, height: 40, rx: 9, transform: 'translate(36 36) rotate(45)' })
    : svg('circle', { class: 'body', cx: 36, cy: 36, r: 25 });
  const g = glyph === 'number'
    ? svg('text', { class: 'glyph glyph-num', x: 36, y: 37, 'text-anchor': 'middle', 'dominant-baseline': 'central', text: order ?? '' })
    : svg('path', { class: 'glyph', d: ICON_PATHS[glyph], transform: 'translate(22 22) scale(1.17)', fill: glyph === 'star' || glyph === 'play' ? 'currentColor' : 'none' });
  const parts = [
    svg('circle', { class: 'halo', cx: 36, cy: 36, r: 35 }),
    svg('circle', { class: 'track', cx: 36, cy: 36, r: R }),
    ring && ring.fraction > 0 ? svg('circle', { class: 'arc', cx: 36, cy: 36, r: R, 'stroke-dasharray': `${(ring.fraction * C).toFixed(2)} ${C.toFixed(2)}`, transform: 'rotate(-90 36 36)' }) : null,
    body, g,
    // Every node shows its place in the suggested order: as the big number when not started, as a small badge otherwise.
    order !== null && order !== '' && glyph !== 'number' ? svg('g', { class: 'order-badge' }, svg('circle', { cx: 11, cy: 11, r: 10 }), svg('text', { x: 11, y: 11.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', text: order })) : null,
  ];
  return svg('svg', { class: 'node-art', viewBox: '0 0 72 72', width: size, height: size, 'aria-hidden': label ? null : 'true', role: label ? 'img' : null, 'aria-label': label, focusable: 'false', 'data-state': state, 'data-optional': optional ? 'true' : 'false' }, parts);
}

export function stateBadge(state, { optional = false } = {}) {
  const def = STATES[state];
  return el('span', { class: 'badge', 'data-state': state }, nodeArt({ state, optional, size: 22, order: '' }), el('span', { text: def.label }));
}

/**
 * The interactive skill node for the area map. A real <button>: keyboard, touch and screen readers all work without the drawing.
 * @param node a model node view
 * @param {{x:number,y:number,onSelect:(node)=>void, selected?:boolean, showTarget?:boolean}} o
 */
export function createSkillNode(node, { x, y, onSelect, selected = false }) {
  const cls = { title: 'node-title', caption: 'node-caption', optional: 'node-tag', suggested: 'node-tag node-tag-next', delta: 'node-delta', target: 'node-chip' };
  const pieces = nodeParts(node).map((part) => el('span', part.visible ? { class: cls[part.key], 'data-tone': part.key === 'target' ? node.target.tone : null, text: part.text } : { class: 'sr-only', text: part.text }));
  return el('button', {
    type: 'button', class: 'skill-node', 'data-map-item': 'skill', 'data-node-id': node.id, 'data-state': node.state, 'data-optional': node.optional ? 'true' : 'false',
    'data-suggested': node.suggested ? 'true' : 'false', 'data-changed': node.delta > 0 ? 'true' : 'false', 'aria-current': selected ? 'true' : null,
    style: `left:${x}px;top:${y}px`, onclick: () => onSelect(node),
  }, nodeArt({ state: node.state, optional: node.optional, ring: node.ring, order: node.order }), ...pieces);
}
