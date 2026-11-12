// Student-facing wording. Every number below is read from the evaluated progress contract (`cs-games.mastery-progress/1`) and only
// formatted here. Nothing recomputes accuracy, thresholds, or how many answers recovery needs: the engine owns that arithmetic.
import { formatDay, formatPercent, formatStamp, joinList, plural } from './format.mjs';
import { OPTIONAL_BLURB, STATES } from './states.mjs';

export const ATTEMPT_STATUS_LABEL = Object.freeze({
  'in-progress': 'Current attempt', 'requirements-not-yet-met': 'Ended before the requirements were met', 'requirements-met': 'Requirements met',
  restarted: 'You started a new attempt', 'superseded-by-new-policy': 'Replaced when the requirements changed',
});

/** A short line shown under a skill node. */
export function nodeCaption(node) {
  const p = node.progress, att = p?.attempt, req = p?.requirements;
  switch (node.state) {
    case 'requirements-met': return 'Requirements met';
    case 'mastered': return 'Mastered';
    case 'review': return 'Review';
    case 'unavailable': return 'Can’t be checked yet';
    case 'in-progress': return req && att ? `${att.attempted} of ${req.minimumQuestions}` : att?.attempted ? `${att.attempted} answered` : '';
    default: return req && att && att.attempted === 0 && (p.lifetime?.questionsAnswered ?? 0) > 0 ? 'New attempt' : '';
  }
}
/**
 * A skill node as an ordered list of pieces. The DOM draws exactly these pieces in this order (visible ones as text, the others as
 * screen-reader-only text), and the accessible name is their concatenation. One list, so the name can never drift from what is
 * written on the node (WCAG 2.5.3, label in name).
 * @returns {Array<{key:string, text:string, visible:boolean}>}
 */
export function nodeParts(node, { suggested = node.suggested } = {}) {
  const p = node.progress, att = p?.attempt, req = p?.requirements, parts = [];
  const add = (key, text, visible) => { if (text) parts.push({ key, text, visible }); };
  add('order', `Skill ${node.order} of ${node.orderOf}: `, false);
  add('title', node.title, true);
  add('state', `. ${STATES[node.state].label}.`, false);
  const cap = nodeCaption(node);
  add('caption', cap, true);
  const accuracy = att?.attempted && att.accuracyPercent !== null && att.accuracyPercent !== undefined ? formatPercent(att.accuracyPercent) : null;
  if (accuracy && ['in-progress', 'review', 'not-started'].includes(node.state)) add('detail', req ? ` questions answered, ${accuracy} right on the first try.` : `, ${accuracy} right on the first try.`, false);
  add('optional', node.optional ? 'Optional' : '', true);
  add('suggested', suggested ? 'Suggested next' : '', true);
  if (node.delta > 0) { add('delta', `+${node.delta}`, true); add('deltaNote', ` ${node.delta === 1 ? 'question' : 'questions'} added in the last session.`, false); }
  add('target', node.target?.text ?? '', true);
  return parts;
}
/** The full accessible name of a skill node (what a screen reader announces). */
export const nodeAccessibleName = (node, options) => nodeParts(node, options).map((x) => x.text).join(' ').replace(/\s+([.,])/g, '$1').replace(/\s+/g, ' ').trim();

/** The teacher's requirement in one sentence, or an honest statement that none is set. */
export function requirementLine(node) {
  const req = node.progress?.requirements;
  if (!req) return 'No requirement is set for this skill. Your practice is still recorded.';
  const parts = [`${plural(req.minimumQuestions, 'question')} answered`, `${formatPercent(req.requiredAccuracyPercent)} right on the first try`];
  if (req.minimumCorrect) parts.push(`at least ${plural(req.minimumCorrect, 'correct answer')}`);
  return `${joinList(parts)}.`;
}
export const exampleNotice = 'Example requirement. A real teacher has not set it.';

/** Lead paragraph: the engine's own sentence when there is one, otherwise a plain statement. */
export function leadText(node) {
  const e = node.progress?.explanation;
  if (e?.headline) return e.headline;
  return node.state === 'not-started' ? `You haven’t practiced ${node.title} yet. Keep practicing; your answers are saved.` : 'Your answers are saved.';
}
export const detailLines = (node) => node.progress?.explanation?.lines ?? [];

/**
 * What is left, as separate sentences. The question count and the accuracy are deliberately kept apart: "at least 18 more questions"
 * and "at least 8 more correct in a row" are different numbers answering different requirements, and both must hold.
 */
