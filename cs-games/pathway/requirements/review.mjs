// The teacher's review: a readable table of the defaults and overrides, what changed from the published version, problems grouped by
// kind, and whether the draft may be saved and published. No identifiers appear in any text.
import { catalog, readLevels, resolveAll, resolveSkill, valueOf, explicitFields, sourceOf, latestPolicy, levelName, isRetired } from './levels.mjs';
import { assessAll } from './limits.mjs';
import { unpublishedPolicies } from './operations.mjs';
import { DIFFICULTY_LABELS, FIELDS, FIELD_LABELS } from './settings.mjs';
import { formatPercent, toBasisPoints } from '../mastery/arithmetic.mjs';

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const pct = (f) => formatPercent(toBasisPoints(f) / 100);

/** One line for a resolved requirement, for tables: "30 questions at 90%" plus any extra rules. */
export function briefSettings(e) {
  if (e.minimumQuestions == null || e.accuracy == null) return 'No requirement set';
  const parts = [`${plural(e.minimumQuestions, 'question')} at ${pct(e.accuracy)}`];
  if (e.minimumCorrect != null) parts.push(`at least ${e.minimumCorrect} correct`);
  for (const d of e.difficulties ?? []) parts.push(`${d.minQuestions} ${DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty}${d.minCorrect ? ` (${d.minCorrect} correct)` : ''}`);
  if ((e.families?.minDistinct ?? 0) > 0) parts.push(`${e.families.minDistinct} kinds of questions`);
  if ((e.subskills ?? []).length) parts.push(`${plural(e.subskills.length, 'essential topic')}`);
  if (['skipped', 'revealed', 'assisted'].some((k) => e.unscored?.[k] === 'excluded')) parts.push('skipped questions left out');
  if (e.requiredForAreaCompletion === false) parts.push('optional for the area');
  if (e.staleAfterDays) parts.push(`review after ${plural(e.staleAfterDays, 'day')}`);
  return parts.join('; ');
}
const ownFields = (policy) => explicitFields(policy).map((f) => FIELD_LABELS[f]);

/** Table of the class defaults, area overrides and skill overrides in the pathway. */
export function overridesTable(pathway, graph) {
  const cat = catalog(pathway, graph), levels = readLevels(pathway), all = resolveAll(pathway, graph);
  const count = (fn) => all.filter(fn).length;
  const rows = [];
  rows.push({ level: 'class', name: 'Class defaults', area: null, settings: levels.class ? briefSettings(resolveSkillAs(pathway, graph, 'class')) : 'Not set', set: Boolean(levels.class), own: levels.class ? ownFields(levels.class) : [], skills: count((r) => r.level === 'class') });
  for (const a of cat.areas) {
    const pol = levels.areas.get(a.id);
    if (!pol) continue;
    rows.push({ level: 'area', name: a.title, area: a.title, settings: briefSettings(resolveSkillAs(pathway, graph, 'area', a.id)), set: true, own: ownFields(pol), skills: count((r) => r.areaId === a.id && r.level === 'area') });
  }
  for (const r of all) {
    const pol = levels.skills.get(r.nodeId);
    if (pol) rows.push({ level: 'skill', name: r.title, area: r.areaTitle, settings: briefSettings(r.effective), set: true, own: ownFields(pol), skills: 1 });
    else if (r.hasLegacyPolicy) rows.push({ level: 'legacy', name: r.title, area: r.areaTitle, settings: briefSettings(r.effective), set: true, own: ['Question count and accuracy'], skills: 1, note: r.legacyActivated ? 'Set in the older policy editor' : 'Set in the older policy editor but not activated' });
  }
  return { rows, counts: { skills: all.length, usingClass: count((r) => r.level === 'class'), usingArea: count((r) => r.level === 'area'), ownSettings: count((r) => r.hasOwnSettings),
    older: count((r) => r.hasLegacyPolicy), notSet: count((r) => r.level === 'none') } };
}
function resolveSkillAs(pathway, graph, level, scopeId) {
  // the settings a level uses, including what it inherits: take any skill that has no settings of its own below that level
  const levels = readLevels(pathway);
  const pick = pathway.checkpoints.find((c) => (level === 'class' ? !levels.skills.has(c.nodeId) && !levels.areas.has(c.areaId) : c.areaId === scopeId && !levels.skills.has(c.nodeId)));
  if (pick) return resolveSkill(pathway, pick.nodeId, graph, levels).effective;
  // every skill has its own settings: derive from a synthetic empty chain
  return resolveSkill(pathway, pathway.checkpoints[0].nodeId, graph, levels).effective;
}

const PROBLEM_HEADINGS = Object.freeze({
  'difficulty-not-offered': 'A required difficulty level does not exist for the skill',
  'invalid': 'A setting is not valid',
  'too-many-families': 'More kinds of questions are required than exist',
  'pool-too-small': 'More questions are required than exist',
  'subskill-without-questions': 'An essential topic has no questions',
  'families-unverifiable': "Question variety can't be checked yet",
  'difficulty-unknown': "It isn't known whether the required difficulty level exists",
  'pool-may-be-small': 'The pool of questions may be too small',
  'evidence-unverified': "Practice on these skills isn't verified to count automatically",
  'no-room-for-mistakes': 'No room for a mistake in the first questions',
});
const SEVERITY_HEADING = Object.freeze({ blocked: 'Cannot be saved', 'draft-only': 'Can be saved as a draft, not published', warning: 'Worth knowing' });
export function groupProblems(list) {
  const groups = new Map();
  for (const p of list) {
    const key = `${p.severity}|${p.code}`;
    if (!groups.has(key)) groups.set(key, { severity: p.severity, code: p.code, heading: PROBLEM_HEADINGS[p.code] ?? 'Check this setting', verified: p.verified, basis: p.basis, items: [] });
    groups.get(key).items.push({ title: p.title, message: p.message });
  }
  return [...groups.values()].sort((a, b) => ['blocked', 'draft-only', 'warning'].indexOf(a.severity) - ['blocked', 'draft-only', 'warning'].indexOf(b.severity));
}

