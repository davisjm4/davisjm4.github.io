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

export async function previewLearningFocus(env, { owner, classId, input, now }) {
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
  const active = new Set(results.map(row => row.id));
  if (recipientIds.some(id => !active.has(id))) fail(400, 'At least one selected profile is unavailable in this class.');
  return {
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
  };
}
