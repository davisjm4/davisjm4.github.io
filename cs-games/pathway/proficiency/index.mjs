import { evaluateEvidence, selectRecords } from '../mastery/evaluate.mjs';
import { assertMasteryPolicy, isChallengeConfigured, validateMasteryPolicy } from '../mastery/policy.mjs';
import { auditedDifficulty, proficiencyPractice, PROFICIENCY_VERSION, rubricFor } from './catalog.mjs';

import { formativeFamily } from './coverage-phase2.mjs';

export {PROFICIENCY_VERSION};
export const PROFICIENCY_SCHEMA='cs-games.formative-proficiency/1';
export const LEVEL_LABELS=['No evidence','Beginning','Approaching','Meeting','Exceeding'];
const difficulties=['beginner','intermediate','advanced'];
const supportedCourses=new Set(['advanced','csp']);

function evaluateTier(node,tier,rule,records,teacherPolicy){
  if(!rule)return {status:'unavailable'};
  const policy=assertMasteryPolicy({
    id:`formative:${tier}`,version:PROFICIENCY_VERSION,provisional:false,
    minimumQuestions:teacherPolicy?.minimumQuestions??rule.minimum,
    accuracy:teacherPolicy?.accuracy??rule.accuracy??0.85,
    challenge:{
      minimumCorrect:teacherPolicy?.challenge.minimumCorrect??null,
      families:{minDistinct:rule.distinct},
      subskills:rule.outcomes??[],
      subskillEvidence:{maxUnmappedShare:1}
    }
  });
  const evaluated=evaluateEvidence({nodeId:node.id,policy,events:records,
    contentProfile:{boundFamilyIds:[...new Set(records.map(event=>event.familyId))]}});
  return {
    status:evaluated.qualifies?'demonstrated':evaluated.status,
    minimumQuestions:policy.minimumQuestions,accuracy:policy.accuracy,
    minimumCorrect:policy.challenge.minimumCorrect,minimumFamilies:rule.distinct,
    answered:evaluated.counts.attempted,correct:evaluated.counts.correct,
    accuracyPercent:evaluated.counts.accuracyPercent,
    missing:evaluated.missing,recovery:evaluated.recovery,checks:evaluated.requirements,
    practice:tier==='intermediate'&&node.id==='node:csp:digital-divide-lab:CSP-DIVIDE'
      ? {...proficiencyPractice(node,tier),mode:evaluated.missing?.subskills[0]?.id??'solution'}
      : proficiencyPractice(node,tier)
  };
}

export function evaluateSkillProficiency(node,events,{policy=null}={}){
  const {role,supplemental=false,tiers:rules}=rubricFor(node);
  const {events:records,ignored}=firstPractice(events,node.id);
  const classified=new Map(difficulties.map(tier=>[tier,[]]));
  for(const event of records){
    const tier=auditedDifficulty(node,event);
    if(tier)classified.get(tier).push({...event,familyId:formativeFamily(event)});
  }
  const result=validateMasteryPolicy(policy);
  const teacherPolicy=result.ok&&isChallengeConfigured(result.policy)?result.policy:null;
  const tiers=Object.fromEntries(difficulties.map(tier=>[
    tier,evaluateTier(node,tier,rules[tier],classified.get(tier),teacherPolicy)
  ]));
  const met=tier=>tiers[tier].status==='demonstrated';
  const classifiedRecords=[...classified.values()].flat();
  const level=met('advanced')&&met('intermediate')?4:met('intermediate')?3:met('beginner')?2:
    classifiedRecords.some(event=>event.correct&&!event.assisted&&event.outcome==='answered')?1:0;
  const goal=role==='core'?'intermediate':role==='foundational'?'beginner':null;
  return {
    nodeId:node.id,areaId:node.areaId,role,supplemental,level,label:LEVEL_LABELS[level],
    highestDemonstratedDifficulty:[...difficulties].reverse().find(met)??null,
    tiers,goal,goalMet:goal!==null&&met(goal),advancementMet:level>=3,
    extensionAvailable:level===3&&Boolean(rules.advanced),
    practice:node.checkpoint?.practice??node.practice??[],
    standardsScore:node.checkpoint?.score??null,
    reviewRecommended:node.masteryChallenge?.status==='review-recommended',
    trust:'formative',evidenceQuality:{
      classified:classifiedRecords.length,unclassified:records.length-classifiedRecords.length,
      duplicates:ignored.duplicateEvents+ignored.duplicateQuestions
    },
    policy:teacherPolicy?{id:teacherPolicy.id,version:teacherPolicy.version}:null
  };
}

function firstPractice(events,nodeId){
  const scopes=new Set(events.map(event=>JSON.stringify(event.scope)));
  if(scopes.size>1)throw new Error('Formative proficiency requires one student scope.');
  const {records,ignored}=selectRecords(events,nodeId);
  return {events:records,ignored};
}

