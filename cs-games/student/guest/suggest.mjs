/* Suggested next skill: guidance, never a lock. Every skill stays open.
 * Priority (from the brief):
 *   1 a skill the learner marked as needing practice
 *   2 the learner's current area (Start here, or where they left off)
 *   3 skills with low first-attempt accuracy
 *   4 the next unvisited skill in the established course order
 *   5 previously practiced skills that are due for a look
 * "Already familiar" skills are skipped by 2 and 4 so a learner who knows Variables is sent on to Math or Boolean Logic.
 */
import { GUIDANCE } from './progress.mjs';

const REASON = {
  marked: () => 'You marked this as needing practice.',
  start: () => 'You chose to start here.',
  area: () => 'You are working in this area.',
  low: p => `First-try accuracy is ${Math.round(p.accuracy * 100)}% over ${p.answered} questions.`,
  next: () => 'The next skill in the course order that you have not tried.',
  review: p => `You last practiced this ${p.staleDays} days ago. A quick review can help it stick.`,
};

export function suggestNext({ nodes, areas, summary, state, courseId, limit = 4 }) {
  const open = nodes.filter(n => n.practice?.length);
  const indexOf = new Map(nodes.map((n, i) => [n.id, i]));
  const position = state.position?.[courseId] || null;
  const areaOf = new Map(nodes.map(n => [n.id, n.areaId]));
  const currentArea = (position?.nodeId && areaOf.get(position.nodeId)) || position?.areaId || [...Object.entries(state.marks)].find(([id, m]) => m.courseId === courseId && m.state === 'start-here' && id.startsWith('area:'))?.[0] || null;
  const picks = [], seen = new Set();
  const add = (node, code, p) => { if (!node || seen.has(node.id)) return; seen.add(node.id); picks.push({ nodeId: node.id, areaId: node.areaId, title: node.title, code, reason: REASON[code](p), priority: { marked: 1, start: 2, area: 2, low: 3, next: 4, review: 5 }[code] }); };
  const stat = n => summary.skills.get(n.id);

  // 1. explicitly marked, steady skills drop out (the learner can clear the mark whenever they like)
  const marked = open.filter(n => stat(n).mark === 'needs-practice' && !stat(n).steady);
  marked.sort((a, b) => (areaOf.get(a.id) === currentArea ? 0 : 1) - (areaOf.get(b.id) === currentArea ? 0 : 1) || indexOf.get(a.id) - indexOf.get(b.id));
  marked.forEach(n => add(n, 'marked', stat(n)));
  // 2. current area
  if (currentArea) {
    const inArea = open.filter(n => n.areaId === currentArea);
    const startHere = inArea.find(n => state.marks[n.id]?.state === 'start-here');
    if (startHere) add(startHere, 'start', stat(startHere));
    const resume = position?.nodeId && inArea.find(n => n.id === position.nodeId && !stat(n).steady && stat(n).mark !== 'familiar');
    if (resume) add(resume, 'area', stat(resume));
    add(inArea.find(n => stat(n).mark !== 'familiar' && !stat(n).steady && stat(n).answered === 0) || inArea.find(n => stat(n).mark !== 'familiar' && !stat(n).steady), 'area', null);
  }
  // 3. low observed accuracy, lowest first
  open.filter(n => stat(n).lowAccuracy).sort((a, b) => stat(a).accuracy - stat(b).accuracy || indexOf.get(a.id) - indexOf.get(b.id)).forEach(n => add(n, 'low', stat(n)));
  // 4. next unvisited in course order, preferring skills after the learner's last position
  const unvisited = open.filter(n => stat(n).answered === 0 && stat(n).mark !== 'familiar');
  const after = position?.nodeId ? indexOf.get(position.nodeId) ?? -1 : -1;
  const nextUnvisited = unvisited.find(n => indexOf.get(n.id) > after) || unvisited[0];
  add(nextUnvisited, 'next', null);
  unvisited.filter(n => n !== nextUnvisited).slice(0, 2).forEach(n => add(n, 'next', null));
  // 5. due for a look (oldest first)
  open.filter(n => stat(n).answered > 0 && stat(n).staleDays !== null && stat(n).staleDays >= GUIDANCE.staleDays && stat(n).mark !== 'familiar')
    .sort((a, b) => stat(b).staleDays - stat(a).staleDays).forEach(n => add(n, 'review', stat(n)));
  return { primary: picks[0] || null, alternatives: picks.slice(1, limit), all: picks };
}

// Where "Resume learning" goes: the last place the learner worked, else the top suggestion.
export function resumeTarget({ nodes, state, courseId, suggestion }) {
  const p = state.position?.[courseId];
  const node = p?.nodeId && nodes.find(n => n.id === p.nodeId);
  if (node) return { nodeId: node.id, areaId: node.areaId, title: node.title, reason: 'Where you left off.', fromPosition: true };
  return suggestion?.primary ? { ...suggestion.primary, fromPosition: false } : null;
}

// After a practice session: continue in this area, move to the next area, or try something different.
export function afterPractice({ nodes, areaOrder, summary, suggestion, nodeId }) {
  const here = nodes.find(n => n.id === nodeId);
  if (!here) return { continueInArea: null, nextArea: null, different: suggestion?.primary || null };
  const stat = n => summary.skills.get(n.id);
  const usable = n => n.practice?.length && stat(n).mark !== 'familiar';
  const sameArea = nodes.filter(n => n.areaId === here.areaId && usable(n));
  const after = sameArea.slice(sameArea.findIndex(n => n.id === here.id) + 1);
  const continueInArea = after.find(n => stat(n).answered === 0 && !stat(n).steady) || after.find(n => !stat(n).steady) || null;
  const later = areaOrder.slice(areaOrder.indexOf(here.areaId) + 1);
  let nextArea = null;
  for (const areaId of later) { nextArea = nodes.find(n => n.areaId === areaId && usable(n) && stat(n).answered === 0) || nodes.find(n => n.areaId === areaId && usable(n)); if (nextArea) break; }
  const different = suggestion?.all.find(s => s.areaId !== here.areaId && s.nodeId !== nextArea?.id) || suggestion?.all.find(s => s.nodeId !== here.id && s.nodeId !== nextArea?.id && s.nodeId !== continueInArea?.id) || null;
  const pack = n => n && { nodeId: n.id, areaId: n.areaId, title: n.title };
  return { continueInArea: pack(continueInArea), nextArea: pack(nextArea), different: different && { nodeId: different.nodeId, areaId: different.areaId, title: different.title, reason: different.reason } };
}
