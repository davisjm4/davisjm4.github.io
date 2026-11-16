import '../../teacher/test-runtime.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {shadowComparisonSummary} from '../proficiency/shadow.mjs';

test('proficiency shadow defaults off without even inspecting its input',()=>{
  assert.equal(shadowComparisonSummary({get nodes(){throw new Error('must not read input');}}),null);
  assert.equal(shadowComparisonSummary(null,false),null);
});

test('enabled proficiency shadow returns only aggregate comparisons',()=>{
  const result=shadowComparisonSummary({courseId:'advanced',nodes:[],eventsByNode:new Map(),policies:[]},true);
  assert.deepEqual(result,{
    schema:'cs-games.independent-outcomes/1',courseId:'advanced',
    nodes:0,differ:0,legacyLower:0,legacyHigher:0
  });
  assert.ok(!Object.hasOwn(result,'profileId')&&!Object.hasOwn(result,'rows'));
});
