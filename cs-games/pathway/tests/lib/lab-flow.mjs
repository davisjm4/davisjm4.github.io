// Shared harness for Advanced CS evidence tests (synthetic data only, nothing real is read or written).
// Flow exercised for every question:
//   real engine question -> real session tracker (java-games/session.js) -> real profile client recordGameAttempt
//   -> outbox event -> real server normalizer cleanGameAttempt -> credited node ids.
// The begin/annotate arguments each lab page passes are reproduced in LAB_ADAPTERS below. For the labs that annotate through a shared
// helper (lab-evidence.js, variable-lab/evidence.js, math-lab/mixed.js) the page and the test call the very same function; for the
// others the page's source line is pinned by pageGuards (see the wiring test) so a change to the page forces a change here.
import fs from 'node:fs';
import assert from 'node:assert/strict';

class MemoryStorage { getItem(k) { return Object.hasOwn(this, k) ? this[k] : null; } setItem(k, v) { this[k] = String(v); } removeItem(k) { delete this[k]; } }
globalThis.localStorage = new MemoryStorage();
localStorage.setItem('wrg.profile.active.v1', JSON.stringify({ id: '3b9d8a5e-1c2f-4a6b-8d7e-0f1a2b3c4d5e', token: 'a'.repeat(64), expires: Date.now() + 1e10, classId: 'synthetic-class', courseId: 'advanced' }));
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...rest) => { const t = realSetTimeout(fn, ms, ...rest); t.unref?.(); return t; };
globalThis.fetch = async () => { throw new Error('network disabled in tests'); };
let seed = 20261112;
export function reseed(n) { seed = n >>> 0; }
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

export const root = new URL('../../../../', import.meta.url);
const imp = path => import(new URL(path, root).href);
export const S = await imp('java-games/session.js');
export const sync = await imp('wpr-games/workplace-readiness/online/profile-sync.mjs');
const { PROFILE_ID } = await imp('wpr-games/workplace-readiness/online/profile-model.mjs');
const { cleanGameAttempt } = await imp('wpr-games/workplace-readiness/service/profile-evidence.mjs');
assert.ok(sync.activeProfile, 'synthetic profile must be active so recordGameAttempt queues events');
export const graph = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/curriculum-graph.json', root), 'utf8'));
export const nodeById = new Map(graph.nodes.map(n => [n.id, n]));

const memory = new Map();
export const tracker = S.createSessionTracker({ storage: { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) }, onAttempt: (...args) => sync.recordGameAttempt('advanced', ...args) });
const outboxPrefix = sync.device.key('outbox.');
export function drain() { const keys = Object.keys(localStorage).filter(k => k.startsWith(outboxPrefix)); const events = keys.map(k => JSON.parse(localStorage.getItem(k))); keys.forEach(k => localStorage.removeItem(k)); return events; }
export const normalize = event => cleanGameAttempt(event, id => PROFILE_ID.test(id));
export const nodeIdsOf = cleaned => cleaned ? cleaned.data.dimensions.map(d => d.id) : null;

/* ------------------------------ engines ------------------------------ */
const e = {};
e.J = await imp('java-games/engine.js');
e.M = await imp('java-games/math-lab/engine.js');
e.X = await imp('java-games/math-lab/expansion/generator.js');
e.MX = await imp('java-games/math-lab/mixed.js');
e.L = await imp('java-games/loop-lab/loop-engine.js');
e.A = await imp('java-games/array-lab/array-engine.js');
e.B = await imp('java-games/boolean-conditional-lab/engine.js');
e.AL = await imp('java-games/arraylist-lab/engine.js');
e.LL = await imp('java-games/linkedlist-lab/engine.js');
e.MC = await imp('java-games/method-constructor-lab/engine.js');
e.IP = await imp('java-games/inheritance-polymorphism-lab/engine.js');
e.SS = await imp('java-games/search-sort-lab/engine/generator.js');
e.RC = await imp('java-games/recursion-lab/engine.js');
e.DB = await imp('java-games/debugger-lab/debugger-engine.js');
e.DOC = await imp('java-games/documentation-lab/engine.js');
e.RB = await imp('java-games/robot-algorithms/engine.js');
e.CO = await imp('java-games/class-object-lab/class-engine.js');
e.LE = await imp('java-games/lab-evidence.js');
export const E = e;
const keys = m => Array.isArray(m) ? m : Object.keys(m || {});
const lc = v => typeof v === 'string' ? v.toLowerCase() : v;
const node = (lab, mode) => `node:advanced:${lab}:${mode}`;

