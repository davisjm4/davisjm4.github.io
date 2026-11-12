/* Adds independent-learner controls to the output of the EXISTING renderPathway() (cs-games/student/pathway-view.mjs).
 *
 * renderPathway is not modified or forked. It renders one <details> per consecutive run of skills in an area and one <li> per
 * skill, in view.nodes order. This decorator relies on exactly that documented order, tags each element with its ids, corrects the
 * two phrases that only make sense for a class ("synced"), and inserts self-assessment controls and chips.
 * When the shared interactive map replaces this list, it should read the same `node.guest` / `area.guest` / `view.guest` data instead.
 */
import { el } from '../../../wpr-games/workplace-readiness/online/dom.mjs';

const CHOICES = [['familiar', 'Already familiar'], ['needs-practice', 'Needs practice'], ['start-here', 'Start here']];

export function markButtons({ id, label, current, inherited, onMark, scope }) {
  const group = el('div', { class: 'guest-marks', role: 'group', 'aria-label': 'Your notes on ' + label });
  for (const [state, text] of CHOICES) {
    const pressed = current === state;
    group.append(el('button', { type: 'button', class: 'guest-mark', 'aria-pressed': String(pressed), 'data-mark': state, 'data-control': `${scope}:${id}:${state}`,
      text, 'aria-label': `${text}: ${label}`, onclick: () => onMark(id, pressed ? null : state) }));
  }
  if (current) group.append(el('button', { type: 'button', class: 'guest-mark guest-clear', 'data-control': `${scope}:${id}:clear`, text: 'Clear', 'aria-label': 'Clear my selection for ' + label, onclick: () => onMark(id, null) }));
  if (!current && inherited) group.append(el('small', { class: 'guest-inherit', text: `Set for the whole area: ${inherited === 'familiar' ? 'already familiar' : inherited === 'needs-practice' ? 'needs practice' : 'start here'}.` }));
  return group;
}

export function decoratePathway(root, view, { onMark, onLaunch, trackedIds = null }) {
  const intro = root.querySelector(':scope > p:nth-of-type(2)');
  if (intro) intro.textContent = 'Every skill is open. Follow the suggestion or jump to any area. Your answers save in this browser, and your own notes below are never counted as practice.';
  const groups = [];
  for (const node of view.nodes) { const last = groups.at(-1); if (last?.areaId === node.areaId) last.skills.push(node); else groups.push({ areaId: node.areaId, skills: [node] }); }
  const areas = new Map(view.areas.map(a => [a.id, a]));
  const sections = [...root.querySelectorAll(':scope > details.pathway-area')];
  groups.forEach(({ areaId, skills }, gi) => {
    const details = sections[gi]; if (!details) return;
    const area = areas.get(areaId);
    details.id = 'area-' + gi; details.dataset.areaId = areaId;
    const g = area?.guest;
    const summary = details.querySelector('summary');
    if (summary && g?.answered) summary.append(' · ' + g.correct + ' of ' + g.answered + ' first-try correct');
    if (summary && g?.review) summary.append(el('span', { class: 'chip chip-review', text: 'Needs review' }));
    if (summary && g?.mark) summary.append(el('span', { class: 'chip chip-self', text: g.mark === 'familiar' ? 'Familiar (self-reported)' : g.mark === 'needs-practice' ? 'You marked: needs practice' : 'You marked: start here' }));
    const list = details.querySelector('ol.pathway-checkpoints');
    list?.before(el('div', { class: 'guest-area-tools' }, el('strong', { text: 'Whole area' }),
      markButtons({ id: areaId, label: (area?.title || 'this area'), current: g?.mark, onMark: (id, s) => onMark(id, s, 'area', { areaId }), scope: 'area' })));
    [...(list?.children || [])].forEach((li, si) => {
      const node = skills[si]; if (!node) return;
      const guest = node.guest;
      li.dataset.nodeId = node.id;
      li.classList.toggle('guest-suggested', !!guest.suggested);
      for (const small of li.querySelectorAll(':scope > small')) if (small.textContent === 'No synced practice for this skill yet') small.textContent = 'No practice recorded yet';
      const chips = el('div', { class: 'guest-chips' },
        el('span', { class: 'chip chip-practice chip-' + guest.status.replace(/[^a-z-]/g, ''), text: guest.status === 'familiar' ? 'Not practiced yet' : guest.statusLabel }),
        guest.selfReported && el('span', { class: 'chip chip-self', text: guest.selfReported + (guest.markSource === 'area' ? ' (whole area)' : '') }),
        guest.suggested && el('span', { class: 'chip chip-suggested', text: 'Suggested next' }));
      li.querySelector('strong')?.after(chips);
      if (guest.reason && guest.suggested) chips.after(el('small', { class: 'guest-reason', text: guest.reason }));
      const actions = li.querySelector('.pathway-actions');
      if (trackedIds && !trackedIds.has(node.id)) actions?.before(el('small', { class: 'guest-untracked', text: 'Practice on this skill is open, but it does not update this page automatically yet.' }));
      actions?.before(markButtons({ id: node.id, label: node.title, current: guest.markSource === 'skill' ? guest.mark : null, inherited: guest.markSource === 'area' ? guest.mark : null,
        onMark: (id, s) => onMark(id, s, 'node', { nodeId: node.id, areaId }), scope: 'node' }));
      actions?.querySelectorAll('a').forEach(a => {
        const url = new URL(a.href);
        if(url.origin===location.origin){url.searchParams.set('learner','guest');a.href=url.href;}
        a.addEventListener('click', () => onLaunch(node));
      });
    });
  });
  return root;
}

// The practice URL the shared renderer already built (focused mode, Mixed link, Workplace skill) for a skill.
export const practiceHref = (root, nodeId) => root.querySelector(`li[data-node-id="${CSS.escape(nodeId)}"] .pathway-actions a`)?.href ?? null;
