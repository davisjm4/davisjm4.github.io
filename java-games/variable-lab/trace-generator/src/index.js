// Public API: generateTraceChallenge() and friends. Browser-independent ES module (no DOM, no Node-only APIs).

import { Rng, mixSeed } from './rng.js';
import { renderProgram, renderStmt } from './model.js';
import { execute, formatValue, typeCheck } from './interp.js';
import { analyze, validateDifficulty, RULES, FAMILIES, FAMILY_IDS, BASELINE_FAMILIES } from './analysis.js';
import { buildCandidate, chooseObjective, TYPES, FORMATS, TYPE_WEIGHTS, FORMAT_WEIGHTS } from './generator.js';
import { generateDistractors, MISCONCEPTIONS } from './distractors.js';
import { buildExplanation } from './explain.js';
import { RecentHistory, exactSignature, semanticSignature, HISTORY_DEFAULTS } from './history.js';

export const SCHEMA_VERSION = '1.0';
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const FORMAT_INFO = {
  output: { id: 'predict-output', label: 'Predict the Output' },
  final: { id: 'final-value', label: 'Final Variable Value' },
  checkpoint: { id: 'intermediate-checkpoint', label: 'Intermediate Checkpoint' },
};

function questionText(target, answerType) {
  if (target.format === 'output') return 'What does System.out.println() print?';
  if (target.format === 'final') return `What is the value of ${target.varName} after the program executes?`;
  return `What is the value of ${target.varName} immediately after line ${target.index + 1} executes?`;
}

function weightedPick(rng, table, allowed) {
  const keys = Object.keys(table).filter((k) => !allowed || allowed.includes(k));
  return rng.weighted(keys, (k) => table[k]);
}

export function generateTraceChallenge(options = {}) {
  const difficulty = options.difficulty || 'beginner';
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`difficulty must be one of ${DIFFICULTIES.join(', ')}`);
  const seed = (options.seed === undefined ? Math.floor(Math.random() * 0xffffffff) : options.seed) >>> 0;
  const maxAttempts = options.maxAttempts || 120;
  const hist = RecentHistory.from(options.history ?? options.recentSignatures ?? [], options.historyOptions);
  const counts = hist.familyCounts();
  const weightOf = (f) => 1 / (1 + 0.7 * (counts[f] || 0));
  const required = options.requireFamilies || (options.family ? [options.family] : []);

  let best = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = new Rng(mixSeed(seed, attempt + 1));
    const type = options.type || weightedPick(rng, TYPE_WEIGHTS);
    const format = options.format || weightedPick(rng, FORMAT_WEIGHTS);
    if (!TYPES.includes(type) || !FORMATS.includes(format)) throw new Error('unknown type or format');
    const objective = chooseObjective(rng, difficulty, type, format, weightOf, required.filter((f) => f !== 'PRINT_VS_STORED' || format === 'final'));
    const cand = buildCandidate(rng, { difficulty, type, format, objective });
    if (!cand) continue;
    const dr = new Rng(mixSeed(seed, 0x5eed + attempt));
    const dis = generateDistractors(dr, cand.program, cand.target, cand.exec, cand.answer, cand.analysis);
    if (!dis) continue;
    if (required.length && !required.every((f) => cand.analysis.families.includes(f))) continue;
    const ex = exactSignature(cand.program, cand.target, cand.answer.text);
    const se = semanticSignature(cand.program, cand.target, cand.analysis, difficulty);
    const sigs = { exact: ex.hash, semantic: se.hash, pattern: se.pattern };
    const verdict = hist.judge(sigs, difficulty);
    const pack = { cand, dis, ex, se, sigs, verdict, attempt, type, format, rng: dr };
    if (verdict.accept) { best = pack; break; }
    if (!best || verdict.penalty < best.verdict.penalty) best = pack;
  }
  if (!best) throw new Error(`generateTraceChallenge: no valid challenge after ${maxAttempts} attempts (difficulty=${difficulty}, type=${options.type}, format=${options.format})`);
  return assemble(best, difficulty, seed, hist);
}

