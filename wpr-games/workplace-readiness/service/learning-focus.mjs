import graph from '../../../cs-games/pathway/curriculum-graph.json' with { type: 'json' };
import { assignmentDestinations, classWork, recommendedWork } from '../../../cs-games/pathway/assignments/access.mjs';
import { studentContract } from '../../../cs-games/pathway/model.mjs';
import { ownerClass, profilesEnabled, studentProfile } from './profiles.mjs';
import { publishedPlan } from './profile-evidence.mjs';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const targetKinds = new Set(['area', 'skill', 'skill-group', 'activity']);
const scopes = new Set(['class', 'group', 'individual']);
const keys = new Set(['target', 'scope', 'recipientIds', 'mode', 'startAt', 'timeZone', 'reason']);
const stableId = value => typeof value === 'string' && value.length > 0 && value.length <= 150;

function normalizeTarget(target) {
  if (!target || !targetKinds.has(target.kind)) fail(400, 'Choose a supported assignment target.');
  if (target.kind !== 'skill-group') {
    if (!stableId(target.id)) fail(400, 'Choose a published assignment target.');
    return { kind: target.kind, id: target.id };
  }
  if (!Array.isArray(target.nodeIds) || !target.nodeIds.length || target.nodeIds.length > 100 || !target.nodeIds.every(stableId))
    fail(400, 'Choose one or more published skills for this group.');
  return { kind: target.kind, nodeIds: [...new Set(target.nodeIds)].sort() };
}

function schedule(startAt, timeZone, now) {
  if (startAt == null) return { startAt: now, timeZone: null };
  if (!Number.isSafeInteger(startAt) || startAt < now || startAt > now + 365 * 86400000 ||
      typeof timeZone !== 'string' || timeZone.length > 64) fail(400, 'Choose a future start time and class time zone.');
  try {
    return { startAt, timeZone: new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone };
  } catch {
    fail(400, 'Choose a valid class time zone.');
  }
}

async function previewLearningFocus(env, { owner, classId, input, now }) {
  if (!profilesEnabled(env)) fail(404, 'Learning focus is unavailable.');
  const classroom = await ownerClass(env.DB, owner, classId, now, true);
  if (!input || Object.keys(input).some(key => !keys.has(key)) || !scopes.has(input.scope))
    fail(400, 'Choose a class, group, or individual recipient scope.');
  const mode = input.mode ?? 'advisory';
  if (mode !== 'advisory') fail(400, 'Classroom assignments are advisory.');
  const reason = input.reason == null ? null : input.reason;
  if (reason !== null && (typeof reason !== 'string' || reason.length > 160 || /[\u0000-\u001f]/.test(reason))) fail(400, 'Use a short classroom instruction for the reason.');
  const target = normalizeTarget(input.target);
  const timing = schedule(input.startAt, input.timeZone, now);
  const recipientIds = input.recipientIds ?? [];
  if (!Array.isArray(recipientIds) || recipientIds.length > 100 || !recipientIds.every(stableId) ||
      new Set(recipientIds).size !== recipientIds.length ||
      (input.scope === 'class' && recipientIds.length !== 0) ||
      (input.scope === 'individual' && recipientIds.length !== 1) ||
      (input.scope === 'group' && recipientIds.length === 0)) fail(400, 'Select the recipients for this assignment.');
  const plan = await publishedPlan(env.DB, classroom.id);
  if (!plan) fail(409, 'Publish the class pathway before assigning learning focus.');
  const destinations = assignmentDestinations(studentContract(plan, graph), target);
  if (!destinations.length) fail(400, 'Choose a target with practice in the published class pathway.');

  const { results } = await env.DB.prepare('SELECT id FROM student_profiles WHERE class_id=? AND active=1').bind(classroom.id).all();
  const active = new Set(results.map(row => row.id).sort());
  if (recipientIds.some(id => !active.has(id))) fail(400, 'At least one selected profile is unavailable in this class.');
  return {
    affectedIds: input.scope === 'class' ? [...active] : recipientIds,
    preview: {
      classId: classroom.id,
      pathwayId: plan.id,
      pathwayRevision: plan.revision,
      scope: input.scope,
      mode,
      ...(reason ? { reason: reason.trim() } : {}),
      target,
      destinations,
      ...timing,
      recipientIds,
      activeRecipientCount: input.scope === 'class' ? active.size : recipientIds.length,
    },
  };
}

