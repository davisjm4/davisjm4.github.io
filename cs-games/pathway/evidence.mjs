import {resolveRecord} from '../../csp-games/exam-readiness/mapping.js';
// Called by a trusted source grader/profile adapter, never from a page visit.
// requestedMode may be Mixed; assessedMode and source family identify the actual question.
export function questionEvidence(graph,event,{trusted=false}={}) {
  if(!event.id||!event.questionId||!event.sessionId||!event.activityId||!event.familyId||!event.timestamp||!Number.isFinite(Date.parse(event.timestamp))||typeof event.correct!=='boolean')throw new Error('Scored questions require stable IDs, family, source and timestamp.');
  const assessedMode=event.assessedMode||event.mode;let nodeIds=[];
  if(event.courseId==='csp'){
    const mapped=resolveRecord({game:event.activityId,mode:assessedMode,topic:event.topic,details:{...event.details,familyId:event.familyId}});
    if(mapped&&mapped.quality==='direct')nodeIds=graph.nodes.filter(n=>n.courseId==='csp'&&n.standardRefs.some(s=>s.id===mapped.skillId)).map(n=>n.id);
  }else if(event.courseId==='robotics'&&event.activityId==='parts-sprint'){
    nodeIds=graph.nodes.filter(n=>n.courseId==='robotics'&&n.familySelectors.some(s=>
      s.activityId===event.activityId&&s.category===event.topic&&s.modes?.includes(assessedMode))).map(n=>n.id);
  }else if(event.nodeIds){nodeIds=event.nodeIds.filter(id=>graph.nodes.some(n=>n.id===id&&n.practice.some(a=>a.activityId===event.activityId)));}
  else nodeIds=graph.nodes.filter(n=>n.familySelectors.some(s=>s.activityId===event.activityId&&(s.modeId===assessedMode||s.modeIds?.includes(assessedMode)))).map(n=>n.id);
  const family=graph.questionFamilies.filter(f=>f.activityId===event.activityId&&f.sourceFamilyId===event.familyId);
  if(family.length)nodeIds=nodeIds.filter(id=>family.some(f=>f.nodeIds.includes(id)));
  return {id:event.id,questionId:event.questionId,sessionId:event.sessionId,timestamp:event.timestamp,activityId:event.activityId,familyId:event.familyId,nodeIds:[...new Set(nodeIds)],
    kind:'question',eligible:trusted&&nodeIds.length>0,firstAttempt:event.firstAttempt===true,correct:event.correct,skipped:event.skipped===true,revealed:event.revealed===true,
    subskills:event.subskills||[],requestedMode:event.requestedMode||event.mode,assessedMode};
}