function assemble(p, difficulty, seed, hist) {
  const { cand, dis, ex, se, sigs, verdict, attempt } = p;
  const { program, target, exec, answer, analysis } = cand;
  const rng = new Rng(mixSeed(seed, 0xc401ce + attempt));
  const all = rng.shuffle([{ text: answer.text, correct: true }, ...dis.map((d) => ({ text: d.text, correct: false, d }))]);
  const letters = 'ABCD';
  const choices = all.map((o, i) => ({ id: letters[i], text: o.text }));
  const correctIdx = all.findIndex((o) => o.correct);
  const expl = buildExplanation(program, exec, target);
  const code = renderProgram(program);
  const variables = exec.order.map((name) => ({ name, type: exec.types[name] }));
  const primaryType = target.format === 'output' ? program[target.index].expr.t : exec.types[target.varName];
  const familiesFull = analysis.families;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: `vt-${difficulty[0]}-${seed.toString(16)}-${attempt}`,
    seed, attempt,
    difficulty,
    answerType: answer.type,
    type: p.type,
    primaryType,
    format: target.format,
    formatInfo: FORMAT_INFO[target.format],
    reasoningFamilies: familiesFull,
    coreReasoningFamilies: analysis.coreFamilies,
    objectiveFamilies: cand.objective,
    code: code.join('\n'),
    codeLines: code,
    variables,
    question: {
      text: questionText(target, answer.type),
      targetVariable: target.varName || null,
      line: target.format === 'checkpoint' ? target.index + 1 : null,
      lineCode: target.format === 'checkpoint' ? code[target.index] : null,
      answerType: answer.type,
    },
    correct: { text: answer.text, choiceId: choices[correctIdx].id, index: correctIdx, type: answer.type },
    choices,
    correctChoiceId: choices[correctIdx].id,
    correctIndex: correctIdx,
    twoChoice: choices.length === 2,
    distractors: all.map((o, i) => (o.correct ? null : {
      choiceId: choices[i].id, text: o.d.text, misconceptionId: o.d.misconceptionId, label: o.d.label, explanation: o.d.explanation, line: o.d.line,
    })).filter(Boolean),
    explanation: { summary: expl.summary, lines: expl.lines },
    stateHistory: expl.stateHistory,
    difficultyMetrics: { ...analysis, difficultyRules: RULES[difficulty], validated: true },
    signatures: sigs,
    repetition: {
      accepted: verdict.accept, relaxed: !verdict.accept, reasons: verdict.reasons,
      semanticDistance: hist.semanticDistance(sigs.semantic) === Infinity ? null : hist.semanticDistance(sigs.semantic),
    },
    model: { program, target },
    debug: { exactSource: ex.source, semanticSource: se.source },
  };
}

// Convenience: generate several challenges, updating a bounded history as it goes.
export function generateTraceBatch(count, options = {}) {
  const history = options.history instanceof RecentHistory ? options.history : RecentHistory.from(options.recentSignatures ?? [], options.historyOptions);
  const base = (options.seed ?? 1) >>> 0;
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = generateTraceChallenge({ ...options, seed: mixSeed(base, i + 1), history });
    history.record(c);
    out.push(c);
  }
  return out;
}

// Re-run a challenge's stored model through the interpreter (used by tests and integrations).
export function verifyChallengeModel(challenge) {
  const { program, target } = challenge.model;
  typeCheck(program);
  const exec = execute(program, { trace: true });
  if (!exec.ok) return { ok: false, error: exec.error };
  const text = target.format === 'output' ? exec.outputs[exec.outputs.length - 1]
    : formatValue(target.format === 'final' ? exec.final[target.varName] : exec.steps[target.index].after[target.varName], exec.types[target.varName]);
  return { ok: text === challenge.correct.text, text, exec };
}

// ---- presentation helpers --------------------------------------------------------------
// Only these fields may be shown BEFORE the student submits an answer.
export function getPreSubmissionView(c) {
  return {
    id: c.id, difficulty: c.difficulty, format: c.format, formatLabel: c.formatInfo.label, type: c.type,
    code: c.code, codeLines: c.codeLines, question: { text: c.question.text, targetVariable: c.question.targetVariable, line: c.question.line },
    choices: c.choices.map((x) => ({ id: x.id, text: x.text })), twoChoice: c.twoChoice,
  };
}
// Feedback for one selected choice. It reports correctness and instructional text only:
// scoring (points, streaks, attempts, Session Summary) stays entirely with Variable Lab.
export function getPostSubmissionView(c, selectedChoiceId) {
  const correct = selectedChoiceId === c.correctChoiceId;
  const d = c.distractors.find((x) => x.choiceId === selectedChoiceId) || null;
  return {
    id: c.id, selectedChoiceId, correct, correctChoiceId: c.correctChoiceId, correctText: c.correct.text,
    selectedMisconception: d ? { id: d.misconceptionId, label: d.label, explanation: d.explanation } : null,
    summary: c.explanation.summary, lines: c.explanation.lines, stateHistory: c.stateHistory,
    reasoningFamilies: c.reasoningFamilies,
  };
}

export { RecentHistory, HISTORY_DEFAULTS, FAMILIES, FAMILY_IDS, BASELINE_FAMILIES, MISCONCEPTIONS, RULES, TYPES, FORMATS, renderProgram, renderStmt, execute, analyze, validateDifficulty };
export { toVariableLabChallenge, DEFAULT_ADAPTER_MAP } from './adapter.js';