const previewLifetime = 10 * 60 * 1000;
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const utf8 = new TextEncoder();
const bytesToHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const hexToBytes = hex => Uint8Array.from(hex.match(/../g), pair => Number.parseInt(pair, 16));
const previewBody = (owner, preview, at, edit) => JSON.stringify(['learning-focus-preview-v2', owner, at, edit, preview]);

async function previewKey(env) {
  if (typeof env.SUBMISSION_SECRET !== 'string' || env.SUBMISSION_SECRET.length < 32) fail(503, 'Assignment previews are unavailable.');
  return crypto.subtle.importKey('raw', utf8.encode(env.SUBMISSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function prepareFocusPreview(env, options) {
  if (options.input?.edit && !focusEnabled(env)) fail(404, 'Learning focus is unavailable.');
  await ownerClass(env.DB, options.owner, options.classId, options.now, true);
  const edit = await editContext(env.DB, options.classId, options.input?.edit);
  const { edit: ignored, ...assignment } = options.input ?? {};
  const reviewed = await previewLearningFocus(env, { ...options, input: assignment });
  const signature = await crypto.subtle.sign('HMAC', await previewKey(env), utf8.encode(previewBody(options.owner, reviewed, options.now, edit)));
  return { ...reviewed.preview, previewAt: options.now, previewSignature: bytesToHex(new Uint8Array(signature)) };
}

export async function publishLearningFocus(env, { owner, classId, input, now }) {
  if (!focusEnabled(env)) fail(404, 'Learning focus is unavailable.');
  const classroom = await ownerClass(env.DB, owner, classId, now, true);
  const { requestId, assignment, previewAt, previewSignature, edit: requestedEdit } = input ?? {};
  const focusId = requestedEdit?.id ?? requestId;
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId) || !Number.isSafeInteger(previewAt) ||
      typeof previewSignature !== 'string' || !/^[a-f0-9]{64}$/.test(previewSignature)) fail(400, 'Preview this assignment before publishing.');
  const db = env.DB;
  const previous = () => db.prepare(`SELECT r.request_digest,r.revision FROM learning_focus f
    JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.request_id=?
    WHERE f.class_id=? AND f.id=?`).bind(requestId, classroom.id, focusId).first();
  const digest = bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8.encode(JSON.stringify([owner, classId, assignment, previewAt, previewSignature, requestedEdit ?? null])))));
  function replay(row) {
    if (row.request_digest !== digest) fail(409, 'This request already published a different assignment.');
    return { id: focusId, revision: row.revision };
  }
  const prior = await previous();
  if (prior) return replay(prior);
  if (previewAt > now || now - previewAt > previewLifetime) fail(409, 'Preview the current assignment before publishing.');
  const edit = await editContext(db, classId, requestedEdit);
  const reviewed = await previewLearningFocus(env, { owner, classId, input: assignment, now: previewAt });
  const { preview, affectedIds } = reviewed;
  const signed = await crypto.subtle.verify('HMAC', await previewKey(env), hexToBytes(previewSignature), utf8.encode(previewBody(owner, reviewed, previewAt, edit)));
  if (!signed) fail(409, 'The assignment or class changed. Preview it again before publishing.');

  const revision = (edit?.revision ?? 0) + 1;
  const verifiedClass = `SELECT c.id FROM profile_classes c JOIN class_pathways p ON p.class_id=c.id
    WHERE c.id=? AND c.owner=? AND c.archived IS NULL AND c.expires>?
      AND p.id=? AND p.head=?
      AND (? <> 'class' OR (SELECT COUNT(*) FROM student_profiles WHERE class_id=c.id AND active=1)=?)
      AND NOT EXISTS (SELECT 1 FROM json_each(?) selected WHERE NOT EXISTS
        (SELECT 1 FROM student_profiles WHERE id=selected.value AND class_id=c.id AND active=1))`;
  const classValues = [classId, owner, now, preview.pathwayId, preview.pathwayRevision,
    preview.scope, preview.activeRecipientCount, JSON.stringify(affectedIds)];
  const create = db.prepare(`INSERT INTO learning_focus(id,class_id,created)
    SELECT ?,c.id,? FROM (${verifiedClass}) c`).bind(focusId, now, ...classValues);
  const scopeCheck = edit ? `AND f.head=? AND EXISTS (${verifiedClass})` : 'AND f.created=?';
  const insert = db.prepare(`INSERT INTO learning_focus_revisions
    (focus_id,revision,pathway_id,pathway_revision,actor,recorded,request_id,request_digest,state,start_at,scope,target,destinations,time_zone,reason)
    SELECT f.id,?,?,?,?,?,?,?,'published',?,?,?,?,?,? FROM learning_focus f
    WHERE f.id=? AND f.class_id=? ${scopeCheck}`)
    .bind(revision, preview.pathwayId, preview.pathwayRevision, owner, now, requestId, digest, preview.startAt, preview.scope,
      JSON.stringify(preview.target), JSON.stringify(preview.destinations), preview.timeZone, preview.reason ?? null,
      focusId, classId, ...(edit ? [edit.revision,...classValues] : [now]));
  const recipients = db.prepare(`INSERT INTO learning_focus_recipients(focus_id,revision,profile_id)
    SELECT r.focus_id,r.revision,item.value FROM learning_focus_revisions r JOIN json_each(?) item
    WHERE r.focus_id=? AND r.revision=? AND r.request_digest=? AND r.recorded=?`)
    .bind(JSON.stringify(preview.recipientIds), focusId, revision, digest, now);
  try {
    const results = await db.batch(edit ? [insert, recipients] : [create, insert, recipients]);
    if (!results.at(-2).meta.changes) fail(409, 'The assignment or class changed. Preview it again before publishing.');
  } catch (error) {
    const concurrent = await previous();
    if (concurrent) return replay(concurrent);
    throw error;
  }
  return { id: focusId, revision };
}

