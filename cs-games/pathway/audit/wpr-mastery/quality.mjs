// Measured question-quality signals for Workplace Readiness questions that earn node credit (student-visible text only).
import { createRequire } from 'node:module';
import * as P from '../../wpr-primary-concepts.mjs';
const require = createRequire(import.meta.url);
const wprDir = new URL('../../../../wpr-games/workplace-readiness/', import.meta.url).pathname;
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

export function measureQuality(hybrid, { n = 12000, seed = 'wpr-quality-v1' } = {}) {
  const SEL = require(wprDir + 'js/compose/selector.js');
  const { challenges } = SEL.generateMany(hybrid, n, { seed, filters: {} });
  const rows = new Map();
  for (const q of challenges) {
    const p = P.reviewedPrimary(q); if (!p) continue;
    const r = rows.get(p.conceptId) || { conceptId: p.conceptId, questions: 0, choice: 0, longestIsBest: 0, shortestIsBest: 0, position: [0, 0, 0, 0], contexts: new Set(), bundles: new Set(),
      scenarioWords: 0, sentences: 0, missingWhy: 0, missingMisconception: 0, texts: new Set(), keys: new Set() };
    r.questions++; r.contexts.add(q.context); r.bundles.add(q.bundle); r.keys.add(p.key);
    r.scenarioWords += words(q.scenario); r.sentences += Math.max(1, String(q.scenario || '').split(/[.!?]+\s/).filter(Boolean).length);
    r.texts.add([q.scenario, q.prompt, ...(q.options || []).map(o => o.text).sort(), ...(q.steps || []).map(s => s.text).sort(), ...(q.doc ? q.doc.segments.map(s => s.text) : [])].join('|'));
    if (q.options) {
      r.choice++;
      const lens = q.options.map(o => o.text.length), best = q.options.findIndex(o => o.id === q.key.bestId);
      if (lens[best] === Math.max(...lens) && lens.filter(l => l === lens[best]).length === 1) r.longestIsBest++;
      if (lens[best] === Math.min(...lens) && lens.filter(l => l === lens[best]).length === 1) r.shortestIsBest++;
      r.position[best]++;
      for (const o of q.options) { const k = q.key.options[o.id]; if (!k || !k.why) r.missingWhy++; if (k && k.role !== 'best' && !k.misconception) r.missingMisconception++; }
    }
    rows.set(p.conceptId, r);
  }
  return [...rows.values()].map(r => ({ conceptId: r.conceptId, questions: r.questions, distinctTexts: r.texts.size, contexts: r.contexts.size, settings: r.bundles.size,
    choice: r.choice, longestIsBest: r.choice ? r.longestIsBest / r.choice : null, shortestIsBest: r.choice ? r.shortestIsBest / r.choice : null, position: r.position,
    meanScenarioWords: r.scenarioWords / r.questions, wordsPerSentence: r.scenarioWords / r.sentences, missingWhy: r.missingWhy, missingMisconception: r.missingMisconception }));
}
