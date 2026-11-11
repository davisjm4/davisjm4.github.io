// Editing requirements. Every function here is pure: it takes a pathway (the draft) and returns a new one, never touching the input.
//
// How the three levels live inside the existing structures, with no second store:
//   * each level that has settings is ONE ordinary policy id (ids.mjs) in pathway.policies[], versioned like any policy;
//   * a checkpoint's policyId/policyVersion says which level's policy that skill uses (skill, else area, else class, else provisional);
//   * a level policy records in requirementSource.explicit which settings that level CHOSE; the other settings in the stored policy are
//     copies of what it inherited, written so the engine and the existing pathway code see a complete policy. They are derived: every
//     operation re-derives them all (rematerialize), so a change to the class defaults reaches every policy that inherits from it.
// Versions: a policy version that is in the published revision is never edited. The first change after publishing creates the next
// version; further changes before the next publish edit that draft-only version in place. Earlier versions are never removed.
import { clone, provisionalPolicy, validatePathway } from '../model.mjs';
import { PROVISIONAL_ID, parsePolicyId, policyIdFor } from './ids.mjs';
import { FIELDS, cloneValue, presetFor, validateSettings } from './settings.mjs';
import { buildPolicy, engineCheck, policyContentKey } from './policies.mjs';
import { catalog, chainFor, explicitFields, isRetired, latestPolicy, policyOf, readLevels, resolveAll, resolveChain, sourceOf, valueOf } from './levels.mjs';
import { assessSkill } from './limits.mjs';

const isPublished = (published, policy) => Boolean(published?.policies?.some((x) => x.id === policy.id && x.version === policy.version));
const sortedKeys = (m) => [...m.keys()].sort();
export const createContext = ({ graph, published = null, facts = null }) => ({ graph, published, facts });

// ---- intent: the explicit choices at each level, read from the policies --------------------------------------------------
function readIntent(pathway, levels = readLevels(pathway)) {
  const entry = (pol) => ({ explicit: new Map(explicitFields(pol).map((f) => [f, valueOf(pol, f)])) });
  return { class: levels.class ? entry(levels.class) : null,
    areas: new Map([...levels.areas].map(([k, v]) => [k, entry(v)])), skills: new Map([...levels.skills].map(([k, v]) => [k, entry(v)])) };
}
const cloneIntent = (i) => ({ class: i.class ? { explicit: new Map([...i.class.explicit].map(([k, v]) => [k, cloneValue(v)])) } : null,
  areas: new Map([...i.areas].map(([k, v]) => [k, { explicit: new Map([...v.explicit].map(([a, b]) => [a, cloneValue(b)])) }])),
  skills: new Map([...i.skills].map(([k, v]) => [k, { explicit: new Map([...v.explicit].map(([a, b]) => [a, cloneValue(b)])) }])) });
const asEntry = (level, scopeId, e) => ({ level, scopeId, explicit: new Set(e.explicit.keys()), values: Object.fromEntries(e.explicit) });
function resolveFor(intent, level, scopeId, areaOfNode) {
  const chain = [];
  if (level === 'skill' && intent.skills.has(scopeId)) chain.push(asEntry('skill', scopeId, intent.skills.get(scopeId)));
  const areaId = level === 'area' ? scopeId : level === 'skill' ? areaOfNode : null;
  if (areaId && intent.areas.has(areaId)) chain.push(asEntry('area', areaId, intent.areas.get(areaId)));
  if (intent.class) chain.push(asEntry('class', null, intent.class));
  return resolveChain(chain).effective;
}

