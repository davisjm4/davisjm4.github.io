// Coverage expansion, first wave: Roundoff vs. Overflow Lab -> node CSP-NUMERIC.
// Every event is built from a question the REAL generator produced, recorded by the REAL session tracker exactly as the lab's
// app.js records it, shaped as csp-games/../profile-sync.mjs recordGameAttempt shapes it, passed through the Worker's
// cleanGameAttempt and the shared normalizeEvent, and judged by the shared evaluateEvidence. Synthetic data only.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import graph from '../curriculum-graph.json' with {type: 'json'};
import * as E from '../../../csp-games/roundoff-overflow-lab/engine.js';
import {createSessionTracker} from '../../../csp-games/session.js';
import {cleanGameAttempt} from '../../../wpr-games/workplace-readiness/service/profile-evidence.mjs';
import {normalizeEvent, evaluateEvidence} from '../mastery/index.mjs';
import {auditRecommended} from '../requirements/recommended.mjs';
import registry from '../evidence-gap-registry.json' with {type: 'json'};
import {pol, basePolicy} from './lib/mastery-fixtures.mjs';

const NUMERIC = graph.nodes.find(n => n.id.endsWith(':CSP-NUMERIC'));
const scope = {profileId: 'synthetic', classId: 'synthetic-class'};
const memory = () => { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k)}; };
const metadata = v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,119}$/.test(v) ? v : null;

// Same record shape app.js builds: tracker.begin(slug,title,answer,answer,filter,...) then annotate({family,practiceMode,selectedMode,...}).
function session() {
  const attempts = []; let clock = Date.parse('2026-11-11T12:00:00Z');
  const tracker = createSessionTracker({storage: memory(), now: () => new Date(clock += 1000).toISOString(), onAttempt: (r, sid, correct, at) => attempts.push({r: structuredClone(r), sid, correct, at})});
  return {tracker, attempts};
}
// Mirrors recordGameAttempt('csp', record, sessionId, correct, occurred) field for field.
function profileEvent({r, sid, correct, at}) {
  const d = r.details || {};
  return {id: r.id + ':' + r.submissions, questionId: r.id, sessionId: sid, courseId: 'csp', activity: r.game, attempt: r.submissions, correct: Boolean(correct), occurred: Date.parse(at),
    mode: metadata(d.practiceSetting || d.selectedMode || r.mode), assessedMode: metadata(d.practiceMode) || metadata(d.format) || metadata(d.mode) || metadata(r.mode),
    topic: metadata(d.profileTopic) || metadata(r.topic), difficulty: metadata(d.difficulty), evidenceRevision: metadata(d.evidenceRevision),
    familyId: metadata(d.reasoningFamily || d.generatorFamily || d.familyId || d.family || d.modelId || d.componentId), assisted: d.assisted === true};
}
function play(q, {filter = 'mixed', picks = [q.answer], tracker, attempts}) {
  const id = tracker.begin('roundoff-overflow-lab', 'Roundoff vs. Overflow Lab', q.answer, q.answer, filter, filter);
  tracker.annotate(id, {skills: E.SKILLS, family: q.family, questionId: q.id, concept: q.answer, filter: q.topic, practiceMode: q.answer.toLowerCase(), selectedMode: filter});
  const start = attempts.length;
  for (const pick of picks) { const ok = E.feedback(q, pick).correct; tracker.submit(id, ok); if (ok) break; }
  return attempts.slice(start).map(a => profileEvent(a));
}
function accept(raw) {
  const row = cleanGameAttempt(raw, () => true);
  assert.ok(row, 'the Worker accepts the event');
  const parsed = normalizeEvent(row, {graph, scope});
  assert.equal(parsed.ok, true, parsed.reason);
  return {row, event: parsed.event};
}
const policy = pol(basePolicy({id: 'test:numeric', minimumQuestions: 30, accuracy: 0.9}));
const evaluate = events => evaluateEvidence({nodeId: NUMERIC.id, policy, events});
const wrong = q => E.ANSWERS.find(a => a !== q.answer);

test('the graph node exists and the lab is bound only to it', () => {
  assert.ok(NUMERIC, 'CSP-NUMERIC node');
  assert.ok(NUMERIC.practice.some(p => p.activityId === 'roundoff-overflow-lab'));
});

test('every one of the 360 real questions, focused and Mixed, credits CSP-NUMERIC and no other node', () => {
  for (const filter of ['mixed', 'integer', 'precision', 'applications']) {
    const s = session();
    for (const q of E.QUESTIONS.filter(x => filter === 'mixed' || x.topic === filter)) {
      const [raw] = play(q, {filter, ...s});
      const {row} = accept(raw);
      assert.deepEqual(row.data.dimensions.map(d => d.id), [NUMERIC.id], `${q.id} (${filter})`);
      assert.equal(row.data.dimensions[0].c, 1);
      assert.equal(raw.familyId, q.family, 'the reported family is the question\'s own family');
    }
  }
});

test('a correct first attempt counts once; an incorrect first attempt counts once in the denominator', () => {
  const s = session(), [good, bad] = E.QUESTIONS.slice(0, 2);
  const ok = accept(play(good, s)[0]).event;
  const [firstWrong] = play(bad, {...s, picks: [wrong(bad)]});
  const no = accept(firstWrong).event;
  const r = evaluate([ok, no]);
  assert.deepEqual([r.counts.attempted, r.counts.correct], [2, 1]);
});

