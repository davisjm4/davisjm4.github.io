// A thin assessment bridge to the published Workplace Readiness engine.
// It uses isolated generator sessions and the game's own pure grader; it never
// opens the game UI or touches student progress.
const W = globalThis.WRG;
const MODE_NAMES = {
  decision: "Workplace Decisions",
  nextstep: "Best Next Step",
  order: "Put the Steps in Order",
  find: "Find the Problem"
};
const hash = value => {
  let h = 2166136261;
  for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
let hybrid = null;
const diagnostics = { attempted: 0, accepted: 0, rejected: Object.create(null) };
function reject(reason) {
  diagnostics.rejected[reason] = (diagnostics.rejected[reason] || 0) + 1;
  return null;
}
export function getWorkplaceAdapterDiagnostics() {
  return { attempted: diagnostics.attempted, accepted: diagnostics.accepted, rejected: { ...diagnostics.rejected } };
}
function getHybrid() {
  if (hybrid) return hybrid;
  if (!W?.content || !W?.composeContent || !W?.selector || !W?.library) throw new Error("Workplace Readiness engine assets are unavailable.");
  const library = W.library.create(W.content);
  hybrid = W.selector.createHybrid(library, W.composeContent);
  return hybrid;
}
const allOptions = challenge => challenge.options.map(option => option.text);
const clean = value => String(value).trim().replace(/\s+/g, " ").toLocaleLowerCase();
function choicesAreDistinct(choices) {
  return choices.length === 4 && new Set(choices.map(clean)).size === 4;
}
function graderAcceptsExactly(challenge, responses, correctIndex) {
  const graded = responses.map(response => W.grader.grade(challenge, response));
  return graded.every(result => result.ok) && graded.filter(result => result.correct).length === 1 && graded[correctIndex].correct;
}
function baseItem(challenge, modeId, points, fields) {
  const choices = fields.choices;
  if (!choicesAreDistinct(choices) || fields.correctIndex < 0 || fields.correctIndex > 3 ||
      choices.filter((_, i) => i === fields.correctIndex).length !== 1 || !fields.explanation) return null;
  const semantic = challenge.reasoning || `${challenge.family}:${challenge.pattern}`;
  const exact = [challenge.scenario, challenge.doc?.title, ...(challenge.doc?.segments || []).map(s => s.text),
    challenge.prompt, ...choices].join("\u001f");
  const item = {
    id: `workplace-${hash(`${semantic}|${modeId}|${challenge.templateId}|${exact}`)}`,
    sourceId: "workplace-readiness", source: "Workplace Readiness Games",
    modeId, mode: MODE_NAMES[modeId], difficulty: challenge.difficulty,
    topic: W.content.skills.find(s => s.id === challenge.skill)?.name || challenge.skill,
    topicId: challenge.skill, contextId: challenge.context,
    context: challenge.scenario || "", prompt: challenge.prompt || MODE_NAMES[modeId],
    passage: fields.passage || "", response: fields.response || "",
    choices, correctIndex: fields.correctIndex, correctAnswer: choices[fields.correctIndex],
    explanation: fields.explanation, points,
    reasoningSignature: `workplace-reasoning|${semantic}`,
    configurationSignature: `workplace-config|${modeId}|${semantic}`,
    signature: `workplace-exact|${exact}|key:${fields.correctIndex}`
  };
  Object.defineProperty(item, "_auditChallenge", { value: challenge, enumerable: false });
  return item;
}
function adaptChoice(challenge, modeId, points) {
  if (!Array.isArray(challenge.options) || challenge.options.length !== 4) return null;
  const choices = allOptions(challenge), responses = challenge.options.map(o => ({ optionId: o.id }));
  const best = challenge.options.findIndex(o => o.id === challenge.key?.bestId);
  if (best < 0 || !graderAcceptsExactly(challenge, responses, best)) return null;
  const result = W.grader.grade(challenge, responses[best]);
  const explanation = [challenge.key.options[challenge.key.bestId]?.why, challenge.principle].filter(Boolean).join(" ") || result.feedback?.lines?.[0]?.text;
  return baseItem(challenge, modeId, points, { choices, correctIndex: best, explanation });
}
function numberedDocument(challenge) {
  const doc = challenge.doc;
  if (!doc?.segments?.length) return null;
  return [doc.title, ...doc.segments.map((segment, i) => `Line ${i + 1}: ${segment.text}`)].filter(Boolean).join("\n\n");
}
function adaptFind(challenge, points) {
  const segments = challenge.doc?.segments || [];
  const problemId = challenge.key?.problemId;
  if (!problemId || segments.length < 4 || segments.length !== Object.keys(challenge.key.segments || {}).length) return null;
  const candidates = segments.map((segment, index) => ({ id: segment.id, label: `Line ${index + 1}` }));
  const problemIndex = candidates.findIndex(c => c.id === problemId);
  if (problemIndex < 0) return null;
  // Seeded selection limits the answer set to four lines while retaining the
  // complete document in the stem. Every candidate is checked by the source grader.
  const rng = W.rng.create(`${challenge.id}|assessment-find`);
  const others = rng.shuffle(candidates.filter((_, i) => i !== problemIndex)).slice(0, 3);
  const selected = rng.shuffle([candidates[problemIndex], ...others]);
  const choices = selected.map(c => c.label), correctIndex = selected.findIndex(c => c.id === problemId);
  const responses = selected.map(c => ({ segmentId: c.id }));
  if (!graderAcceptsExactly(challenge, responses, correctIndex)) return null;
  const explanation = [challenge.key.segments[problemId]?.note, challenge.principle].filter(Boolean).join(" ");
  return baseItem(challenge, "find", points, { choices, correctIndex, explanation, passage: numberedDocument(challenge) });
}
function adaptOrder(challenge, points) {
  const steps = challenge.steps || [], ids = steps.map(step => step.id);
  if (ids.length < 3 || ids.length > 7 || new Set(ids).size !== ids.length) return null;
  const valid = W.order.enumerateValid(ids, challenge.key?.precedence || []);
  if (!valid.length) return null;
  const all = W.order.permutations(ids);
  const validKeys = new Set(valid.map(order => order.join("|")));
  const invalid = all.filter(order => !validKeys.has(order.join("|")));
  if (!invalid.length) return null;
  const rng = W.rng.create(`${challenge.id}|assessment-order`);
  const correctOrder = rng.pick(valid), wrongOrders = rng.shuffle(invalid).slice(0, 3);
  if (wrongOrders.length !== 3) return null;
  const candidateOrders = rng.shuffle([correctOrder, ...wrongOrders]);
  const position = new Map(steps.map((step, i) => [step.id, i + 1]));
  const choices = candidateOrders.map(order => order.map(id => `Sentence ${position.get(id)}`).join(" → "));
  const correctIndex = candidateOrders.findIndex(order => validKeys.has(order.join("|")));
  const responses = candidateOrders.map(order => ({ order }));
  if (!graderAcceptsExactly(challenge, responses, correctIndex)) return null;
  const response = steps.map((step, i) => `Sentence ${i + 1}: ${step.text}`).join("\n");
  const explanation = challenge.principle || "A valid sequence places every step after the steps it depends on.";
  return baseItem(challenge, "order", points, { choices, correctIndex, explanation, response });
}
export function generateWorkplaceAssessmentItem(modeId, difficulty, seed, points, filters = {}) {
  diagnostics.attempted++;
  if (!MODE_NAMES[modeId]) return reject("unsupported-mode");
  if (!W?.grader) return reject("runtime-unavailable");
  try {
    const ctxs = Array.isArray(filters.contexts) ? filters.contexts : [];
    const context = ctxs.length ? W.rng.create(`${seed}|career-context`).pick(ctxs) : null;
    const diff = String(difficulty || "Mixed").toLowerCase();
    const wh = getHybrid();
    const session = W.selector.createSession(wh, { seed: String(seed), filters: {
      skills: filters.skills?.length ? filters.skills : null,
      modes: [modeId], difficulty: ["beginner", "intermediate", "advanced"].includes(diff) ? diff : "mixed",
      context
    }});
    const challenge = session.next();
    if (challenge.mode !== modeId || (diff !== "mixed" && challenge.difficulty !== diff)) return reject("filter-contract-mismatch");
    if (W.selector.validate(wh, challenge)) return reject("source-validation-failed");
    const item = modeId === "decision" || modeId === "nextstep" ? adaptChoice(challenge, modeId, points) : modeId === "find" ? adaptFind(challenge, points) : adaptOrder(challenge, points);
    if (!item) return reject("ambiguous-or-unverifiable-answer-set");
    diagnostics.accepted++;
    return item;
  } catch (error) {
    return reject(/No challenges match these filters/i.test(String(error)) ? "no-eligible-filtered-content" : "source-generation-error");
  }
}
export function workplaceCatalog() {
  if (!W?.content) return { skills: [], contexts: [] };
  return { skills: W.content.skills.map(({ id, name, number, category }) => ({ id, name, number, category })),
    contexts: W.content.contexts.map(({ id, name, label }) => ({ id, name: name || label || id })) };
}