export const focusEnabled = env => env.ENABLE_TEACHER_DIRECTED_LEARNING === '1' && profilesEnabled(env);
const first = (db, sql, ...values) => db.prepare(sql).bind(...values).first();
const rows = async (db, sql, ...values) => (await db.prepare(sql).bind(...values).all()).results;
const revisionSql = `SELECT f.id,f.class_id,f.head,r.*,COALESCE((SELECT json_group_array(profile_id)
  FROM learning_focus_recipients p WHERE p.focus_id=f.id AND p.revision=r.revision),'[]') recipient_ids FROM learning_focus f
  JOIN learning_focus_revisions r ON r.focus_id=f.id`;

async function editContext(db, classId, edit) {
  if (edit == null) return null;
  if (!requestIdPattern.test(edit.id ?? '') || !Number.isInteger(edit.revision)) fail(400, 'Choose an assignment revision.');
  const row = await first(db, revisionSql + ' WHERE f.class_id=? AND f.id=? AND r.revision=f.head', classId, edit.id);
  if (!row) fail(404, 'Assignment not found.');
  if (row.head !== edit.revision || row.state !== 'published') fail(409, 'The assignment changed. Reload before editing.');
  return { id: row.id, revision: row.head };
}

function normalizeRow(row) {
  return {
    id: row.id, classId: row.class_id, revision: row.revision, state: row.state,
    startAt: row.start_at, timeZone: row.time_zone, order: 0, scope: row.scope,
    reason: row.reason, recipientIds: JSON.parse(row.recipient_ids), target: JSON.parse(row.target),
    destinations: JSON.parse(row.destinations),
  };
}

export async function focusState(db, classId) {
  const [records, progress, exemptions] = await Promise.all([
    rows(db,revisionSql+' WHERE f.class_id=? AND r.revision=f.head ORDER BY r.recorded,f.id',classId),
    rows(db,'SELECT p.* FROM learning_focus_progress p JOIN learning_focus f ON f.id=p.focus_id WHERE f.class_id=?',classId),
    rows(db,'SELECT x.focus_id,x.focus_revision,x.profile_id FROM learning_focus_exemptions x JOIN learning_focus f ON f.id=x.focus_id WHERE f.class_id=?',classId),
  ]);
  return { items:records.map(normalizeRow), progress, exemptions };
}

const memberFor = p => ({ id:p.id,classId:p.class_id,active:true });

export async function readTeacherFocus(env,{owner,classId,now}) {
  if (!focusEnabled(env)) return { enabled:false };
  await ownerClass(env.DB,owner,classId,now,true);
  const [state,plan] = await Promise.all([
    focusState(env.DB,classId),publishedPlan(env.DB,classId),
  ]);
  const pathway = plan ? studentContract(plan,graph) : null;
  return {enabled:true,now,items:state.items,progress:state.progress,exemptions:state.exemptions,
    pathway: pathway ? {revision:pathway.revision,areas:pathway.areas.map(({id,title})=>({id,title})),
      nodes:pathway.nodes.map(node=>({id:node.id,title:node.title,areaId:node.areaId,destinations:assignmentDestinations(pathway,{kind:'skill',id:node.id})}))} : null};
}