/* ---------------------------- lab adapters ---------------------------- *
 * modes        every focused-practice mode id the page offers (Mixed excluded)
 * levels       difficulty levels the page offers, or null
 * focused(m,i) draw as the page does in focused practice; mixed(i) draw as the page does in Mixed Practice (null when the lab has none)
 * record(q)    the begin() fields that matter: topic and mode;  details(q) the annotate() argument (null when the page sends none)
 * mode(q)      the mode id that SHOULD be credited;  expected(q) the node that should be credited (null = intentionally credits nothing)
 * difficulty(q) the difficulty actually presented, or null when the lab has no difficulty levels
 */
export function makeAdapters() {
  const A = {};
  { // Math Lab (java-games/math-lab/app.js)
    const deck = e.M.createDeck(Math.random), xdeck = e.X.createExpansionDeck({ seed: 99 });
    const mixedDeck = e.MX.createMixedDeck({ deck, expansionDeck: xdeck });
    const isX = m => Object.hasOwn(e.X.EXPANSION_MODES, m);
    A['math-lab'] = { modes: [...keys(e.M.structures), ...keys(e.X.EXPANSION_MODES)], levels: e.X.DIFFICULTIES,
      focused: (m, i) => isX(m) ? xdeck.next(m, e.X.DIFFICULTIES[i % 3]) : deck.next(m), mixed: i => mixedDeck.next(e.X.DIFFICULTIES[i % 3]),
      record: q => ({ topic: q.mode, mode: q.mode }), details: q => e.MX.mathEvidence(q), mode: q => q.mode, expected: q => node('math-lab', q.mode), difficulty: q => isX(q.mode) ? q.difficulty : null };
  }
  { // Loop Lab (java-games/loop-lab/loop-ui.js)
    const session = e.L.createLoopSession({ seed: 5 });
    A['loop-lab'] = { modes: e.L.MODES, levels: e.L.DIFFICULTIES, focused: (m, i) => session.next({ mode: m, difficulty: e.L.DIFFICULTIES[i % 3] }), mixed: i => session.next({ mode: 'mixed', difficulty: e.L.DIFFICULTIES[i % 3] }),
      record: q => ({ topic: q.topic, mode: q.mode }), details: q => ({ mode: q.mode, practiceSetting: 'x', difficulty: q.difficulty, skill: q.concept, generatorFamily: q.reasoningFamily, seed: q.seed }),
      mode: q => q.mode, expected: q => node('loop-lab', q.mode), difficulty: q => q.difficulty };
  }
  { // Array Lab (java-games/array-lab/array-ui.js)
    const history = e.A.createArrayHistory(null), lv = ['Beginner', 'Intermediate', 'Advanced'];
    A['array-lab'] = { modes: keys(e.A.formatNames), levels: lv, focused: (m, i) => e.A.generateArray(m, undefined, { difficulty: lv[i % 3], history }), mixed: i => e.A.generateArray('mixed', undefined, { difficulty: lv[i % 3], history }),
      record: q => ({ topic: q.topic, mode: q.format }), details: q => ({ mode: q.formatName, practiceMode: q.format, practiceSetting: 'x', difficulty: q.difficulty || null, skill: q.skill || q.topic, family: q.family || q.variant, seed: q.seed ?? null }),
      mode: q => q.format, expected: q => node('array-lab', q.format), difficulty: q => q.difficulty || null };
  }
  { // Boolean & Conditional Lab (java-games/boolean-conditional-lab/boolean-ui.js)
    const practice = e.B.createPracticeSession(), lv = e.B.DIFFICULTIES;
    A['boolean-conditional-lab'] = { modes: keys(e.B.booleanGame.modes), levels: lv, focused: (m, i) => practice.next(m, lv[i % 3]), mixed: i => practice.next('mixed', lv[i % 3]),
      record: q => ({ topic: q.topic, mode: q.mode }), details: q => e.LE.labEvidence('boolean-conditional-lab', q), mode: q => q.mode, expected: q => node('boolean-conditional-lab', q.mode), difficulty: q => q.difficulty };
  }
  { // ArrayList Lab (java-games/arraylist-lab/script.js)
    const history = undefined;
    A['arraylist-lab'] = { modes: keys(e.AL.MODES), levels: null, focused: m => e.AL.generate(m, Math.random, history), mixed: () => e.AL.generate('mixed', Math.random, history),
      record: q => ({ topic: q.mode, mode: q.mode }), details: () => null, mode: q => q.mode, expected: q => node('arraylist-lab', q.mode), difficulty: () => null };
  }
  { // LinkedList Lab (java-games/linkedlist-lab/script.js)
    A['linkedlist-lab'] = { modes: keys(e.LL.MODES).filter(m => m !== 'mixed'), levels: null, focused: m => e.LL.generate(m, Math.random), mixed: () => e.LL.generate('mixed', Math.random),
      record: q => ({ topic: q.mode, mode: q.mode }), details: q => e.LE.labEvidence('linkedlist-lab', q), mode: q => q.mode, expected: q => node('linkedlist-lab', q.mode === 'link' || q.mode === 'mutate' ? 'references' : q.mode), difficulty: () => null };
  }
  { // Method & Constructor Lab (java-games/method-constructor-lab/script.js)
    let last = null;
    A['method-constructor-lab'] = { modes: keys(e.MC.MODES), levels: null, focused: m => e.MC.generate(m, Math.random, {}),
      mixed: () => { const q = e.MC.generate('mixed', Math.random, { exclude: last ? [last] : [] }); last = q.mode; return q; },
      record: q => ({ topic: q.mode, mode: q.mode }), details: () => null, mode: q => q.mode, expected: q => node('method-constructor-lab', q.mode === 'order-args' ? 'match-call' : q.mode), difficulty: () => null };
  }
  { // Inheritance & Polymorphism Lab (java-games/inheritance-polymorphism-lab/script.js)
    const picker = e.IP.createPicker(Math.random);
    A['inheritance-polymorphism-lab'] = { modes: keys(e.IP.MODES), levels: null, focused: m => e.IP.generate(m, picker, Math.random), mixed: () => e.IP.generate('mixed', picker, Math.random),
      record: q => ({ topic: q.mode, mode: q.mode }), details: q => e.LE.labEvidence('inheritance-polymorphism-lab', q), mode: q => q.mode, expected: q => node('inheritance-polymorphism-lab', q.mode), difficulty: () => null };
  }
  { // Search & Sort Lab (java-games/search-sort-lab/app.js): no Mixed Practice mode
    const history = e.SS.createHistory(), lv = e.SS.DIFFICULTIES;
    A['search-sort-lab'] = { modes: keys(e.SS.MODES), levels: lv, focused: (m, i) => e.SS.nextChallenge(m, lv[i % 3], Math.random, history), mixed: null,
      record: q => ({ topic: q.mode, mode: q.mode }), details: q => ({ difficulty: q.difficulty, skill: q.skill, family: q.family, seed: q.seed }), mode: q => q.mode, expected: q => node('search-sort-lab', q.mode), difficulty: q => q.difficulty };
  }
  { // Recursion Lab (java-games/recursion-lab/ui.js)
    const lv = e.RC.difficulties;
    A['recursion-lab'] = { modes: keys(e.RC.recursionGame.modes), levels: lv, focused: (m, i) => e.RC.generateRecursion(m, Math.random, lv[i % 3], {}), mixed: i => e.RC.generateRecursion('mixed', Math.random, lv[i % 3], {}),
      record: q => ({ topic: q.topic, mode: q.mode }), details: q => ({ mode: q.topicTitle, difficulty: q.difficulty, skill: q.skill, generatorFamily: q.family, seed: q.seed }), mode: q => q.mode, expected: q => node('recursion-lab', q.mode), difficulty: q => q.difficulty };
  }
  { // Debugger Lab (java-games/debugger-lab/debugger-ui.js)
    const lv = e.DB.DIFFICULTIES;
    A['debugger-lab'] = { modes: keys(e.DB.formatNames), levels: lv, focused: (m, i) => e.DB.generateDebugger(m, { difficulty: lv[i % 3], seed: i + 1 }), mixed: i => e.DB.generateDebugger('mixed', { difficulty: lv[i % 3], seed: i + 1 }),
      record: q => ({ topic: q.topic, mode: q.format }), details: q => ({ mode: q.format, difficulty: q.difficulty, skill: q.skill, generatorFamily: q.familyId, seed: q.seed, errorCategory: q.errorCategory }), mode: q => q.format, expected: q => node('debugger-lab', q.format), difficulty: q => q.difficulty };
  }
  { // Documentation Lab (java-games/documentation-lab/script.js)
    const picker = e.DOC.createPicker(Math.random);
    A['documentation-lab'] = { modes: keys(e.DOC.MODES), levels: null, focused: m => e.DOC.generate(m, picker, Math.random), mixed: () => e.DOC.generate('mixed', picker, Math.random),
      record: q => ({ topic: q.mode, mode: q.mode }), details: q => e.LE.labEvidence('documentation-lab', q), mode: q => q.mode, expected: q => node('documentation-lab', q.mode), difficulty: () => null };
  }
  { // Robot Algorithms (java-games/robot-algorithms/script.js)
    let last = null, lastFamily = null;
    A['robot-algorithms'] = { modes: keys(e.RB.MODES), levels: null, focused: m => e.RB.generate(m, Math.random, {}),
      mixed: () => { const q = e.RB.generate('mixed', Math.random, { exclude: last ? [last] : [], lastFamily }); last = q.mode; lastFamily = q.family; return q; },
      record: q => ({ topic: q.mode, mode: q.mode }), details: q => e.LE.labEvidence('robot-algorithms', q), mode: q => q.mode, expected: q => node('robot-algorithms', q.mode), difficulty: () => null };
  }
  { // Class & Object Lab (java-games/class-object-lab/class-ui.js)
    const lv = e.CO.difficulties, modes = ['structure', 'defaults', 'constructors', 'getters', 'setters', 'this', 'independent', 'aliases', 'equality', 'parameters', 'static', 'tostring', 'reverse'];
    A['class-object-lab'] = { modes, levels: lv, focused: (m, i) => e.CO.generateClassObject(m, Math.random, lv[i % 3]), mixed: i => e.CO.generateClassObject('mixed', Math.random, lv[i % 3]),
      record: q => ({ topic: q.topic, mode: q.mode }), details: q => ({ difficulty: q.difficulty, family: q.family, reasoning: q.reasoningSignature }), mode: q => q.mode, expected: q => node('class-object-lab', q.mode), difficulty: q => q.difficulty };
  }
  for (const [lab, a] of Object.entries(A)) a.lab = lab;
  return A;
}
export const LAB_ADAPTERS = makeAdapters();

