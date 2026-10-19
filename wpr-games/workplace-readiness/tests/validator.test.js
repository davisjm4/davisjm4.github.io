'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../js/core/validator.js');
const G = require('../js/core/generator.js');
const { base, clone, libWith } = require('./helpers.js');

function errorsFor(id, mutate) {
  const { lib, template } = libWith(id, mutate);
  return V.validateTemplate(template, lib).errors;
}
function expectReject(label, id, mutate, pattern) {
  test('validator rejects: ' + label, () => {
    const errs = errorsFor(id, mutate);
    assert.ok(errs.length > 0, 'expected an error but template passed');
    assert.ok(errs.some(e => pattern.test(e)), 'expected /' + pattern + '/ in:\n' + errs.join('\n'));
  });
}

test('validator: the shipped library passes with no errors or warnings', () => {
  const r = V.validateLibrary(base);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

// ---- choice templates ----
expectReject('two best answers', 'INT-D-001', t => { t.options[1].role = 'best'; }, /exactly one option must have role "best"/);
expectReject('no best answer', 'INT-D-001', t => { t.options[0].role = 'distractor'; t.options[0].misconception = 'x'; }, /exactly one option must have role "best"/);
expectReject('duplicate option text', 'INT-D-001', t => { t.options[2].text = t.options[1].text; }, /duplicate option text/);
expectReject('wrong option count', 'INT-D-001', t => { t.options.pop(); }, /exactly 4 options/);
expectReject('distractor without misconception', 'INT-D-001', t => { delete t.options[1].misconception; }, /needs a "misconception"/);
expectReject('option without explanation', 'INT-D-001', t => { t.options[1].why = ''; }, /needs a "why"/);
expectReject('best answer conspicuously longest', 'INT-D-001', t => {
  t.options[0].text += ' and then write a short note in the margin explaining exactly why the change was made and when it happened today';
}, /conspicuously the longest/);
expectReject('too-short throwaway distractor', 'INT-D-001', t => { t.options[1].text = 'Ignore it.'; }, /too short/);
expectReject('absurd distractor wording', 'INT-D-001', t => { t.options[1].text = 'Yell at everyone nearby until someone else deals with the incorrect entry.'; }, /absurd/);
expectReject('advanced template with no acceptable-but-not-best option', 'EFF-D-001', t => { t.options[1].role = 'distractor'; }, /advanced templates must include/);
expectReject('nextstep prompt without sequence cue', 'INT-N-001', t => { t.prompt = 'What is the most appropriate action?'; }, /sequence or timing/);
expectReject('nextstep missing timing note', 'INT-N-001', t => { delete t.timing; }, /timing/);
expectReject('best option requires a fact the scenario never asserts', 'INT-D-001', t => { t.options[0].requires = ['never-stated']; }, /requires fact/);

// ---- text / tokens / answer leakage ----
expectReject('undeclared slot token', 'INT-D-001', t => { t.scenario += ' {mystery}'; }, /not declared/);
expectReject('double determiner', 'INT-D-001', t => { t.scenario = t.scenario.replace('{record|the}', 'the {record|the}'); }, /double determiner/);
expectReject('subject pronoun (they-agreement hazard)', 'INT-N-001', t => { t.options[2].text += ' while {coworker.subj} waits'; }, /avoid subject pronouns/);
expectReject('numeric token without declared var', 'MAT-D-001', t => { t.scenario += ' {bogus|money}'; }, /not declared/);
expectReject('scenario names the target skill', 'INT-D-001', t => { t.scenario += ' This tests your integrity.'; }, /answer-leaking phrase/);
expectReject('scenario says "should do"', 'CON-D-001', t => { t.scenario += ' Think about what you should do.'; }, /answer-leaking phrase/);
expectReject('legal claim without review', 'INT-D-001', t => { t.scenario += ' It is illegal to change records.'; }, /legal\/mandatory-law claim/);
expectReject('OSHA requirement claim without review', 'SAF-D-001', t => { t.scenario += ' OSHA requires every check to be signed.'; }, /legal\/mandatory-law claim/);

// ---- metadata ----
expectReject('unknown skill', 'INT-D-001', t => { t.skill = 'made-up'; }, /unknown skill/);
expectReject('family from another skill', 'INT-D-001', t => { t.family = 'workplace-safety.reporting-hazards'; }, /belongs to skill/);
expectReject('unknown concept', 'INT-D-001', t => { t.concepts = ['integrity:nope']; }, /unknown concept/);
expectReject('concept from another skill', 'INT-D-001', t => { t.concepts = ['teamwork:share-responsibility']; }, /belongs to another skill/);
expectReject('id prefix mismatch', 'INT-D-001', t => { t.id = 'SAF-D-001'; }, /id prefix|duplicate/);
expectReject('id mode letter mismatch', 'INT-D-001', t => { t.id = 'INT-O-001'; }, /mode letter/);
expectReject('unreviewed template', 'INT-D-001', t => { t.review.status = 'draft'; }, /review\.status/);
expectReject('sensitive skill without jurisdiction check', 'SAF-D-001', t => { t.review.checks = ['policy-stated-in-scenario']; }, /no-jurisdiction-claims/);
expectReject('unknown context', 'INT-D-001', t => { t.contexts = ['moonbase']; }, /unknown context/);
expectReject('unknown slot source', 'INT-D-001', t => { t.slots.thing = 'spaceship'; }, /unknown source/);

// ---- ordering ----
expectReject('order step with no required position', 'EFF-O-001', t => {
  t.precedence = t.precedence.filter(p => p.before !== 'start' && p.after !== 'start');
}, /not part of any precedence relation/);
expectReject('order that is too loosely constrained', 'SAF-O-001', t => {
  t.precedence = t.precedence.filter(p => p.before === 'stop');
}, /too many valid orders|not part of any/);
expectReject('order with a cycle', 'EFF-O-001', t => { t.precedence.push({ before: 'start', after: 'list', why: 'x' }); }, /cycle/);
expectReject('order missing why', 'EFF-O-001', t => { t.precedence[0].why = ''; }, /needs a "why"/);
expectReject('order with alternates not reviewed', 'SAF-O-001', t => { delete t.alternatesReviewed; }, /alternatesReviewed/);
expectReject('order with only two steps', 'EFF-O-001', t => { t.steps = t.steps.slice(0, 2); t.precedence = [t.precedence[0]]; }, /needs 3-5 steps/);

// ---- find ----
expectReject('find with two problems', 'ISE-F-001', t => { t.segments[0].problem = true; t.segments[0].why = 'x'; }, /exactly one segment must be the problem/);
expectReject('find with no problem', 'ISE-F-001', t => { t.segments[3].problem = false; t.segments[3].whyFine = 'x'; }, /exactly one segment must be the problem/);
expectReject('find segment without explanation', 'ISE-F-001', t => { t.segments[0].whyFine = ''; }, /whyFine/);
expectReject('find with too few segments', 'ISE-F-001', t => { t.segments = t.segments.slice(2, 4); }, /needs 3-7 segments/);

// ---- numeric ----
expectReject('bad derive expression', 'MAT-D-001', t => { t.derive.net = 'gross -- tax )'; }, /derive "net"/);
expectReject('unsafe derive expression', 'MAT-D-001', t => { t.derive.net = 'process.exit()'; }, /derive "net"/);

// ---- instance level ----
function goodInstance(id) {
  const t = base.templatesById[id];
  return G.renderTemplate(t, base, { seed: 'inst-' + id, id: '0' });
}
function instErrors(c) { return V.validateChallenge(c, base).errors; }

test('instance validator accepts a well-formed instance of every template', () => {
  base.templates.forEach(t => assert.deepEqual(instErrors(goodInstance(t.id)), [], t.id));
});
test('instance validator rejects unresolved tokens', () => {
  const c = goodInstance('INT-D-001'); c.scenario += ' {oops}';
  assert.ok(instErrors(c).some(e => /unresolved token/.test(e)));
});
test('instance validator rejects "undefined"/"NaN" leaking into text', () => {
  const c = goodInstance('INT-D-001'); c.options[0].text = 'Do the undefined thing right away today please';
  assert.ok(instErrors(c).some(e => /bad value leaked/.test(e)));
});
test('instance validator rejects repeated words ("the the")', () => {
  const c = goodInstance('INT-D-001'); c.scenario = c.scenario.replace('the ', 'the the ');
  assert.ok(instErrors(c).some(e => /repeated word/.test(e)));
});
test('instance validator rejects duplicate choices', () => {
  const c = goodInstance('CON-D-001'); c.options[1].text = c.options[0].text;
  assert.ok(instErrors(c).some(e => /duplicate option text/.test(e)));
});
test('instance validator rejects a wrong or missing bestId', () => {
  const c = goodInstance('CON-D-001'); const wrong = c.options.find(o => o.id !== c.key.bestId).id; c.key.bestId = wrong;
  assert.ok(instErrors(c).length > 0);
  const d = goodInstance('CON-D-001'); d.key.bestId = 'o9';
  assert.ok(instErrors(d).length > 0);
});
test('instance validator rejects two best answers', () => {
  const c = goodInstance('CON-D-001'); const other = Object.keys(c.key.options).find(k => k !== c.key.bestId); c.key.options[other].role = 'best';
  assert.ok(instErrors(c).some(e => /exactly one best/.test(e)));
});
test('instance validator rejects answer leakage (best option copied into scenario)', () => {
  const c = goodInstance('CON-D-001');
  const best = c.options.find(o => o.id === c.key.bestId).text;
  c.scenario += ' ' + best;
  assert.ok(instErrors(c).some(e => /leaks the best answer/.test(e)));
});
test('instance validator rejects contradictory facts', () => {
  const c = goodInstance('INT-D-001'); c.contradictions = [['own-error', 'error-unnoticed']];
  assert.ok(instErrors(c).some(e => /contradictory scenario facts/.test(e)));
});
test('instance validator rejects a best answer whose required fact is absent', () => {
  const c = goodInstance('INT-D-001'); c.facts = c.facts.filter(f => f !== 'policy-marked-corrections');
  assert.ok(instErrors(c).some(e => /does not state/.test(e)));
});
test('instance validator rejects an ordering that is already solved', () => {
  const c = goodInstance('EFF-O-001'); c.steps = c.key.example.map(id => c.steps.find(s => s.id === id));
  assert.ok(instErrors(c).some(e => /already a valid answer/.test(e)));
});
test('instance validator rejects over-length scenarios for the difficulty', () => {
  const c = goodInstance('INT-D-001'); c.scenario += ' ' + 'extra detail '.repeat(40);
  assert.ok(instErrors(c).some(e => /scenario is \d+ words/.test(e)));
});
test('instance validator rejects find documents with a missing problem segment', () => {
  const c = goodInstance('ISE-F-001'); c.key.problemId = 'zzz';
  assert.ok(instErrors(c).length > 0);
});
test('instance validator rejects an instance that does not match its template', () => {
  const c = goodInstance('INT-D-001'); c.family = 'integrity.accepting-responsibility';
  assert.ok(instErrors(c).some(e => /does not match its template/.test(e)));
});
