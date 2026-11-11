// Versioned mastery-policy model. A mastery policy is a SUPERSET of the pathway policy that model.mjs already stores:
//   {id, version, provisional, label, minimumQuestions, accuracy, coverage, scoreTarget}
// validatePathway() only checks those legacy fields, so a policy that also carries a `challenge` block is stored and
// published by the existing pathway code unchanged. Nothing here assigns a policy to a node.
import { toBasisPoints } from './arithmetic.mjs';

export const CHALLENGE_SCHEMA = 'cs-games.mastery-challenge/1';
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:/|%-]{0,119}$/;
const UNSCORED = ['incorrect', 'excluded'];

export const DEFAULT_CHALLENGE = Object.freeze({
  schema: CHALLENGE_SCHEMA,
  minimumCorrect: null,
  difficulties: [],
  subskills: [],
  subskillEvidence: { maxUnmappedShare: 0 },
  families: { minDistinct: 0, minCorrectEach: 1 },
  // Skips, reveals and hint-assisted answers are never credited as correct. By default each stays in the denominator as
  // incorrect, so skipping or revealing hard questions cannot raise accuracy. 'excluded' removes them from the
  // denominator but is capped by maxExcludedShare.
  unscored: { assisted: 'incorrect', skipped: 'incorrect', revealed: 'incorrect', maxExcludedShare: 0.1 },
  requiredForAreaCompletion: true,
  review: { staleAfterDays: null },
});

const int = (v, min = 0) => Number.isInteger(v) && v >= min;
const frac = (v) => { try { toBasisPoints(v); return true; } catch { return false; } };

