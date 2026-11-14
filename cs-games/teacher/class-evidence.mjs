import { csv } from '../../wpr-games/workplace-readiness/online/model.mjs';
import { button, download, el, options, table } from '../../wpr-games/workplace-readiness/online/dom.mjs';

const minimumAttempts = 10;
const reviewThreshold = 0.7;
const strongThreshold = 0.9;
const filters = [
  ['all', 'All active profiles'],
  ['review', 'Review for support'],
  ['sparse', 'Limited evidence'],
  ['no-evidence', 'No evidence'],
  ['strong', 'High first-try accuracy'],
];

export function classifyPractice(attempted, correct) {
  if (attempted === 0) return ['no-evidence', 'No evidence'];
  if (attempted < minimumAttempts) return ['sparse', 'Limited evidence'];
  const accuracy = correct / attempted;
  if (accuracy < reviewThreshold) return ['review', 'Review for support'];
  if (accuracy >= strongThreshold) return ['strong', 'High first-try accuracy'];
  return ['recorded', 'Practice recorded'];
}

export function nodePractice(reports, roster) {
  const measures = new Map(roster.filter(profile => profile.active === 1).map(profile => [profile.id, new Map()]));
  for (const report of reports) {
    const nodes = measures.get(report.id);
    if (!nodes) continue;
    for (const row of report.measures) {
      if (row.scope !== 'node' || row.kind !== 'practice') continue;
      const total = nodes.get(row.id) ?? { attempted: 0, correct: 0 };
      total.attempted += row.n;
      total.correct += row.c;
      nodes.set(row.id, total);
    }
  }
  return measures;
}

export function renderClassEvidence({ classroom, roster, pathway, reports, openProfile, asOf = new Date() }) {
  const measures = nodePractice(reports, roster);
  if (!measures.size) return el('p', { text: 'Practice comparison is available when the class has active student profiles.' });
  if (!pathway?.nodes.length) return el('p', { text: 'Publish a pathway with skills to compare practice.' });

  const area = el('select', {}, options(pathway.areas.map(item => [item.id, item.title])));
  const skill = el('select');
  const filter = el('select', {}, options(filters));
  const results = el('div');
  const status = el('p', { role: 'status', class: 'muted' });
  const refresh = () => {
    const nodes = pathway.nodes.filter(node => node.areaId === area.value);
    const selected = nodes.find(node => node.id === skill.value) ?? nodes[0];
    skill.replaceChildren(...options(nodes.map(node => [node.id, node.title])));
    skill.value = selected.id;

    function read(profileId, nodeId) {
      const { attempted, correct } = measures.get(profileId).get(nodeId) ?? { attempted: 0, correct: 0 };
      const [key, label] = classifyPractice(attempted, correct);
      return { attempted, correct, key, label };
    }
    const ids = [...measures.keys()].filter(id => filter.value === 'all' || read(id, selected.id).key === filter.value);
    status.textContent = ids.length + ' of ' + measures.size + ' profiles shown for ' + selected.title + '.';
    if (!ids.length) {
      results.replaceChildren(el('p', { text: 'No profiles match this filter.' }));
      return;
    }
    function cell(id, node) {
      const { attempted, correct, label } = read(id, node.id);
      const counts = attempted ? correct + '/' + attempted + ' first try · ' + Math.round(100 * correct / attempted) + '%' : 'No attempts';
      const open = button(counts, event => openProfile(id, node, event.currentTarget), 'btn small');
      open.setAttribute('aria-label', counts + ' for ' + node.title + ' · Profile ' + id);
      return el('div', { class: 'evidence-cell' }, open, el('small', { text: label }));
    }
    function comparison(columns, layout, caption) {
      const matrix = table(['Profile ID', ...columns.map(node => node.title)], ids.map(id => [id, ...columns.map(node => cell(id, node))]), caption);
      matrix.classList.add(layout);
      if (layout === 'evidence-matrix') {
        matrix.setAttribute('tabindex', '0');
        matrix.setAttribute('role', 'region');
        matrix.setAttribute('aria-label', 'Scrollable comparison by area');
      }
      return matrix;
    }
    const exportSkill = button('Export selected skill CSV', () => download('cs-games-skill-practice.csv', csv([
      ['class_id', 'pathway_revision', 'as_of_utc', 'evidence_scope', 'profile_id', 'skill_id', 'attempted', 'first_try_correct', 'accuracy', 'practice_signal'],
      ...ids.map(id => {
        const { attempted, correct, label } = read(id, selected.id);
        return [classroom.id, pathway.revision, asOf.toISOString(), 'all-recorded-mapped-first-attempt-practice', id, selected.id, attempted, correct, attempted ? correct / attempted : '', label];
      }),
    ])));
    results.replaceChildren(
      comparison(nodes, 'evidence-matrix', 'Recorded first-attempt practice by skill'),
      comparison([selected], 'evidence-list', 'Recorded first-attempt practice for ' + selected.title),
      el('div', { class: 'actions' }, exportSkill));
  };

  for (const select of [area, skill, filter]) select.addEventListener('change', refresh);
  refresh();
  return el('div', {},
    el('p', { text: 'All available first attempts matched to published skills as of ' + asOf.toLocaleDateString() + ' · Pathway revision ' + pathway.revision + '.' }),
    el('p', { class: 'muted', text: 'Practice signals guide review. Review for support marks below 70%, and high accuracy marks 90% or higher, after at least 10 attempts. Open a student’s record for teacher-reviewed scores.' }),
    el('div', { class: 'field-grid' },
      el('label', {}, 'Area', area),
      el('label', {}, 'Skill to filter and export', skill),
      el('label', {}, 'Practice signal', filter)),
    status, results);
}
