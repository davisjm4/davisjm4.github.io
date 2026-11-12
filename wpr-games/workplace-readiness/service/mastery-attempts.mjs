import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import {areaProgress} from '../../../cs-games/pathway/mastery/area.mjs';
import {activeAttempt,emptyHistory,restartAttempt} from '../../../cs-games/pathway/mastery/attempts.mjs';
import registry from '../../../cs-games/pathway/evidence-gap-registry.json' with {type:'json'};
import {buildContentFacts} from '../../../cs-games/pathway/requirements/limits.mjs';
import {normalizeEvents} from '../../../cs-games/pathway/mastery/events.mjs';
import {isChallengeConfigured,policyForCheckpoint,validateMasteryPolicy} from '../../../cs-games/pathway/mastery/policy.mjs';
import {nodeProgress} from '../../../cs-games/pathway/mastery/progress.mjs';
import {studentRequirementView} from '../../../cs-games/pathway/requirements/student.mjs';

const facts=buildContentFacts({graph,registry});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const describeAttempt=attempt=>({
  number:attempt.seq,
  status:attempt.status,
  closedAt:attempt.closedAt,
  answered:attempt.snapshot?.counts?.attempted??0,
  correct:attempt.snapshot?.counts?.correct??0,
  accuracy:attempt.snapshot?.counts?.accuracyPercent??null
});

// Send evaluated student-facing fields only. The engine also carries internal
// policy metadata, event references and transition details.
function mapProgress(progress,activeAttemptId){
  const {statusReason,attemptStatus,attempt,remaining,recovery,missing,requirementChecks,
    lastCompletedAttempt,lifetime,verification,award}=progress;
  return {
    statusReason,attemptStatus,remaining,recovery,missing,lifetime,verification,award,
    attempt:attempt?{
      id:activeAttemptId,seq:attempt.seq,attempted:attempt.attempted,
      correct:attempt.correct,accuracyPercent:attempt.accuracyPercent
    }:null,
    requirementChecks:requirementChecks.map(({code,label,met})=>({code,label,met})),
    lastCompletedAttempt:lastCompletedAttempt?{seq:lastCompletedAttempt.seq,closedAt:lastCompletedAttempt.closedAt}:null
  };
}

function configuredSkills(pathway){
  const nodes=new Map([...(pathway.curriculumSnapshot?.nodes??graph.nodes),...pathway.customNodes].map(node=>[node.id,node]));
  const skills=new Map();
  for(const checkpoint of pathway.checkpoints){
    const definition=pathway.policies.find(p=>p.id===checkpoint.policyId&&p.version===checkpoint.policyVersion);
    if(!definition?.challenge)continue;
    const {ok,policy}=policyForCheckpoint(pathway,checkpoint);
    if(ok&&isChallengeConfigured(policy))skills.set(checkpoint.nodeId,{checkpoint,node:nodes.get(checkpoint.nodeId),policy});
  }
  return skills;
}

export async function loadEvidence(db,profile,pathway,now){
  const {results}=await db.prepare(`SELECT id,occurred,pathway,activity,data FROM performance_events
    WHERE profile=? AND kind='practice' AND pathway=? AND json_extract(data,'$.attempt')=1
    ORDER BY occurred,id`).bind(profile.id,pathway.courseId).all();
  const scope={profileId:profile.id,classId:pathway.classId};
  const normalized=normalizeEvents(results.map(row=>({...row,data:JSON.parse(row.data)})),{graph,scope,now});
  const byNode=new Map();
  for(const event of normalized.events)for(const id of event.nodeIds){
    if(!byNode.has(id))byNode.set(id,[]);
    byNode.get(id).push(event);
  }
  return {scope,byNode};
}

async function loadHistories(db,profileId,scope,nodeId=null){
  const {results}=await db.prepare(`SELECT s.node_id,s.version,a.body
    FROM mastery_attempt_states s LEFT JOIN mastery_attempts a USING(profile_id,node_id)
    WHERE s.profile_id=? AND (? IS NULL OR s.node_id=?) ORDER BY s.node_id,a.sequence`)
    .bind(profileId,nodeId,nodeId).all();
  const histories=new Map();
  for(const row of results){
    if(!histories.has(row.node_id)){
      const history=emptyHistory(scope,row.node_id);
      histories.set(row.node_id,{version:row.version,history:{...history,attempts:[]}});
    }
    if(row.body)histories.get(row.node_id).history.attempts.push(JSON.parse(row.body));
  }
  return histories;
}

function transitionStatements(db,profile,pathway,prior,next,requestId=null){
  const changes=next.attempts.filter((attempt,index)=>JSON.stringify(attempt)!==JSON.stringify(prior.history.attempts[index]));
  if(!changes.length)return [];
  const marker=crypto.randomUUID(), now=Date.now(), id=next.nodeId;
  const guard=db.prepare(`INSERT INTO mastery_attempt_states(profile_id,node_id,version,marker)
    SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM student_profiles s
      JOIN profile_classes c ON c.id=s.class_id JOIN class_pathways p ON p.class_id=c.id
      WHERE s.id=? AND s.class_id=? AND s.generation=? AND s.active=1 AND s.event_count=?
        AND c.archived IS NULL AND c.expires>? AND p.head=?)
    ON CONFLICT(profile_id,node_id) DO UPDATE SET version=excluded.version,marker=excluded.marker
    WHERE mastery_attempt_states.version=?`)
    .bind(profile.id,id,prior.version+1,marker,profile.id,pathway.classId,profile.generation,profile.event_count,now,pathway.revision,prior.version);
  const ownsMarker='EXISTS(SELECT 1 FROM mastery_attempt_states WHERE profile_id=? AND node_id=? AND marker=?)';
  const write=changes.map(attempt=>db.prepare(`INSERT INTO mastery_attempts(profile_id,node_id,sequence,body)
    SELECT ?,?,?,? WHERE ${ownsMarker}
    ON CONFLICT(profile_id,node_id,sequence) DO UPDATE SET body=excluded.body`)
    .bind(profile.id,id,attempt.seq,JSON.stringify(attempt),profile.id,id,marker));
  if(requestId)write.push(db.prepare(`INSERT INTO mastery_restart_requests(profile_id,node_id,request_id,body)
    SELECT ?,?,?,? WHERE ${ownsMarker}`)
    .bind(profile.id,id,requestId,JSON.stringify(next.requests[requestId]),profile.id,id,marker));
  return [guard,...write];
}

