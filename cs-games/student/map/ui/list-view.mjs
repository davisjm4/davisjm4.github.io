// The accessible alternative to the drawn map. Same model, same states, same panel: a plain nested list that works with a keyboard,
// a screen reader, or any zoom level. Every skill in the course (or area) can be opened and practiced from here.
import { nodeCaption, stopSummaryLine } from '../copy.mjs';
import { icon } from '../icons.mjs';
import { STATES } from '../states.mjs';
import { el } from './dom.mjs';
import { nodeArt } from './skill-node.mjs';

function skillRow(node, { onSelect, onPractice, selectedId }) {
  const link = node.practice[0], cap = nodeCaption(node);
  return el('li', { class: 'skill-row', 'data-state': node.state, 'data-node-id': node.id, 'data-optional': node.optional ? 'true' : 'false' },
    el('button', { type: 'button', class: 'skill-row-open', 'data-map-item': 'skill-row', 'aria-current': node.id === selectedId ? 'true' : null, onclick: () => onSelect(node) },
      nodeArt({ state: node.state, optional: node.optional, ring: node.ring, order: node.order, size: 40 }),
      el('span', { class: 'row-text' },
        el('span', { class: 'row-title' }, el('span', { class: 'sr-only', text: `Skill ${node.order} of ${node.orderOf}: ` }), node.title),
        el('span', { class: 'row-meta', text: [STATES[node.state].label, node.optional ? 'Optional' : null, cap && cap !== STATES[node.state].label ? cap : null, node.delta > 0 ? `+${node.delta} questions` : null, node.target?.text ?? null, node.suggested ? 'Suggested next' : null].filter(Boolean).join(' · ') }))),
    link ? el('a', { class: 'btn btn-small', href: link.url, 'data-action': 'practice', 'aria-label': `Practice ${node.title}`, text: 'Practice', onclick: (e) => { if (onPractice({ node, url: link.url, kind: link.kind }) === true) e.preventDefault(); } }) : el('span', { class: 'muted small', text: 'No activity linked' }));
}

/** @param {object[]} stops the stops to list (all of them in the course view, one in the area view) */
export function renderListView(model, stops, { onSelect, onOpenStop, onPractice, selectedId, showStopButton }) {
  return el('div', { class: 'list-view', 'data-map-item-group': 'list' }, el('ol', { class: 'stop-list' }, stops.map((stop) => el('li', { class: 'stop-item', 'data-stop-id': stop.id, 'data-status': stop.summary.status, style: `--h:${stop.identity.hue}` },
    el('div', { class: 'stop-item-head' },
      el('span', { class: 'stop-item-icon' }, icon(stop.identity.icon, { size: 22 })),
      el('h3', {}, el('span', { text: stop.title }), el('span', { class: 'stop-item-sub', text: stopSummaryLine(stop) })),
      showStopButton ? el('button', { type: 'button', class: 'btn btn-small', 'data-action': 'open-stop', 'aria-label': `Open ${stop.title}`, text: 'Open', onclick: () => onOpenStop(stop) }) : null,
      stop.mixed ? el('a', { class: 'btn btn-small', href: stop.mixed.url, 'data-action': 'mixed', 'aria-label': stop.mixed.label, text: 'Mixed Practice', onclick: (e) => { if (onPractice({ stop, url: stop.mixed.url, kind: 'mixed' }) === true) e.preventDefault(); } }) : null),
    el('ol', { class: 'skill-list' }, stop.nodes.map((n) => skillRow(n, { onSelect, onPractice, selectedId })))))));
}