export function studentWork(profile,pathway,state,now) {
  return classWork({member:memberFor(profile),...state,now,pathway});
}

export async function readStudentFocus(env,request,now) {
  if (!focusEnabled(env)) return {enabled:false};
  const p = await studentProfile(request,env,now);
  const plan = await publishedPlan(env.DB,p.class_id);
  const pathway = plan ? studentContract(plan,graph) : null;
  const state = await focusState(env.DB,p.class_id);
  const work = studentWork(p,pathway,{...state,items:state.items.filter(item=>!state.exemptions.some(x=>
    x.focus_id===item.id&&x.focus_revision===item.revision&&x.profile_id===p.id))},now);
  for (const item of [...work.classwork,...work.catchUp]) {
    const current = state.progress.find(row=>row.focus_id===item.id&&row.focus_revision===item.revision&&row.profile_id===p.id);
    item.progress = current?.state ?? 'available';
  }
  return {enabled:true,
    classwork:work.classwork,catchUp:work.catchUp,recommendations:recommendedWork(work)};
}

export async function endLearningFocus(env,{owner,classId,input,now}) {
  if (!focusEnabled(env)) fail(404,'Learning focus is unavailable.');
  await ownerClass(env.DB,owner,classId,now,true);
  const {id,revision,requestId} = input ?? {};
  if (!requestIdPattern.test(id ?? '') || !requestIdPattern.test(requestId ?? '') || !Number.isInteger(revision))
    fail(400,'Choose the assignment revision to end.');
  const digest = 'end:' + revision;
  const existing = () => first(env.DB,`SELECT r.revision,r.request_digest,r.state FROM learning_focus_revisions r
    JOIN learning_focus f ON f.id=r.focus_id WHERE f.class_id=? AND f.id=? AND r.request_id=?`,classId,id,requestId);
  function replay(prior) {
    if (prior.request_digest!==digest) fail(409,'This request was already used for another action.');
    return {id,revision:prior.revision,state:prior.state};
  }
  const prior = await existing();
  if (prior) return replay(prior);
  await editContext(env.DB,classId,{id,revision});
  try {
    const result = await env.DB.prepare(`INSERT INTO learning_focus_revisions
      (focus_id,revision,pathway_id,pathway_revision,actor,recorded,request_id,request_digest,state,start_at,scope,target,destinations,time_zone,reason)
      SELECT f.id,r.revision+1,r.pathway_id,r.pathway_revision,?,?,?,?,
        CASE WHEN r.start_at>? THEN 'canceled' ELSE 'ended' END,r.start_at,r.scope,r.target,r.destinations,r.time_zone,r.reason
      FROM learning_focus f JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=f.head
      JOIN profile_classes c ON c.id=f.class_id
      WHERE f.id=? AND c.id=? AND c.owner=? AND c.archived IS NULL AND c.expires>? AND f.head=? AND r.state='published'`)
      .bind(owner,now,requestId,digest,now,id,classId,owner,now,revision).run();
    if (!result.meta.changes) fail(409,'The assignment changed. Reload before ending it.');
  } catch (error) {
    const concurrent=await existing();
    if(concurrent)return replay(concurrent);
    throw error;
  }
  return replay(await existing());
}

