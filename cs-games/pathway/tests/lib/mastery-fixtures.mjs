// Shared helpers for the mastery engine tests. Synthetic data only.
import fs from 'node:fs';
import { createPathway } from '../../model.mjs';
import { emptyHistory, normalizeEvents, nodeProgress, validateMasteryPolicy, contentProfileFromGraph } from '../../mastery/index.mjs';
import { answer, focused, mixed, minutesAfterStart } from '../../mastery/synthetic.mjs';

export const graph = JSON.parse(fs.readFileSync(new URL('../../curriculum-graph.json', import.meta.url), 'utf8'));
export const NODE = { division: 'node:advanced:math-lab:division', modulus: 'node:advanced:math-lab:modulus', array: 'node:advanced:array-lab:trace-2d', element: 'node:advanced:array-lab:element', varType: 'node:advanced:variable-lab:identify/type' };
export const SCOPE = { profileId: 'synthetic-student-1', classId: 'synthetic-class-1' };
export const NOW = '2026-12-01T12:00:00.000Z';
export const calendar = { start: '2026-11-02', end: '2027-01-15', weekdays: [1, 2, 3, 4, 5], minutes: 80, rotation: ['A', 'B'], classRotations: ['A'], rotationOffset: 0, overrides: [] };
export const families = (nodeId) => graph.questionFamilies.filter((f) => f.nodeIds[0] === nodeId).map((f) => f.sourceFamilyId);
export const pol = (raw) => { const r = validateMasteryPolicy(raw); if (!r.ok) throw new Error(JSON.stringify(r.errors)); return r.policy; };
export const basePolicy = (over = {}) => ({ id: 'test:policy', version: 1, provisional: false, label: 'test', minimumQuestions: 30, accuracy: 0.9, coverage: {}, scoreTarget: null, ...over });
export const norm = (raw, { scope = SCOPE, now = NOW, trustResolver = null } = {}) => normalizeEvents(raw, { graph, scope, now, trustResolver });
export const node = (id) => graph.nodes.find((n) => n.id === id);

/** `count` focused Math Lab answers on a mode with the given result pattern; families cycle through the node's own families. */
export const run = ({ mode = 'division', count, results, student = 's1', session = 'x1', start, activity = 'math-lab', famList, difficulty = null }) =>
  focused({ student, session, start, activity, assessedMode: mode, families: famList ?? families(`node:advanced:${activity}:${mode}`), count, results, difficulty }).events;

export function progress({ policy, raw, nodeId = NODE.division, history, now = NOW, policies, contentProfile, scope = SCOPE, assessmentEvidence = [], carryOver = false }) {
  const p = pol(policy), n = norm(raw, { scope, now });
  return nodeProgress({ node: node(nodeId), policy: p, history: history ?? emptyHistory(scope, nodeId), events: n.events, now, policies: (policies ?? [policy]).map(pol),
    contentProfile: contentProfile === undefined ? contentProfileFromGraph(graph, nodeId) : contentProfile, assessmentEvidence, carryOver });
}
export function newPathway(over = {}) { return createPathway(graph, { id: 'test-pathway', classId: SCOPE.classId, courseId: 'advanced', calendar, ...over }); }
export { answer, focused, mixed, minutesAfterStart };
