// The coverage matrix must stay current, complete and consistent with the classification that governs new classes.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import graph from '../curriculum-graph.json' with {type: 'json'};
import registry from '../evidence-gap-registry.json' with {type: 'json'};
import {auditRecommended} from '../requirements/recommended.mjs';

const dir = new URL('../reports/coverage/', import.meta.url);
const matrix = JSON.parse(fs.readFileSync(new URL('coverage-matrix.json', dir), 'utf8'));

test('the checked-in matrix is regenerated from the sources', () => {
  const run = spawnSync(process.execPath, [new URL('../audit/coverage/build-coverage-matrix.mjs', import.meta.url).pathname, '--check'], {encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr);
});

test('every graph node has exactly one row', () => {
  assert.deepEqual(matrix.rows.map(r => r.nodeId).sort(), graph.nodes.map(n => n.id).sort());
  assert.equal(matrix.rows.length, 290);
});

test('automatic rows match the recommendation rules; no row is automatic without a tier', () => {
  const tiers = new Map(auditRecommended(graph, registry).map(r => [r.nodeId, r.tier]));
  for (const row of matrix.rows) {
    const auto = row.status === 'already-automatic' || row.status === 'newly-validated';
    assert.equal(Boolean(tiers.get(row.nodeId)), auto, row.nodeId);
    assert.equal(row.proposedTier, tiers.get(row.nodeId) ?? '', row.nodeId);
  }
});

test('every exception has a category, status, rationale, recommendation and confidence; none is called teacher-only merely for missing metadata', () => {
  const ex = matrix.rows.filter(r => r.currentRoute === 'teacher-assessment');
  for (const r of ex) {
    assert.match(r.category, /^[B-E]$/, r.nodeId);
    for (const f of ['status', 'whyNotEnabled', 'recommendation', 'confidence', 'evidenceSource', 'objectivelyAssessable']) assert.ok(r[f], `${r.nodeId} ${f}`);
    if (r.category === 'E') assert.notEqual(r.objectivelyAssessable, 'yes', `${r.nodeId}: E requires a reason other than metadata`);
  }
  assert.equal(ex.length + matrix.rows.filter(r => r.status === 'newly-validated').length, 162, 'the original 162 exceptions are all accounted for');
});

test('only measured nodes may claim high confidence; no unmeasured node gets a tier', () => {
  for (const r of matrix.rows.filter(r => r.currentRoute === 'teacher-assessment' && r.confidence === 'high')) assert.ok(r.measuredDistinct, `${r.nodeId} high confidence needs a measured value`);
  for (const r of matrix.rows.filter(r => r.currentRoute === 'teacher-assessment')) assert.equal(r.proposedTier, '', r.nodeId);
});

test('summary totals add up', () => {
  const s = matrix.summary, sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  assert.equal(sum(s.byStatus), 290);
  assert.equal(sum(s.exceptionsByCategory), 162);
  assert.equal(s.nodesAutomatic + s.remainingTeacherRoute, 290);
});
