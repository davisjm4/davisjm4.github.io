// Assessment bridge for the public RACECES engine. Builds isolated challenges and
// checks every keyed answer with the same semantic graders used by the student game.
const R = globalThis.RACECES;
const MODES = {
  identify: { name: "Identify the Parts", keys: ["R", "A", "S", "C:1", "C:2", "E:1", "E:2"] },
  missing: { name: "Choose the Missing Piece", keys: R?.Missing?.SLOT_KEYS || [] },
  rearrange: { name: "Rearrange the Response", keys: [null] }
};
const LEVELS = { Beginner: "beginner", Intermediate: "intermediate", Advanced: "advanced" };
const SOURCE = "R-A-C-E-C-E-S Writing Games";
const hash = value => {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
const htmlText = x => String(x ?? "");

function buildIndex() {
  if (!R?.Generator || !R.CONTENT || !R.COMPOSE_LIBRARY) return null;
  const isolated = new R.Generator.Generator(R.CONTENT, "teacher-assessment", { compose: R.COMPOSE_LIBRARY });
  const index = isolated.index;
  index.catalog = isolated.catalog;
  return index;
}
const INDEX = buildIndex();

function makeRng(seed) { return R.RNG.create(String(seed)); }
function availableModels(modeId, level, filters) {
  if (!INDEX) return [];
  const topicIds = Array.isArray(filters.topics) && filters.topics.length ? filters.topics : null;
  const selection = { subject: filters.subject || "all", topics: topicIds };
  return R.Generator.targetKeysFor(modeId) && INDEX.catalog.filter(model =>
    (!topicIds || topicIds.includes(model.topicId)) &&
    (selection.subject === "all" || !selection.subject || R.CONTENT.topics.find(t => t.id === model.topicId)?.subject === selection.subject) &&
    model.level === level
  );
}
export function racecesEligibility(modeId, difficulty, filters = {}) {
  return !!availableModels(modeId, LEVELS[difficulty], filters)?.length;
}
function numberedResponse(lines, includeGap = false) {
  return lines.map((line, i) => `${includeGap && line.gap ? `Sentence ${i + 1}: [Missing sentence]` : `Sentence ${i + 1}: ${line.text}`}`).join("\n");
}
function withNumberedItems(items) {
  return items.map((line, i) => ({ ...line, number: i + 1 }));
}
function packageItem({ modeId, challenge, level, points, choices, correctIndex, answer, response, prompt, signature, audit }) {
  if (!choices || choices.length !== 4 || new Set(choices).size !== 4 || correctIndex < 0 || correctIndex >= choices.length || choices.filter(x => x === answer).length !== 1) return null;
  return {
    id: `raceces-${hash(signature)}`, sourceId: "raceces", source: SOURCE,
    modeId, mode: MODES[modeId].name, difficulty: Object.entries(LEVELS).find(([, value]) => value === level)?.[0] || level, topic: challenge.title,
    topicId: challenge.topicId, family: challenge.family,
    reasoningSignature: `raceces-reasoning|${challenge.generated?.structure || challenge.family}|${challenge.modelId}`,
    passage: challenge.excerpt, questionContext: challenge.question,
    response, prompt, choices, correctIndex, correctAnswer: answer,
    explanation: audit.explanation,
    signature: `raceces-exact|${[challenge.excerpt,challenge.question,response,prompt,...choices].sort().join("\u001f")}|answer:${answer}`,
    configurationSignature: `raceces-config|${challenge.mode}|${challenge.modelId}|${challenge.targetKey || challenge.missingSlot || "all"}`,
    points, _audit: audit
  };
}

function buildChallenge(modeId, level, seed, filters, model, targetKey) {
  const ch = R.Generator.build(INDEX, { mode: modeId, level, modelId: model.id, targetKey, seed: String(seed) });
  if (R.Validator.validateChallenge(ch).length) return null;
  ch.title = R.CONTENT.topics.find(t => t.id === ch.topicId)?.title || ch.title || ch.topicId;
  return ch;
}

function adaptIdentify(ch, level, points, rng) {
  if (ch.multi || ch.solution.ids.length !== 1) return null;
  const correctId = ch.solution.ids[0];
  const distractorIds = ch.sentences.map(s => s.id).filter(id => id !== correctId);
  const picked = rng.shuffle(distractorIds).slice(0, 3);
  const candidateIds = rng.shuffle([correctId, ...picked]);
  const choices = candidateIds.map(id => ch.info[id].text);
  const correctIndex = candidateIds.indexOf(correctId);
  const graded = candidateIds.map(id => R.Identify.grade(ch, { selected: [id] }).correct);
  if (graded.filter(Boolean).length !== 1 || !graded[correctIndex]) return null;
  const lines = withNumberedItems(ch.sentences);
  return packageItem({ modeId: "identify", challenge: ch, level, points, choices, correctIndex,
    answer: choices[correctIndex], response: numberedResponse(lines),
    prompt: ch.prompt, signature: `identify|${ch.modelId}|${ch.targetKey}`,
    audit: { challenge: ch, choiceIds: candidateIds, explanation: `The source model identifies Sentence ${ch.sentences.findIndex(s => s.id === correctId) + 1} as the ${ch.info[correctId].role === "C" ? "evidence" : ch.info[correctId].role === "E" ? "explanation" : ({ R: "restatement", A: "answer", S: "summary" })[ch.info[correctId].role]}${ch.info[correctId].tag ? ` about ${ch.info[correctId].tag}` : ""}.` }
  });
}

function adaptMissing(ch, level, points) {
  const correctOption = ch.options.find(o => o.id === ch.correctId);
  if (!correctOption) return null;
  if (ch.options.filter(o => o.id === ch.correctId || !R.Missing.grade(ch, { optionId: o.id }).correct).length !== 4) return null;
  const choices = ch.options.map(o => o.text);
  const correctIndex = ch.options.findIndex(o => o.id === ch.correctId);
  if (R.Missing.grade(ch, { optionId: correctOption.id }).correct !== true || ch.options.some(o => o.id !== correctOption.id && R.Missing.grade(ch, { optionId: o.id }).correct)) return null;
  return packageItem({ modeId: "missing", challenge: ch, level, points, choices, correctIndex,
    answer: correctOption.text, response: numberedResponse(ch.shown, true), prompt: ch.prompt,
    signature: `missing|${ch.modelId}|${ch.missingSlot}`,
    audit: { challenge: ch, choiceIds: ch.options.map(o => o.id), explanation: ch.whyCorrect }
  });
}

function adaptRearrange(ch, level, points, seed) {
  const items = ch.items;
  const sentenceNumber = Object.fromEntries(items.map((item, i) => [item.id, i + 1]));
  const candidates = [ch.solution.order];
  if (ch.solution.alternate) candidates.push(ch.solution.alternate);
  if (candidates.some(order => !R.Rearrange.analyze(order, ch.info, ch.dependency || null).valid)) return null;
  const rng = makeRng(`${seed}|rearrange-options`);
  const correctOrder = candidates[rng.int(candidates.length)];
  const validSet = new Set(candidates.map(order => order.join("|")));
  const invalid = [], seen = new Set();
  for (let attempt = 0; invalid.length < 3 && attempt < 1000; attempt++) {
    const order = rng.shuffle(items.map(item => item.id));
    const key = order.join("|");
    if (seen.has(key) || validSet.has(key) || R.Rearrange.analyze(order, ch.info, ch.dependency || null).valid) continue;
    seen.add(key); invalid.push(order);
  }
  if (invalid.length !== 3) return null;
  const answerFor = order => order.map(id => sentenceNumber[id]).join(" → ");
  const choiceOrders = rng.shuffle([correctOrder, ...invalid]);
  const choices = choiceOrders.map(answerFor), correctIndex = choiceOrders.findIndex(order => order.join("|") === correctOrder.join("|"));
  if (choiceOrders.filter(order => R.Rearrange.analyze(order, ch.info, ch.dependency || null).valid).length !== 1) return null;
  const labels = items.map((item, i) => ({ id: item.id, text: item.text, number: i + 1 }));
  return packageItem({ modeId: "rearrange", challenge: ch, level, points, choices, correctIndex,
    answer: choices[correctIndex], response: numberedResponse(labels),
    prompt: ch.dependency
      ? "Which sequence correctly organizes these seven sentences into a complete R-A-C-E-C-E-S response, respecting the evidence dependency?"
      : "Which sequence correctly organizes these seven sentences into a complete R-A-C-E-C-E-S response?",
    signature: `rearrange|${ch.modelId}`,
    audit: { challenge: ch, candidateOrders: choiceOrders, explanation: ch.dependency
      ? "A valid sequence starts with the restatement, places the answer second, keeps each evidence sentence beside its matching explanation, follows the required evidence dependency, and ends with the summary."
      : "A valid sequence starts with the restatement, places the answer second, keeps each evidence sentence beside its matching explanation, and ends with the summary. The independent evidence/explanation pairs may appear in either order." }
  });
}

export function generateRacecesAssessmentItem(modeId, difficulty, seed, points, filters = {}) {
  if (!INDEX || !MODES[modeId] || !LEVELS[difficulty]) return null;
  const level = LEVELS[difficulty], pool = availableModels(modeId, level, filters);
  if (!pool.length) return null;
  const rng = makeRng(`${seed}|${modeId}|${difficulty}|${filters.subject || "all"}|${(filters.topics || []).join(",")}`);
  const model = pool[rng.int(pool.length)];
  const keys = MODES[modeId].keys;
  const targetKey = modeId === "rearrange" ? null : keys[rng.int(keys.length)];
  const ch = buildChallenge(modeId, level, seed, filters, model, targetKey);
  if (!ch) return null;
  if (modeId === "identify") return adaptIdentify(ch, level, points, rng);
  if (modeId === "missing") return adaptMissing(ch, level, points);
  return adaptRearrange(ch, level, points, seed);
}

export function racecesCatalog() {
  return { subjects: [...new Set((R?.CONTENT?.topics || []).map(t => t.subject))].sort(), topics: (R?.CONTENT?.topics || []).map(t => ({ id: t.id, subject: t.subject, title: t.title })) };
}
