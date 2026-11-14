import graph from '../../../cs-games/pathway/curriculum-graph.json' with { type:'json' };
import { assignmentDestinations, classWork } from '../../../cs-games/pathway/assignments/access.mjs';
import { studentContract } from '../../../cs-games/pathway/model.mjs';
import { practiceLinks } from '../../../cs-games/student/practice-links.mjs';
import { PROFILE_ID, DAY } from '../online/profile-model.mjs';
import { publishedPlan } from './profile-evidence.mjs';
import { focusEnabled, focusState, studentWork } from './learning-focus.mjs';
import { studentProfile } from './profiles.mjs';

const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
const first = (db,sql,...args) => db.prepare(sql).bind(...args).first();
const launchId = value => typeof value==='string' && PROFILE_ID.test(value);
const launchLifetime = 7*DAY;
const pageOrigin = 'https://cs-games.invalid';

function resolveDestination(pathway, input) {
  const scope = pathway.nodes.filter(node=>input.nodeId ? node.id===input.nodeId : node.areaId===input.areaId);
  const safe = value => typeof value==='string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
  if (!safe(input.href)) fail(400,'Choose a practice activity from your class pathway.');
  const requested = new URL(input.href,pageOrigin);
  requested.searchParams.delete('returnTo');
  const destinations = scope.flatMap(node=>{
    const {links,mixed}=practiceLinks(node);
    return [...links,mixed].filter(link=>safe(link?.url))
      .filter(link=>new URL(link.url,pageOrigin).href===requested.href)
      .map(link=>({nodeId:node.id,activityId:link.activityId,kind:link.kind??'mixed'}));
  });
  if (!destinations.length) fail(400,'This practice link is unavailable in your class.');
  return { requested,destinations };
}

export async function createFocusLaunch(env,request,input,now) {
  if (!focusEnabled(env)) fail(404,'Class launch verification is unavailable.');
  const profile=await studentProfile(request,env,now);
  const plan=await publishedPlan(env.DB,profile.class_id);
  if(!plan)fail(404,'Your class pathway is unavailable.');
  if(input?.classId!==profile.class_id)fail(403,'Open practice from your active class.');
  const pathway=studentContract(plan,graph);
  const {requested,destinations}=resolveDestination(pathway,input);
  const state=await focusState(env.DB,profile.class_id);
  const work=studentWork(profile,pathway,state,now);
  const permitted=work.grants.length ?
    destinations.filter(d=>work.allowed.some(a=>a.nodeId===d.nodeId&&a.activityId===d.activityId)) : destinations;
  if(!permitted.length)fail(403,'Practice is limited to your assigned work. You can still open either active assignment.');
  // Mixed sets can contain unrelated questions. Reserve a focused route instead
  // whenever the assigned scope does not cover the mixed pool.
  if(work.grants.length && permitted.some(d=>d.kind==='mixed')) {
    const available=assignmentDestinations(pathway,{kind:'activity',id:permitted[0].activityId});
    const allAllowed=available.every(d=>work.allowed.some(a=>a.nodeId===d.nodeId&&a.activityId===d.activityId));
    if(!allAllowed)fail(403,'Open a focused skill to practice within your current assignment.');
    permitted.splice(0,permitted.length,...available);
  } else if (permitted.some(d=>d.kind==='mixed')) {
    permitted.splice(0,permitted.length,...assignmentDestinations(pathway,{kind:'activity',id:permitted[0].activityId}));
  }
  const activity=permitted[0].activityId;
  const applicable=[...work.classwork,...work.catchUp];
  const assignments=applicable.filter(item=>item.destinations.some(d=>d.activityId===activity&&permitted.some(p=>p.nodeId===d.nodeId)));
  const primary=input.assignmentId ? assignments.find(item=>item.id===input.assignmentId) : null;
  if(input.assignmentId&&!primary)fail(403,'This assignment is unavailable for your active profile.');
  const id=crypto.randomUUID();
  const destination=requested.pathname+requested.search+requested.hash;
  const exists=await env.DB.prepare(`INSERT INTO learning_focus_launches
    (id,profile_id,generation,pathway_id,pathway_revision,activity,node_ids,assignment_refs,destination,created,expires,restricted)
    SELECT ?,p.id,p.generation,?,?,?,?,?,?,?,?,? FROM student_profiles p
    JOIN profile_classes c ON c.id=p.class_id JOIN class_pathways w ON w.class_id=c.id
    WHERE p.id=? AND p.generation=? AND p.active=1 AND c.archived IS NULL AND c.expires>?
      AND w.id=? AND w.head=?`)
    .bind(id,plan.id,plan.revision,activity,JSON.stringify([...new Set(permitted.map(d=>d.nodeId))]),
      JSON.stringify(assignments.map(item=>({id:item.id,revision:item.revision}))),destination,now,now+launchLifetime,
      Number(work.grants.length>0),profile.id,profile.generation,now,plan.id,plan.revision).run();
  if(!exists.meta.changes)fail(409,'Your class changed. Open the activity from the class pathway again.');
  if(primary)await advanceFocus(env.DB,profile.id,primary,'started',now);
  return {id,destination,restricted:work.grants.length>0,expires:now+launchLifetime};
}

async function readLaunch(db,profile,id,now) {
  if(!launchId(id))return null;
  return first(db,`SELECT * FROM learning_focus_launches WHERE id=? AND profile_id=? AND generation=? AND expires>?`,
    id,profile.id,profile.generation,now);
}

