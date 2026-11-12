// The node states a student can see, and the one rule that maps the evaluated progress contract onto them.
// The map never decides whether requirements are met. It reads `status`, `verification`, `award` and `statusReason`.
export const STATE_KEYS = Object.freeze(['not-started', 'in-progress', 'requirements-met', 'mastered', 'review', 'unavailable']);
export const STATES = Object.freeze({
  'not-started': { label: 'Not started', glyph: 'number', blurb: 'No practice recorded yet.' },
  'in-progress': { label: 'In progress', glyph: 'play', blurb: 'You have started answering questions.' },
  'requirements-met': { label: 'Requirements met', glyph: 'check', blurb: 'You met the practice requirements. It becomes official mastery only after it is verified.' },
  mastered: { label: 'Mastered', glyph: 'star', blurb: 'Official mastery was recorded for this skill.' },
  review: { label: 'Review recommended', glyph: 'refresh', blurb: 'Some more practice would help. Your earlier progress is saved.' },
  unavailable: { label: 'Can’t be checked yet', glyph: 'help', blurb: 'Insufficient evidence: your answers are saved, but this skill can’t be scored against requirements yet.' },
});
export const OPTIONAL_BLURB = 'Optional enrichment. It never holds back finishing the area.';
const CANNOT_CHECK = new Set(['requirements-cannot-be-met', 'families-cannot-be-verified']);

/**
 * @param progress a `cs-games.mastery-progress/1` object, or null/undefined when the system has none for this skill.
 * @returns {{state:string, unrecognized:boolean}}
 */
export function deriveNodeState(progress) {
  if (!progress || typeof progress !== 'object') return { state: 'not-started', unrecognized: false };
  const practiced = (progress.attempt?.attempted ?? 0) > 0 || (progress.lifetime?.questionsAnswered ?? 0) > 0;
  switch (progress.status) {
    case 'requirements-met': return { state: progress.verification === 'verified' && progress.award?.id ? 'mastered' : 'requirements-met', unrecognized: false };
    case 'review-recommended': return { state: 'review', unrecognized: false };
    case 'in-progress': return { state: 'in-progress', unrecognized: false };
    case 'not-started': return { state: 'not-started', unrecognized: false };
    case 'provisional':
      if (CANNOT_CHECK.has(progress.statusReason)) return { state: 'unavailable', unrecognized: false };
      // No requirement has been set (the automatic default). Practice still counts, so the skill reads as started or not.
      return { state: practiced ? 'in-progress' : 'not-started', unrecognized: false };
    default: return { state: 'not-started', unrecognized: true };
  }
}
/** Whether a skill counts toward finishing an area. Mirrors the engine's default: an earlier completion stays complete under review. */
export const countsAsComplete = (state, progress) => state === 'requirements-met' || state === 'mastered' || (state === 'review' && Boolean(progress?.lastCompletedAttempt));
