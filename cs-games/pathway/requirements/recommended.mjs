// Only assign targets where a scored source and its assessed-mode attribution have
// been reviewed. Unlisted formats stay open for practice and teacher assessment.
import { suggestedConfigurations } from '../mastery/suggestions.mjs';

export const TIERS = Object.freeze(suggestedConfigurations.map(({tier, label, minimumQuestions, accuracy}) =>
  Object.freeze({id:tier, label, minimumQuestions, accuracy})));
export const tierLabel = id => TIERS.find(tier => tier.id === id)?.label ?? 'Teacher assessment';

const recognition = {
  'variable-lab': ['identify/type', 'identify/operator', 'identify/value', 'identify/declaration', 'identify/initialization', 'identify/assignment-operator', 'identify/assignment', 'identify/declaration-only', 'identify/stored'],
  'method-constructor-lab': ['identify-method', 'identify-constructor'],
  'recursion-lab': ['base'],
  'class-object-lab': ['structure', 'defaults'],
  'documentation-lab': ['docs'],
  'search-sort-lab': ['name'],
  'loop-lab': ['components'],
  'boolean-conditional-lab': ['identify'],
};
const reasoning = {
  'variable-lab': ['trace'],
  'loop-lab': ['conditional', 'nested', 'debug', 'algorithms', 'executions'],
  'array-lab': ['nested', 'trace-2d', 'in-place', 'update-2d'],
  'arraylist-lab': ['traverse', 'compare'],
  'linkedlist-lab': ['trace', 'references'],
  'math-lab': ['expressions', 'reverse'],
  'boolean-conditional-lab': ['truthTable', 'switchIf', 'coverage', 'short'],
  'class-object-lab': ['aliases', 'reverse', 'parameters'],
  'recursion-lab': ['returns', 'output', 'arrays', 'debug', 'searchsort'],
  'search-sort-lab': ['selection', 'insertion', 'merge', 'compare'],
  'inheritance-polymorphism-lab': ['tracer', 'debug'],
  'documentation-lab': ['editor', 'builder'],
  'string-lab': ['trace', 'algo', 'loop'],
  'robot-algorithms': ['build', 'debug'],
  'list-lab': ['CSP-LISTS'],
  'algorithm-architect': ['CSP-ITERATION', 'CSP-SEQUENCE'],
};

// Existing replay tests cover these sources outside the Java gap registry.
// Keep sources with only exploratory or weak evidence outside this list.
const separatelyReviewed = {
  'list-lab': ['CSP-LISTS'],
  'algorithm-architect': ['CSP-ITERATION', 'CSP-SELECTION', 'CSP-SEQUENCE'],
  'boolean-gatekeeper': ['CSP-BOOLEAN'],
  'digital-divide-lab': ['CSP-DIVIDE'],
  'tcp-udp-lab': ['CSP-TRANSPORT'],
  'analog-digital-lab': ['CSP-ANALOG'],
  'lossless-lossy-lab': ['CSP-COMPRESSION'],
  'variable-lab': [...recognition['variable-lab'], 'trace', 'identify/name', 'identify/conversion', 'identify/compatibility'],
  'string-lab': ['predict', 'trace', 'index', 'expr', 'algo', 'compare', 'loop'],
};

// Fixed authored banks measured by distinct challenge content, without answer
// shuffles. The category pools in Parts Sprint are also below 50 unique parts.
export const boundedPracticePools = Object.freeze({
  'node:advanced:inheritance-polymorphism-lab:override': 16,
  'node:advanced:inheritance-polymorphism-lab:tracer': 21,
  'node:advanced:inheritance-polymorphism-lab:debug': 20,
  'node:advanced:documentation-lab:editor': 20,
  'node:advanced:documentation-lab:builder': 12,
});
const smallBanks = {
  'inheritance-polymorphism-lab': ['override', 'abstract'],
  'documentation-lab': ['builder'],
  'parts-sprint': ['structure', 'fasteners', 'spacing', 'motion', 'transmission', 'wheels', 'tools', 'electronics'],
};

export function auditRecommended(graph, registry) {
  const entries = new Map();
  for (const row of registry?.entries ?? []) {
    if (row.status !== 'fully-supported' || !row.measured?.focusedDrawn ||
        row.measured.focusedDrawn !== row.measured.focusedCreditedToIntendedNode) continue;
    if (!entries.has(row.nodeId)) entries.set(row.nodeId, []);
    entries.get(row.nodeId).push(row);
  }
  return graph.nodes.map(node => {
    const [, , activity, mode] = node.id.split(':');
    const rows = entries.get(node.id) ?? [];
    const verified = rows.length > 0 || separatelyReviewed[activity]?.includes(mode) === true;
    const shortfall = smallBanks[activity]?.includes(mode) === true;
    const tier = !verified || shortfall ? null
      : recognition[activity]?.includes(mode) ? 'quick-recognition'
      : reasoning[activity]?.includes(mode) ? 'complex-reasoning' : 'standard-practice';
    // Source-family binding and the focused replay must both support the rule.
    const minDistinct = tier && node.familyBindingStatus === 'source-family-ids' &&
      node.familyIds.length >= 2 && (activity === 'string-lab' || rows.some(row => row.measured.distinctFamiliesBound >= 2)) ? 2 : 0;
    return {nodeId:node.id, tier, minDistinct, activity,
      modes:rows.map(row => row.mode), reason:shortfall ? 'limited-bank' : verified ? null : 'insufficient-evidence-review'};
  });
}
