// Can the requirement be met with the questions and levels that exist? Uses the engine's own assessSupport and the facts we can
// verify from this repository. Every finding says whether it is a verified limit or an estimate, and the answer for the teacher is one
// of four statuses:
//   ok          nothing found
//   warning     something we cannot verify or an estimate; saving and publishing are allowed (publishing asks for acknowledgement)
//   draft-only  a verified shortfall in content that can be added later; the draft may be saved, publishing is blocked
//   blocked     impossible as written (no such difficulty level exists, or the numbers are invalid); nothing is saved
// Nothing here changes how questions are drawn: the lab's protections against repeating a question stay as they are, and no question
// kinds are invented to make a requirement look possible.
import { assessSupport, contentProfileFromGraph } from '../mastery/evaluate.mjs';
import { toBasisPoints } from '../mastery/arithmetic.mjs';
import { DIFFICULTY_LABELS, FIELDS } from './settings.mjs';
import { engineCheck } from './policies.mjs';

export const STATUS_ORDER = Object.freeze(['ok', 'warning', 'draft-only', 'blocked']);
const worst = (a, b) => (STATUS_ORDER.indexOf(a) >= STATUS_ORDER.indexOf(b) ? a : b);

/**
 * Facts about each skill's practice content, from the graph and the evidence registry. `extra` lets a caller add facts the repository
 * does not hold, in the shape {[nodeId]: {bankSize: {value, basis: 'verified'|'estimate', expandable: boolean}}}.
 */
export function buildContentFacts({ graph, registry = null, extra = {} }) {
  const levelsByNode = new Map(), seenNode = new Set(), verifiedEvidence = new Set();
  for (const m of registry?.matrix ?? []) {
    seenNode.add(m.node);
    if (!levelsByNode.has(m.node)) levelsByNode.set(m.node, new Set());
    if (m.difficulty && m.difficulty !== 'n/a') levelsByNode.get(m.node).add(String(m.difficulty).toLowerCase());
  }
  for (const e of registry?.entries ?? []) if (e.nodeId && e.status === 'fully-supported') verifiedEvidence.add(e.nodeId);
  return {
    profileFor(nodeId) {
      const base = contentProfileFromGraph(graph, nodeId) ?? { boundFamilyIds: null, familyBindingStatus: null, difficulties: null, bankSize: null };
      const lv = levelsByNode.get(nodeId);
      const bank = extra[nodeId]?.bankSize ?? null;
      return {
        ...base,
        difficulties: lv ? [...lv].sort() : base.difficulties,
        // assessSupport only treats a pool as a verified limit when the size is verified; estimates are handled below
        bankSize: bank && bank.basis === 'verified' ? bank.value : null,
        bank,
      };
    },
    practiceEvidence(nodeId) { return verifiedEvidence.has(nodeId) ? 'verified' : 'unverified'; },
  };
}

const an = (word) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);
const problem = (severity, code, message, verified, field = null) => ({ severity, code, message, verified, basis: verified ? 'verified' : 'estimate', field });

/**
 * Check one resolved requirement against the facts for its skill.
 * `effective` is the resolved settings, `policy` the engine-normalized policy (or null when the requirement is incomplete).
 */
