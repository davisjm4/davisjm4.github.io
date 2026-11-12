// View A: the whole course as one journey. Each learning area is a place on a winding trail.
import { stopSummaryLine } from '../copy.mjs';
import { icon } from '../icons.mjs';
import { serpentine } from '../layout.mjs';
import { el, svg } from './dom.mjs';
import { createBackdrop } from './trail.mjs';

const R = 42, C = 2 * Math.PI * R;
/** 96x96 drawing of a place: area icon in its colour, with a progress ring that says what it measures (see data-ring). */
function stopArt(stop) {
  const s = stop.summary;
  const arc = s.fraction > 0 ? svg('circle', { class: 'arc', cx: 48, cy: 48, r: R, 'stroke-dasharray': `${(s.fraction * C).toFixed(2)} ${C.toFixed(2)}`, transform: 'rotate(-90 48 48)' }) : null;
  const g = icon(stop.identity.icon, { size: 40 });
  const holder = svg('g', { transform: 'translate(28 28)' });
  while (g.firstChild) holder.append(g.firstChild);
  for (const a of ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill']) holder.setAttribute(a, g.getAttribute(a));
  holder.setAttribute('transform', 'translate(28 28) scale(1.667)');
  return svg('svg', { class: 'stop-art', viewBox: '0 0 96 96', width: 96, height: 96, 'aria-hidden': 'true', focusable: 'false', 'data-ring': s.mode },
    svg('circle', { class: 'track', cx: 48, cy: 48, r: R }), arc, svg('circle', { class: 'body', cx: 48, cy: 48, r: 34 }), holder);
}

/** @returns {{content: Node[], width:number, height:number, cols:number}} */
export function renderCourseMap(model, { width, onOpenStop, onPractice }) {
  const layout = serpentine(model.stops.length, { width, cellW: 200, cellH: 262, padX: 28, padY: 40, maxCols: 5, wobble: 14 });
  const travelled = model.stops.findIndex((s) => !s.summary.complete);
  const content = [createBackdrop({ width: layout.width, height: layout.height, points: layout.points, motif: 'dots', travelled: travelled < 0 ? model.stops.length : travelled, bulge: 150 })];
  model.stops.forEach((stop, i) => {
    const { x, y } = layout.points[i];
    const isNext = model.suggestedNext?.stopId === stop.id, isCurrent = model.pacing.currentStopId === stop.id;
    const button = el('button', { type: 'button', class: 'stop-open', 'data-map-item': 'stop', 'data-stop-id': stop.id, 'data-x': x, 'data-y': y, onclick: () => onOpenStop(stop) },
      stopArt(stop),
      el('span', { class: 'stop-num', 'aria-hidden': 'true', text: String(i + 1) }),
      el('span', { class: 'sr-only', text: `Stop ${i + 1} of ${model.stops.length}: ` }),
      el('span', { class: 'stop-title', text: stop.title }),
      el('span', { class: 'stop-sub', text: stopSummaryLine(stop) }));
    const flags = [stop.summary.complete ? el('span', { class: 'flag flag-done' }, icon('check', { size: 14 }), el('span', { text: 'Complete' })) : null,
      stop.delta > 0 ? el('span', { class: 'flag flag-delta', text: `+${stop.delta} questions` }) : null,
      isNext ? el('span', { class: 'flag flag-next', text: 'Suggested next' }) : null, isCurrent ? el('span', { class: 'flag flag-current', text: 'Current area' }) : null].filter(Boolean);
    const mixed = stop.mixed ? el('a', { class: 'stop-mixed', href: stop.mixed.url, 'aria-label': stop.mixed.label, 'data-action': 'mixed', text: 'Mixed Practice',
      onclick: (e) => { if (onPractice({ stop, url: stop.mixed.url, kind: 'mixed' }) === true) e.preventDefault(); } }) : null;
    content.push(el('div', { class: 'stop', 'data-stop-id': stop.id, 'data-status': stop.summary.status, 'data-suggested': isNext ? 'true' : 'false', style: `left:${x}px;top:${y}px;--h:${stop.identity.hue}` }, button, flags.length ? el('span', { class: 'stop-flags' }, flags) : null, mixed));
  });
  return { content, width: layout.width, height: layout.height, cols: layout.cols };
}