/* Pages whose annotation is replicated above: the begin/annotate source line each page contains today. */
export const pageGuards = {
  'boolean-conditional-lab': ['java-games/boolean-conditional-lab/boolean-ui.js', ['tracker.begin("boolean-conditional-lab", E.booleanGame.name, q.topic, E.booleanGame.modes[q.topic], q.mode, E.booleanGame.modes[q.mode])', 'labEvidence("boolean-conditional-lab", q)']],
  'arraylist-lab': ['java-games/arraylist-lab/script.js', ['tracker.begin(E.GAME_ID, E.arrayListGame.name, ch.mode, E.MODES[ch.mode], ch.mode, E.MODES[ch.mode])']],
  'linkedlist-lab': ['java-games/linkedlist-lab/script.js', ['tracker.begin("linkedlist-lab",E.GAME.name,ch.mode,E.MODES[ch.mode],ch.mode,E.MODES[ch.mode]);tracker.annotate(instance,labEvidence("linkedlist-lab",ch)||{})']],
  'method-constructor-lab': ['java-games/method-constructor-lab/script.js', ['tracker.begin(E.GAME_ID, E.methodLabGame.name, ch.mode, E.MODES[ch.mode], ch.mode, E.MODES[ch.mode])']],
  'inheritance-polymorphism-lab': ['java-games/inheritance-polymorphism-lab/script.js', ['tracker.begin(E.GAME_ID, E.ipLabGame.name, ch.mode, E.MODES[ch.mode], ch.mode, E.MODES[ch.mode])', 'tracker.annotate(instance, labEvidence(E.GAME_ID, ch) || {})']],
  'search-sort-lab': ['java-games/search-sort-lab/app.js', ['tracker.begin(GAME_ID, "Search & Sort Lab", mode, MODES[mode].title, mode, MODES[mode].title)', 'tracker.annotate?.(instance, { difficulty, skill: ch.skill, family: ch.family, seed: ch.seed })']],
  'recursion-lab': ['java-games/recursion-lab/ui.js', ['tracker.begin(question.game, question.title, question.topic, question.topicTitle, question.mode, question.topicTitle)', 'tracker.annotate(instance, { mode: question.topicTitle, difficulty: question.difficulty, skill: question.skill, generatorFamily: question.family, seed: question.seed })']],
  'debugger-lab': ['java-games/debugger-lab/debugger-ui.js', ['tracker.begin(question.game, question.title, question.topic, question.topicTitle, question.format, question.formatName)', 'tracker.annotate(instanceId,{mode:question.format,difficulty:question.difficulty,skill:question.skill,generatorFamily:question.familyId,seed:question.seed,errorCategory:question.errorCategory})']],
  'documentation-lab': ['java-games/documentation-lab/script.js', ['tracker.begin(E.GAME_ID, E.docLabGame.name, ch.mode, E.MODES[ch.mode], ch.mode, E.MODES[ch.mode])', 'tracker.annotate(instance, labEvidence(E.GAME_ID, ch) || {})']],
  'robot-algorithms': ['java-games/robot-algorithms/script.js', ['tracker.begin(GAME, TITLE, ch.mode, E.MODES[ch.mode], ch.mode, E.MODES[ch.mode])', 'tracker.annotate(instance, labEvidence(GAME, ch) || {})']],
  'class-object-lab': ['java-games/class-object-lab/class-ui.js', ['tracker.begin(question.game, question.title, question.topic, question.topicTitle, question.mode, question.topicTitle)', 'tracker.annotate(instance, { difficulty: question.difficulty, family: question.family, reasoning: question.reasoningSignature })']],
  'math-lab': ['java-games/math-lab/app.js', ['tracker.begin("math-lab", "Math Lab", q.mode, title, q.mode, title)', 'tracker.annotate(instance, evidence)', 'mathEvidence(q)', 'mixedDeck.next(']],
  'loop-lab': ['java-games/loop-lab/loop-ui.js', ['generatorFamily: q.reasoningFamily']],
  'array-lab': ['java-games/array-lab/array-ui.js', ['practiceMode: question.format,', 'difficulty: question.difficulty || null']],
};
export function pageSource(rel) { return fs.readFileSync(new URL(rel, root), 'utf8'); }