// ---- writing the intent back as policies and checkpoint references -----------------------------------------------------
function writeIntent(pathway, intent, ctx, { forceInherit = new Set() } = {}) {
  const p = clone(pathway), cat = catalog(p, ctx.graph);
  const areaOf = new Map(p.checkpoints.map((c) => [c.nodeId, c.areaId]));
  // drop settings for areas and skills that are no longer in the plan
  for (const a of [...intent.areas.keys()]) if (!p.checkpoints.some((c) => c.areaId === a)) intent.areas.delete(a);
  for (const s of [...intent.skills.keys()]) if (!areaOf.has(s)) intent.skills.delete(s);
  const desired = [];
  if (intent.class) desired.push({ level: 'class', scopeId: null, entry: intent.class });
  for (const k of sortedKeys(intent.areas)) desired.push({ level: 'area', scopeId: k, entry: intent.areas.get(k) });
  for (const k of sortedKeys(intent.skills)) desired.push({ level: 'skill', scopeId: k, entry: intent.skills.get(k) });
  const wanted = new Set(desired.map((d) => policyIdFor(d.level, d.scopeId)));
  const names = (d) => ({ area: d.level === 'area' ? cat.areaTitle(d.scopeId) : undefined, skill: d.level === 'skill' ? cat.nodeTitle(d.scopeId) : undefined });
  for (const d of desired) {
    const id = policyIdFor(d.level, d.scopeId), cur = latestPolicy(p, id);
    const effective = resolveFor(intent, d.level, d.scopeId, areaOf.get(d.scopeId));
    const mk = (version) => buildPolicy({ level: d.level, scopeId: d.scopeId, version, explicit: [...d.entry.explicit.keys()], effective, names: names(d) });
    const live = cur && !isRetired(cur);
    if (live && policyContentKey(mk(cur.version)) === policyContentKey(cur)) continue;
    if (cur && !isPublished(ctx.published, cur)) { p.policies[p.policies.indexOf(cur)] = mk(cur.version); continue; }
    p.policies.push(mk(cur ? cur.version + 1 : 1));
  }
  // retire levels that no longer have any explicit settings
  for (const id of new Set(p.policies.map((x) => x.id))) {
    if (!['class', 'area', 'skill'].includes(parsePolicyId(id).level) || wanted.has(id)) continue;
    const cur = latestPolicy(p, id);
    if (!cur || isRetired(cur) || !sourceOf(cur)) continue;
    const { level, scopeId } = parsePolicyId(id);
    const blank = Object.fromEntries(FIELDS.map((f) => [f, cloneValue(valueOf(buildPolicy({ level, scopeId, version: 1, explicit: [], effective: resolveChain([]).effective }), f))]));
    const retired = (v) => buildPolicy({ level, scopeId, version: v, explicit: [], effective: blank, retired: true });
    const draftOnly = !isPublished(ctx.published, cur);
    if (draftOnly && !p.policies.some((x) => x.id === id && x.version < cur.version)) p.policies.splice(p.policies.indexOf(cur), 1);
    else if (draftOnly) p.policies[p.policies.indexOf(cur)] = retired(cur.version);
    else p.policies.push(retired(cur.version + 1));
  }
  // point every checkpoint at the policy that applies to it
  if (!latestPolicy(p, PROVISIONAL_ID)) p.policies.unshift(clone(provisionalPolicy));
  const prov = latestPolicy(p, PROVISIONAL_ID);
  for (const c of p.checkpoints) {
    const cur = policyOf(p, c), isLegacy = cur && parsePolicyId(cur.id).level === 'legacy' && !forceInherit.has(c.nodeId);
    let target;
    if (intent.skills.has(c.nodeId)) target = latestPolicy(p, policyIdFor('skill', c.nodeId));
    else if (isLegacy) continue;
    else if (intent.areas.has(c.areaId)) target = latestPolicy(p, policyIdFor('area', c.areaId));
    else if (intent.class) target = latestPolicy(p, policyIdFor('class', null));
    else target = prov;
    c.policyId = target.id; c.policyVersion = target.version;
  }
  return p;
}

/** Re-derive every level policy and checkpoint reference from the explicit choices already in the pathway. Idempotent. */
export const rematerialize = (pathway, ctx) => writeIntent(pathway, readIntent(pathway), ctx);

