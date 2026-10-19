// Compatibility adapter.
// The existing Variable Lab source (https://github.com/davisjm4/davisjm4.github.io, java-games/variable-lab/)
// could NOT be inspected while building this package (GitHub access was not enabled for the session and the
// public page exposes no readable script source). The default mapping below is therefore an ASSUMPTION about a
// typical multiple-choice challenge shape, not a description of the real schema.
//
// Work: either (a) edit DEFAULT_ADAPTER_MAP to match the real field names, or (b) pass your own `map` object, or
// (c) skip the adapter and read the native challenge object directly (see CHALLENGE_SCHEMA.md).

export const DEFAULT_ADAPTER_MAP = Object.freeze({
  id: 'id',
  difficulty: 'difficulty',            // "beginner" | "intermediate" | "advanced"
  code: 'code',                        // string with \n line breaks
  codeLines: 'codeLines',              // array of strings (one statement per line, line N = array[N-1])
  prompt: 'question',                  // question text
  options: 'options',                  // array of option strings in display order
  answerIndex: 'answerIndex',          // index of correct option
  answerText: 'answer',                // correct option text
  explanation: 'explanation',          // post-submission feedback text
  trace: 'trace',                      // line-by-line trace objects
  topic: 'topic',                      // bounded Session Summary topic id
  meta: 'generator',                   // full native challenge object, kept for debugging / richer UI
});

export function toVariableLabChallenge(challenge, map = {}) {
  const m = { ...DEFAULT_ADAPTER_MAP, ...map };
  const topic = `variable-trace/${challenge.difficulty}/${challenge.type}`; // bounded: 3 x 5 topics, not one per challenge
  const out = {};
  out[m.id] = challenge.id;
  out[m.difficulty] = challenge.difficulty;
  out[m.code] = challenge.code;
  out[m.codeLines] = challenge.codeLines;
  out[m.prompt] = challenge.question.text;
  out[m.options] = challenge.choices.map((c) => c.text);
  out[m.answerIndex] = challenge.correctIndex;
  out[m.answerText] = challenge.correct.text;
  out[m.explanation] = [challenge.explanation.summary, ...challenge.explanation.lines.map((l) => `Line ${l.line}: ${l.text}`)].join('\n');
  out[m.trace] = challenge.explanation.lines;
  out[m.topic] = topic;
  out[m.meta] = challenge;
  return out;
}
