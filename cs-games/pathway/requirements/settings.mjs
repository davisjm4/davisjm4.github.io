// What a teacher can set, how it is typed, checked and explained. Everything numeric about accuracy goes through the engine's
// arithmetic (../mastery/arithmetic.mjs), so a teacher's preview and a student's progress can never disagree.
import { BP, formatPercent, fractionToPercent, minCorrectFor, mistakeAllowance, percentToFraction, toBasisPoints } from '../mastery/arithmetic.mjs';
import { DEFAULT_CHALLENGE } from '../mastery/policy.mjs';
import { suggestedConfigurations } from '../mastery/suggestions.mjs';

/** The settings a level can set explicitly. Order is the order a teacher sees them. */
export const FIELDS = Object.freeze(['minimumQuestions', 'accuracy', 'minimumCorrect', 'difficulties', 'families', 'subskills', 'unscored', 'requiredForAreaCompletion', 'staleAfterDays']);
/** Fields that may only be chosen for one skill, because they name that skill's own topics. */
export const SKILL_ONLY_FIELDS = Object.freeze(['subskills']);
export const FIELD_LABELS = Object.freeze({
  minimumQuestions: 'Minimum questions', accuracy: 'Required accuracy', minimumCorrect: 'Minimum correct answers', difficulties: 'Difficulty levels',
  families: 'Question variety', subskills: 'Essential topics', unscored: 'Skipped, revealed and hinted questions', requiredForAreaCompletion: 'Needed to finish the learning area', staleAfterDays: 'Review reminder',
});
export const FIELD_DEFAULTS = Object.freeze({
  minimumQuestions: null, accuracy: null, minimumCorrect: null, difficulties: [], families: { ...DEFAULT_CHALLENGE.families }, subskills: [],
  unscored: { ...DEFAULT_CHALLENGE.unscored }, requiredForAreaCompletion: true, staleAfterDays: null,
});
export const LIMITS = Object.freeze({ maxQuestions: 1000, maxFamilies: 50, maxDays: 3650 });
export const DIFFICULTY_NAMES = Object.freeze(['beginner', 'intermediate', 'advanced']);
export const DIFFICULTY_LABELS = Object.freeze({ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' });

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
export const cloneValue = clone;
const isInt = (v, min = 0) => Number.isInteger(v) && v >= min;
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const list = (items) => (items.length <= 1 ? items.join('') : items.length === 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`);

// ---- typed input ---------------------------------------------------------------------------------------------------
/** "95", "95%", " 92.5 % " -> {ok, fraction, percent}. Percent only: 0.95 is refused instead of silently meaning 0.95%. */
export function parsePercent(text) {
  const raw = typeof text === 'number' ? String(text) : String(text ?? '');
  const s = raw.trim().replace(/%$/, '').trim();
  if (!s) return { ok: false, error: 'Enter the accuracy as a percentage, for example 90.' };
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'Enter the accuracy as a percentage using digits only, for example 90 or 92.5.' };
  const percent = Number(s);
  if (percent > 100) return { ok: false, error: 'Accuracy cannot be more than 100%.' };
  if (percent < 1) return { ok: false, error: `Enter the accuracy as a percentage like 90, not a fraction like 0.90. ${s} would mean less than 1%.` };
  try { return { ok: true, percent, fraction: percentToFraction(percent) }; } catch { return { ok: false, error: 'Use at most two decimal places, for example 92.5.' }; }
}
/** Whole-number input such as 30. Refuses 30.5, -3, 1e2 and blanks. */
export function parseWholeNumber(text, { min = 1, max = LIMITS.maxQuestions, label = 'This number' } = {}) {
  const s = String(text ?? '').trim();
  if (!s) return { ok: false, error: `${label} needs a whole number.` };
  if (!/^\d+$/.test(s)) return { ok: false, error: `${label} must be a whole number, like 30.` };
  const value = Number(s);
  if (value < min) return { ok: false, error: `${label} must be at least ${min}.` };
  if (value > max) return { ok: false, error: `${label} can be at most ${max}.` };
  return { ok: true, value };
}
export const accuracyPercentOf = (fraction) => fractionToPercent(fraction);

// ---- presets -------------------------------------------------------------------------------------------------------
/** Starting points, not calibrated. Numbers come from the single list in mastery/suggestions.mjs and become editable values. */
export const PRESETS = Object.freeze([
  ...suggestedConfigurations.map((s) => Object.freeze({ id: s.tier, label: s.label, minimumQuestions: s.minimumQuestions, accuracyPercent: fractionToPercent(s.accuracy), intendedFor: s.intendedFor })),
  Object.freeze({ id: 'custom', label: 'Custom', minimumQuestions: null, accuracyPercent: null, intendedFor: 'your own numbers' }),
]);
export const PRESET_NOTICE = 'These are starting points built from your stated preferences. They have not been calibrated against student data; change any number you like.';
export const presetSettings = (id) => {
  const p = PRESETS.find((x) => x.id === id);
  if (!p || p.id === 'custom') return {};
  return { minimumQuestions: p.minimumQuestions, accuracy: percentToFraction(p.accuracyPercent) };
};
/** Which preset exactly matches these numbers, else 'custom'. */
export function presetFor(settings) {
  const q = settings?.minimumQuestions, a = settings?.accuracy;
  if (q == null || a == null) return 'custom';
  return PRESETS.find((p) => p.id !== 'custom' && p.minimumQuestions === q && p.accuracyPercent === fractionToPercent(a))?.id ?? 'custom';
}

// ---- validation of one level's explicit settings --------------------------------------------------------------------
/**
 * Check the settings a teacher typed at one level. `level` is 'class', 'area' or 'skill'.
 * Errors block saving the change; warnings explain consequences. Content limits (not enough questions in the pool, and so on) are
 * not decided here: see limits.mjs. `existing` (optional) holds the settings the level already has, for the class-level rule that both
 * numbers must be present once the change is applied.
 */
export function validateSettings(settings, { level = 'class', existing = null } = {}) {
  const errors = [], warnings = [];
  const err = (field, message) => errors.push({ field, message });
  const warn = (field, message) => warnings.push({ field, message });
  const s = settings ?? {};
  for (const k of Object.keys(s)) if (!FIELDS.includes(k)) err(k, `Unknown setting "${k}".`);
  if (level !== 'skill') for (const f of SKILL_ONLY_FIELDS) if (f in s && s[f] && (!Array.isArray(s[f]) || s[f].length)) err(f, 'Essential topics are chosen for one skill at a time, because each skill has its own topics.');
  if ('minimumQuestions' in s && s.minimumQuestions !== null) {
    if (!isInt(s.minimumQuestions, 1)) err('minimumQuestions', 'Minimum questions must be a whole number of 1 or more.');
    else if (s.minimumQuestions > LIMITS.maxQuestions) err('minimumQuestions', `Minimum questions can be at most ${LIMITS.maxQuestions}.`);
  }
  if ('accuracy' in s && s.accuracy !== null) {
    let bp = null;
    try { bp = toBasisPoints(s.accuracy); } catch { err('accuracy', 'Accuracy must be a percentage from 1 to 100 with at most two decimal places.'); }
    if (bp !== null && bp < 100) err('accuracy', 'Enter the accuracy as a percentage like 90, not a fraction like 0.90.');
    if (bp === BP) warn('accuracy', 'At 100%, one mistake can never be recovered inside an attempt. A student would have to restart (their history is kept).');
  }
  if ('minimumCorrect' in s && s.minimumCorrect !== null) {
    if (!isInt(s.minimumCorrect, 1)) err('minimumCorrect', 'Minimum correct answers must be a whole number of 1 or more.');
    else if (s.minimumQuestions != null && s.minimumCorrect > s.minimumQuestions) warn('minimumCorrect', `Students will need at least ${s.minimumCorrect} answers, more than the ${s.minimumQuestions} question minimum, to reach ${s.minimumCorrect} correct.`);
  }
  if ('families' in s) {
    const f = s.families;
    if (!f || typeof f !== 'object' || Array.isArray(f)) err('families', 'Question variety needs a number of kinds and a number correct in each.');
    else {
      if (!isInt(f.minDistinct, 0) || f.minDistinct > LIMITS.maxFamilies) err('families', `The number of different kinds of questions must be a whole number from 0 to ${LIMITS.maxFamilies}.`);
      if (!isInt(f.minCorrectEach ?? 1, 1)) err('families', 'Correct answers needed in each kind must be a whole number of 1 or more.');
    }
  }
  if ('difficulties' in s) {
    if (!Array.isArray(s.difficulties)) err('difficulties', 'Difficulty requirements must be a list.');
    else {
      const seen = new Set();
      s.difficulties.forEach((d, i) => {
        const name = typeof d?.difficulty === 'string' ? d.difficulty.trim().toLowerCase() : '';
        if (!name) err('difficulties', `Difficulty requirement ${i + 1} needs a level.`);
        else if (seen.has(name)) err('difficulties', `${DIFFICULTY_LABELS[name] ?? name} is listed twice.`); else seen.add(name);
        if (!isInt(d?.minQuestions, 1)) err('difficulties', `${DIFFICULTY_LABELS[name] ?? 'Each level'} needs a whole number of questions.`);
        else if (!isInt(d?.minCorrect ?? 0, 0) || (d.minCorrect ?? 0) > d.minQuestions) err('difficulties', `${DIFFICULTY_LABELS[name] ?? 'Each level'}: correct answers must be a whole number no larger than the questions required.`);
      });
    }
  }
  if ('unscored' in s) {
    const u = s.unscored;
    if (!u || typeof u !== 'object') err('unscored', 'Choose how skipped, revealed and hinted questions are handled.');
    else for (const k of ['assisted', 'skipped', 'revealed']) if (!['incorrect', 'excluded'].includes(u[k])) err('unscored', 'Skipped, revealed and hinted questions are either counted as incorrect or left out.');
  }
  if ('requiredForAreaCompletion' in s && typeof s.requiredForAreaCompletion !== 'boolean') err('requiredForAreaCompletion', 'Choose whether this skill is needed to finish its learning area.');
  if ('staleAfterDays' in s && s.staleAfterDays !== null && !(isInt(s.staleAfterDays, 1) && s.staleAfterDays <= LIMITS.maxDays)) err('staleAfterDays', 'Review reminder must be a whole number of days, or off.');
  // Both numbers or neither: a question count with no accuracy (or the reverse) is not a requirement.
  // `existing` is what the level already holds, so changing one number later does not need the other to be typed again.
  if (level === 'class') {
    const merged = (f) => (f in s ? s[f] : existing?.[f] ?? null);
    if ((merged('minimumQuestions') != null) !== (merged('accuracy') != null)) err(merged('minimumQuestions') != null ? 'accuracy' : 'minimumQuestions', 'Class defaults need both a minimum number of questions and a required accuracy.');
  }
  return { ok: errors.length === 0, errors, warnings };
}

// ---- plain-language explanation -------------------------------------------------------------------------------------
/**
 * Explain a resolved requirement in the words a teacher or student reads. `effective` is {minimumQuestions, accuracy (fraction),
 * minimumCorrect, difficulties, families, subskills, unscored}. The correct-answer counts are the engine's own arithmetic.
 */
export function explainRequirement(effective) {
  const e = effective ?? {};
  const q = e.minimumQuestions ?? null, a = e.accuracy ?? null;
  if (q == null || a == null) {
    return { complete: false, lines: ['No practice requirement is set yet. Choose a minimum number of questions and a required accuracy.'], text: 'No practice requirement is set yet. Choose a minimum number of questions and a required accuracy.' };
  }
  const bp = toBasisPoints(a), pct = formatPercent(bp / 100);
  const needed = Math.max(minCorrectFor(q, bp), e.minimumCorrect ?? 0);
  const accuracyNeeded = minCorrectFor(q, bp);
  const lines = [`Students must answer at least ${plural(q, 'question')} with at least ${pct} first-attempt accuracy.`];
  lines.push(`At ${plural(q, 'question')}, students need at least ${plural(accuracyNeeded, 'correct answer')}.`);
  const allowed = q - accuracyNeeded;
  if (bp < BP) lines.push(allowed > 0 ? `That allows up to ${plural(allowed, 'mistake')} in the first ${q}.` : `That allows no mistakes in the first ${q}, so a student who misses one keeps answering to bring their accuracy back up.`);
  else lines.push('At 100%, a student who makes a mistake would need to restart the attempt; their earlier work stays in their history.');
  if (bp < BP) lines.push(`Students may answer more than ${plural(q, 'question')} to improve their accuracy.`);
  if (e.minimumCorrect != null) lines.push(`They also need at least ${plural(e.minimumCorrect, 'correct answer')} in total${e.minimumCorrect > accuracyNeeded ? `, which is more than the accuracy rule alone asks for` : ''}. Both requirements must be met${needed > q ? `, so they will answer at least ${needed} questions` : ''}.`);
  for (const d of e.difficulties ?? []) lines.push(`At least ${plural(d.minQuestions, `${DIFFICULTY_LABELS[d.difficulty] ?? d.difficulty} question`)}${d.minCorrect ? `, with at least ${d.minCorrect} correct` : ''}.`);
  if ((e.families?.minDistinct ?? 0) > 0) lines.push(`Correct answers in at least ${plural(e.families.minDistinct, 'different kind')} of question${(e.families.minCorrectEach ?? 1) > 1 ? `, at least ${e.families.minCorrectEach} correct in each kind` : ''}.`);
  if ((e.subskills ?? []).length) lines.push(`Essential topics: ${list(e.subskills.map((s) => `${s.label ?? s.id} (${s.minExposure ?? 1}${s.minCorrect ? `, ${s.minCorrect} correct` : ''}${s.minAccuracy ? `, ${formatPercent(fractionToPercent(s.minAccuracy))} accuracy` : ''})`))}.`);
  const u = e.unscored;
  if (u) {
    const excluded = ['skipped', 'revealed', 'assisted'].some((k) => u[k] === 'excluded');
    lines.push(excluded ? `Recorded skips, reveals or hint-assisted answers can be left out of the count, up to ${Math.round((u.maxExcludedShare ?? 0.1) * 100)}% of questions.` : 'Recorded skips, reveals or hint-assisted answers count as incorrect.');
  }
  return { complete: true, minimumQuestions: q, accuracyPercent: bp / 100, correctNeededAtMinimum: accuracyNeeded, mistakesAllowedAtMinimum: allowed, lines, text: lines.join(' ') };
}

/** How questions are counted. One short list, shown beside the settings and mirrored in the student view. */
export const COUNTING_RULES = Object.freeze([
  'Each question counts once, by the student\'s first answer. Trying again never adds credit, and a wrong first answer stays in the total.',
  'Questions from focused practice and from Mixed Practice both count toward the skill they test.',
  'Recorded skips, reveals or hint-assisted answers are never counted as correct. They count as incorrect by default, with optional exclusions. A game must report a skip or reveal for this rule to apply.',
  'If you set a minimum number of correct answers, it is required in addition to the accuracy: both must be met.',
  'A student can keep answering past the minimum to raise their accuracy. They never have to restart unless they choose to.',
  'Meeting the requirement is a practice milestone. It is separate from the 0 to 4 standards score, which comes from your own assessment.',
]);
export { fractionToPercent, percentToFraction, formatPercent, minCorrectFor, mistakeAllowance };
