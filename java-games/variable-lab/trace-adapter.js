import { generateTraceChallenge, getPostSubmissionView, RecentHistory } from "./trace-generator/src/index.js";

const HISTORY_KEY = "variableLab.traceHistory.v1";
const storage = typeof localStorage === "undefined" ? null : localStorage;
const history = RecentHistory.load(storage, HISTORY_KEY);

export function generateTrace({ difficulty = "beginner", seed } = {}) {
  const native = generateTraceChallenge({ difficulty, seed, ...(seed === undefined ? { history } : {}) });
  if (seed === undefined) {
    history.record(native);
    history.save(storage, HISTORY_KEY);
  }
  const view = getPostSubmissionView(native, native.correctChoiceId);
  const types = Object.fromEntries(native.variables.map(({ name, type }) => [name, type]));
  const traceRows = view.stateHistory.rows.map((row, i) => ({
    line: row.line,
    statement: row.code,
    variables: row.values,
    output: row.printed ?? null,
    explanation: view.lines[i].text,
    steps: view.lines[i].steps,
    notes: view.lines[i].notes,
  }));
  return {
    kind: "value",
    id: native.id,
    topic: `variable-trace/${difficulty}/${native.type}`,
    topicTitle: `Trace the Variable · ${native.type}`,
    traceFamily: native.coreReasoningFamilies[0] || "SEQUENTIAL_UPDATE",
    difficulty,
    format: native.format === "output" ? "print" : native.format,
    prompt: native.question.text,
    code: native.codeLines.map((line, i) => `${i + 1}. ${line}`).join("\n"),
    answer: native.correct.text,
    choices: native.choices.map(choice => choice.text),
    choiceDetails: native.choices.map(choice => {
      const misconception = native.distractors.find(d => d.choiceId === choice.id);
      return { value: choice.text, misconceptionId: misconception?.misconceptionId || null,
        explanation: misconception?.explanation || null };
    }),
    explanation: [view.summary, ...view.lines.map(line => `Line ${line.line}: ${line.text}`)].join("\n"),
    traceRows,
    types,
    nativeTrace: native,
  };
}