export function checkRequirement({ effective, policy, profile, evidence = 'verified', title = 'This skill' }) {
  const problems = [];
  if (effective.minimumQuestions == null || effective.accuracy == null) return { status: 'ok', complete: false, problems: [] };
  if (policy) {
    const support = assessSupport(policy, profile);
    for (const r of support.reasons) {
      switch (r.code) {
        case 'family-metadata-unavailable': case 'families-not-bound-at-source':
          problems.push(problem('warning', 'families-unverifiable', `${title}: we can't check how many kinds of questions exist, so the question variety requirement can't be confirmed yet. Students' progress on it stays provisional.`, false, 'families')); break;
        case 'fewer-families-than-required':
          problems.push(problem('draft-only', 'too-many-families', `${title}: ${r.message.replace(/^Only (\d+) question families exist for this skill but (\d+) are required\.$/, 'only $1 kinds of questions exist but you asked for $2.')} The draft can be saved; add question kinds or lower the number before publishing.`, true, 'families')); break;
        case 'difficulty-levels-unknown':
          { const raw = r.message.match(/has (\w+) questions/)?.[1]; problems.push(problem('warning', 'difficulty-unknown', `${title}: it isn't known whether this skill has ${DIFFICULTY_LABELS[raw] ?? raw ?? 'those'} questions, so students may not be able to finish.`, false, 'difficulties')); break; }
        case 'difficulty-not-offered': {
          const level = DIFFICULTY_LABELS[r.message.match(/no (\w+) questions/)?.[1]] ?? r.message.match(/no (\w+) questions/)?.[1] ?? 'that level';
          const none = Array.isArray(profile?.difficulties) && profile.difficulties.length === 0;
          problems.push(problem('blocked', 'difficulty-not-offered', none ? `${title}: its practice has no difficulty levels, so ${an(level)} requirement can't be met.` : `${title}: its practice has no ${level} questions, so that requirement can't be met.`, true, 'difficulties')); break;
        }
        case 'question-pool-smaller-than-minimum': {
          const expandable = profile?.bank?.expandable !== false;
          problems.push(problem(expandable ? 'draft-only' : 'blocked', 'pool-too-small', `${title}: only ${profile.bankSize} different questions exist but ${policy.minimumQuestions} are required, and a question is not repeated within a practice window.${expandable ? ' The draft can be saved; more questions need to be added before publishing.' : ''}`, true, 'minimumQuestions')); break;
        }
        case 'subskill-has-no-questions':
          problems.push(problem('draft-only', 'subskill-without-questions', `${title}: ${r.message} The draft can be saved; questions for it need to exist before publishing.`, true, 'subskills')); break;
        default: break;
      }
    }
  }
  const bank = profile?.bank;
  if (bank && bank.basis === 'estimate' && Number.isFinite(bank.value) && bank.value < effective.minimumQuestions) {
    problems.push(problem('warning', 'pool-may-be-small', `${title}: roughly ${bank.value} different questions are available (an estimate) but ${effective.minimumQuestions} are required. Students may run out of new questions.`, false, 'minimumQuestions'));
  }
  if (evidence !== 'verified') problems.push(problem('warning', 'evidence-unverified', `${title}: CS Games has not verified that practice on this skill is counted automatically yet, so students' answers may not count toward this requirement.`, false));
  try {
    const bp = toBasisPoints(effective.accuracy);
    if (bp < 10000 && effective.minimumQuestions - Math.floor((bp * effective.minimumQuestions + 9999) / 10000) === 0 && effective.minimumQuestions < 20)
      problems.push(problem('warning', 'no-room-for-mistakes', `${title}: ${effective.minimumQuestions} questions at this accuracy allows no mistakes in the first ${effective.minimumQuestions}. Students can keep answering to recover.`, true, 'accuracy'));
  } catch { /* accuracy errors are reported by validation */ }
  const status = problems.reduce((s, p) => worst(s, p.severity), 'ok');
  return { status, complete: true, problems };
}

/** Check a stored policy (from a pathway) with the engine and the facts. Returns the same shape as checkRequirement plus engine errors. */
export function checkPolicy({ policy, effective, facts, nodeId, title }) {
  const v = engineCheck(policy);
  if (!v.ok) return { status: 'blocked', complete: true, problems: v.errors.map((e) => problem('blocked', 'invalid', `${title ?? 'This skill'}: ${e.message}`, true, null)) };
  return checkRequirement({ effective, policy: v.policy, profile: facts?.profileFor(nodeId) ?? null, evidence: facts?.practiceEvidence(nodeId) ?? 'verified', title });
}
export { FIELDS };

import { resolveSkill, readLevels } from './levels.mjs';
import { buildPolicy } from './policies.mjs';
/** Check one skill's resolved requirement: `{status, complete, problems, title}`. `facts` is from buildContentFacts (or null for no content facts). */
export function assessSkill(pathway, nodeId, graph, facts = null, levels = readLevels(pathway)) {
  const r = resolveSkill(pathway, nodeId, graph, levels);
  if (!r) return null;
  const pseudo = buildPolicy({ level: 'skill', scopeId: nodeId, version: 1, explicit: [], effective: r.effective });
  const out = checkPolicy({ policy: pseudo, effective: r.effective, facts, nodeId, title: r.title });
  return { nodeId, title: r.title, areaId: r.areaId, areaTitle: r.areaTitle, ...out };
}
/** Check every skill. Returns {byNode, counts, blocked, draftOnly, warnings} (problem lists carry the skill title). */
export function assessAll(pathway, graph, facts = null) {
  const levels = readLevels(pathway), byNode = new Map(), counts = { ok: 0, warning: 0, 'draft-only': 0, blocked: 0, notSet: 0 };
  for (const id of pathway.sequence) {
    const a = assessSkill(pathway, id, graph, facts, levels);
    if (!a) continue;
    byNode.set(id, a);
    if (!a.complete) counts.notSet++; else counts[a.status]++;
  }
  const flat = (sev) => [...byNode.values()].flatMap((a) => a.problems.filter((p) => p.severity === sev).map((p) => ({ ...p, nodeId: a.nodeId, title: a.title, areaId: a.areaId })));
  return { byNode, counts, blocked: flat('blocked'), draftOnly: flat('draft-only'), warnings: flat('warning') };
}
