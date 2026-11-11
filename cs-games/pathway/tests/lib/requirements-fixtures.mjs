// Shared helpers for the teacher-controlled mastery requirement tests. Synthetic data only: no network, no secrets, no student records.
import fs from 'node:fs';
import { createPathway, clone } from '../../model.mjs';
import * as R from '../../requirements/index.mjs';
import { stampPublishTime } from '../../requirements/index.mjs';
import { percentToFraction } from '../../mastery/arithmetic.mjs';

export const graph = JSON.parse(fs.readFileSync(new URL('../../curriculum-graph.json', import.meta.url), 'utf8'));
export const registry = JSON.parse(fs.readFileSync(new URL('../../evidence-gap-registry.json', import.meta.url), 'utf8'));
export const calendar = { start: '2026-11-02', end: '2027-01-15', weekdays: [1, 2, 3, 4, 5], minutes: 80, rotation: ['A', 'B'], classRotations: ['A'], rotationOffset: 0, overrides: [] };
export const NOW = '2026-12-01T12:00:00.000Z';
export const PUBLISH_AT = '2026-11-20T08:00:00.000Z';

export const AREA = {
  variable: 'area:advanced:variable-lab', math: 'area:advanced:math-lab', boolean: 'area:advanced:boolean-conditional-lab', loop: 'area:advanced:loop-lab',
  array: 'area:advanced:array-lab', arraylist: 'area:advanced:arraylist-lab', recursion: 'area:advanced:recursion-lab',
};
export const NODE = {
  modulus: 'node:advanced:math-lab:modulus', division: 'node:advanced:math-lab:division', casting: 'node:advanced:math-lab:casting', expressions: 'node:advanced:math-lab:expressions',
  reverse: 'node:advanced:math-lab:reverse', mathMethods: 'node:advanced:math-lab:math-methods', numericLimits: 'node:advanced:math-lab:numeric-limits',
  trace2d: 'node:advanced:array-lab:trace-2d', element: 'node:advanced:array-lab:element',
};
export const MATH_NODES = [NODE.modulus, NODE.division, NODE.casting, NODE.expressions, NODE.reverse, NODE.mathMethods, NODE.numericLimits];

/** A fresh, unconfigured Advanced CS class pathway (every skill points at the provisional policy). */
export const classPathway = ({ id = 'req-test-pathway', classId = 'req-test-class', title = 'Period 1' } = {}) => {
  const p = createPathway(graph, { id, classId, title, courseId: 'advanced', calendar });
  p.examDate = '2027-01-08';
  return p;
};
export const facts = R.buildContentFacts({ graph, registry });
export const ctxFor = ({ published = null, extra = null, withFacts = true } = {}) =>
  R.createContext({ graph, published, facts: withFacts ? (extra ? R.buildContentFacts({ graph, registry, extra }) : facts) : null });
export const pct = (n) => percentToFraction(n);

/** What a teacher's "Publish": stamp the new versions with the publish time and make a revision. Returns {draft, published}. */
export function publishDraft(draft, published, at = PUBLISH_AT) {
  const stamped = stampPublishTime(draft, published, at);
  const revision = (published?.revision ?? 0) + 1;
  return { draft: stamped, published: { ...clone(stamped), revision, baseRevision: published?.revision ?? 0, publishedAt: at } };
}
/** Apply an operation result, failing loudly with its messages so a test shows why. */
export const must = (res) => {
  if (!res.ok) throw new Error(`Operation failed: ${res.errors.map((e) => e.message).join(' | ')}`);
  return res.pathway;
};
export const policyById = (p, id, version = null) => (version == null ? R.latestPolicy(p, id) : p.policies.find((x) => x.id === id && x.version === version));
export const checkpointOf = (p, nodeId) => p.checkpoints.find((c) => c.nodeId === nodeId);
export const resolved = (p, nodeId) => R.resolveSkill(p, nodeId, graph);
export const reqPolicies = (p) => p.policies.filter((x) => R.isRequirementPolicy(x));
export { R };
