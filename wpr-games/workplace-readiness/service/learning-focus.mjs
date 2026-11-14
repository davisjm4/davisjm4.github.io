import graph from '../../../cs-games/pathway/curriculum-graph.json' with { type: 'json' };
import { assignmentDestinations } from '../../../cs-games/pathway/assignments/access.mjs';
import { studentContract } from '../../../cs-games/pathway/model.mjs';
import { ownerClass, profilesEnabled } from './profiles.mjs';
import { publishedPlan } from './profile-evidence.mjs';

const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const targetKinds = new Set(['area', 'skill', 'skill-group', 'activity']);
const scopes = new Set(['class', 'group', 'individual']);
const modes = new Set(['advisory', 'restricted']);
const keys = new Set(['target', 'scope', 'recipientIds', 'mode', 'startAt', 'timeZone']);
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
  if (!modes.has(mode)) fail(400, 'Choose advisory or restricted access.');
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
const previewBody = (owner, preview, at) => JSON.stringify(['learning-focus-preview-v1', owner, at, preview]);

async function previewKey(env) {
  if (typeof env.SUBMISSION_SECRET !== 'string' || env.SUBMISSION_SECRET.length < 32) fail(503, 'Assignment previews are unavailable.');
  return crypto.subtle.importKey('raw', utf8.encode(env.SUBMISSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function prepareFocusPreview(env, options) {
  const reviewed = await previewLearningFocus(env, options);
  const signature = await crypto.subtle.sign('HMAC', await previewKey(env), utf8.encode(previewBody(options.owner, reviewed, options.now)));
  return { ...reviewed.preview, previewAt: options.now, previewSignature: bytesToHex(new Uint8Array(signature)) };
}

export async function publishLearningFocus(env, { owner, classId, input, now }) {
  // The entire assignment feature remains gated until all launch and evidence paths use it.
  if (env.ENABLE_TEACHER_DIRECTED_LEARNING !== '1' || !profilesEnabled(env)) fail(404, 'Learning focus is unavailable.');
  const classroom = await ownerClass(env.DB, owner, classId, now, true);
  const { requestId, assignment, previewAt, previewSignature } = input ?? {};
  if (typeof requestId !== 'string' || !requestIdPattern.test(requestId) || !Number.isSafeInteger(previewAt) ||
      typeof previewSignature !== 'string' || !/^[a-f0-9]{64}$/.test(previewSignature)) fail(400, 'Preview this assignment before publishing.');
  const db = env.DB;
  const previous = () => db.prepare(`SELECT r.request_digest,r.revision FROM learning_focus f
    JOIN learning_focus_revisions r ON r.focus_id=f.id AND r.revision=1
    WHERE f.class_id=? AND f.id=?`).bind(classroom.id, requestId).first();
  const digest = bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8.encode(JSON.stringify([owner, classId, assignment, previewAt, previewSignature])))));
  function replay(row) {
    if (row.request_digest !== digest) fail(409, 'This request already published a different assignment.');
    return { id: requestId, revision: row.revision };
  }
  const prior = await previous();
  if (prior) return replay(prior);
  if (previewAt > now || now - previewAt > previewLifetime) fail(409, 'Preview the current assignment before publishing.');
  const reviewed = await previewLearningFocus(env, { owner, classId, input: assignment, now: previewAt });
  const { preview, affectedIds } = reviewed;
  const signed = await crypto.subtle.verify('HMAC', await previewKey(env), hexToBytes(previewSignature), utf8.encode(previewBody(owner, reviewed, previewAt)));
  if (!signed) fail(409, 'The assignment or class changed. Preview it again before publishing.');

  const ids = JSON.stringify(preview.recipientIds);
  try {
    const [created] = await db.batch([
      db.prepare(`INSERT INTO learning_focus(id,class_id,created)
        SELECT ?,c.id,? FROM profile_classes c JOIN class_pathways p ON p.class_id=c.id
        WHERE c.id=? AND c.owner=? AND c.archived IS NULL AND c.expires>?
          AND p.id=? AND p.head=?
          AND (? <> 'class' OR (SELECT COUNT(*) FROM student_profiles WHERE class_id=c.id AND active=1)=?)
          AND NOT EXISTS (SELECT 1 FROM json_each(?) selected WHERE NOT EXISTS
            (SELECT 1 FROM student_profiles WHERE id=selected.value AND class_id=c.id AND active=1))`)
        .bind(requestId, now, classroom.id, owner, now, preview.pathwayId, preview.pathwayRevision,
          preview.scope, preview.activeRecipientCount, JSON.stringify(affectedIds)),
      db.prepare(`INSERT INTO learning_focus_revisions
        (focus_id,revision,pathway_id,pathway_revision,actor,recorded,request_id,request_digest,state,start_at,scope,target,destinations,restricted,time_zone)
        SELECT id,1,?,?,?,?,?,?,'published',?,?,?,?,?,? FROM learning_focus WHERE id=? AND class_id=? AND created=?`)
        .bind(preview.pathwayId, preview.pathwayRevision, owner, now, requestId, digest, preview.startAt, preview.scope,
          JSON.stringify(preview.target), JSON.stringify(preview.destinations), Number(preview.mode === 'restricted'), preview.timeZone,
          requestId, classId, now),
      db.prepare(`INSERT INTO learning_focus_recipients(focus_id,revision,profile_id)
        SELECT r.focus_id,1,item.value FROM learning_focus_revisions r JOIN json_each(?) item
        WHERE r.focus_id=? AND r.revision=1 AND r.request_digest=? AND r.recorded=?`).bind(ids, requestId, digest, now),
    ]);
    if (!created.meta.changes) fail(409, 'The class changed. Preview it again before publishing.');
  } catch (error) {
    const concurrent = await previous();
    if (concurrent) return replay(concurrent);
    throw error;
  }
  return { id: requestId, revision: 1 };
}
