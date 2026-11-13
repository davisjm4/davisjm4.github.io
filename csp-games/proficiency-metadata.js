/* Evidence metadata for formative proficiency, shared by the games and the tests. Pure functions, no imports.
 *
 * A game reports a reasoning FAMILY with each scored question. The proficiency rubric (cs-games/pathway/proficiency/coverage-phase2.mjs)
 * decides from the family which tier a question can support, so a family must name the thinking the question needs, not just its topic.
 * These two helpers keep two kinds of question out of Level 3 evidence:
 *   - Boolean Gatekeeper "make it TRUE" questions a random guess often passes, and
 *   - Algorithm Architect questions that ask the learner to recognise an idiom or copy a call that the goal already states.
 * Those questions still score and still appear in the Session Summary; they just carry no Level 3 family.
 */

/** Largest share of the 13 × 13 input pairs that may open the gate for a question to count as Level 3 evidence. A learner
 *  guessing a random pair passes such a question at most 25% of the time; across the 8 answers Level 3 needs, luck is negligible. */
export const SPARSE_MAX_DENSITY = 0.25;

/**
 * @param {{x:number,y:number}[]} solutions every pair (0–12) that satisfies the expression
 * @param {string} rootOp "AND" | "OR" | "NOT"
 * @returns {{needsBothInputs:boolean,density:number,family:string|undefined}}
 *   needsBothInputs: no single value of x, and none of y, opens the gate whatever the other input is (the learner must coordinate both).
 *   family: set only when both-inputs AND sparse, so only questions that reward reasoning are classified.
 */
export function booleanMakeEvidence(solutions, rootOp, side = 13) {
  const counts = input => Array.from({ length: side }, (_, value) => solutions.filter(pair => pair[input] === value).length);
  const needsBothInputs = ['x', 'y'].every(input => counts(input).every(count => count < side));
  const density = solutions.length / (side * side);
  return { needsBothInputs, density, family: solutions.length && needsBothInputs && density <= SPARSE_MAX_DENSITY ? `both-inputs:${String(rootOp).toLowerCase()}` : undefined };
}

// Keep the Make control and grading unchanged. Prefer a different root
// operation from the last assessment and avoid recently repeated solutions.
export function selectBooleanMakeChallenge(draw, recent) {
  const previous = recent.at(-1)?.family;
  let firstQualified = null;
  let freshQualified = null;
  let fallback;
  for (let i = 0; i < 64; i++) {
    const question = draw();
    fallback ??= question;
    const {family} = booleanMakeEvidence(question.solutions, question.e.op);
    if (!family || !question.solutions.length) continue;
    const key = question.solutions.map(({x,y}) => 13*x+y).join(',');
    const candidate = {question, family, key};
    firstQualified ??= candidate;
    if (recent.some(item => item.key === key)) continue;
    freshQualified ??= candidate;
    if (family !== previous) { freshQualified = candidate; break; }
  }
  const selected = freshQualified ?? firstQualified;
  if (!selected) return fallback;
  recent.push({family:selected.family,key:selected.key});
  if (recent.length > 12) recent.shift();
  return selected.question;
}

const optionText = option => (option && typeof option === 'object' ? option.text ?? option.label ?? '' : String(option ?? ''));
const callMatch = /^result ← ([A-Za-z]\w*)\(([^()]*)\)$/;

/**
 * The component an Algorithm Architect question asks about, at the grain the rubric needs.
 *   update-count            the whole answer is the counter increment `result ← (result + 1)`: idiom recognition, constants as distractors
 *   procedure-call-direct   one call to a named procedure using only the procedure's own inputs, e.g. `result ← difference(a, b)`:
 *                           the goal already names the call, so this is transcription and argument order, not composition
 * Everything else keeps the component name the game has always used (condition, loop-boundary, update, procedure-call, initialization,
 * return, arrange), so earlier practice records stay valid.
 */
export function architectComponent(q) {
  if (q.format === 'arrange') return 'arrange';
  const component = String(q.component).replaceAll(' ', '-');
  const correct = q.options?.[Number(String(q.correctChoice).split('-')[1])];
  const text = optionText(correct);
  if (component === 'update' && text === 'result ← (result + 1)') return 'update-count';
  if (component === 'procedure-call') {
    const call = callMatch.exec(text);
    const args = call ? call[2].split(',').map(part => part.trim()).filter(Boolean) : [];
    if (call && args.length && args.every(arg => (q.params ?? []).includes(arg))) return 'procedure-call-direct';
  }
  return component;
}