/** What will change for students and teachers if this draft is published, in plain words. */
export function differences(draft, published, graph) {
  const before = published ?? { ...draft, policies: draft.policies.filter((p) => p.id === 'policy:provisional'), checkpoints: draft.checkpoints.map((c) => ({ ...c, policyId: 'policy:provisional', policyVersion: 1 })) };
  const cat = catalog(draft, graph), lb = readLevels(before), la = readLevels(draft);
  const out = { levels: [], skills: [] };
  const show = (pol, p) => (pol ? briefSettings(Object.fromEntries(FIELDS.map((f) => [f, valueOf(pol, f)]))) : null);
  const cmp = (label, a, b) => {
    const sa = a ? JSON.stringify(explicitFields(a).map((f) => [f, valueOf(a, f)])) : null, sb = b ? JSON.stringify(explicitFields(b).map((f) => [f, valueOf(b, f)])) : null;
    if (sa === sb) return;
    out.levels.push({ name: label, change: !a ? 'added' : !b ? 'removed' : 'changed', before: a ? show(a) : null, after: b ? show(b) : null,
      text: !a ? `${label}: new setting, ${show(b)}.` : !b ? `${label}: own setting removed (was ${show(a)}); it now follows the level above.` : `${label}: ${show(a)} changed to ${show(b)}.` });
  };
  cmp('Class defaults', lb.class, la.class);
  for (const id of new Set([...lb.areas.keys(), ...la.areas.keys()])) cmp(cat.areaTitle(id), lb.areas.get(id), la.areas.get(id));
  for (const id of new Set([...lb.skills.keys(), ...la.skills.keys()])) cmp(cat.nodeTitle(id), lb.skills.get(id), la.skills.get(id));
  const rb = new Map(resolveAll(before, graph).map((r) => [r.nodeId, r])), groups = new Map();
  for (const r of resolveAll(draft, graph)) {
    const o = rb.get(r.nodeId), was = o ? briefSettings(o.effective) : 'No requirement set', now = briefSettings(r.effective);
    if (was === now) continue;
    const key = `${r.areaTitle}|${was}|${now}`;
    if (!groups.has(key)) groups.set(key, { area: r.areaTitle, was, now, skills: [] });
    groups.get(key).skills.push(r.title);
  }
  out.skills = [...groups.values()].map((g) => ({ ...g, text: `${plural(g.skills.length, 'skill')} in ${g.area}: ${g.now}${g.was === 'No requirement set' ? '' : ` (was ${g.was})`}.` }));
  out.changed = out.skills.reduce((n, g) => n + g.skills.length, 0);
  return out;
}

/**
 * Everything the review screen shows, and whether this draft may be saved and published.
 *   facts        from buildContentFacts (or null)
 *   acknowledged true when the teacher has accepted the warnings
 */
export function reviewRequirements(draft, published, graph, { facts = null, acknowledged = false } = {}) {
  const table = overridesTable(draft, graph), diff = differences(draft, published, graph), assessed = assessAll(draft, graph, facts);
  const incompleteLevels = draft.policies.filter((p) => sourceOf(p) && !isRetired(p) && latestPolicy(draft, p.id) === p && p.provisional);
  const problems = groupProblems([...assessed.blocked, ...assessed.draftOnly, ...assessed.warnings]);
  const pending = unpublishedPolicies(draft, published).filter((x) => x.id.startsWith('policy:req:'));
  const reasons = [];
  const hasChanges = diff.levels.length > 0 || diff.skills.length > 0 || pending.length > 0;
  if (!hasChanges) reasons.push('There are no changes to publish.');
  if (assessed.blocked.length) reasons.push('Some settings cannot be met and must be changed.');
  if (assessed.draftOnly.length) reasons.push(`${plural(new Set(assessed.draftOnly.map((x) => x.nodeId)).size, 'skill')} ${new Set(assessed.draftOnly.map((x) => x.nodeId)).size === 1 ? 'needs' : 'need'} more questions or question kinds than exist. Save the draft and lower the requirement, or publish after the content is added.`);
  if (incompleteLevels.length) reasons.push('A level has settings but no question count and accuracy; choose both or restore it to inherited.');
  const needsAcknowledgement = assessed.warnings.length > 0 && !assessed.blocked.length && !assessed.draftOnly.length;
  if (needsAcknowledgement && !acknowledged) reasons.push('Read the notes below and confirm you understand them.');
  return {
    table, differences: diff, problems, counts: assessed.counts, pendingPolicies: pending,
    readiness: { canSaveDraft: assessed.blocked.length === 0, canPublish: reasons.length === 0, needsAcknowledgement, reasons, hasChanges },
  };
}
export { SEVERITY_HEADING, PROBLEM_HEADINGS, levelName };