/** Stable JSON text with sorted keys; the basis of the policy digest. */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
/** cyrb53: small deterministic 53-bit string hash. It detects accidental edits to a published version; it is not a security measure. */
export function digest(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
export const policyRef = (p) => ({ id: p.id, version: p.version });
export const policyKey = (p) => `${p.id}@${p.version}`;

function mergeChallenge(raw = {}) {
  const d = DEFAULT_CHALLENGE;
  return {
    schema: CHALLENGE_SCHEMA,
    minimumCorrect: raw.minimumCorrect ?? null,
    difficulties: (raw.difficulties ?? []).map((x) => ({ difficulty: x.difficulty, minQuestions: x.minQuestions ?? 1, minCorrect: x.minCorrect ?? 0 })),
    subskills: (raw.subskills ?? []).map((s) => ({ id: s.id, label: s.label ?? s.id, match: { ...(s.match ?? {}) }, minExposure: s.minExposure ?? s.minCorrect ?? 1, minCorrect: s.minCorrect ?? 0, minAccuracy: s.minAccuracy ?? null })),
    subskillEvidence: { ...d.subskillEvidence, ...(raw.subskillEvidence ?? {}) },
    families: { ...d.families, ...(raw.families ?? {}) },
    unscored: { ...d.unscored, ...(raw.unscored ?? {}) },
    requiredForAreaCompletion: raw.requiredForAreaCompletion ?? d.requiredForAreaCompletion,
    review: { ...d.review, ...(raw.review ?? {}) },
    ...(raw.description ? { description: String(raw.description) } : {}),
  };
}

/**
 * Validate a policy and return a normalized copy. Never throws on bad input: callers get {ok, errors, warnings, policy}.
 * Legacy `coverage` entries ({subskillId: minCorrect}) become subskill requirements that match events carrying that subskill id.
 */
export function validateMasteryPolicy(raw) {
  const errors = [], warnings = [];
  const err = (path, message) => errors.push({ path, message });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: [{ path: '', message: 'Policy must be an object.' }], warnings, policy: null };
  if (raw.executable === false || raw.status === 'suggestion') err('', 'Suggested configurations are not executable policies. A teacher must approve and publish one under its own id.');
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 150) err('id', 'Policy needs a stable id.');
  if (!int(raw.version, 1)) err('version', 'Version must be a whole number of 1 or more.');
  if (typeof raw.provisional !== 'boolean') err('provisional', 'provisional must be true or false.');
  const minimumQuestions = raw.minimumQuestions ?? null, accuracy = raw.accuracy ?? null;
  if (minimumQuestions !== null && !int(minimumQuestions, 1)) err('minimumQuestions', 'Minimum questions must be a whole number of 1 or more.');
  if (accuracy !== null && !frac(accuracy)) err('accuracy', 'Accuracy must be a fraction from 0 to 1 with at most two decimal places of a percent.');
  if (raw.scoreTarget != null && !(Number.isFinite(raw.scoreTarget) && raw.scoreTarget >= 0 && raw.scoreTarget <= 4)) err('scoreTarget', 'scoreTarget uses the 0-4 scale.');
  if (raw.coverage != null && (typeof raw.coverage !== 'object' || Array.isArray(raw.coverage) || Object.values(raw.coverage).some((n) => !int(n)))) err('coverage', 'coverage maps a subskill id to a whole-number minimum.');
  if (raw.effectiveFrom != null && !Number.isFinite(Date.parse(raw.effectiveFrom))) err('effectiveFrom', 'effectiveFrom must be an ISO timestamp.');
  const c = mergeChallenge(raw.challenge);
  const rc = raw.challenge ?? {};
  if (rc.schema != null && rc.schema !== CHALLENGE_SCHEMA) err('challenge.schema', `Unknown challenge schema ${rc.schema}.`);
  if (c.minimumCorrect !== null && !int(c.minimumCorrect, 1)) err('challenge.minimumCorrect', 'Minimum correct must be a whole number of 1 or more.');
  const seenD = new Set();
  c.difficulties.forEach((d, i) => {
    const p = `challenge.difficulties[${i}]`;
    if (typeof d.difficulty !== 'string' || !d.difficulty.trim()) err(`${p}.difficulty`, 'Difficulty needs a name.');
    else if (seenD.has(d.difficulty.toLowerCase())) err(`${p}.difficulty`, 'Duplicate difficulty.'); else seenD.add(d.difficulty.toLowerCase());
    if (!int(d.minQuestions, 1)) err(`${p}.minQuestions`, 'Needs a whole number of 1 or more.');
    if (!int(d.minCorrect) || d.minCorrect > d.minQuestions) err(`${p}.minCorrect`, 'Minimum correct must be a whole number no larger than minQuestions.');
    d.difficulty = typeof d.difficulty === 'string' ? d.difficulty.trim().toLowerCase() : d.difficulty;
  });
  const seenS = new Set();
  c.subskills.forEach((s, i) => {
    const p = `challenge.subskills[${i}]`;
    if (typeof s.id !== 'string' || !ID.test(s.id)) err(`${p}.id`, 'Subskill needs a stable id.');
    else if (seenS.has(s.id)) err(`${p}.id`, 'Duplicate subskill id.'); else seenS.add(s.id);
    if (!int(s.minExposure, 1)) err(`${p}.minExposure`, 'Exposure must be a whole number of 1 or more.');
    if (!int(s.minCorrect) || s.minCorrect > s.minExposure) err(`${p}.minCorrect`, 'Minimum correct must be a whole number no larger than minExposure.');
    if (s.minAccuracy !== null && !frac(s.minAccuracy)) err(`${p}.minAccuracy`, 'Subskill accuracy must be a fraction from 0 to 1.');
    if (s.minAccuracy === 1) warnings.push({ path: `${p}.minAccuracy`, message: 'Requiring 100% on a subskill means one slip can never be recovered inside the attempt.' });
    for (const k of ['assessedModes', 'familyIds', 'familyPrefixes', 'topics']) if (s.match[k] != null && (!Array.isArray(s.match[k]) || !s.match[k].length || s.match[k].some((v) => typeof v !== 'string' || !v))) err(`${p}.match.${k}`, 'Needs a non-empty list of text values.');
    const unknown = Object.keys(s.match).filter((k) => !['assessedModes', 'familyIds', 'familyPrefixes', 'topics'].includes(k));
    if (unknown.length) err(`${p}.match`, `Unknown selector ${unknown.join(', ')}.`);
  });
  for (const [key, min] of Object.entries(raw.coverage ?? {})) {
    if (seenS.has(key)) continue;
    c.subskills.push({ id: key, label: key, match: {}, minExposure: Math.max(1, min), minCorrect: min, minAccuracy: null, legacyCoverage: true });
  }
  if (!(c.subskillEvidence.maxUnmappedShare >= 0 && c.subskillEvidence.maxUnmappedShare <= 1)) err('challenge.subskillEvidence.maxUnmappedShare', 'Share must be between 0 and 1.');
  if (!int(c.families.minDistinct)) err('challenge.families.minDistinct', 'Distinct families must be a whole number of 0 or more.');
  if (!int(c.families.minCorrectEach, 1)) err('challenge.families.minCorrectEach', 'Correct per family must be a whole number of 1 or more.');
  for (const k of ['assisted', 'skipped', 'revealed']) if (!UNSCORED.includes(c.unscored[k])) err(`challenge.unscored.${k}`, `Use ${UNSCORED.join(' or ')}.`);
  if (!(c.unscored.maxExcludedShare >= 0 && c.unscored.maxExcludedShare <= 1)) err('challenge.unscored.maxExcludedShare', 'Share must be between 0 and 1.');
  if (typeof c.requiredForAreaCompletion !== 'boolean') err('challenge.requiredForAreaCompletion', 'Must be true or false.');
  if (c.review.staleAfterDays !== null && !int(c.review.staleAfterDays, 1)) err('challenge.review.staleAfterDays', 'Must be a whole number of days or null.');
  if (minimumQuestions !== null && minimumQuestions < 5) warnings.push({ path: 'minimumQuestions', message: 'A very small minimum makes the accuracy rule coarse: one miss may be unrecoverable inside the minimum.' });
  if (raw.provisional === false && (minimumQuestions === null || accuracy === null)) warnings.push({ path: '', message: 'Non-provisional policy without a question minimum and accuracy has no practice challenge; the node stays provisional.' });
  if (errors.length) return { ok: false, errors, warnings, policy: null };
  const policy = {
    id: raw.id, version: raw.version, provisional: raw.provisional, label: raw.label ?? raw.id,
    minimumQuestions, accuracy, coverage: { ...(raw.coverage ?? {}) }, scoreTarget: raw.scoreTarget ?? null,
    effectiveFrom: raw.effectiveFrom ?? null, challenge: c, ...(raw.exampleOnly === true ? { exampleOnly: true } : {}),
  };
  return { ok: true, errors, warnings, policy };
}
export function assertMasteryPolicy(raw) {
  const r = validateMasteryPolicy(raw);
  if (!r.ok) throw new Error('Invalid mastery policy: ' + r.errors.map((e) => `${e.path || 'policy'}: ${e.message}`).join('; '));
  return r.policy;
}
/** Content digest of the executable parts of a policy, recorded on every attempt so a published version can't be edited silently. */
export const policyDigest = (p) => digest(stableStringify({ id: p.id, version: p.version, provisional: p.provisional, minimumQuestions: p.minimumQuestions, accuracy: p.accuracy, coverage: p.coverage, challenge: p.challenge }));
/** True when the policy defines a practice challenge the engine can evaluate. */
export const isChallengeConfigured = (p) => !p.provisional && p.minimumQuestions !== null && p.accuracy !== null;
/** A normalized policy back to the stored pathway shape. validatePathway() accepts it as is. */
export const toPathwayPolicy = (p) => JSON.parse(JSON.stringify({ id: p.id, version: p.version, provisional: p.provisional, label: p.label, minimumQuestions: p.minimumQuestions, accuracy: p.accuracy, coverage: p.coverage, scoreTarget: p.scoreTarget, ...(p.effectiveFrom ? { effectiveFrom: p.effectiveFrom } : {}), ...(p.exampleOnly ? { exampleOnly: true } : {}), challenge: p.challenge }));
/** Resolve the policy a checkpoint points at inside a stored pathway. */
export function policyForCheckpoint(pathway, checkpoint) {
  const raw = pathway.policies.find((x) => x.id === checkpoint.policyId && x.version === checkpoint.policyVersion);
  if (!raw) return { ok: false, errors: [{ path: 'policyId', message: 'Checkpoint refers to a policy version that is not in the pathway.' }], warnings: [], policy: null };
  return validateMasteryPolicy(raw);
}