// ---- results ---------------------------------------------------------------------------------------------------------
const fail = (pathway, errors, extra = {}) => ({ ok: false, pathway, errors: errors.map((e) => (typeof e === 'string' ? { message: e } : e)), warnings: [], changed: [], kept: [], ...extra });
function describeChanges(before, after, graph) {
  const a = new Map(resolveAll(before, graph).map((r) => [r.nodeId, r])), changed = [];
  for (const r of resolveAll(after, graph)) {
    const o = a.get(r.nodeId);
    if (!o || JSON.stringify(o.effective) !== JSON.stringify(r.effective) || o.policyId !== r.policyId || o.policyVersion !== r.policyVersion) changed.push(r.nodeId);
  }
  return changed;
}
function finish(before, after, ctx, { kept = [], warnings = [] } = {}) {
  const errors = [];
  for (const pol of after.policies) {
    if (!sourceOf(pol) || isRetired(pol)) continue;
    const prior = before.policies.find((x) => x.id === pol.id && x.version === pol.version);
    if (prior && policyContentKey(prior) === policyContentKey(pol)) continue;
    const v = engineCheck(pol);
    if (!v.ok) errors.push(...v.errors.map((e) => ({ message: `${pol.label}: ${e.message}` })));
  }
  try { validatePathway(after, ctx.graph, { validateSessions: false, validateTargets: false }); } catch (e) { errors.push({ message: e.message }); }
  if (errors.length) return fail(before, errors);
  const changed = describeChanges(before, after, ctx.graph);
  const levels = readLevels(after);
  const problems = { blocked: [], draftOnly: [], warnings: [] };
  const incomplete = [];
  for (const id of changed) {
    const a = assessSkill(after, id, ctx.graph, ctx.facts, levels);
    if (!a) continue;
    if (!a.complete) { if (levels.skills.has(id) || levels.areas.size || levels.class) incomplete.push(a.title); continue; }
    for (const pr of a.problems) (pr.severity === 'blocked' ? problems.blocked : pr.severity === 'draft-only' ? problems.draftOnly : problems.warnings).push({ ...pr, nodeId: id, title: a.title });
  }
  if (problems.blocked.length) return fail(before, problems.blocked.map((b) => ({ message: b.message, code: b.code, nodeId: b.nodeId })), { blocked: problems.blocked, problems });
  return { ok: true, pathway: after, errors: [], warnings, changed, kept, problems, incomplete };
}

// ---- the editing operations -------------------------------------------------------------------------------------------
const nodeIdsOf = (p) => new Set(p.checkpoints.map((c) => c.nodeId));
const areaIdsOf = (p) => new Set(p.checkpoints.map((c) => c.areaId));
function targets(pathway, target) {
  if (target.level === 'class') return { ok: true, ids: [null] };
  const known = target.level === 'area' ? areaIdsOf(pathway) : nodeIdsOf(pathway);
  const ids = [...new Set(target.ids ?? [])];
  if (!ids.length) return { ok: false, error: `Choose at least one ${target.level === 'area' ? 'learning area' : 'skill'}.` };
  if (ids.some((i) => !known.has(i))) return { ok: false, error: `That ${target.level === 'area' ? 'learning area' : 'skill'} is not in this class.` };
  return { ok: true, ids };
}
function legacySeed(pathway, nodeId) {
  const c = pathway.checkpoints.find((x) => x.nodeId === nodeId), cur = c && policyOf(pathway, c);
  if (!cur || parsePolicyId(cur.id).level !== 'legacy') return [];
  return [['minimumQuestions', cur.minimumQuestions], ['accuracy', cur.accuracy]].filter(([, v]) => v != null);
}
/** Entry in the intent for a scope, created (seeded from an older-editor policy when there is one) if missing. */
function entryOf(intent, pathway, level, id) {
  if (level === 'class') return (intent.class ??= { explicit: new Map() });
  const bag = level === 'area' ? intent.areas : intent.skills;
  if (!bag.has(id)) bag.set(id, { explicit: new Map(level === 'skill' ? legacySeed(pathway, id).map(([k, v]) => [k, v]) : []) });
  return bag.get(id);
}
const dropIfEmpty = (intent, level, id) => {
  if (level === 'class') { if (intent.class && !intent.class.explicit.size) intent.class = null; return; }
  const bag = level === 'area' ? intent.areas : intent.skills;
  if (bag.has(id) && !bag.get(id).explicit.size) bag.delete(id);
};