/* ---------------------------- the flow itself ---------------------------- */
const unmapped = [];
export const unmappedReport = unmapped;
/** Present a question exactly as a lab page does, then perform the student action. Returns {instance, events, credits[]}.
 *  action: 'correct' | 'incorrect' | 'skip' | 'reveal' | {retryAfterWrong:true} | {doubleSubmit:true} */
export function play(adapter, q, action = 'correct') {
  const rec = adapter.record(q);
  const instance = tracker.begin(adapter.lab, adapter.lab, rec.topic, String(rec.topic), rec.mode, String(rec.mode));
  const details = adapter.details(q);
  if (details) tracker.annotate(instance, details);
  drain(); // begin/annotate alone emit nothing
  const out = [];
  const submit = ok => { tracker.submit(instance, ok); out.push(...drain()); };
  if (action === 'correct') submit(true);
  else if (action === 'incorrect') { submit(false); tracker.reveal(instance); out.push(...drain()); }
  else if (action === 'skip') { tracker.skip(instance); out.push(...drain()); }
  else if (action === 'reveal') { tracker.reveal(instance); out.push(...drain()); }
  else if (action === 'wrongThenRight') { submit(false); submit(true); }
  else if (action === 'doubleSubmit') { submit(true); submit(true); }
  else throw new Error('unknown action ' + action);
  const credits = out.map(ev => { const c = normalize(ev); const ids = nodeIdsOf(c); return { event: ev, cleaned: c, ids: ids || [] }; });
  return { instance, events: out, credits };
}
export function reportUnmapped(label) { unmapped.push(label); }
