// Repeatable quality gate for the authored, server-issued Workplace Readiness bank.
// Hard checks are per item and fail closed; cue checks are measured per skill across
// all of its items. Passing does not prove that a competent professional would agree
// with every key. It removes mechanical defects, and the separate review ledger records
// the adversarial reading of each family.
import {WPR_CANDIDATE_TIERS} from '../../mastery/wpr-automatic.mjs';

export const normalize = text => String(text ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const wordCount = text => normalize(text).split(' ').filter(Boolean).length;
const STOP = new Set('a an the and or of to in on for with at by from is are was were be been it its this that these those as if then than so but not no do does did your you they their them he she his her we our i my can will would should could may might must have has had into out up over under after before during while about who whom which what when where how any each both either one two more most less least only also just very'.split(' '));
const content = text => new Set(normalize(text).split(' ').filter(w => w.length > 2 && !STOP.has(w)));
// Share of the words in `a` that also appear in `b` (containment, not symmetric).
export const contained = (a, b) => {
  const A = content(a), B = content(b);
  return [...A].filter(w => B.has(w)).length / (A.size || 1);
};
export const jaccard = (a, b) => {
  const A = content(a), B = content(b);
  const shared = [...A].filter(w => B.has(w)).length;
  return shared / (new Set([...A, ...B]).size || 1);
};
const GENERIC = [/this is incorrect/i, /good job/i, /always communicate professionally/i, /the other answer is better/i, /^correct\.?$/i, /^incorrect\.?$/i];
// A choice with two clauses (an action plus a follow-up) looks more complete than a one-clause choice.
const compound = text => /(,| and | then | so | while | because )/i.test(text);
const ABSOLUTE = /\b(always|never|ignore|ignores|ignoring|refuse|refuses|nothing|everyone|no one)\b/i;
export const CONTEXTS = ['agriculture', 'automotive', 'business', 'construction', 'culinary', 'education', 'engineering', 'healthcare', 'hospitality', 'it', 'manufacturing', 'media', 'retail'];
export const REQUIRED = ['id', 'family', 'concept', 'decision', 'context', 'scenario', 'prompt', 'choices', 'best', 'decisive', 'why', 'comparison'];

export function itemIssues(item) {
  const issues = [];
  for (const field of REQUIRED) if (item[field] === undefined || item[field] === '') issues.push('missing-' + field);
  if (issues.length) return issues;
  if (!Object.hasOwn(WPR_CANDIDATE_TIERS, item.concept)) issues.push('unknown-concept');
  if (!CONTEXTS.includes(item.context)) issues.push('unknown-context');
  if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(item.id)) issues.push('bad-id');
  if (!/^authored:[a-z0-9-]+$/.test(item.family)) issues.push('bad-family-identity');
  if (!Array.isArray(item.choices) || item.choices.length !== 4) return [...issues, 'choice-count'];
  if (!Number.isInteger(item.best) || item.best < 0 || item.best > 3) issues.push('bad-key');
  if (!Array.isArray(item.comparison) || item.comparison.length !== 4) return [...issues, 'comparison-count'];
  const sw = wordCount(item.scenario);
  if (sw < 38 || sw > 110) issues.push('scenario-length');
  if (!/\b(best|most appropriate|first|next|strongest)\b/i.test(item.prompt) || wordCount(item.prompt) < 4) issues.push('prompt-not-best-answer');
  const norm = item.choices.map(normalize);
  if (norm.some(t => !t) || new Set(norm).size !== 4) issues.push('duplicate-choice');
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (jaccard(item.choices[i], item.choices[j]) >= 0.6) issues.push('near-duplicate-choices');
  const lengths = item.choices.map(wordCount);
  if (lengths.some(n => n < 7 || n > 34)) issues.push('choice-length-out-of-range');
  if (Math.max(...lengths) - Math.min(...lengths) > 12) issues.push('choice-length-spread');
  if (wordCount(item.why) < 22 || wordCount(item.why) > 80) issues.push('why-length');
  if (item.comparison.some(text => wordCount(text) < 8 || wordCount(text) > 45)) issues.push('comparison-length');
  if ([item.why, ...item.comparison].some(text => GENERIC.some(re => re.test(text.trim())))) issues.push('generic-feedback');
  if (!normalize(item.scenario).includes(normalize(item.decisive))) issues.push('decisive-fact-not-in-scenario');
  else if (wordCount(item.decisive) < 4) issues.push('decisive-fact-too-short');
  // The explanation of the key must point at the stated decisive fact rather than invent a rule.
  if (contained(item.decisive, item.why + ' ' + item.comparison[item.best]) < 0.25) issues.push('explanation-ignores-decisive-fact');
  if (!/\b(but|however|while|although|though|can|may|would|helps?|helpful|useful|reasonable|appropriate|valid|sensible|understandable|natural|friendly|cautious|considerate|kind|polite)\b/i.test(item.comparison.filter((_, i) => i !== item.best).join(' '))) issues.push('alternatives-not-acknowledged');
  const sentences = item.why.split(/[.!?]+\s/).filter(Boolean).length;
  if (sentences < 2) issues.push('why-needs-reasoning-and-transfer');
  return [...new Set(issues)];
}

