#!/usr/bin/env node
/* Creates a deterministic, student-facing stratified sample plus independent QA data. */
const fs = require('fs');
const path = require('path');
const bundle = require('../js/data/content-bundle.js');
const composition = require('../js/data/compose-bundle.js');
const G = require('../js/engine/generator.js');
const V = require('../js/engine/validator.js');
const root = path.join(__dirname, '..');
const topics = bundle.topics.filter(t => t.subject === 'Mathematics');
const levels = ['beginner','intermediate','advanced'];
const modes = ['identify','rearrange','missing'];
const labels = { identify: 'Identify the Parts', rearrange: 'Rearrange the Response', missing: 'Choose the Missing Piece' };
const rows = [];
const stats = { seed: 'math-quality-audit-20261023', perTopicLevelMode: 10, mixedPerTopicLevel: 10,
  stratifiedChallengeCount: 0, mixedChallengeCount: 0, invalidChallenges: 0, gradeFailures: 0,
  optionSetFailures: 0, exactQuestionRepeatsWithinFirstSix: 0, strata: [] };
function gradeInputs(ch) {
  if (ch.mode === 'identify') {
    const correct = { selected: ch.solution.ids.slice() };
    const allIds = ch.sentences.map(x => x.id);
    const wrongId = allIds.find(id => !ch.solution.ids.includes(id));
    const wrong = { selected: ch.solution.ids.length > 1 ? ch.solution.ids.slice(1).concat([wrongId]) : [wrongId] };
    return [correct, wrong];
  }
  if (ch.mode === 'rearrange') return [{ order: ch.solution.order.slice() }, { order: ch.solution.order.slice().reverse() }];
  const wrongId = ch.options.map(o => o.id).find(id => id !== ch.correctId);
  return [{ optionId: ch.correctId }, { optionId: wrongId }];
}
function rowFor(ch, topic, level, mode, index, seed, isMixed) {
  const [answerOK, answerBad] = gradeInputs(ch);
  const good = G.grade(ch, answerOK), bad = G.grade(ch, answerBad);
  const valid = V.validateChallenge(ch);
  if (valid.length) stats.invalidChallenges++;
  if (!good.correct || bad.correct) stats.gradeFailures++;
  if (ch.mode === 'missing') {
    const opts = ch.options;
    if (opts.length !== 4 || new Set(opts.map(o => o.text.trim().toLowerCase())).size !== 4) stats.optionSetFailures++;
  }
  const studentView = { question: ch.question, source: ch.excerpt, prompt: ch.prompt };
  if (ch.mode === 'identify') studentView.sentences = ch.sentences;
  if (ch.mode === 'rearrange') studentView.shuffledSentences = ch.items;
  if (ch.mode === 'missing') { studentView.responseWithGap = ch.shown; studentView.answerChoices = ch.options; }
  const review = { focus: { topicId: topic.id, topic: topic.title, difficulty: level, mode: labels[ch.mode], mixed: !!isMixed },
    seed, sessionIndex: index + 1, modelId: ch.modelId, reasoningFamily: ch.family, reviewPractice: !!ch.pool.review,
    studentView, correctAnswer: answerOK, correctFeedback: good.feedback, incorrectAnswer: answerBad,
    incorrectFeedback: bad.feedback, validationErrors: valid };
  return review;
}
for (const topic of topics) for (const level of levels) for (const mode of modes) {
  const seed = `${stats.seed}|${topic.id}|${level}|${mode}`;
  const g = new G.Generator(bundle, seed, { compose: composition });
  g.setSelection({ subject: 'Mathematics', topics: [topic.id] });
  const seenQuestions = new Set();
  const modelIds = new Set();
  for (let i=0;i<10;i++) {
    const ch = g.next({ mode, level });
    const row = rowFor(ch, topic, level, mode, i, seed, false);
    rows.push(row); modelIds.add(ch.modelId);
    const k = `${ch.question}|${ch.modelId}`;
    if (i < 6 && seenQuestions.has(k)) stats.exactQuestionRepeatsWithinFirstSix++;
    seenQuestions.add(k);
  }
  stats.stratifiedChallengeCount += 10;
  stats.strata.push({ topicId: topic.id, difficulty: level, mode: labels[mode], generated: 10,
    uniqueModelIds: modelIds.size, availableModels: g.availableModels({subject:'Mathematics',topics:[topic.id]}, level).length,
    reviewAfterPoolExhaustion: rows.slice(-10).filter(x => x.reviewPractice).length });
}
for (const topic of topics) for (const level of levels) {
  const seed = `${stats.seed}|${topic.id}|${level}|mixed`;
  const g = new G.Generator(bundle, seed, { compose: composition });
  g.setSelection({ subject:'Mathematics', topics:[topic.id] });
  for (let i=0;i<10;i++) {
    const ch = g.next({ mode:'mixed', level });
    rows.push(rowFor(ch, topic, level, 'mixed', i, seed, true));
    stats.mixedChallengeCount++;
  }
}
const out = { title: 'RACECES mathematics rendered challenge review set', generatedAt: new Date().toISOString(),
  methodology: 'Seeded generator output rendered into each mode’s student-visible question, passage, answer task/options, and grader feedback. This is a review set, not evidence that every item was manually reviewed.',
  totals: stats, samples: rows };
const dest = path.join(root, 'samples', 'math-quality-review-960.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log(`Generated ${rows.length} rendered samples: ${stats.stratifiedChallengeCount} across 72 topic/level/mode strata and ${stats.mixedChallengeCount} Mixed Practice; ${stats.invalidChallenges} validation errors, ${stats.gradeFailures} grading errors, ${stats.optionSetFailures} answer-set errors. File ${path.relative(root,dest)} (${fs.statSync(dest).size} bytes).`);
if (stats.invalidChallenges || stats.gradeFailures || stats.optionSetFailures) process.exitCode = 1;
