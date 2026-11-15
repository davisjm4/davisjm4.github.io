import assert from 'node:assert/strict';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type:'json'};
import registry from '../evidence-gap-registry.json' with {type:'json'};
import {createPathway} from '../model.mjs';
import * as requirements from '../requirements/index.mjs';

const facts=requirements.buildContentFacts({graph,registry});
const assignments=requirements.auditRecommended(graph,registry);
const byNode=new Map(assignments.map(row=>[row.nodeId,row]));
const presets=new Map(requirements.TIERS.map(tier=>[tier.id,tier]));

test('each graph node has an audited disposition and every selected default passes the existing feasibility checks',()=>{
  assert.equal(byNode.size,graph.nodes.length);
  for(const {id:courseId} of graph.courses){
    const original=createPathway(graph,{courseId});
    const ctx=requirements.createContext({graph,facts});
    const result=requirements.applyRecommended(original,ctx,assignments);
    assert.ok(result.ok,JSON.stringify(result.errors));
    assert.ok(original.checkpoints.every(c=>c.policyId==='policy:provisional'));
    assert.equal(requirements.canApplyRecommended(result.pathway),false);
    const review=requirements.reviewRequirements(result.pathway,original,graph,{facts});
    assert.deepEqual(review.problems,[]);
    for(const skill of requirements.resolveAll(result.pathway,graph)){
      const row=byNode.get(skill.nodeId);
      assert.equal(skill.tier,row.tier,skill.title);
      if(!row.tier){
        assert.equal(skill.complete,false,skill.title);
        assert.equal(skill.policyId,'policy:provisional');
        assert.ok(row.reason);
        continue;
      }
      const preset=presets.get(row.tier);
      const policy=result.pathway.policies.find(p=>p.id===skill.policyId&&p.version===skill.policyVersion);
      assert.equal(policy.minimumQuestions,preset.minimumQuestions,skill.title);
      assert.equal(policy.accuracy,preset.accuracy,skill.title);
      assert.equal(policy.challenge.families.minDistinct,row.minDistinct,skill.title);
      assert.equal(facts.practiceEvidence(skill.nodeId),'verified');
    }
  }
});

test('an explicit opt-in leaves the original class untouched and fixed banks block an infeasible edit',()=>{
  const legacy=createPathway(graph,{courseId:'advanced'});
  const ctx=requirements.createContext({graph,facts,published:legacy});
  const result=requirements.applyRecommended(legacy,ctx,assignments);
  assert.ok(result.ok);
  const next=requirements.setTierSettings(result.pathway,{'complex-reasoning':{minimumQuestions:25}},ctx);
  assert.ok(next.ok);
  assert.ok(next.problems.draftOnly.some(p=>p.nodeId==='node:advanced:documentation-lab:editor'));
  assert.equal(requirements.reviewRequirements(next.pathway,legacy,graph,{facts}).readiness.canPublish,false);
  assert.ok(legacy.checkpoints.every(c=>c.policyId==='policy:provisional'&&!Object.hasOwn(c,'requirementTier')));
});