/**
 * Set (and optionally clear) settings at one level for one or many scopes.
 *   target   {level: 'class'} | {level: 'area', ids: [areaId...]} | {level: 'skill', ids: [nodeId...]}
 *   settings the settings to set explicitly: any of FIELDS (accuracy as a fraction)
 *   options  {clear: [field...], replaceLowerOverrides: false}
 * Lower levels that set the same fields keep their own choice (precedence), and the result lists them in `kept`.
 */
export function setSettings(pathway, target, settings, ctx, { clear = [], replaceLowerOverrides = false } = {}) {
  const t = targets(pathway, target);
  if (!t.ok) return fail(pathway, [t.error]);
  const intent = cloneIntent(readIntent(pathway)), kept = [];
  const held = Object.fromEntries([...(intent.class?.explicit ?? [])].filter(([k]) => !clear.includes(k)));
  const check = validateSettings(settings, { level: target.level, existing: held });
  if (!check.ok) return fail(pathway, check.errors, { warnings: check.warnings });
  const fields = [...Object.keys(settings), ...clear];
  for (const id of t.ids) {
    const e = entryOf(intent, pathway, target.level, id);
    for (const [k, v] of Object.entries(settings)) e.explicit.set(k, cloneValue(v));
    for (const k of clear) e.explicit.delete(k);
    dropIfEmpty(intent, target.level, id);
  }
  // lower levels that set the same fields
  const lower = [];
  if (target.level === 'class') { for (const [a, e] of intent.areas) lower.push(['area', a, e]); for (const [s, e] of intent.skills) lower.push(['skill', s, e]); }
  if (target.level === 'area') for (const [s, e] of intent.skills) if (t.ids.includes(pathway.checkpoints.find((c) => c.nodeId === s)?.areaId)) lower.push(['skill', s, e]);
  for (const [lvl, id, e] of lower) {
    const overlap = fields.filter((f) => e.explicit.has(f));
    if (!overlap.length) continue;
    if (replaceLowerOverrides) { for (const f of overlap) e.explicit.delete(f); dropIfEmpty(intent, lvl, id); }
    else kept.push({ level: lvl, scopeId: id, fields: overlap });
  }
  const after = writeIntent(pathway, intent, ctx);
  const res = finish(pathway, after, ctx, { kept, warnings: check.warnings });
  if (!res.ok) return res;
  // a level must leave every skill it touches with a complete requirement
  const levels = readLevels(res.pathway), notSet = [];
  for (const r of resolveAll(res.pathway, ctx.graph)) if (res.changed.includes(r.nodeId) && !r.complete && (levels.class || levels.areas.has(r.areaId) || levels.skills.has(r.nodeId))) notSet.push(r.title);
  if (notSet.length) return fail(pathway, [`Choose both a minimum number of questions and a required accuracy. ${notSet.length === 1 ? `${notSet[0]} has` : `${notSet.length} skills have`} only one of them.`]);
  return res;
}
export const applyToClass = (pathway, settings, ctx, opts) => setSettings(pathway, { level: 'class' }, settings, ctx, opts);
export const applyToAreas = (pathway, areaIds, settings, ctx, opts) => setSettings(pathway, { level: 'area', ids: areaIds }, settings, ctx, opts);
export const applyToSkills = (pathway, nodeIds, settings, ctx, opts) => setSettings(pathway, { level: 'skill', ids: nodeIds }, settings, ctx, opts);

