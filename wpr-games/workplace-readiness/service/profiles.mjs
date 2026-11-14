import { focusEnabled } from './learning-focus.mjs';
import { verifyFocusEvidence, creditFocusStatements } from './focus-launch.mjs';
import {defaultPathwayStatements,ensureClassPathway} from './default-pathways.mjs';
import { cleanGameAttempt, courses, metadataId, practiceMetadata, profilePathway, publishedPlan, readProfileEvidence, readPracticeProgress } from './profile-evidence.mjs';
import { DEMONSTRATION_TYPES } from '../../../cs-games/pathway/proficiency/demonstrations.mjs';
import { teacherIdentity } from './auth.mjs';
import { PROFILE_VERSION, WPR_ACTIVITY, PROFILE_ID, PROFILE_KEY, DAY, CLASS_DAYS, ARCHIVE_DAYS, SESSION_DAYS, BATCH_LIMIT } from '../online/profile-model.mjs';
import skills from '../content/skills.json' with {type:'json'};
import topics from '../content/topics.json' with {type:'json'};

const MAX_CLASSES=30, MAX_STUDENTS=100, MAX_EVENTS=20000;
const profileError=(status,message)=>{ throw Object.assign(new Error(message),{status}); };
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const randomKey=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const profileHash=async (s)=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
export const profilesEnabled=env=>env.ENABLE_STUDENT_PROFILES==='1';
const known = {
  skill:new Set(skills.skills.map(s=>s.id)),
  topic:new Set(topics.map(t=>t.id)),
  subtopic:new Set(topics.flatMap(t=>t.subtopics.map(s=>s[0]))),
};
const first=(db,sql,...v)=>db.prepare(sql).bind(...v).first();
const all=async(db,sql,...v)=>(await db.prepare(sql).bind(...v).all()).results;
const write=(db,sql,...v)=>db.prepare(sql).bind(...v).run();
const present=(value,pattern)=>typeof value==='string'&&pattern.test(value);