export function whatsLeft(node) {
  const p = node.progress, req = p?.requirements;
  if (!req || ['requirements-met', 'mastered', 'unavailable'].includes(node.state)) return [];
  const att = p.attempt, rec = p.recovery, out = [];
  const remainingQuestions = rec?.remainingQuestions ?? p.remaining?.questions ?? 0;
  if (remainingQuestions > 0) {
    out.push({ kind: 'questions', text: att.attempted === 0 ? `Answer at least ${plural(remainingQuestions, 'question')}.`
      : `Answer at least ${plural(remainingQuestions, 'more question')}: you have ${att.attempted} of ${req.minimumQuestions}.` });
  }
  if (rec && !rec.accuracyMet && att.attempted > 0) {
    if (rec.accuracyUnrecoverableInAttempt) out.push({ kind: 'accuracy', text: `Reaching ${formatPercent(req.requiredAccuracyPercent)} is no longer possible in this attempt. You can start a new attempt; your history stays.` });
    else if (rec.additionalCorrectForAccuracy > 0) {
      out.push({ kind: 'accuracy', text: `For accuracy, at least ${plural(rec.additionalCorrectForAccuracy, 'more correct answer')} in a row would bring you to ${formatPercent(req.requiredAccuracyPercent)}. You are at ${formatPercent(att.accuracyPercent)}.`,
        long: rec.additionalCorrectForAccuracy > req.minimumQuestions });
    }
  }
  const s = p.missing?.subskills ?? [];
  if (s.length) out.push({ kind: 'subskills', text: `Practice questions about ${joinList(s.map((x) => x.label))}.` });
  const d = p.missing?.difficulties ?? [];
  if (d.length) out.push({ kind: 'difficulties', text: `Answer some ${joinList(d.map((x) => x.difficulty))} questions.` });
  const f = p.missing?.families;
  if (f) out.push({ kind: 'families', text: `Try questions of more kinds. You have answered correctly in ${plural(f.have, 'kind')} and need ${f.have + f.needed}.` });
  const both = out.some((x) => x.kind === 'questions') && out.some((x) => x.kind === 'accuracy');
  if (both) out.push({ kind: 'note', text: 'Both count: you need the question total and the accuracy.' });
  if (rec?.lowerBoundOnly && rec.otherRequirementsOutstanding?.length && out.some((x) => x.kind === 'accuracy')) out.push({ kind: 'note', text: 'The accuracy number covers accuracy only. The other requirements still apply.' });
  return out;
}

/** The requirement checklist straight from `requirementChecks`. */
export function checklist(node) {
  return (node.progress?.requirementChecks ?? []).map((c) => ({ code: c.code, label: c.label, met: c.met === true }));
}

export function practiceSummary(node) {
  const att = node.progress?.attempt;
  if (!att || !att.attempted) return null;
  const acc = formatPercent(att.accuracyPercent);
  return `${att.attempted} answered, ${att.correct} right on the first try${acc ? ` (${acc})` : ''}.`;
}
/** An attempt is closed when it has a close time, or the host marked it closed (the live history lists closed attempts without times). */
export const isClosedAttempt = (a) => a.closed === true || (a.closedAt !== null && a.closedAt !== undefined);
export function lifetimeLine(node) {
  const l = node.progress?.lifetime;
  if (!l) return 'No practice recorded yet.';
  const bits = [`${plural(l.questionsAnswered, 'question')} answered`, `${l.firstTryCorrect} right on the first try`];
  return `${joinList(bits)}.`;
}
export function attemptLine(a, timeZone) {
  const start = formatStamp(a.openedAt, timeZone), end = formatStamp(a.closedAt, timeZone);
  const when = start && end && start !== end ? `${start} to ${end}` : start ? (a.closedAt ? start : `Started ${start}`) : null;
  const nums = a.attempted === null ? null : `${a.attempted} answered, ${a.correct} correct${a.accuracyPercent === null ? '' : ` (${formatPercent(a.accuracyPercent)})`}`;
  return [nums, when].filter(Boolean).join(' · ');
}
export const attemptLabel = (a) => `Attempt ${a.seq}: ${ATTEMPT_STATUS_LABEL[a.status] ?? a.status}`;

/** Pacing copy. Never "overdue", never "late": a target date is a goal, not a deadline. */
export const pacingNote = 'Target dates come from your teacher. They are goals to aim for, not due dates.';
export function stopSummaryLine(stop) {
  const s = stop.summary;
  const bits = [s.label];
  if (s.optionalTotal) bits.push(s.complete && s.optionalRemaining ? `${plural(s.optionalRemaining, 'optional skill')} still open` : `${plural(s.optionalTotal, 'optional skill')}`);
  if (s.requiredTotal && s.practiceOnly) bits.push(`${plural(s.practiceOnly,'practice-only skill')}`);
  if (s.reviewRecommended) bits.push(`${s.reviewRecommended} to review`);
  return bits.join(' · ');
}
export function courseSummaryLine(model) {
  const t = model.totals;
  if (model.mode === 'requirements') {
    const rest = t.practiceOnly ? ` ${plural(t.practiceOnly, 'other skill')} ${t.practiceOnly === 1 ? 'shows' : 'show'} practice only.` : '';
    return `${t.completeWithRequirements} of ${plural(t.withRequirements, 'skill')} with requirements complete.${rest}`;
  }
  return t.started ? `You have practiced ${t.started} of ${plural(t.skills, 'skill')}.`
    : `${plural(t.skills, 'skill')} in ${plural(t.stops, 'stop')}. Start anywhere.`;
}
export const optionalBlurb = OPTIONAL_BLURB;
export { formatDay };