export async function verifyFocusLaunch(env,request,id,now) {
  if(!focusEnabled(env))fail(404,'Class launch verification is unavailable.');
  const profile=await studentProfile(request,env,now);
  const launch=await readLaunch(env.DB,profile,id,now);
  if(!launch)fail(403,'Open this activity from your class pathway.');
  const plan=await publishedPlan(env.DB,profile.class_id);
  if(!plan)fail(404,'Your class pathway is unavailable.');
  const state=await focusState(env.DB,profile.class_id);
  const work=classWork({member:{id:profile.id,classId:profile.class_id,active:true},
    ...state,now,pathway:studentContract(plan,graph)});
  const launchedNodes=JSON.parse(launch.node_ids);
  if(work.grants.length && !launchedNodes.every(nodeId=>work.allowed.some(d=>d.nodeId===nodeId&&d.activityId===launch.activity)))
    fail(403,'Your class access changed. Open an available assignment.');
  return {id,destination:launch.destination,restricted:work.grants.length>0,expires:launch.expires};
}

export async function verifyFocusEvidence(env,profile,event,token,now) {
  if(!token)return false;
  const launch=await readLaunch(env.DB,profile,token,now);
  if(!launch||event.occurred<launch.created-60000||event.occurred>launch.expires) return false;
  const supported=launch.activity===event.activity ||
    (launch.activity==='workplace-readiness'&&event.activity==='workplace-readiness-games');
  if(!supported || (event.pathway!==profile.course_id&&!(profile.course_id==='workplace'&&event.pathway==='workplace-readiness')))return false;
  const nodeIds=new Set(JSON.parse(launch.node_ids));
  const measured=event.data.dimensions.filter(row=>row.scope==='node');
  const measuredIds=event.pathway==='workplace-readiness' ?
    graph.nodes.filter(n=>n.courseId==='workplace'&&n.standardRefs.some(s=>event.data.dimensions.some(d=>d.scope==='skill'&&d.id===s.id))).map(n=>n.id) :
    event.mappedNodes ?? measured.map(row=>row.id);
  if (launch.restricted && measuredIds.some(id=>!nodeIds.has(id)))return false;
  const plan=await publishedPlan(env.DB,profile.class_id);
  if(!plan||plan.id!==launch.pathway_id)return false;
  const pathway=studentContract(plan,graph);
  const work=studentWork(profile,pathway,await focusState(env.DB,profile.class_id),now);
  const relevant=measuredIds.length?measuredIds:[...nodeIds];
  if(work.grants.length&&relevant.some(id=>!work.allowed.some(d=>d.nodeId===id&&d.activityId===launch.activity)))return false;
  return {launch,measuredIds:measuredIds.filter(id=>nodeIds.has(id))};
}

export async function advanceFocus(db,profileId,assignment,state,now) {
  await db.prepare(`INSERT INTO learning_focus_progress(focus_id,focus_revision,profile_id,state,updated)
    SELECT r.focus_id,r.revision,?,?,? FROM learning_focus_revisions r
    WHERE r.focus_id=? AND r.revision=?
    ON CONFLICT(focus_id,focus_revision,profile_id) DO UPDATE SET state=excluded.state,updated=excluded.updated
    WHERE learning_focus_progress.state!='complete' AND (excluded.state!='started' OR learning_focus_progress.state='started')`)
    .bind(profileId,state,now,assignment.id,assignment.revision).run();
}

export function creditFocusStatements(db,profile,event,validated,now) {
  if (!validated || !event.data.n || !validated.measuredIds.length) return [];
  const {launch,measuredIds}=validated;
  return JSON.parse(launch.assignment_refs).flatMap(assignment=>{
    // One ordinary qualifying response is the disclosed completion criterion for
    // supported work. The assignment record references the original event only.
    const hasEvidence=`EXISTS (SELECT 1 FROM performance_events e WHERE e.profile=? AND e.id=? AND
      json_extract(e.data,'$.classLaunchId')=?)`;
    const applies=`EXISTS (SELECT 1 FROM json_each(r.destinations) dest
      WHERE json_extract(dest.value,'$.activityId')=? AND json_extract(dest.value,'$.nodeId') IN (SELECT value FROM json_each(?)))`;
    const args=[profile.id,event.id,launch.id,launch.activity,JSON.stringify(measuredIds)];
    return [
      db.prepare(`INSERT OR IGNORE INTO learning_focus_completion(focus_id,focus_revision,profile_id,actor,recorded,source)
        SELECT r.focus_id,r.revision,?,?,?,'qualifying-practice' FROM learning_focus_revisions r
        WHERE r.focus_id=? AND r.revision=? AND ${hasEvidence} AND ${applies}`)
        .bind(profile.id,profile.id,now,assignment.id,assignment.revision,...args),
      db.prepare(`INSERT INTO learning_focus_progress(focus_id,focus_revision,profile_id,state,updated)
        SELECT focus_id,focus_revision,profile_id,'complete',recorded FROM learning_focus_completion
        WHERE focus_id=? AND focus_revision=? AND profile_id=?
        ON CONFLICT(focus_id,focus_revision,profile_id) DO UPDATE SET state='complete',updated=excluded.updated`)
        .bind(assignment.id,assignment.revision,profile.id),
    ];
  });
}
