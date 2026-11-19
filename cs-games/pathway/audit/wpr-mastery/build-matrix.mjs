// Regenerates the Workplace Readiness mastery coverage matrix and summary from the live catalog and attribution table.
//   node cs-games/pathway/audit/wpr-mastery/build-matrix.mjs <output-directory>
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, measure, RULES, TIER_QUESTIONS } from './coverage.mjs';
import * as P from '../../wpr-primary-concepts.mjs';

const out = process.argv[2];
if (!out) { console.error('Give an output directory.'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const catalog = loadCatalog();
const m = measure(catalog);
const csv = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const pct = v => v === null || v === undefined ? '' : Math.round(v * 100) + '%';
const head = ['skill_id', 'skill_name', 'learning_area', 'tagged_question_units', 'tagged_reasoning_units', 'primary_question_units', 'primary_reasoning_units', 'high_confidence_units',
  'medium_confidence_units', 'distinct_families', 'question_modes', 'difficulty_mix', 'objective_assessment_suitable', 'first_attempt_scoring', 'sufficient_evidence', 'additional_content_needed',
  'teacher_assessment_remains', 'recommended_tier', 'tier_questions', 'questions_per_reasoning_unit', 'longest_option_correct', 'career_contexts_sampled', 'status', 'enabled_by_this_package', 'confidence', 'supporting_evidence'];
const lines = [head.join(',')];
for (const r of [...m.rows].sort((a, b) => a.nodeId.localeCompare(b.nodeId))) {
  const perKey = r.tier && r.keyCount ? (TIER_QUESTIONS[r.tier] / r.keyCount).toFixed(1) : '';
  const confidence = r.enabled ? (r.highKeys === r.keyCount ? 'high (table not educator-reviewed)' : 'medium (table not educator-reviewed)') : r.keyCount ? 'low' : 'none';
  lines.push([r.nodeId, r.title, r.area, r.taggedUnits, r.taggedKeys.size, r.creditedUnits, r.keyCount, r.highKeys, r.keyCount - r.highKeys, r.families.size,
    Object.entries(r.modes).map(([k, v]) => `${k}:${v}`).join(' '), Object.entries(r.difficulties).map(([k, v]) => `${k}:${v}`).join(' '),
    r.keyCount ? 'yes' : 'no primary questions', 'yes (one locked check per question)', r.enabled ? 'yes' : 'no', r.enabled ? 'no' : 'yes', r.enabled ? 'optional' : 'yes',
    r.tier || '', r.tier ? TIER_QUESTIONS[r.tier] : '', perKey, pct(r.quality?.choice >= 30 ? r.quality.longestIsBest : null), r.quality?.contexts ?? '', r.status, r.enabled ? 'yes' : 'no', confidence,
    r.enabled ? [...r.keys.keys()].join(' ') : r.reasons.join('; ') + (r.keyCount ? ' | units: ' + [...r.keys.keys()].join(' ') : '')].map(csv).join(','));
}
fs.writeFileSync(path.join(out, 'CLAUDE_WPR_MASTERY_MATRIX.csv'), lines.join('\n') + '\n');
const by = k => m.rows.reduce((a, r) => (a[r[k]] = (a[r[k]] || 0) + 1, a), {});
const kitRules = Object.values(P.COMPOSED_PRIMARY).reduce((n, v) => n + Object.keys(v).length, 0);
const summary = {
  nodes: m.rows.length, units: m.totals, status: by('status'), tiersAll: by('tier'), tiersEnabled: m.rows.filter(r => r.enabled).reduce((a, r) => (a[r.tier] = (a[r.tier] || 0) + 1, a), {}),
  withPrimary: m.rows.filter(r => r.keyCount).length, onlyConfidenceShort: m.rows.filter(r => !r.enabled && r.keyCount >= RULES.MIN_KEYS && r.highKeys < RULES.MIN_HIGH).length,
  thin: m.rows.filter(r => r.keyCount > 0 && r.keyCount < RULES.MIN_KEYS).length,
  table: { authoredCredited: Object.keys(P.AUTHORED_PRIMARY).length, authoredAmbiguous: P.AUTHORED_AMBIGUOUS.length, kits: Object.keys(P.COMPOSED_PRIMARY).length, kitRules,
    high: [...Object.values(P.AUTHORED_PRIMARY), ...Object.values(P.COMPOSED_PRIMARY).flatMap(v => Object.values(v))].filter(e => e.endsWith('|H')).length },
  rules: RULES, enabled: m.rows.filter(r => r.enabled).map(r => ({ node: r.nodeId, tier: r.tier, units: r.keyCount, high: r.highKeys })),
  notEnabled: m.rows.filter(r => !r.enabled).map(r => ({ node: r.nodeId, status: r.status, units: r.keyCount, reasons: r.reasons })),
};
fs.writeFileSync(path.join(out, 'wpr-mastery-summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log(JSON.stringify({ nodes: summary.nodes, units: summary.units, status: summary.status, tiersEnabled: summary.tiersEnabled, withPrimary: summary.withPrimary, onlyConfidenceShort: summary.onlyConfidenceShort, thin: summary.thin, table: summary.table }, null, 1));
