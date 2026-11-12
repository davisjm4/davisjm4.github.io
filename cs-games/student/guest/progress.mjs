/* Practice progress for an independent learner.
 *
 * Derived from stored first-attempt events plus per-skill archives. There is no teacher policy, so nothing here is a
 * requirement, a mastery level or a score. Self-reported marks are carried separately and never change the practice numbers.
 * The thresholds below are GUIDANCE for suggestions only. They are not calibrated against student data.
 */
export const GUIDANCE = Object.freeze({ lowMinAnswered: 5, lowAccuracy: 0.7, steadyAnswered: 10, steadyAccuracy: 0.8, staleDays: 14 });
export const STATUS = Object.freeze({
  'not-started': 'Not started',
  practiced: 'Practiced',
  'needs-review': 'Needs review',
  familiar: 'Familiar (self-reported)',
});

const dayNumber = d => Math.floor(Date.parse(d + 'T00:00:00Z') / 86400000);
export const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);

// A node mark wins over its area's mark. Returns 'familiar' | 'needs-practice' | 'start-here' | null.
export function effectiveMark(state, node) {
  return state.marks[node.id]?.state ?? state.marks[node.areaId]?.state ?? null;
}

export function summarizeProgress(state, graph, courseId, today) {
  const nodes = graph.nodes.filter(n => n.courseId === courseId);
  const known = new Set(nodes.map(n => n.id));
  const per = new Map(nodes.map(n => [n.id, { nodeId: n.id, answered: 0, correct: 0, lastDate: null, firstDate: null }]));
  const bump = (id, answered, correct, first, last) => {
    const p = per.get(id); if (!p) return;
    p.answered += answered; p.correct += correct;
    if (!p.firstDate || first < p.firstDate) p.firstDate = first;
    if (!p.lastDate || last > p.lastDate) p.lastDate = last;
  };
  for (const [id, a] of Object.entries(state.archive)) if (known.has(id)) bump(id, a.answered, a.correct, a.first, a.last);
  const mine = state.events.filter(e => e.courseId === courseId);
  let unmapped = 0;
  for (const e of mine) {
    const ids = (e.nodeIds || []).filter(id => known.has(id));
    if (!ids.length) { unmapped++; continue; }
    for (const id of ids) bump(id, 1, e.correct ? 1 : 0, e.date, e.date);
  }
  const archived = state.archiveTotals.byCourse[courseId] || { answered: 0, correct: 0 };
  const totals = { answered: mine.length + archived.answered, correct: mine.filter(e => e.correct).length + archived.correct, unmapped };
  totals.accuracy = totals.answered ? totals.correct / totals.answered : null;
  const flagged = new Set();
  const skills = new Map();
  for (const n of nodes) {
    const p = per.get(n.id);
    p.accuracy = p.answered ? p.correct / p.answered : null;
    p.mark = effectiveMark(state, n);
    p.markSource = state.marks[n.id] ? 'skill' : state.marks[n.areaId] ? 'area' : null;
    const lowAccuracy = p.answered >= GUIDANCE.lowMinAnswered && p.accuracy < GUIDANCE.lowAccuracy;
    const steady = p.answered >= GUIDANCE.steadyAnswered && p.accuracy >= GUIDANCE.steadyAccuracy;
    const staleDays = p.lastDate && today ? daysBetween(p.lastDate, today) : null;
    p.lowAccuracy = lowAccuracy; p.steady = steady; p.staleDays = staleDays;
    // Practice-based status. A self-report never produces "Practiced" and practice never produces "Familiar".
    p.practiceStatus = !p.answered ? 'not-started' : lowAccuracy || (p.mark === 'needs-practice' && !steady) ? 'needs-review' : 'practiced';
    p.status = p.practiceStatus === 'not-started' && p.mark === 'familiar' ? 'familiar' : p.practiceStatus;
    p.statusLabel = STATUS[p.status];
    p.selfReported = p.mark === 'familiar' ? 'Familiar (self-reported)' : p.mark === 'needs-practice' ? 'You marked: needs practice' : p.mark === 'start-here' ? 'You marked: start here' : null;
    if (p.practiceStatus === 'needs-review') flagged.add(n.areaId);
    skills.set(n.id, p);
  }
  const list = [...skills.values()];
  return {
    courseId, today, skills, totals,
    practicedSkills: list.filter(p => p.answered > 0).length,
    notPracticedSkills: list.filter(p => p.answered === 0).length,
    skillCount: list.length,
    reviewAreas: [...flagged],
    byArea: nodes.reduce((m, n) => { const a = m.get(n.areaId) || { areaId: n.areaId, answered: 0, correct: 0, practiced: 0, skills: 0, review: false }; const p = skills.get(n.id);
      a.answered += p.answered; a.correct += p.correct; a.practiced += p.answered ? 1 : 0; a.skills++; a.review ||= p.practiceStatus === 'needs-review'; return m.set(n.areaId, a); }, new Map()),
  };
}

// Recent activity, grouped by day and game. Reads only what is stored; archived history is intentionally not itemized.
export function recentActivity(state, graph, courseId, limit = 6) {
  const titles = new Map(graph.nodes.map(n => [n.id, n.title]));
  const groups = new Map();
  for (const e of [...state.events].reverse()) {
    if (e.courseId !== courseId) continue;
    const key = e.date + '|' + e.activityId;
    const g = groups.get(key) || { date: e.date, activityId: e.activityId, answered: 0, correct: 0, skills: new Set() };
    g.answered++; g.correct += e.correct ? 1 : 0;
    for (const id of e.nodeIds || []) if (titles.has(id)) g.skills.add(titles.get(id));
    groups.set(key, g);
    if (groups.size > limit * 4) break;
  }
  return [...groups.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, limit).map(g => ({ ...g, skills: [...g.skills] }));
}

export const activityName = id => id.split('-').map(w => (w[0] ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
