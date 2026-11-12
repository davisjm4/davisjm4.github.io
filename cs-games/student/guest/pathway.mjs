/* Guest adapter for the shared student pathway map.
 *
 * buildGuestView() returns the SAME contract an enrolled student's map receives (studentContract in cs-games/pathway/model.mjs):
 * { areas, nodes, edges, courseId, status:'Self-paced', ... }. It is built from the one canonical curriculum graph with the existing
 * createPathway() prerequisite ordering and no calendar, so there are no due dates, pacing or schedule. No curriculum is copied.
 *
 * Each node gains a `guest` object and the view gains `view.guest`. A map that ignores them still renders a complete pathway.
 */
import { createPathway, studentContract } from '../../pathway/model.mjs';
import { evaluateProficiency } from '../../pathway/proficiency/index.mjs';
import { guestEvidenceByNode } from './evidence.mjs';
import { summarizeProgress, recentActivity } from './progress.mjs';
import { suggestNext, resumeTarget } from './suggest.mjs';

export const guestCourses = graph => graph.courses.map(c => ({ id: c.id, title: c.title, skills: graph.nodes.filter(n => n.courseId === c.id).length }));

export function guestPathway(graph, courseId) {
  const course = graph.courses.find(c => c.id === courseId);
  if (!course) throw new Error('Unknown course.');
  return createPathway(graph, { id: 'guest:' + courseId, classId: 'guest', title: course.title + ' pathway', courseId, calendar: null });
}

export function buildGuestView(graph, courseId, state, { today } = {}) {
  const pathway = guestPathway(graph, courseId);
  const summary = summarizeProgress(state, graph, courseId, today);
  const practice = new Map([...summary.skills].filter(([, p]) => p.answered).map(([id, p]) => [id, { attempted: p.answered, correct: p.correct }]));
  const view = studentContract(pathway, graph, [], { practice });
  const suggestion = suggestNext({ nodes: view.nodes, areas: view.areas, summary, state, courseId });
  const resume = resumeTarget({ nodes: view.nodes, state, courseId, suggestion });
  view.nodes = view.nodes.map(node => {
    const p = summary.skills.get(node.id);
    return { ...node, guest: { mark: p.mark, markSource: p.markSource, status: p.status, statusLabel: p.statusLabel, selfReported: p.selfReported,
      answered: p.answered, correct: p.correct, accuracy: p.accuracy, lastDate: p.lastDate, lowAccuracy: p.lowAccuracy,
      suggested: suggestion.primary?.nodeId === node.id, reason: suggestion.all.find(s => s.nodeId === node.id)?.reason ?? null } };
  });
  const familiarity = Object.fromEntries(view.nodes.filter(n => n.guest.mark === 'familiar').map(n => [n.id, true]));
  const proficiency = evaluateProficiency({courseId, nodes:view.nodes, familiarity, skipFamiliar:true, eventsByNode:guestEvidenceByNode(graph,state.events,courseId)});
  const applySuggestion = (guidance, pick) => {
    if (!pick || guidance.primary?.kind === 'continue-learning' ||
        !['marked','start','low','review'].includes(pick.code) && guidance.primary?.tier) return;
    const skill=proficiency.skills[pick.nodeId];
    const tier=skill.goalMet?null:skill.goal;
    guidance.primary={kind:'guest-practice',nodeId:pick.nodeId,areaId:pick.areaId,tier,practice:skill.tiers[tier]?.practice??null,reason:pick.reason};
  };
  applySuggestion(proficiency.recommendation,suggestion.primary);
  for(const [areaId,guidance] of Object.entries(proficiency.byArea)){
    applySuggestion(guidance,suggestion.all.find(pick=>pick.areaId===areaId));
  }
  view.proficiency=proficiency;
  view.areas = view.areas.map(area => ({ ...area, guest: { mark: state.marks[area.id]?.state ?? null, ...summary.byArea.get(area.id) } }));
  view.guest = { source: 'independent', courseId, totals: summary.totals, practicedSkills: summary.practicedSkills, notPracticedSkills: summary.notPracticedSkills,
    skillCount: summary.skillCount, reviewAreas: summary.reviewAreas, suggestion, resume, recent: recentActivity(state, graph, courseId),
    areaOrder: view.areas.map(a => a.id), summary };
  return view;
}