async function knownPolicies(db,pathway){
  const {results}=await db.prepare('SELECT definition FROM pathway_policy_versions WHERE pathway_id=?')
    .bind(pathway.id).all();
  return results.map(({definition})=>validateMasteryPolicy(JSON.parse(definition))).filter(x=>x.ok).map(x=>x.policy);
}

export async function readMasteryProgress(db,profile,pathway,assessmentEvidence,practiceEvidence){
  const skills=configuredSkills(pathway);
  if(!skills.size)return null;
  const now=new Date().toISOString();
  const {scope,byNode}=profile ? practiceEvidence??await loadEvidence(db,profile,pathway,now)
    : {scope:{profileId:'teacher-preview',classId:pathway.classId},byNode:new Map()};
  const [existing,policies]=profile
    ?await Promise.all([loadHistories(db,profile.id,scope),knownPolicies(db,pathway)])
    :[new Map(),[]];
  const nodes=new Map(), progresses=[], transitions=[];
  for(const [id,{node,policy,checkpoint}] of skills){
    const prior=existing.get(id)??{version:0,history:emptyHistory(scope,id)};
    const result=nodeProgress({node,policy,history:prior.history,events:byNode.get(id)??[],now,policies,
      contentProfile:facts.profileFor(id),assessmentEvidence,
      required:checkpoint.required!==false&&policy.challenge.requiredForAreaCompletion});
    if(profile&&result.changes.length)transitions.push(transitionStatements(db,profile,pathway,prior,result.history));
    const current=activeAttempt(result.history);
    const student=studentRequirementView(result.progress);
    const noSkillMapping=node.courseId==='workplace'||node.familySelectors.every(selector=>selector.eligibility);
    const activeAttemptId=current&&student.progress?.answered>0?current.id:null;
    const closed=result.history.attempts.filter(attempt=>attempt.closedAt!==null);
    nodes.set(id,{...student,
      ...(noSkillMapping?{practiceAvailability:'This activity is open for practice. Individual skill answers cannot be counted for this requirement yet.'}:{}),
      activeAttemptId,
      ...(profile?{mapProgress:mapProgress(result.progress,activeAttemptId)}:{}),
      history:closed.slice(-10).map(describeAttempt),
      historyCount:closed.length});
    progresses.push(result.progress);
  }
  let stable=true;
  for(let offset=0;offset<transitions.length;offset+=20){
    const batch=transitions.slice(offset,offset+20);
    const saved=await db.batch(batch.flat());
    let index=0;
    for(const statements of batch){
      if(!saved[index].meta.changes)stable=false;
      index+=statements.length;
    }
  }
  const byArea=new Map();
  for(const progress of progresses){
    if(!byArea.has(progress.areaId))byArea.set(progress.areaId,[]);
    byArea.get(progress.areaId).push(progress);
  }
  const areas=new Map([...byArea].map(([id,nodes])=>{
    const area=areaProgress({area:{id},nodes});
    return [id,{requiredTotal:area.requiredTotal,requiredCompleted:area.requiredCompleted}];
  }));
  return {nodes,areas,stable};
}

export async function restartMasteryPractice(db,profile,pathway,input){
  const {nodeId,requestId,expectedAttemptId}=input??{};
  if(typeof nodeId!=='string'||nodeId.length>150||
    typeof requestId!=='string'||!/^[-0-9a-f]{36}$/i.test(requestId)||
    typeof expectedAttemptId!=='string'||expectedAttemptId.length>300||
    Object.keys(input).some(key=>!['nodeId','requestId','expectedAttemptId'].includes(key)))
    fail(400,'Choose an active practice attempt to restart.');
  const previous=()=>db.prepare('SELECT body FROM mastery_restart_requests WHERE profile_id=? AND node_id=? AND request_id=?')
    .bind(profile.id,nodeId,requestId).first();
  if(await previous())return {restarted:true};
  const skill=configuredSkills(pathway).get(nodeId);
  if(!skill)fail(409,'This skill does not have an active practice requirement.');
  const now=new Date().toISOString();
  const {scope,byNode}=await loadEvidence(db,profile,pathway,now);
  const [histories,policies]=await Promise.all([loadHistories(db,profile.id,scope,nodeId),knownPolicies(db,pathway)]);
  const prior=histories.get(nodeId)??{version:0,history:emptyHistory(scope,nodeId)};
  const result=restartAttempt(prior.history,{requestId,expectedAttemptId,policy:skill.policy,events:byNode.get(nodeId)??[],
    now,policies,contentProfile:facts.profileFor(nodeId)});
  if(!result.ok)fail(409,'This practice attempt has changed. Refresh before restarting.');
  const [saved]=await db.batch(transitionStatements(db,profile,pathway,prior,result.history,requestId));
  if(!saved.meta.changes&&!await previous())
    fail(409,'New practice or a new pathway version is available. Refresh before restarting.');
  return {restarted:true};
}
