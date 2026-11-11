// Reading the three levels back out of a pathway, and resolving what a skill's requirement is and where each value came from.
// There is no separate store: levels are policies in pathway.policies[] (see ids.mjs) and a skill's requirement is the policy its
// checkpoint references. Resolution walks skill -> area -> class and takes each setting from the first level that set it.
import { FIELDS, FIELD_DEFAULTS, cloneValue } from './settings.mjs';
import { PROVISIONAL_ID, REQ_SCHEMA, parsePolicyId, policyIdFor } from './ids.mjs';

const pick = {
  minimumQuestions: (p) => p.minimumQuestions ?? null,
  accuracy: (p) => p.accuracy ?? null,
  minimumCorrect: (p) => p.challenge?.minimumCorrect ?? null,
  difficulties: (p) => p.challenge?.difficulties ?? [],
  families: (p) => p.challenge?.families ?? FIELD_DEFAULTS.families,
  subskills: (p) => p.challenge?.subskills ?? [],
  unscored: (p) => p.challenge?.unscored ?? FIELD_DEFAULTS.unscored,
  requiredForAreaCompletion: (p) => p.challenge?.requiredForAreaCompletion ?? true,
  staleAfterDays: (p) => p.challenge?.review?.staleAfterDays ?? null,
};
/** The value a stored policy holds for one setting. */
export const valueOf = (policy, field) => cloneValue(pick[field](policy));
export const sourceOf = (policy) => policy?.requirementSource?.schema === REQ_SCHEMA ? policy.requirementSource : null;
export const isRetired = (policy) => sourceOf(policy)?.retired === true;
export const explicitFields = (policy) => (isRetired(policy) ? [] : [...(sourceOf(policy)?.explicit ?? [])]);

/** Highest version of a policy id in the pathway (published and draft versions alike). */
export function latestPolicy(pathway, id) {
  let best = null;
  for (const p of pathway.policies ?? []) if (p.id === id && (!best || p.version > best.version)) best = p;
  return best;
}
export const policyOf = (pathway, ref) => (pathway.policies ?? []).find((p) => p.id === ref.policyId && p.version === ref.policyVersion) ?? null;

/** The areas and skills of this class with titles, from the graph, the pinned snapshot and the teacher's own additions. */
export function catalog(pathway, graph) {
  const nodes = new Map([...graph.nodes, ...(pathway.curriculumSnapshot?.nodes ?? []), ...(pathway.customNodes ?? [])].map((n) => [n.id, n]));
  const areas = new Map([...graph.areas, ...(pathway.curriculumSnapshot?.areas ?? []), ...(pathway.customAreas ?? [])].map((a) => [a.id, a]));
  const list = [];
  for (const id of pathway.sequence ?? pathway.checkpoints.map((c) => c.nodeId)) {
    const c = pathway.checkpoints.find((x) => x.nodeId === id);
    if (!c) continue;
    let a = list.find((x) => x.id === c.areaId);
    if (!a) { a = { id: c.areaId, title: areas.get(c.areaId)?.title ?? 'Learning area', skills: [] }; list.push(a); }
    a.skills.push({ id, title: nodes.get(id)?.title ?? nodes.get(id)?.objective ?? 'Skill', areaId: c.areaId, required: c.required });
  }
  return { areas: list, nodeTitle: (id) => nodes.get(id)?.title ?? 'Skill', areaTitle: (id) => areas.get(id)?.title ?? 'Learning area', node: (id) => nodes.get(id) ?? null,
    skillCount: pathway.checkpoints.length };
}

/** The active (latest, not retired) requirement policies of each level. */
export function readLevels(pathway) {
  const out = { class: null, areas: new Map(), skills: new Map() };
  const seen = new Set();
  for (const p of pathway.policies ?? []) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const { level, scopeId } = parsePolicyId(p.id);
    if (!['class', 'area', 'skill'].includes(level)) continue;
    const latest = latestPolicy(pathway, p.id);
    if (!sourceOf(latest) || isRetired(latest)) continue;
    if (level === 'class') out.class = latest; else if (level === 'area') out.areas.set(scopeId, latest); else out.skills.set(scopeId, latest);
  }
  return out;
}

/** A pseudo-level for a checkpoint that points at a policy made by the older editor: its numbers stand in for a skill-level choice. */
function legacyEntry(pathway, checkpoint) {
  const cur = policyOf(pathway, checkpoint);
  if (!cur || parsePolicyId(cur.id).level !== 'legacy') return null;
  const values = {};
  for (const f of FIELDS) values[f] = valueOf(cur, f);
  const explicit = ['minimumQuestions', 'accuracy'].filter((f) => values[f] !== null);
  return { level: 'legacy', scopeId: null, policy: cur, values, explicit: new Set(explicit), activated: cur.provisional === false };
}
function entryFor(level, scopeId, policy) {
  const values = {};
  for (const f of FIELDS) values[f] = valueOf(policy, f);
  return { level, scopeId, policy, values, explicit: new Set(explicitFields(policy)), activated: true };
}

/**
 * The levels that apply to a scope, most specific first. For 'skill' the skill's checkpoint decides its area; a checkpoint on a legacy
 * policy contributes it as the skill's own choice. Pass `levels` (from readLevels) to avoid reading twice.
 */
