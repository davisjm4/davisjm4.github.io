import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { TRACKED_NODE_IDS, TRACKED_GRAPH_VERSION } from '../coverage-data.mjs';
import { graph } from './lib.mjs';

test('the generated coverage matrix and tracking data are current for this graph release', () => {
  const r = spawnSync('node', [new URL('../build-coverage-matrix.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr + ' (run node cs-games/student/guest/build-coverage-matrix.mjs)');
  assert.equal(TRACKED_GRAPH_VERSION, graph.version);
});

test('tracking claims are conservative: only real nodes, none for Workplace Readiness, none for Course Architect', () => {
  const ids = new Set(graph.nodes.map(n => n.id));
  for (const id of TRACKED_NODE_IDS) assert.ok(ids.has(id), id);
  assert.equal([...TRACKED_NODE_IDS].filter(id => id.startsWith('node:workplace:')).length, 0);
  assert.equal([...TRACKED_NODE_IDS].filter(id => id.includes(':course-architect:')).length, 0);
  assert.equal([...TRACKED_NODE_IDS].filter(id => id.startsWith('node:advanced:')).length, 123);
});

test('the matrix never calls an activity exercised in real Chromium "practice only"', () => {
  const md = fs.readFileSync(new URL('../ACTIVITY_COVERAGE.md', import.meta.url), 'utf8');
  for (const line of md.split('\n').filter(l => /^\| (math-lab|boolean-gatekeeper|parts-sprint|component-challenge) /.test(l))) assert.match(line, /Local question-level progress \| .* \| Yes \|/);
});
