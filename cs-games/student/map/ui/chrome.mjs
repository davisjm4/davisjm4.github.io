import {proficiencySuggestion} from './proficiency.mjs?v=proficiency-v2';
// The frame around the maps: header, view and zoom controls, legend, suggested next, and the optional pacing card.
import { courseSummaryLine, pacingNote, stopSummaryLine } from '../copy.mjs';
import { formatDay } from '../format.mjs';
import { icon } from '../icons.mjs';
import { STATES, STATE_KEYS } from '../states.mjs';
import { el } from './dom.mjs';
import { nodeArt } from './skill-node.mjs';

const iconButton = (name, label, onclick, extra = {}) => el('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onclick, ...extra }, icon(name, { size: 20 }));

export function createToolbar({ layout, onLayout, zoom, showZoom }) {
  const seg = (key, label, ic) => el('button', { type: 'button', class: 'seg-btn', 'data-layout': key, 'aria-pressed': layout === key ? 'true' : 'false', onclick: () => onLayout(key) }, icon(ic, { size: 18 }), el('span', { text: label }));
  return el('div', { class: 'toolbar' },
    el('div', { class: 'seg', role: 'group', 'aria-label': 'How to show the skills' }, seg('map', 'Map', 'map'), seg('list', 'List', 'list')),
    showZoom ? el('div', { class: 'zoom', role: 'group', 'aria-label': 'Zoom the map' },
      iconButton('zoomOut', 'Zoom out', zoom.out, { 'data-action': 'zoom-out' }), iconButton('zoomIn', 'Zoom in', zoom.in, { 'data-action': 'zoom-in' }),
      el('button', { type: 'button', class: 'btn btn-quiet', 'data-action': 'reset-view', 'aria-label': 'Reset view', onclick: zoom.reset }, icon('reset', { size: 18 }), el('span', { text: 'Reset view' }))) : null);
}

/** "What the symbols mean", drawn with the real node art so it can never drift from the map. */
export function createLegend({ dated }) {
  const row = (art, title, text) => el('li', {}, art, el('div', {}, el('strong', { text: title }), el('span', { text })));
  const items = STATE_KEYS.map((k) => row(nodeArt({ state: k, order: 1, size: 40 }), STATES[k].label, STATES[k].blurb));
  items.push(row(nodeArt({ state: 'not-started', optional: true, order: 2, size: 40 }), 'Optional', 'A diamond shape. Enrichment that never holds back finishing the area.'));
  items.push(row(el('span', { class: 'legend-chip' }, 'Next'), 'Suggested next', 'The next skill in the suggested order. Every skill is still open to you.'));
  if (dated) items.push(row(el('span', { class: 'legend-chip', 'data-tone': 'upcoming' }, icon('calendar', { size: 16 })), 'Target date', 'A goal from your teacher. It is not a due date.'));
  return el('details', { class: 'legend' }, el('summary', { text: 'What the symbols mean' }),
    el('ul', {}, items), el('p', { class: 'muted small', text: 'Numbers show the suggested learning order. A ring shows questions answered toward a requirement; where there is no requirement, there is no ring.' }));
}

export function createSuggested(model, { onShow, onPractice, stop: currentStop }) {
  if(model.proficiency)return proficiencySuggestion(model,{onShow,onPractice,stop:currentStop});
  const s = model.suggestedNext;
  if (!s) return model.totals.required > 0 && model.totals.complete === model.totals.required && model.totals.withRequirements > 0
    ? el('p', { class: 'suggested done', text: 'Every required skill with a requirement is complete. Optional skills and review are still open.' }) : null;
  const node = model.nodeIndex[s.nodeId], stop = model.stops.find((x) => x.id === s.stopId);
  const link = node.practice[0];
  return el('div', { class: 'suggested', 'data-node-id': node.id },
    el('p', { class: 'suggested-label', text: 'Suggested next' }),
    el('p', { class: 'suggested-title' }, el('strong', { text: node.title }), el('span', { text: ` in ${stop.title}` })),
    el('div', { class: 'suggested-actions' },
      el('button', { type: 'button', class: 'btn', 'data-action': 'show-suggested', text: 'Show on map', onclick: () => onShow(node) }),
      link ? el('a', { class: 'btn btn-primary', href: link.url, 'data-action': 'practice-suggested', text: 'Practice', 'aria-label': `Practice ${node.title}`, onclick: (e) => { if (onPractice({ node, url: link.url, kind: link.kind }) === true) e.preventDefault(); } }) : null));
}

/** Only drawn when a teacher has applied dates. The undated default shows nothing about dates, so there is nothing to be late for. */
export function createPacingCard(model, { onShow }) {
  if (!model.pacing.showDates) return null;
  const list = model.pacing.upcoming.map((id) => model.nodeIndex[id]).slice(0, 3);
  const review = model.pacing.reviewIds.map((id) => model.nodeIndex[id]);
  const cur = model.stops.find((s) => s.id === model.pacing.currentStopId);
  return el('section', { class: 'pacing', 'aria-label': 'Teacher pacing' },
    el('h3', {}, icon('calendar', { size: 18 }), el('span', { text: 'Your teacher’s pacing' })),
    el('p', { class: 'muted small', text: model.pacing.note ?? pacingNote }),
    cur ? el('p', {}, el('strong', { text: 'Current area: ' }), cur.title) : null,
    list.length ? el('div', {}, el('p', { class: 'pacing-h', text: 'Coming up' }), el('ul', {}, list.map((n) => el('li', { 'data-tone': n.target.tone }, el('button', { type: 'button', class: 'link-btn', text: n.title, onclick: () => onShow(n) }), el('span', { text: ` · ${n.target.text}` }))))) : null,
    review.length ? el('div', {}, el('p', { class: 'pacing-h', text: 'Review recommended' }), el('ul', {}, review.map((n) => el('li', {}, el('button', { type: 'button', class: 'link-btn', text: n.title, onclick: () => onShow(n) }))))) : null);
}

export function createHeader(model, { route, stop, onBack }) {
  const inArea = route.view === 'area' && stop;
  return el('div', { class: 'map-head' },
    el('nav', { class: 'crumbs', 'aria-label': 'Where you are' },
      inArea ? el('button', { type: 'button', class: 'btn btn-quiet', 'data-action': 'back', onclick: onBack }, icon('back', { size: 18 }), el('span', { text: `${model.courseTitle} map` })) : el('span', { class: 'crumb-course', text: model.classTitle??model.courseTitle }),
      inArea ? el('span', { class: 'crumb-sep', 'aria-hidden': 'true', text: '/' }) : null,
      inArea ? el('span', { class: 'crumb-here', 'aria-current': 'page', text: stop.title }) : null),
    el('h2', { id: 'map-heading', class: 'map-title', tabindex: '-1', text: inArea ? stop.title : `${model.courseTitle} journey` }),
    el('p', { class: 'map-summary', text: inArea ? stopSummaryLine(stop) : courseSummaryLine(model) }),
    !inArea&&!model.pacing.showDates?el('span',{class:'tag',text:'Self-paced'}):null);
}
export { formatDay };
