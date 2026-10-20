/* Challenge assembly. Every option carries a `claim` that an independent
 * checker (real Java execution, see tests/java-verify.mjs) can evaluate. A
 * generated challenge is valid only when exactly one option's claim is true. */
import { buildChoices } from "./core.js";
import { print } from "./bool.js";

export const SCHEMA_VERSION = 2;

/** A Java program the verifier compiles: params + statement body. */
export const boolProgram = (vars, node) => ({ params: vars.map(v => ["boolean", v]), body: `System.out.print(${print(node)});` });
export const boolInputs = vars => Array.from({ length: 1 << vars.length }, (_, r) => vars.map((_, j) => !!(r & (1 << (vars.length - 1 - j)))));
export const rowInput = (vars, env) => vars.map(v => !!env[v]);

/**
 * opts: {mode, family, skill, question, code, correct:{text,tag,claim}, wrong:[...],
 *        explanation, rng, count, structure, complexity, check:{programs, inputs}, extra}
 */
export function challenge(o) {
  const { choices, answer, choiceTags } = buildChoices(o.correct, o.wrong, o.rng, o.count ?? 4);
  const all = [o.correct, ...o.wrong];
  const claims = choices.map(t => all.find(c => c.text === t).claim);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: o.mode, topic: o.mode, variant: o.family, family: o.family, reasoning: o.family, skill: o.skill,
    kind: "choice", question: o.question, code: o.code, choices, answer, answerText: choices[answer],
    explanation: o.explanation, choiceTags, structure: o.structure, complexity: o.complexity,
    check: o.check ? { ...o.check, claims } : undefined,
    ...(o.extra || {}),
  };
}
export const fmtRow = (vars, env) => vars.map(v => `${v} = ${env[v]}`).join(", ");
