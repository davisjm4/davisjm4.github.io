// Building the stored policy for one level. The stored object is a normal pathway policy plus the engine's `challenge` block plus a
// `requirementSource` note saying which level made it and which settings that level chose itself (the rest were inherited when it was
// written, and are re-derived whenever a higher level changes; see operations.mjs).
import { CHALLENGE_SCHEMA, validateMasteryPolicy } from '../mastery/policy.mjs';
import { formatPercent, toBasisPoints } from '../mastery/arithmetic.mjs';
import { FIELDS, cloneValue, presetFor, PRESETS } from './settings.mjs';
import { REQ_SCHEMA, policyIdFor } from './ids.mjs';

export const CALIBRATION_NOTE = 'teacher-defined; not system-calibrated';
export function policyLabel(level, scopeId, effective, names = {}) {
  const who = level === 'class' ? 'Class defaults' : level === 'area' ? (names.area ?? 'Learning area') : (names.skill ?? 'Skill');
  if (effective.minimumQuestions == null || effective.accuracy == null) return `${who} · requirement incomplete`;
  return `${who} · ${effective.minimumQuestions} questions at ${formatPercent(toBasisPoints(effective.accuracy) / 100)}`;
}

/**
 * The stored policy for a level, from its resolved settings. `explicit` lists the settings the level chose itself. An incomplete
 * requirement (no question count or no accuracy) is stored as provisional, so it can never be mistaken for an approved one.
 */
export function buildPolicy({ level, scopeId, version, explicit, effective, retired = false, names = {} }) {
  const complete = effective.minimumQuestions != null && effective.accuracy != null;
  const source = { schema: REQ_SCHEMA, level, scopeId: scopeId ?? null, explicit: retired ? [] : FIELDS.filter((f) => explicit.includes(f)),
    preset: retired ? null : presetFor(effective) };
  if (retired) source.retired = true;
  const policy = {
    id: policyIdFor(level, scopeId), version, provisional: retired || !complete,
    label: retired ? 'Replaced by inherited settings' : policyLabel(level, scopeId, effective, names),
    calibration: CALIBRATION_NOTE,
    minimumQuestions: retired ? null : effective.minimumQuestions, accuracy: retired ? null : effective.accuracy, coverage: {}, scoreTarget: null,
    effectiveFrom: null,
    challenge: {
      schema: CHALLENGE_SCHEMA, minimumCorrect: effective.minimumCorrect ?? null,
      difficulties: cloneValue(effective.difficulties ?? []), subskills: cloneValue(effective.subskills ?? []), subskillEvidence: { maxUnmappedShare: 0 },
      families: cloneValue(effective.families), unscored: cloneValue(effective.unscored),
      requiredForAreaCompletion: effective.requiredForAreaCompletion, review: { staleAfterDays: effective.staleAfterDays ?? null },
    },
    requirementSource: source,
  };
  return policy;
}
/** Content of a policy that matters for deciding whether a new version is needed. `effectiveFrom` is set by the publisher and ignored. */
export function policyContentKey(p) {
  const { effectiveFrom, ...rest } = p;
  return JSON.stringify(sortKeys(rest, ['version']));
}
function sortKeys(v, skip = []) {
  if (Array.isArray(v)) return v.map((x) => sortKeys(x));
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).filter((k) => !skip.includes(k)).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
/** Validate with the engine. Returns the engine's {ok, errors, warnings, policy}. */
export const engineCheck = (policy) => validateMasteryPolicy(policy);
export { PRESETS };
