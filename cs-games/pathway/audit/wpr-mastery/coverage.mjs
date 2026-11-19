// Workplace Readiness mastery coverage: measures, for each of the 94 concept nodes, what the generator can actually assess under the
// primary-concept table, and applies the documented activation and tier rules. Pure; used by the matrix builder and the tests.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as P from '../../wpr-primary-concepts.mjs';
import { measureQuality } from './quality.mjs';
import { WPR_PERFORMANCE_ONLY } from '../../mastery/wpr-automatic.mjs';

const require = createRequire(import.meta.url);
const root = new URL('../../../../', import.meta.url);
const wprDir = new URL('wpr-games/workplace-readiness/', root).pathname;

export const TIER_QUESTIONS = Object.freeze({ 'quick-recognition': 50, 'standard-practice': 30, 'complex-reasoning': 20 });
/* Activation rules (audit heuristics, not calibrated against student data):
 *  - at least MIN_KEYS distinct credited reasoning units, at least MIN_HIGH of them high confidence, in at least MIN_MODES question modes;
 *  - no more than MAX_PER_KEY required questions per distinct reasoning unit at the recommended tier's question count;
 *  - picking the longest option is right in no more than MAX_LONGEST of sampled choice questions (answer-length shortcut).
 *  - the concept is not a performed behaviour (WPR_PERFORMANCE_ONLY): those stay teacher-assessed whatever the question bank holds.
 * A node that fails stays teacher-assessed; the tier's numbers are never lowered to make it pass. */
export const RULES = Object.freeze({ MIN_KEYS: 4, MIN_HIGH: 3, MIN_MODES: 2, MAX_PER_KEY: 10, MAX_LONGEST: 0.5 });
const REASONING_MODES = new Set(['decision', 'nextstep', 'order']);

export function loadCatalog() {
  const { loadHybrid } = require(wprDir + 'tools/compose-load.js');
  const graph = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/curriculum-graph.json', root), 'utf8'));
  return { hybrid: loadHybrid(), graph };
}
const unitKey = u => u.kind === 'authored' ? 'a:' + u.id : `c:${u.kitId}/${u.rule}`;
const unitTags = u => u.kind === 'authored' ? u.template.concepts : u.concepts;

export function measure({ hybrid, graph }) {
  const quality = new Map(measureQuality(hybrid).map(q => [q.conceptId, q]));
  const nodes = graph.nodes.filter(n => n.courseId === 'workplace');
  const areaTitle = new Map(graph.areas.map(a => [a.id, a.title]));
  const rows = new Map(nodes.map(n => [n.familySelectors[0].conceptId, {
    nodeId: n.id, conceptId: n.familySelectors[0].conceptId, title: n.title, area: areaTitle.get(n.areaId),
    taggedUnits: 0, taggedKeys: new Set(), keys: new Map(), creditedUnits: 0, modes: {}, difficulties: {}, families: new Set(), reasoningUnits: 0,
  }]));
  let multiTag = 0, credited = 0;
  for (const u of hybrid.units) {
    const key = unitKey(u), tags = unitTags(u);
    if (tags.length > 1) multiTag++;
    for (const tag of tags) { const r = rows.get(tag); if (r) { r.taggedUnits++; r.taggedKeys.add(key); } }
    const entry = P.primaryForKey(key);
    if (!entry || !tags.includes(entry.conceptId)) continue;
    credited++;
    const r = rows.get(entry.conceptId);
    r.keys.set(key, entry.confidence); r.creditedUnits++; r.families.add(u.family);
    r.modes[u.mode] = (r.modes[u.mode] || 0) + 1; r.difficulties[u.difficulty] = (r.difficulties[u.difficulty] || 0) + 1;
    if (REASONING_MODES.has(u.mode) && u.difficulty !== 'beginner') r.reasoningUnits++;
  }
  return { rows: [...rows.values()].map(r => classify(r, quality.get(r.conceptId) || null)), totals: { units: hybrid.units.length, multiTag, credited, uncredited: hybrid.units.length - credited } };
}

function classify(r, quality) {
  const keys = r.keys.size, high = [...r.keys.values()].filter(c => c === 'H').length, modes = Object.keys(r.modes).length;
  const share = r.creditedUnits ? r.reasoningUnits / r.creditedUnits : 0;
  const tier = !r.creditedUnits ? null : share >= 0.6 ? 'complex-reasoning' : share < 0.3 ? 'quick-recognition' : 'standard-practice';
  const needKeys = tier ? Math.ceil(TIER_QUESTIONS[tier] / RULES.MAX_PER_KEY) : null;
  const reasons = [];
  if (!keys) reasons.push('no question has this concept as its primary assessed concept');
  else {
    if (keys < RULES.MIN_KEYS) reasons.push(`${keys} distinct reasoning unit(s); ${RULES.MIN_KEYS} needed`);
    if (high < RULES.MIN_HIGH) reasons.push(`${high} high-confidence unit(s); ${RULES.MIN_HIGH} needed`);
    if (modes < RULES.MIN_MODES) reasons.push(`${modes} question mode(s); ${RULES.MIN_MODES} needed`);
    if (quality && quality.choice >= 30 && quality.longestIsBest > RULES.MAX_LONGEST) reasons.push(`the longest option is correct in ${Math.round(quality.longestIsBest * 100)}% of sampled choice questions`);
    if (keys < needKeys) reasons.push(`${TIER_QUESTIONS[tier]} questions over ${keys} reasoning units exceeds ${RULES.MAX_PER_KEY} per unit`);
  }
  const performance = WPR_PERFORMANCE_ONLY.includes(r.conceptId);
  if (performance) reasons.unshift('performed behaviour: scenario questions show knowledge of the expectation, not the behaviour');
  const enabled = reasons.length === 0;
  const shortcutOnly = !enabled && reasons.length === 1 && reasons[0].startsWith('the longest option');
  const status = enabled ? 'automatic-enabled' : performance ? 'teacher-assessed-performance' : !keys ? 'teacher-assessed-no-primary-content' : shortcutOnly ? 'needs-question-revision' : 'needs-content-or-review';
  const reviewOnly = !enabled && !performance && keys >= RULES.MIN_KEYS && high < RULES.MIN_HIGH && reasons.length === 1;
  return { ...r, quality, performance, reviewOnly, keyCount: keys, highKeys: high, modeCount: modes, reasoningShare: share, tier, enabled, status, reasons };
}
export const enabledTiers = measured => Object.fromEntries(measured.rows.filter(r => r.enabled).map(r => [r.conceptId, r.tier]).sort());
