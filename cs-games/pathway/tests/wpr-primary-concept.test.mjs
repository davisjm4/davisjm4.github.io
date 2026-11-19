import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {auditRelease,assertReleaseGate,structuralIssues} from '../audit/wpr-mastery/release-audit.mjs';
import {loadCatalog} from '../audit/wpr-mastery/coverage.mjs';
import {WPR_AUTOMATIC,WPR_CANDIDATE_TIERS} from '../mastery/wpr-automatic.mjs';

test('the full seeded WPR audit is current and no unsupported skill can activate',()=>{
  const report=auditRelease(loadCatalog());
  assertReleaseGate(report);
  const saved=JSON.parse(fs.readFileSync(new URL('../reports/wpr-mastery/RELEASE_AUDIT.json',import.meta.url)));
  assert.deepEqual(report,saved);
  assert.equal(report.samples,18000);
  assert.equal(report.skills.length,Object.keys(WPR_CANDIDATE_TIERS).length);
  // Skills without enough authored, server-scoreable families stay below their threshold.
  // Skills that reach it are only ready for release review; none is automatic.
  for (const s of report.skills) {
    assert.ok(s.originalUnits>0);
    assert.equal(s.automatic,false);
    if (s.serverScoreableUnits>=s.minimum) assert.equal(s.disposition,'ready-pending-release-review');
    else assert.ok(s.optimisticUpperBound<s.minimum && s.disposition==='insufficient-diversity');
  }
  assert.equal(report.skills.filter(s=>s.disposition==='ready-pending-release-review').length,6);
  assert.deepEqual(Object.keys(WPR_AUTOMATIC),[]);
  for (const key of ['c:saf-chemical-task/report-after','c:tea-team-project/support-teammate','c:raw-delay-email/verify-before-writing']) {
    assert.equal(report.families.find(r=>r.key===key)?.disposition,'replaced-for-server-checked-practice');
  }
});

test('choice validation accepts competing plausible answers and flags malformed keys and near-duplicates',()=>{
  const q={scenario:'The written change policy requires approval before sending a notice.',prompt:'What is the best response?',
    options:['Ask for approval first','Notify the warehouse promptly','Check the schedule internally','Draft the client email'].map((text,i)=>({id:String(i),text})),
    key:{bestId:'0',options:Object.fromEntries([0,1,2,3].map(i=>[i,{role:i===0?'best':'plausible',why:'The stated procedure governs timing.'}]))}};
  assert.deepEqual(structuralIssues(q),[]);
  assert.ok(structuralIssues({...q,key:{...q.key,bestId:'2'}}).includes('inconsistent-key'));
  q.options[1].text=q.options[0].text;
  assert.ok(structuralIssues(q).includes('duplicate-or-missing-option'));
});

test('ordering checks accept alternative valid sequences and flag impossible dependencies',()=>{
  const q={mode:'order',scenario:'The team can prepare two materials independently before opening.',prompt:'Arrange the three steps.',
    steps:[{id:'a'},{id:'b'},{id:'c'}],key:{example:['b','a','c'],precedence:[{before:'a',after:'c'},{before:'b',after:'c'}]}};
  assert.deepEqual(structuralIssues(q),[]);
  q.key.precedence.push({before:'c',after:'a'});
  assert.ok(structuralIssues(q).includes('invalid-order-key'));
});
