import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import { questionEvidence } from '../../../cs-games/pathway/evidence.mjs';
import { studentContract } from '../../../cs-games/pathway/model.mjs';

export const courses = new Map(graph.courses.map(course=>[course.id,course.title]));
const activityCourses = new Map();
for (const node of graph.nodes) {
  for (const activity of node.practice) {
    const ids=activityCourses.get(activity.activityId) || new Set();
    ids.add(node.courseId);
    activityCourses.set(activity.activityId,ids);
  }
}
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,119}$/;
export const metadataId = value => typeof value==='string' && identifier.test(value) ? value : null;
const difficultyLabels=new Set(['beginner','intermediate','advanced','easy','medium','hard','mixed']);
export function practiceMetadata(event) {
  const difficulty=typeof event.difficulty==='string' ? event.difficulty.toLowerCase() : '';
  return {
    mode:metadataId(event.mode), assessedMode:metadataId(event.assessedMode),
    topic:metadataId(event.topic), familyId:metadataId(event.familyId),
    ...(metadataId(event.evidenceRevision)?{evidenceRevision:metadataId(event.evidenceRevision)}:{}),
    difficulty:difficultyLabels.has(difficulty) ? difficulty : null,
  };
}
export function cleanGameAttempt(event, validId) {
  const {questionId,sessionId,attempt,correct,courseId,activity}=event;
  if (!validId(questionId) || !validId(sessionId) || !Number.isInteger(attempt) || attempt<1 || attempt>1000 ||
      event.id!==questionId+':'+attempt || typeof correct!=='boolean' ||
      typeof activity!=='string' || !activityCourses.get(activity)?.has(courseId)) return null;
  const meta=practiceMetadata(event);
  const evidence=questionEvidence(graph,{
    ...meta, id:event.id, questionId, sessionId, courseId, activityId:activity,
    familyId:meta.familyId || 'unclassified', timestamp:new Date(event.occurred).toISOString(),
    firstAttempt:attempt===1, correct,
  });
  const nodeIds=evidence.nodeIds;
  const assisted=event.assisted===true;
  const independent=attempt===1 && !assisted;
  return {
    id:event.id, occurred:event.occurred, pathway:courseId, activity,
    data:{...meta, questionId, sessionId, attempt, correct, firstAttempt:attempt===1,
      assisted,n:Number(independent), c:Number(independent && correct),
      dimensions:independent ? nodeIds.map(id=>({scope:'node',id,n:1,c:Number(correct)})) : []},
  };
}
export async function publishedPlan(db,classId) {
  const row=await db.prepare(`SELECT r.snapshot FROM class_pathways p JOIN pathway_revisions r
    ON r.pathway_id=p.id AND r.revision=p.head WHERE p.class_id=?`).bind(classId).first();
  return row ? JSON.parse(row.snapshot) : null;
}
export async function readProfileEvidence(db,profileId) {
  const rows=await db.prepare(`SELECT json_extract(data,'$.evidence') evidence FROM performance_events
    WHERE profile=? AND kind='assessment' AND json_type(data,'$.evidence')='array' ORDER BY occurred DESC,id DESC`).bind(profileId).all();
  return rows.results.flatMap(row=>JSON.parse(row.evidence));
}
export function profilePathway(plan,evidence,practice) {
  return studentContract(plan,graph,evidence,{practice});
}

export async function readPracticeProgress(db,profileId) {
  const {results}=await db.prepare(`SELECT json_extract(d.value,'$.id') node,
    SUM(json_extract(d.value,'$.n')) attempted,SUM(json_extract(d.value,'$.c')) correct
    FROM performance_events e JOIN json_each(e.data,'$.dimensions') d
    WHERE e.profile=? AND e.kind='practice' AND json_extract(d.value,'$.scope')='node'
    GROUP BY node`).bind(profileId).all();
  return new Map(results.map(({node,attempted,correct})=>[node,{attempted,correct}]));
}