test('a corrected second attempt earns no credit and is not another first attempt', () => {
  const s = session(), q = E.QUESTIONS[7];
  const raws = play(q, {...s, picks: [wrong(q), q.answer]});
  assert.equal(raws.length, 2);
  const first = accept(raws[0]), second = cleanGameAttempt(raws[1], () => true);
  assert.deepEqual(second.data.dimensions, [], 'the Worker gives a retry no skill credit');
  assert.equal(second.data.firstAttempt, false);
  const r = evaluate([first.event, normalizeEvent(second, {graph, scope}).event].filter(Boolean));
  assert.deepEqual([r.counts.attempted, r.counts.correct], [1, 0]);
});

test('a replayed or duplicated event earns no second credit', () => {
  const s = session(), q = E.QUESTIONS[3], [raw] = play(q, s), {event} = accept(raw);
  const r = evaluate([event, event, {...event}]);
  assert.equal(r.counts.attempted, 1);
});

test('skipped questions never earn correct-answer credit', () => {
  const s = session(), q = E.QUESTIONS[5];
  const id = s.tracker.begin('roundoff-overflow-lab', 't', q.answer, q.answer, 'mixed', 'mixed');
  s.tracker.annotate(id, {family: q.family, practiceMode: q.answer.toLowerCase(), selectedMode: 'mixed'});
  s.tracker.skip(id);
  assert.equal(s.attempts.length, 0, 'a skip is not a scored attempt');
});

test('unrelated nodes receive no credit from this lab', () => {
  const s = session(), [raw] = play(E.QUESTIONS[0], s), {row} = accept(raw);
  const others = graph.nodes.filter(n => n.id !== NUMERIC.id).map(n => n.id);
  assert.equal(row.data.dimensions.filter(d => others.includes(d.id)).length, 0);
});

test('30 correct first attempts at 90% is feasible, and 27 of 30 meets it while 26 does not', () => {
  const s = session(), qs = E.QUESTIONS.filter((_, i) => i % 12 === 0).slice(0, 30);
  assert.equal(qs.length, 30);
  const events = qs.map((q, i) => accept(play(q, {...s, picks: i < 3 ? [wrong(q)] : [q.answer]})[0]).event);
  const r = evaluate(events);
  assert.deepEqual([r.counts.attempted, r.counts.correct], [30, 27]);
  assert.ok(r.counts.accuracy >= 0.9);
  const r2 = evaluate(events.map((e, i) => i < 4 ? {...e, correct: false} : e));
  assert.ok(r2.counts.accuracy < 0.9);
});

// ---- bank depth and shortcut audit (student-visible fields only) ---------------------------------------------------------------
test('bank: 60 reasoning families, each with its own objective and kind; 360 distinct visible questions', () => {
  assert.equal(new Set(E.QUESTIONS.map(q => q.family)).size, 60);
  assert.equal(new Set(E.QUESTIONS.map(q => q.scene + '|' + q.prompt)).size, 360);
});

test('shortcut audit: no visible parameter predicts the answer beyond the topic base rate', () => {
  const majority = (qs, f) => { const g = {}; for (const q of qs) { const k = String(f(q)); (g[k] ??= {}); g[k][q.answer] = (g[k][q.answer] || 0) + 1; }
    return Object.values(g).reduce((n, v) => n + Math.max(...Object.values(v)), 0) / qs.length; };
  const bits = q => (/(\d+)-bit|(\d+) bits/.exec(q.scene) || [])[1] || (/(\d+)-bit|(\d+) bits/.exec(q.scene) || [])[2] || '?';
  const integer = E.QUESTIONS.filter(q => q.topic === 'integer');
  const base = majority(integer, () => 'all');
  assert.ok(majority(integer, bits) <= base + 0.05, `bit width must not add information (base ${base}, width ${majority(integer, bits)}); it was 0.93 before the repair`);
  for (const [name, f] of Object.entries({topic: q => q.topic, kind: q => q.model.format.kind, op: q => q.model.op, length: q => Math.round(q.scene.length / 40)}))
    assert.ok(majority(E.QUESTIONS, f) <= 0.60, `${name} predicts the answer too well`);
  const lengths = E.ANSWERS.map(a => { const x = E.QUESTIONS.filter(q => q.answer === a); return x.reduce((n, q) => n + q.scene.length, 0) / x.length; });
  assert.ok(Math.max(...lengths) / Math.min(...lengths) < 1.25, 'scene length must not separate the answers');
});

// ---- classification ------------------------------------------------------------------------------------------------------------
test('the recommendation now treats CSP-NUMERIC as verified practice at the standard tier and leaves unreviewed nodes alone', () => {
  const rows = auditRecommended(graph, registry), by = Object.fromEntries(rows.map(r => [r.nodeId, r]));
  assert.equal(by[NUMERIC.id].tier, 'standard-practice');
  assert.equal(by[graph.nodes.find(n=>n.id.endsWith(':CSP-RGB')).id].tier,'standard-practice','RGB exact code assessment was subsequently reviewed');
  for (const key of ['CHARACTERS', 'BINARY', 'CAPACITY', 'REPRESENTATION'])
    assert.equal(by[graph.nodes.find(n => n.id.endsWith(':CSP-' + key)).id].tier, null, `${key} stays unreviewed`);
});