/** Restore settings to inherited. With `fields`, only those settings; without, everything the level set. */
export function resetToInherited(pathway, target, ctx, { fields = null } = {}) {
  const t = targets(pathway, target);
  if (!t.ok) return fail(pathway, [t.error]);
  const intent = cloneIntent(readIntent(pathway)), forceInherit = new Set();
  for (const id of t.ids) {
    const bag = target.level === 'class' ? null : target.level === 'area' ? intent.areas : intent.skills;
    const e = target.level === 'class' ? intent.class : bag.get(id);
    if (e) { if (fields) for (const f of fields) e.explicit.delete(f); else e.explicit.clear(); dropIfEmpty(intent, target.level, id); }
    if (target.level === 'skill' && (!fields)) forceInherit.add(id);
  }
  const after = writeIntent(pathway, intent, ctx, { forceInherit });
  const res = finish(pathway, after, ctx);
  return res;
}
/** Remove every skill's own settings inside the given learning areas, so the whole area follows its area (or class) settings. */
export function clearSkillOverridesInAreas(pathway, areaIds, ctx) {
  const ids = pathway.checkpoints.filter((c) => areaIds.includes(c.areaId)).map((c) => c.nodeId);
  return resetToInherited(pathway, { level: 'skill', ids }, ctx);
}
/** Copy the settings an area has chosen for itself to other areas. A source that uses the class defaults has nothing to copy. */
export function copyAreaSettings(pathway, fromAreaId, toAreaIds, ctx) {
  const intent = cloneIntent(readIntent(pathway)), src = intent.areas.get(fromAreaId);
  const cat = catalog(pathway, ctx.graph);
  if (!areaIdsOf(pathway).has(fromAreaId)) return fail(pathway, ['That learning area is not in this class.']);
  if (!src || !src.explicit.size) return fail(pathway, [`${cat.areaTitle(fromAreaId)} follows the class defaults, so it has no settings of its own to copy.`]);
  const dest = [...new Set(toAreaIds)].filter((a) => a !== fromAreaId);
  if (!dest.length) return fail(pathway, ['Choose at least one other learning area to copy to.']);
  if (dest.some((a) => !areaIdsOf(pathway).has(a))) return fail(pathway, ['That learning area is not in this class.']);
  for (const a of dest) intent.areas.set(a, { explicit: new Map([...src.explicit].map(([k, v]) => [k, cloneValue(v)])) });
  const kept = [];
  for (const [s, e] of intent.skills) if (dest.includes(pathway.checkpoints.find((c) => c.nodeId === s)?.areaId)) kept.push({ level: 'skill', scopeId: s, fields: [...e.explicit.keys()].filter((f) => src.explicit.has(f)) });
  return finish(pathway, writeIntent(pathway, intent, ctx), ctx, { kept: kept.filter((k) => k.fields.length) });
}
export { presetFor };

/** Set `effectiveFrom` on every requirement policy version that is not in the published revision yet. Call when publishing. */
export function stampPublishTime(pathway, published, isoNow) {
  const p = clone(pathway);
  for (const pol of p.policies) if (sourceOf(pol) && !isPublished(published, pol) && pol.effectiveFrom == null) pol.effectiveFrom = isoNow;
  return p;
}
/** Policy versions in the draft that the published revision does not have yet. */
export const unpublishedPolicies = (pathway, published) => pathway.policies.filter((x) => !isPublished(published, x)).map((x) => ({ id: x.id, version: x.version, label: x.label }));
/** True when every derived value in the pathway matches what its explicit choices would produce (there is no hidden second copy). */
export function verifyConsistency(pathway, ctx) {
  const again = rematerialize(pathway, ctx), drift = [];
  if (JSON.stringify(again.policies) !== JSON.stringify(pathway.policies)) drift.push('policies');
  for (const c of pathway.checkpoints) { const o = again.checkpoints.find((x) => x.nodeId === c.nodeId); if (o.policyId !== c.policyId || o.policyVersion !== c.policyVersion) drift.push(c.nodeId); }
  return { consistent: drift.length === 0, drift };
}