export function chainFor(pathway, level, scopeId, levels = readLevels(pathway)) {
  const chain = [];
  const cls = levels.class ? entryFor('class', null, levels.class) : null;
  if (level === 'class') return cls ? [cls] : [];
  if (level === 'area') {
    const a = levels.areas.get(scopeId);
    return [a ? entryFor('area', scopeId, a) : null, cls].filter(Boolean);
  }
  const c = pathway.checkpoints.find((x) => x.nodeId === scopeId);
  const s = levels.skills.get(scopeId);
  const legacy = !s && c ? legacyEntry(pathway, c) : null;
  const a = c ? levels.areas.get(c.areaId) : null;
  return [s ? entryFor('skill', scopeId, s) : legacy, a ? entryFor('area', c.areaId, a) : null, cls].filter(Boolean).concat(chain);
}

/** First level that set a setting wins; otherwise the system default. */
export function resolveChain(chain) {
  const effective = {}, sources = {};
  for (const f of FIELDS) {
    const hit = chain.find((e) => e.explicit.has(f));
    effective[f] = hit ? cloneValue(hit.values[f]) : cloneValue(FIELD_DEFAULTS[f]);
    sources[f] = hit ? { level: hit.level, scopeId: hit.scopeId } : { level: 'default', scopeId: null };
  }
  return { effective, sources, complete: effective.minimumQuestions !== null && effective.accuracy !== null };
}

export function sourceLabel(src, cat) {
  switch (src.level) {
    case 'skill': return 'Set for this skill';
    case 'area': return `Set for the ${cat.areaTitle(src.scopeId)} area`;
    case 'class': return 'Class defaults';
    case 'legacy': return 'Set in the older policy editor';
    default: return 'Not set';
  }
}
export const levelName = { class: 'Class defaults', area: 'Learning area', skill: 'Skill', legacy: 'Older policy editor', default: 'Not set' };

/** What one skill's requirement is, field by field, and where each value comes from. */
export function resolveSkill(pathway, nodeId, graph, levels = readLevels(pathway)) {
  const c = pathway.checkpoints.find((x) => x.nodeId === nodeId);
  if (!c) return null;
  const cat = catalog(pathway, graph);
  const chain = chainFor(pathway, 'skill', nodeId, levels);
  const { effective, sources, complete } = resolveChain(chain);
  const top = chain[0]?.level ?? 'none';
  const winner = FIELDS.map((f) => sources[f].level).find((l) => l !== 'default') ?? 'none';
  const current = policyOf(pathway, c);
  return {
    nodeId, areaId: c.areaId, title: cat.nodeTitle(nodeId), areaTitle: cat.areaTitle(c.areaId), required: c.required,
    effective, sources, labels: Object.fromEntries(FIELDS.map((f) => [f, sourceLabel(sources[f], cat)])), complete,
    // where the headline numbers come from; a skill with its own policy says so even if only some settings are its own
    level: top === 'legacy' ? 'legacy' : levels.skills.has(nodeId) ? 'skill' : sources.minimumQuestions.level === 'default' ? 'none' : sources.minimumQuestions.level,
    hasOwnSettings: levels.skills.has(nodeId), hasLegacyPolicy: top === 'legacy', legacyActivated: chain[0]?.level === 'legacy' ? chain[0].activated : null,
    policy: current ? { id: current.id, version: current.version } : null, policyId: c.policyId, policyVersion: c.policyVersion, winner,
  };
}
/** Every skill of the class, in teaching order. */
export function resolveAll(pathway, graph) {
  const levels = readLevels(pathway);
  return pathway.sequence.map((id) => resolveSkill(pathway, id, graph, levels)).filter(Boolean);
}
/**
 * What a level would use for each setting if nothing were set at that level, and what it uses now. Used for the editing form: it
 * shows inherited values with their source, and marks the settings that are the level's own.
 */
export function levelView(pathway, level, scopeId, graph) {
  const levels = readLevels(pathway), cat = catalog(pathway, graph);
  const chain = chainFor(pathway, level, scopeId, levels);
  const own = chain.find((e) => e.level === level && (level === 'class' || e.scopeId === scopeId));
  const { effective, sources, complete } = resolveChain(chain);
  const setHere = own ? [...own.explicit] : [];
  const inherited = resolveChain(chain.filter((e) => e !== own));
  return {
    level, scopeId, effective, sources, complete, setHere,
    labels: Object.fromEntries(FIELDS.map((f) => [f, setHere.includes(f) ? levelHere(level) : sourceLabel(sources[f], cat)])),
    inheritedValues: inherited.effective, inheritedSources: inherited.sources, inheritedLabels: Object.fromEntries(FIELDS.map((f) => [f, sourceLabel(inherited.sources[f], cat)])),
    preset: sourceOf(own?.policy)?.preset ?? null, active: Boolean(own),
  };
}
const levelHere = (level) => (level === 'class' ? 'Set here (class defaults)' : level === 'area' ? 'Set for this area' : 'Set for this skill');

export { policyIdFor, PROVISIONAL_ID };