export function recommendProficiency(nodes,skills,areas,{currentAreaId=null,familiarity={},pacingTargets={}}={}){
  const choose=(node,kind,tier=null)=>({
    kind,nodeId:node.id,areaId:node.areaId,tier,targetDate:pacingTargets[node.id]??null,
    practice:tier?skills[node.id].tiers[tier].practice:null
  });
  const actionable=node=>(node.checkpoint?.practice??node.practice??[]).length>0;
  const required=node=>countsForAdvancement(node,skills[node.id]);
  const goalCandidates=nodes.filter(node=>required(node)&&actionable(node)&&skills[node.id].goal&&!skills[node.id].goalMet);
  const current=nodes.filter(node=>node.areaId===currentAreaId);
  const ready=areas[currentAreaId]?.readyToAdvance===true;
  const within=current.filter(node=>goalCandidates.includes(node));
  // Prefer required foundations before core work within an area. Harder
  // evidence on the core skill remains independently assessable.
  const focused=within.find(node=>skills[node.id].role==='foundational')??within[0];
  const later=current.length?nodes.slice(nodes.findLastIndex(node=>node.areaId===currentAreaId)+1):[];
  const laterArea=later.find(node=>actionable(node)&&!areas[node.areaId]?.readyToAdvance)?.areaId;
  const laterCandidates=later.filter(node=>node.areaId===laterArea&&actionable(node));
  const next=laterCandidates.find(node=>goalCandidates.includes(node))??laterCandidates[0];
  const continuation=ready?next:null;
  const fallback=nodes.filter(node=>node.checkpoint?.required!==false&&actionable(node)&&!skills[node.id].goalMet);
  const localFallback=current.find(node=>fallback.includes(node)&&!familiarity[node.id]);
  const candidate=focused??continuation??localFallback??goalCandidates[0]??fallback.find(node=>!familiarity[node.id])??fallback[0];
  const extension=(ready?current:current.length?[]:nodes)
    .find(node=>skills[node.id].extensionAvailable&&(ready||areas[node.areaId]?.readyToAdvance));
  const review=nodes.filter(node=>skills[node.id].reviewRecommended).map(node=>choose(node,'review'));
  return {
    primary:candidate?choose(candidate,continuation===candidate?'continue-learning':skills[candidate.id].goal?'practice-tier':'practice-evidence-gap',skills[candidate.id].goal):null,
    browseNext:next&&current.length&&!ready?choose(next,'browse-next'):null,
    extension:extension?choose(extension,'level-4-extension','advanced'):null,
    review
  };
}

function countsForAdvancement(node,skill){
  return node.checkpoint?.required!==false&&skill.role!=='extension'&&
    (!skill.supplemental||skill.policy!==null);
}

/** Shared entry point for a published class or an independent learner. Pass
 * nodes in curriculum order and normalized evidence for exactly one learner. */
export function evaluateProficiency({courseId,nodes,eventsByNode=new Map(),policies=[],familiarity,pacingTargets}){
  if(!supportedCourses.has(courseId))return null;
  const scopes=new Set([...eventsByNode.values()].flatMap(events=>events.map(event=>JSON.stringify(event.scope))));
  if(scopes.size>1)throw new Error('Formative proficiency requires one student scope.');
  const rules=new Map(policies.map(policy=>[`${policy.id}@${policy.version}`,policy]));
  const skills={}, grouped=new Map();
  for(const node of nodes){
    const checkpoint=node.checkpoint;
    const policy=checkpoint?rules.get(`${checkpoint.policyId}@${checkpoint.policyVersion}`):null;
    skills[node.id]=evaluateSkillProficiency(node,eventsByNode.get(node.id)??[],{policy});
    if(!grouped.has(node.areaId))grouped.set(node.areaId,[]);
    grouped.get(node.areaId).push(node);
  }
  const areas=Object.fromEntries([...grouped].map(([id,members])=>{
    const required=members.filter(node=>countsForAdvancement(node,skills[node.id]));
    const assessable=required.filter(node=>skills[node.id].goal);
    const missing=assessable.filter(node=>!skills[node.id].goalMet).map(node=>node.id);
    const unavailable=required.filter(node=>!skills[node.id].goal).map(node=>node.id);
    const hasCore=assessable.some(node=>skills[node.id].role==='core');
    return [id,{readyToAdvance:hasCore&&!missing.length,missing,unavailable,hasCore}];
  }));
  const recommendation=options=>recommendProficiency(nodes,skills,areas,{familiarity,pacingTargets,...options});
  return {schema:PROFICIENCY_SCHEMA,version:PROFICIENCY_VERSION,courseId,skills,areas,
    recommendation:recommendation(),byArea:Object.fromEntries([...grouped.keys()].map(id=>[id,recommendation({currentAreaId:id})]))};
}