export async function confirmFocusCompletion(env,{owner,classId,input,now}) {
  if (!focusEnabled(env)) fail(404,'Learning focus is unavailable.');
  await ownerClass(env.DB,owner,classId,now,true);
  const {id,revision,profileId}=input??{};
  if (!requestIdPattern.test(id??'')||!requestIdPattern.test(profileId??'')||!Number.isInteger(revision))
    fail(400,'Choose a student and assignment to confirm.');
  const db=env.DB;
  const [confirmation]=await db.batch([
    db.prepare(`INSERT OR IGNORE INTO learning_focus_completion(focus_id,focus_revision,profile_id,actor,recorded,source)
      SELECT f.id,r.revision,p.id,?,?,'teacher-confirmation' FROM learning_focus f
      JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=f.head
      JOIN profile_classes c ON c.id=f.class_id JOIN student_profiles p ON p.class_id=c.id
      WHERE f.id=? AND r.revision=? AND p.id=? AND c.id=? AND c.owner=? AND c.archived IS NULL AND c.expires>?
        AND p.active=1 AND r.state='published' AND r.start_at<=?
        AND NOT EXISTS(SELECT 1 FROM learning_focus_exemptions x WHERE x.focus_id=f.id AND x.focus_revision=r.revision AND x.profile_id=p.id)
        AND (r.scope='class' OR EXISTS(SELECT 1 FROM learning_focus_recipients sr
          WHERE sr.focus_id=f.id AND sr.revision=r.revision AND sr.profile_id=p.id))`)
      .bind(owner,now,id,revision,profileId,classId,owner,now,now),
    db.prepare(`INSERT INTO learning_focus_progress(focus_id,focus_revision,profile_id,state,updated)
      SELECT x.focus_id,x.focus_revision,x.profile_id,'complete',x.recorded FROM learning_focus_completion x
      JOIN learning_focus f ON f.id=x.focus_id WHERE x.focus_id=? AND x.focus_revision=? AND x.profile_id=? AND f.class_id=?
      ON CONFLICT(focus_id,focus_revision,profile_id) DO UPDATE SET state='complete',updated=excluded.updated`)
      .bind(id,revision,profileId,classId)
  ]);
  if (!confirmation.meta.changes && !await first(db,`SELECT 1 FROM learning_focus_completion x JOIN learning_focus f ON f.id=x.focus_id
    WHERE x.focus_id=? AND x.focus_revision=? AND x.profile_id=? AND f.class_id=?`,id,revision,profileId,classId))
    fail(409,'This student or assignment is no longer active.');
  return {complete:true};
}