async function limit(db, scope, now, maximum) {
  const window=Math.floor(now/(15*60000));
  const result=await write(db,`INSERT INTO profile_limits(scope,window,hits) VALUES (?,?,1)
    ON CONFLICT(scope,window) DO UPDATE SET hits=hits+1 WHERE hits<?`,scope,window,maximum);
  if (!result.meta.changes) profileError(429,'Too many attempts. Wait before trying again.');
}
async function session(db, p, now) {
  const token=randomKey();
  const expires=now+SESSION_DAYS*DAY;
  const inserted=await write(db,`INSERT INTO profile_sessions(digest,profile,generation,expires)
    SELECT ?,p.id,p.generation,? FROM student_profiles p JOIN profile_classes c ON c.id=p.class_id
    WHERE p.id=? AND p.generation=? AND p.active=1 AND c.archived IS NULL AND c.expires>?`,
  await profileHash(token),expires,p.id,p.generation,now);
  if (!inserted.meta.changes) profileError(403,'Profile access is no longer active.');
  const c=await first(db,'SELECT id,course_id FROM profile_classes WHERE id=(SELECT class_id FROM student_profiles WHERE id=?)',p.id);
  return {id:p.id,token,expires,classId:c.id,courseId:c.course_id};
}
export async function studentProfile(request,env,now=Date.now()) {
  if (!profilesEnabled(env)) profileError(403,'Student profiles are unavailable.');
  const token=request.headers.get('Authorization')?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
  if (!token) profileError(401,'Student profile sign-in required.');
  const digest=await profileHash(token);
  const p=await first(env.DB,`SELECT p.id,p.class_id,p.generation,p.evidence_count,p.event_count,s.expires,c.title,c.course_id
    FROM profile_sessions s JOIN student_profiles p ON p.id=s.profile
    JOIN profile_classes c ON c.id=p.class_id WHERE s.digest=? AND s.expires>?
    AND p.active=1 AND p.generation=s.generation AND c.archived IS NULL AND c.expires>?`,digest,now,now);
  if (!p) profileError(401,'This profile session expired or was revoked.');
  return {...p,digest};
}
export async function ownerClass(db,owner,id,now=Date.now(),active=false) {
  if (!present(id,PROFILE_ID)) profileError(404,'Class not found.');
  const c=await first(db,'SELECT id,title,course_id,created,expires,archived FROM profile_classes WHERE id=? AND owner=? AND expires>?',id,owner,now);
  if (!c || (active && c.archived)) profileError(404,'Class not found.');
  return c;
}
async function issue(db,classId,now,owner=null,invite=null) {
  const id=crypto.randomUUID(), recovery=randomKey();
  const result=await write(db,`INSERT INTO student_profiles(id,class_id,recovery,created)
    SELECT ?,c.id,?,? FROM profile_classes c
    WHERE c.id=? AND c.archived IS NULL AND c.expires>?
      AND ((? IS NOT NULL AND c.owner=?) OR (? IS NOT NULL AND c.invite=?))
      AND (SELECT COUNT(*) FROM student_profiles WHERE class_id=c.id)<?`,
  id,await profileHash(recovery),now,classId,now,owner,owner,invite,invite,MAX_STUDENTS);
  if (!result.meta.changes) profileError(409,'The class is unavailable or full.');
  return {id,recovery,generation:0};
}
function validTimestamp(occurred,now) {
  return Number.isSafeInteger(occurred) && occurred>=now-CLASS_DAYS*DAY && occurred<=now+5*60000;
}
function cleanPractice(event,now) {
  if (event?.format==='game-attempt') {
    if (event.version!==PROFILE_VERSION || event.kind!=='practice' || !validTimestamp(event.occurred,now)) profileError(400,'Invalid game attempt.');
    const attempt=cleanGameAttempt(event,id=>present(id,PROFILE_ID));
    if (!attempt) profileError(400,'Invalid game or question metadata.');
    return attempt;
  }
  if (!event || event.version!==PROFILE_VERSION || !present(event.id,PROFILE_ID) ||
      event.pathway!==WPR_ACTIVITY.pathway || event.activity!==WPR_ACTIVITY.activity ||
      event.kind!=='practice' || event.n!==1 || (event.c!==0 && event.c!==1) ||
      !validTimestamp(event.occurred,now) ||
      !Array.isArray(event.dimensions) || event.dimensions.length>24) profileError(400,'Invalid practice event.');
  const dimensions=[], seen=new Set();
  for (const d of event.dimensions) {
    if (!d || !Object.hasOwn(known,d.scope) || !known[d.scope].has(d.id) || seen.has(d.scope+':'+d.id)) profileError(400,'Invalid skill or topic.');
    seen.add(d.scope+':'+d.id);
    dimensions.push({scope:d.scope,id:d.id,n:1,c:event.c});
  }
  if (dimensions.filter(d=>d.scope==='skill').length!==1) profileError(400,'A practice event needs one skill.');
  return {id:event.id,occurred:event.occurred,...WPR_ACTIVITY,
    data:{n:1,c:event.c,dimensions,questionId:metadataId(event.questionId),...practiceMetadata(event)}};
}
function eventInsert(db,p,{id,kind,occurred,pathway,activity,data},now,expectedRevision=null) {
  return db.prepare(`INSERT OR IGNORE INTO performance_events(profile,id,version,pathway,activity,kind,occurred,data)
    SELECT p.id,?,?,?,?,?,?,? FROM student_profiles p JOIN profile_classes c ON c.id=p.class_id
    WHERE p.id=? AND p.generation=? AND p.active=1 AND c.archived IS NULL AND c.expires>?
      AND p.event_count<? AND (? IS NULL OR EXISTS(SELECT 1 FROM class_pathways WHERE class_id=c.id AND head=?))`)
    .bind(id,PROFILE_VERSION,pathway,activity,kind,occurred,JSON.stringify(data),p.id,p.generation,now,MAX_EVENTS,expectedRevision,expectedRevision);
}
async function saveEvent(db,p,event,now,expectedRevision=null) {
  const result=await eventInsert(db,p,event,now,expectedRevision).run();
  if (!result.meta.changes && !await first(db,'SELECT 1 FROM performance_events WHERE profile=? AND id=?',p.id,event.id)) {
    profileError(409,'The profile, pathway revision, or record limit changed. Refresh and try again.');
  }
}
export async function saveProfileAssessment(db,p,receipt,report,now) {
  const {assignmentId,kind,n,c}=report;
  const dimensions=report.rows.map(({scope,id,n,c})=>({scope,id,n,c}));
  // The grader is authoritative. Do not copy prompts, answers, or free text.
  return saveEvent(db,p,{...WPR_ACTIVITY,id:await profileHash(receipt),kind:'assessment',occurred:Date.parse(report.date),
    data:{assignmentId,assignmentKind:kind,n,c,dimensions}},now);
}
async function progress(db,id,classId,{includePathway=false}={}) {
  const [activity,measures,history,attempts,plan,evidence,practice]=await Promise.all([
    all(db,`SELECT pathway,activity,kind,COUNT(*) events,
      SUM(json_extract(data,'$.n')) n,SUM(json_extract(data,'$.c')) c FROM performance_events
      WHERE profile=? GROUP BY pathway,activity,kind ORDER BY pathway,activity,kind`,id),
    all(db,`SELECT pathway,activity,kind,json_extract(d.value,'$.scope') scope,json_extract(d.value,'$.id') id,
      SUM(json_extract(d.value,'$.n')) n,SUM(json_extract(d.value,'$.c')) c
      FROM performance_events,json_each(data,'$.dimensions') d WHERE profile=?
      GROUP BY pathway,activity,kind,json_extract(d.value,'$.scope'),json_extract(d.value,'$.id') ORDER BY kind,scope,id`,id),
    all(db,`SELECT occurred,data FROM performance_events WHERE profile=? AND kind='assessment'
      AND json_type(data,'$.assignmentId') IS NOT NULL ORDER BY occurred DESC,id DESC LIMIT 120`,id),
    all(db,`SELECT id,pathway,activity,occurred,data FROM performance_events WHERE profile=? AND kind='practice'
      ORDER BY occurred DESC,id DESC LIMIT 100`,id),
    includePathway ? publishedPlan(db,classId) : null,
    includePathway ? readProfileEvidence(db,id) : [],
    includePathway ? readPracticeProgress(db,id) : null,
  ]);
  return {version:PROFILE_VERSION,id,activity,measures,
    attempts:attempts.map(({data,...row})=>({...row,...JSON.parse(data)})),
    verifiedEvidence:evidence, pathway:plan ? profilePathway(plan,evidence,practice) : null,
    assessments:history.map(r=>{
    return {occurred:r.occurred,...JSON.parse(r.data)};
  })};
}
async function classProgress(db,classId) {
  const roster=await all(db,'SELECT id FROM student_profiles WHERE class_id=?',classId);
  const reports=new Map(roster.map(({id})=>[id,{version:PROFILE_VERSION,id,activity:[],measures:[],assessments:[]}]));
  const [activity,measures,history]=await Promise.all([
    all(db,`SELECT e.profile,e.pathway,e.activity,e.kind,COUNT(*) events,
      SUM(json_extract(e.data,'$.n')) n,SUM(json_extract(e.data,'$.c')) c
      FROM performance_events e JOIN student_profiles p ON p.id=e.profile
      WHERE p.class_id=? GROUP BY e.profile,e.pathway,e.activity,e.kind`,classId),
    all(db,`SELECT e.profile,e.pathway,e.activity,e.kind,json_extract(d.value,'$.scope') scope,json_extract(d.value,'$.id') id,
      SUM(json_extract(d.value,'$.n')) n,SUM(json_extract(d.value,'$.c')) c
      FROM performance_events e JOIN student_profiles p ON p.id=e.profile,json_each(e.data,'$.dimensions') d
      WHERE p.class_id=? GROUP BY e.profile,e.pathway,e.activity,e.kind,json_extract(d.value,'$.scope'),json_extract(d.value,'$.id')`,classId),
    all(db,`WITH recent AS (SELECT e.profile,e.occurred,e.data,
      ROW_NUMBER() OVER (PARTITION BY e.profile ORDER BY e.occurred DESC,e.id DESC) rn
      FROM performance_events e JOIN student_profiles p ON p.id=e.profile WHERE p.class_id=? AND e.kind='assessment' AND json_type(e.data,'$.assignmentId') IS NOT NULL)
      SELECT profile,occurred,data FROM recent WHERE rn<=120 ORDER BY occurred DESC`,classId),
  ]);
  for (const {profile,...r} of activity) reports.get(profile)?.activity.push(r);
  for (const {profile,...r} of measures) reports.get(profile)?.measures.push(r);
  for (const {profile,occurred,data} of history) {
    const {dimensions,...scores}=JSON.parse(data);
    reports.get(profile)?.assessments.push({occurred,...scores});
  }
  return {reports:[...reports.values()]};
}
function validateTitle(input) {
  const title=typeof input?.title==='string' ? input.title.trim() : '';
  if (!title || title.length>80 || /[\u0000-\u001f]/.test(title)) profileError(400,'Enter a class title of 1 to 80 characters.');
  if (Object.keys(input).some(key=>!['title','courseId','creationKey'].includes(key))) profileError(400,'Send the class title and course only.');
  const courseId=input.courseId ?? 'workplace';
  if (!courses.has(courseId)) profileError(400,'Choose a supported course.');
  if(input.creationKey!==undefined&&!present(input.creationKey,PROFILE_KEY)) profileError(400,'Invalid class creation key.');
  return {title,courseId,creationKey:input.creationKey};
}
async function teacherRoute(request,env,segments,readBody,now) {
  const owner=await teacherIdentity(request,env), db=env.DB, method=request.method;
  if (!owner) profileError(401,'Teacher sign-in required.');
  const [classId,section,profileId,action,extra]=segments;
  if (extra) profileError(404,'Profile route not found.');
  if (!classId) {
    if (method==='GET') return {classes:await all(db,`SELECT id,title,course_id,created,expires,archived FROM profile_classes
      WHERE owner=? AND expires>? ORDER BY created DESC`,owner,now)};
    if (method==='POST') {
      const {title,courseId,creationKey}=validateTitle(await readBody(request));
      const id=crypto.randomUUID();
      // The retry key has 256 bits of client entropy. Neither it nor the enrollment link is stored in plaintext.
      const requestDigest=creationKey?await profileHash('create-class:'+creationKey):null;
      const invite=creationKey?await profileHash('class-enrollment:'+owner+':'+creationKey):randomKey();
      const inviteDigest=await profileHash(invite);
      const insert=db.prepare(`INSERT INTO profile_classes(id,owner,title,invite,created,expires,course_id,creation_request)
        SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM profile_classes WHERE owner=? AND expires>?)<?
          AND NOT EXISTS (SELECT 1 FROM profile_classes WHERE owner=? AND creation_request=?)`)
        .bind(id,owner,title,inviteDigest,now,now+CLASS_DAYS*DAY,courseId,requestDigest,owner,now,MAX_CLASSES,owner,requestDigest);
      const [created]=await db.batch([insert,...defaultPathwayStatements(db,{classId:id,owner,title,courseId,now})]);
      if(created.meta.changes)return {id,invite};
      const prior=requestDigest&&await first(db,`SELECT id,title,course_id,invite,archived,expires FROM profile_classes
        WHERE owner=? AND creation_request=?`,owner,requestDigest);
      if(!prior)profileError(429,'Class limit reached.');
      if(prior.title!==title||prior.course_id!==courseId||prior.archived||prior.expires<=now)
        profileError(409,'This creation request already belongs to a different or inactive class.');
      return {id:prior.id,invite:prior.invite===inviteDigest?invite:null};
    }
  }
  if(classId==='default-pathways'&&!section&&method==='POST'){
    const candidates=await all(db,`SELECT id,title,course_id FROM profile_classes c
      WHERE owner=? AND archived IS NULL AND expires>? AND NOT EXISTS (SELECT 1 FROM class_pathways WHERE class_id=c.id)`,owner,now);
    for(const c of candidates)await db.batch(defaultPathwayStatements(db,{classId:c.id,owner,now,title:c.title,courseId:c.course_id}));
    return {checked:candidates.length};
  }
  const c=await ownerClass(db,owner,classId,now);
  if (!section && method==='GET') {
    const roster=await all(db,`SELECT p.id,p.active,p.created,COUNT(e.id) events,MAX(e.occurred) latest
      FROM student_profiles p LEFT JOIN performance_events e ON e.profile=p.id
      WHERE p.class_id=? GROUP BY p.id ORDER BY p.created,p.id`,c.id);
    return {class:c,roster};
  }
  if (section==='progress' && !profileId && method==='GET') return classProgress(db,c.id);
  if (!section && method==='DELETE') {
    await write(db,'DELETE FROM profile_classes WHERE id=? AND owner=?',c.id,owner);
    return {deleted:true};
  }
  if (section==='invite' && !profileId && method==='POST' && !c.archived) {
    const invite=randomKey();
    const result=await write(db,'UPDATE profile_classes SET invite=? WHERE id=? AND owner=? AND archived IS NULL AND expires>?',await profileHash(invite),c.id,owner,now);
    if (!result.meta.changes) profileError(409,'The class is no longer active.');
    return {invite};
  }
  if (section==='archive' && !profileId && method==='POST') {
    await write(db,'UPDATE profile_classes SET archived=?,expires=MIN(expires,?) WHERE id=? AND owner=? AND archived IS NULL',now,now+ARCHIVE_DAYS*DAY,c.id,owner);
    return {archived:true};
  }
  if (section==='students' && !profileId && method==='POST' && !c.archived) {
    const {id,recovery}=await issue(db,c.id,now,owner);
    return {id,recovery};
  }
  if (section==='students' && present(profileId,PROFILE_ID)) {
    const p=await first(db,'SELECT id FROM student_profiles WHERE id=? AND class_id=?',profileId,c.id);
    if (!p) profileError(404,'Student profile not found.');
    if (!action && method==='GET') return {...await progress(db,p.id,c.id,{includePathway:true}),classTitle:c.title,courseId:c.course_id};
    if (action==='evidence' && method==='POST') return recordTeacherEvidence(db,c,p.id,await readBody(request),now);
    if (!action && method==='DELETE') {
      await write(db,'DELETE FROM student_profiles WHERE id=? AND class_id=?',p.id,c.id);
      return {deleted:true};
    }
    if (['reset','revoke'].includes(action) && method==='POST' && !c.archived) {
      const recovery=randomKey(), active=Number(action==='reset');
      const result=await write(db,`UPDATE student_profiles SET recovery=?,generation=generation+1,active=?
        WHERE id=? AND class_id IN (SELECT id FROM profile_classes WHERE id=? AND owner=? AND archived IS NULL AND expires>?)`,
      await profileHash(recovery),active,p.id,c.id,owner,now);
      if (!result.meta.changes) profileError(409,'The class is no longer active.');
      return action==='reset'?{id:p.id,recovery}:{revoked:true};
    }
  }
  profileError(404,'Profile route not found.');
}
async function recordTeacherEvidence(db,classroom,profileId,input,now) {
  const allowed=['id','nodeId','score','award','revision','demonstrationType'];
  if (!input || Object.keys(input).some(key=>!allowed.includes(key)) || !present(input.id,PROFILE_ID) ||
      !Number.isFinite(input.score) || input.score<0 || input.score>4 || !Number.isInteger(input.score*2) ||
      (input.demonstrationType!==undefined&&(typeof input.demonstrationType!=='string'||!Object.hasOwn(DEMONSTRATION_TYPES,input.demonstrationType))) ||
      typeof input.award!=='boolean' || !Number.isInteger(input.revision)) {
    profileError(400,'Select a published checkpoint and a score from 0 to 4 in half-point steps.');
  }
  const p=await first(db,'SELECT id,generation FROM student_profiles WHERE id=? AND class_id=? AND active=1',profileId,classroom.id);
  if (!p || classroom.archived) profileError(404,'This student profile is inactive.');
  const plan=await publishedPlan(db,classroom.id);
  if (!plan || plan.revision!==input.revision) profileError(409,'The published pathway changed. Reload student progress.');
  const checkpoint=plan.checkpoints.find(item=>item.nodeId===input.nodeId);
  if (!checkpoint) profileError(400,'This skill is outside the published pathway.');
  const timestamp=new Date(now).toISOString();
  const assessment={id:input.id,nodeIds:[checkpoint.nodeId],kind:'assessment',score:input.score,eligible:true,timestamp,
    ...(input.demonstrationType?{demonstrationType:input.demonstrationType}:{})};
  const evidence=[assessment];
  if (input.award) evidence.push({...assessment,id:input.id+':award',kind:'mastery-award',
    policyId:checkpoint.policyId,policyVersion:checkpoint.policyVersion});
  await saveEvent(db,p,{id:input.id,kind:'assessment',pathway:plan.courseId,activity:'teacher-assessment',occurred:now,
    data:{pathwayId:plan.id,pathwayRevision:plan.revision,evidence,n:0,c:0,dimensions:[]}},now,plan.revision);
  return {accepted:true,id:input.id};
}
async function syncPractice(db,p,events,now,authorized=[],rejected=[]) {
  const published=await first(db,'SELECT id,head FROM class_pathways WHERE class_id=? AND head>0',p.class_id);
  const items=events.map((event,index)=>({ ...event, kind:'practice',data:{...event.data,
    pathwayId:authorized[index]?.launch.pathway_id ?? published?.id ?? null,
    receivedUnderRevision:authorized[index]?.launch.pathway_revision ?? published?.head ?? null,
    ...(authorized[index] ? {classLaunchId:authorized[index].launch.id} : {})} }));
  if (!items.length) return {accepted:[],rejected};
  await db.batch(items.flatMap((event,index)=>[eventInsert(db,p,event,now),...creditFocusStatements(db,p,event,authorized[index],now)]));
  const ids=[...new Set(items.map(event=>event.id))];
  const accepted=(await all(db,'SELECT id FROM performance_events WHERE profile=? AND id IN ('+
    ids.map(()=>'?').join(',')+')',p.id,...ids)).map(row=>row.id);
  if (!accepted.length) profileError(409,'The profile is inactive or its record limit was reached.');
  const found=new Set(accepted);
  return {accepted:ids.filter(id=>found.has(id)),...(rejected.length?{rejected}:{})};
}
export async function routeProfiles(request,env,segments,readBody,now) {
  if (!profilesEnabled(env)) profileError(404,'Student profiles are unavailable.');
  if (segments[0]==='teacher') return teacherRoute(request,env,segments.slice(2),readBody,now);
  const action=segments[1], method=request.method, db=env.DB;
  if (segments.length!==2) profileError(404,'Profile route not found.');
  if (action==='enroll' && method==='POST') {
    await limit(db,'enroll',now,600);
    const {invite,...extra}=await readBody(request) || {};
    if (Object.keys(extra).length || !present(invite,PROFILE_KEY)) profileError(400,'Invalid enrollment link.');
    const hash=await profileHash(invite);
    const c=await first(db,'SELECT id,owner FROM profile_classes WHERE invite=? AND archived IS NULL AND expires>?',hash,now);
    if (!c) profileError(404,'Enrollment link is inactive.');
    await ensureClassPathway(db,c.owner,c.id,now);
    const p=await issue(db,c.id,now,null,hash);
    return {...await session(db,p,now),recovery:p.recovery};
  }
  if (action==='restore' && method==='POST') {
    await limit(db,'restore',now,600);
    const {id,recovery,...extra}=await readBody(request) || {};
    if (Object.keys(extra).length || !present(id,PROFILE_ID) || !present(recovery,PROFILE_KEY)) profileError(401,'Invalid profile ID or recovery credential.');
    await limit(db,'restore:'+id,now,8);
    const p=await first(db,`SELECT p.id,p.generation FROM student_profiles p JOIN profile_classes c ON c.id=p.class_id
      WHERE p.id=? AND p.recovery=? AND p.active=1 AND c.archived IS NULL AND c.expires>?`,id,await profileHash(recovery),now);
    if (!p) profileError(401,'Invalid profile ID or recovery credential.');
    return session(db,p,now);
  }
  const p=await studentProfile(request,env,now);
  if (action==='identity' && method==='GET') return {id:p.id,classId:p.class_id,courseId:p.course_id,classTitle:p.title};
  if (action==='me' && method==='GET') return {...await progress(db,p.id,p.class_id),classId:p.class_id,courseId:p.course_id,classTitle:p.title};
  if (action==='signout' && method==='POST') {
    await write(db,'DELETE FROM profile_sessions WHERE digest=?',p.digest);
    return {signedOut:true};
  }
  if (action==='sync' && method==='POST') {
    const input=await readBody(request);
    if (!Array.isArray(input?.events) || !input.events.length || input.events.length>BATCH_LIMIT) profileError(400,'Send 1 to 25 practice events.');
    const events=input.events.map(event=>cleanPractice(event,now));
    await limit(db,'sync:'+p.id,now,240);
    if (!focusEnabled(env)) return syncPractice(db,p,events,now);
    const allowed=[], authorized=[], rejected=[];
    for (let index=0;index<events.length;index++) {
      const event=events[index], source=input.events[index];
      const validation=source.learner==='guest' ? false : await verifyFocusEvidence(env,p,event,source.classLaunchId,now);
      if (!validation) {
        rejected.push({id:event.id,code:'class-context'});
        continue;
      }
      allowed.push(event);
      authorized.push(validation);
    }
    return syncPractice(db,p,allowed,now,authorized,rejected);
  }
  profileError(404,'Profile route not found.');
}
export async function purgeProfiles(db,now) {
  await write(db,'DELETE FROM profile_classes WHERE expires<=?',now);
  await write(db,`DELETE FROM profile_sessions WHERE expires<=? OR generation<>(
    SELECT generation FROM student_profiles WHERE id=profile)`,now);
  await write(db,'DELETE FROM profile_limits WHERE window<?',Math.floor(now/(15*60000))-1);
}