export function bankIssues(items) {
  const out = [];
  const seen = {id: new Set(), family: new Set(), decision: new Set()};
  for (const item of items) {
    for (const field of ['id', 'family', 'decision']) {
      if (item[field] === undefined) continue;
      if (seen[field].has(item[field])) out.push({family: item.family, issue: 'duplicate-' + field});
      seen[field].add(item[field]);
    }
  }
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    const situation = jaccard(a.scenario + ' ' + a.prompt, b.scenario + ' ' + b.prompt);
    const choices = jaccard(a.choices.join(' '), b.choices.join(' '));
    if (situation >= 0.5) out.push({family: a.family, issue: 'near-duplicate-situation', peer: b.family, score: +situation.toFixed(2)});
    if (choices >= 0.5) out.push({family: a.family, issue: 'near-duplicate-choice-set', peer: b.family, score: +choices.toFixed(2)});
  }
  return out;
}

// Cue measurements across one skill's authored items. Bounds are set well below the
// 60 percent used by the sampling audit because each family is asked once.
export function cueReport(items) {
  const n = items.length || 1;
  let longest = 0, shortest = 0, echo = 0, absolute = 0, hedged = 0, shape = 0;
  const position = [0, 0, 0, 0];
  const lengthRank = [];
  for (const item of items) {
    const words = item.choices.map(wordCount);
    const max = Math.max(...words), min = Math.min(...words);
    if (words[item.best] === max && words.filter(w => w === max).length === 1) longest++;
    if (words[item.best] === min && words.filter(w => w === min).length === 1) shortest++;
    const overlaps = item.choices.map(text => [...content(text)].filter(w => content(item.scenario).has(w)).length);
    const top = Math.max(...overlaps);
    if (overlaps[item.best] === top && overlaps.filter(o => o === top).length === 1) echo++;
    const shapes = item.choices.map(compound);
    if (shapes[item.best] && shapes.filter(Boolean).length === 1) shape++;
    const flags = item.choices.map(text => ABSOLUTE.test(text));
    if (flags[item.best]) absolute++;
    if (flags.filter(Boolean).length && !flags[item.best]) hedged++;
    position[item.best]++;
    lengthRank.push(words[item.best] - words.reduce((a, b) => a + b, 0) / 4);
  }
  return {
    items: items.length, position, longestIsBest: longest / n, shortestIsBest: shortest / n,
    sceneEchoIsBest: echo / n, onlyCompoundIsBest: shape / n, absoluteWordInBest: absolute, absoluteWordOnlyInDistractors: hedged,
    meanBestLengthOffset: +(lengthRank.reduce((a, b) => a + b, 0) / n).toFixed(2),
  };
}

export const CUE_LIMITS = {longestIsBest: 0.4, shortestIsBest: 0.4, sceneEchoIsBest: 0.5, onlyCompoundIsBest: 0.25, maxPosition: 0.4, absoluteOnlyInDistractors: 0.2};

export function cueFailures(items) {
  const r = cueReport(items), fail = [];
  if (r.longestIsBest > CUE_LIMITS.longestIsBest) fail.push('longest-answer-shortcut');
  if (r.shortestIsBest > CUE_LIMITS.shortestIsBest) fail.push('shortest-answer-shortcut');
  if (r.sceneEchoIsBest > CUE_LIMITS.sceneEchoIsBest) fail.push('scenario-echo-shortcut');
  if (r.onlyCompoundIsBest > CUE_LIMITS.onlyCompoundIsBest) fail.push('compound-answer-shortcut');
  if (Math.max(...r.position) / (r.items || 1) > CUE_LIMITS.maxPosition) fail.push('key-position-pattern');
  if (r.absoluteWordOnlyInDistractors / (r.items || 1) > CUE_LIMITS.absoluteOnlyInDistractors) fail.push('absolute-wording-shortcut');
  return fail;
}