// A receipt links optional assignment progress to an authenticated start.
// Ordinary practice does not depend on this request or on any assignment.
export async function startStudentFocus(env,request,input,now) {
  if (!focusEnabled(env)) fail(404,'Learning focus is unavailable.');
  const profile=await studentProfile(request,env,now);
  const {id,revision}=input ?? {};
  if (!requestIdPattern.test(id ?? '') || !Number.isInteger(revision)) fail(400,'Choose an assignment.');
  const db=env.DB;
  const args=[id,revision,profile.id,profile.generation];
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO learning_focus_starts
      (id,focus_id,focus_revision,profile_id,generation,recorded)
      SELECT ?,f.id,r.revision,p.id,p.generation,? FROM learning_focus f
      JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=f.head
      JOIN profile_classes c ON c.id=f.class_id JOIN student_profiles p ON p.class_id=c.id
      WHERE f.id=? AND r.revision=? AND p.id=? AND p.generation=?
        AND p.active=1 AND c.archived IS NULL AND c.expires>? AND r.start_at<=? AND r.state='published'
        AND (r.scope='class' OR EXISTS(SELECT 1 FROM learning_focus_recipients rr
          WHERE rr.focus_id=f.id AND rr.revision=r.revision AND rr.profile_id=p.id))
        AND NOT EXISTS(SELECT 1 FROM learning_focus_exemptions x
          WHERE x.focus_id=f.id AND x.focus_revision=r.revision AND x.profile_id=p.id)
        AND EXISTS(SELECT 1 FROM profile_sessions s WHERE s.digest=? AND s.profile=p.id AND s.generation=p.generation AND s.expires>?)`)
      .bind(crypto.randomUUID(),now,...args,now,now,profile.digest,now),
    db.prepare(`INSERT OR IGNORE INTO learning_focus_progress(focus_id,focus_revision,profile_id,state,updated)
      SELECT focus_id,focus_revision,profile_id,'started',recorded FROM learning_focus_starts
      WHERE focus_id=? AND focus_revision=? AND profile_id=? AND generation=?`).bind(...args),
  ]);
  const result=await first(db,`SELECT s.id FROM learning_focus_starts s JOIN learning_focus f ON f.id=s.focus_id
    JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=f.head
    WHERE s.focus_id=? AND s.focus_revision=? AND s.profile_id=? AND s.generation=?
      AND r.revision=s.focus_revision AND r.state='published' AND NOT EXISTS (
        SELECT 1 FROM learning_focus_exemptions x WHERE x.focus_id=s.focus_id AND x.focus_revision=s.focus_revision AND x.profile_id=s.profile_id)`,...args);
  if (!result) fail(404,'This assignment is unavailable for your profile.');
  return {receipt:result.id};
}

export function creditFocusStatements(db,profile,events,now) {
  const linked=events.filter(event=>event.receipt && event.pathway===profile.course_id);
  if (!linked.length) return [];
  const candidates=JSON.stringify(linked.map(event=>({id:event.id,activity:event.activity,receipt:event.receipt})));
  // Match existing canonical evidence without rewriting it or repeating D1
  // statements for each response in a full offline batch.
  return [
    db.prepare(`INSERT OR IGNORE INTO learning_focus_completion(focus_id,focus_revision,profile_id,actor,recorded,source)
      SELECT s.focus_id,s.focus_revision,s.profile_id,s.profile_id,?,'qualifying-practice'
      FROM json_each(?) submitted
      JOIN learning_focus_starts s ON s.id=json_extract(submitted.value,'$.receipt')
      JOIN learning_focus f ON f.id=s.focus_id
      JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=s.focus_revision
      JOIN performance_events e ON e.profile=s.profile_id AND e.id=json_extract(submitted.value,'$.id') AND e.kind='practice'
      WHERE s.profile_id=? AND s.generation=? AND f.class_id=? AND f.head=s.focus_revision
        AND r.state='published' AND e.occurred>=s.recorded-5000
        AND e.activity=json_extract(submitted.value,'$.activity')
        AND json_extract(e.data,'$.assignmentReceipt')=s.id AND json_extract(e.data,'$.n')=1
        AND NOT EXISTS(SELECT 1 FROM learning_focus_exemptions x
          WHERE x.focus_id=s.focus_id AND x.focus_revision=s.focus_revision AND x.profile_id=s.profile_id)
        AND EXISTS(SELECT 1 FROM json_each(r.destinations) dest JOIN json_each(e.data,'$.dimensions') d
          ON json_extract(dest.value,'$.nodeId')=json_extract(d.value,'$.id')
          WHERE json_extract(dest.value,'$.activityId')=e.activity AND json_extract(d.value,'$.scope')='node')`)
      .bind(now,candidates,profile.id,profile.generation,profile.class_id),
    db.prepare(`INSERT INTO learning_focus_progress(focus_id,focus_revision,profile_id,state,updated)
      SELECT c.focus_id,c.focus_revision,c.profile_id,'complete',c.recorded FROM learning_focus_completion c
      JOIN learning_focus_starts s ON s.focus_id=c.focus_id AND s.focus_revision=c.focus_revision AND s.profile_id=c.profile_id
      WHERE s.profile_id=? AND s.generation=? AND s.id IN (SELECT json_extract(value,'$.receipt') FROM json_each(?))
      ON CONFLICT(focus_id,focus_revision,profile_id) DO UPDATE SET state='complete',updated=excluded.updated
      WHERE learning_focus_progress.state!='complete'`).bind(profile.id,profile.generation,candidates),
  ];
}

export async function excuseFocusRecipient(env,{owner,classId,input,now}) {
  if (!focusEnabled(env)) fail(404,'Learning focus is unavailable.');
  await ownerClass(env.DB,owner,classId,now,true);
  const {id,revision,profileId}=input ?? {};
  if (!requestIdPattern.test(id ?? '') || !requestIdPattern.test(profileId ?? '') || !Number.isInteger(revision))
    fail(400,'Choose a student and assignment.');
  const db=env.DB;
  const result=await db.prepare(`INSERT OR IGNORE INTO learning_focus_exemptions
    (focus_id,focus_revision,profile_id,actor,recorded)
    SELECT f.id,r.revision,p.id,?,? FROM learning_focus f
    JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=f.head
    JOIN profile_classes c ON c.id=f.class_id JOIN student_profiles p ON p.class_id=c.id
    WHERE f.id=? AND r.revision=? AND p.id=? AND c.id=? AND c.owner=? AND c.archived IS NULL AND c.expires>?
      AND p.active=1 AND r.state='published' AND (r.scope='class' OR EXISTS(SELECT 1 FROM learning_focus_recipients rr
        WHERE rr.focus_id=f.id AND rr.revision=r.revision AND rr.profile_id=p.id))`)
    .bind(owner,now,id,revision,profileId,classId,owner,now).run();
  if(!result.meta.changes && !await first(db,`SELECT 1 FROM learning_focus_exemptions x
    JOIN learning_focus f ON f.id=x.focus_id WHERE f.class_id=? AND x.focus_id=? AND x.focus_revision=? AND x.profile_id=?`,
    classId,id,revision,profileId)) fail(409,'This student or assignment is no longer active.');
  return {excused:true};
}
