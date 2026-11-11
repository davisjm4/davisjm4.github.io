// Versioned cross-pathway contract. New pathways supply their own catalog
// and adapter. The Workplace Readiness event shape remains supported.
export const PROFILE_VERSION = 1;
export const WPR_ACTIVITY = {pathway:'workplace-readiness', activity:'workplace-readiness-games'};
export const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const PROFILE_KEY = /^[0-9a-f]{64}$/;
export const DAY = 86400000;
export const CLASS_DAYS = 365;
export const ARCHIVE_DAYS = 30;
export const SESSION_DAYS = 30;
export const BATCH_LIMIT = 25;

export function practiceEvent(q, right, occurred = Date.now(), id = crypto.randomUUID()) {
  const map = new Map([['skill:'+q.skill,{scope:'skill',id:q.skill}]]);
  for (const t of q.tags || []) {
    map.set('topic:'+t.topicId,{scope:'topic',id:t.topicId});
    map.set('subtopic:'+t.subtopicId,{scope:'subtopic',id:t.subtopicId});
  }
  return {version:PROFILE_VERSION,id,...WPR_ACTIVITY,kind:'practice',occurred,n:1,c:Number(right),mode:q.mode ?? null,
    questionId:q.id ?? null,familyId:q.familyId ?? q.family ?? null,difficulty:q.difficulty ?? null,dimensions:[...map.values()]};
}
