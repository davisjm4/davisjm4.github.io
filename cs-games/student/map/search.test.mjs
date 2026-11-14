import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildMapModel } from './model.mjs';
import { searchSkills } from './search.mjs';

const graph = JSON.parse(readFileSync(new URL('../../pathway/curriculum-graph.json', import.meta.url)));
const advanced = buildMapModel({ graph, courseId: 'advanced' });
const csp = buildMapModel({ graph, courseId: 'csp' });

test('course skill search recognizes the approved classroom concepts', () => {
  for (const [phrase, expected] of [
    ['modulus', 'math-lab:modulus'],
    ['remainder', 'math-lab:modulus'],
    ['%', 'math-lab:modulus'],
    ['indexOf()', 'string-lab:index'],
    ['find index', 'string-lab:index'],
    ['substring', 'string-lab:predict'],
    ['nested loops', 'loop-lab:nested'],
    ['parameters', 'class-object-lab:this'],
    ['conditional statements', 'boolean-conditional-lab:branch'],
  ]) {
    assert.ok(searchSkills(advanced, phrase)[0]?.node.id.endsWith(expected), phrase);
  }
  assert.match(searchSkills(csp, 'binary representation')[0].node.id, /binary-builder:/);
  assert.deepEqual(searchSkills(csp, 'modulus'), []);
  assert.deepEqual(searchSkills(advanced, 'zzzzzz'), []);
  assert.deepEqual(searchSkills(advanced, '  '), []);
});
