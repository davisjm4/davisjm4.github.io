// Real Chromium attribution test for Boolean Gatekeeper and Algorithm Architect (Build 6).
// A class profile is simulated so the real tracker queues the event the Worker would receive. The test plays real questions, reads the
// queued event, and checks it against an INDEPENDENT calculation made from the question as displayed on screen.
//   python3 -m http.server 8123 --bind 127.0.0.1     (repository root)     node cs-games/pathway/tests/csp-proficiency-a-browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright/index.mjs');
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const root = new URL('../../../', import.meta.url);
const graph = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/curriculum-graph.json', root)));
const { cleanGameAttempt } = await import(new URL('wpr-games/workplace-readiness/service/profile-evidence.mjs', root));
const { normalizeEvent } = await import(new URL('cs-games/pathway/mastery/events.mjs', root));
const PID = '0a1b2c3d-1111-4222-8333-444455556666';
let passed = 0; const check = (cond, name) => { assert.ok(cond, name); passed++; };

// ---- independent parser/evaluator for the formatted expression the page shows ----
function parse(text) {
  const s = text.trim();
  const m = /^([xy]) (>|<|≥|≤|=|≠) (-?\d+)$/.exec(s);
  if (m) return { leaf: true, v: m[1], op: m[2], n: Number(m[3]) };
  const close = open => { let d = 0; for (let i = open; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')' && --d === 0) return i; } throw new Error('unbalanced: ' + s); };
  if (s.startsWith('NOT (')) { const end = close(4); assert.equal(end, s.length - 1); return { op: 'NOT', a: parse(s.slice(5, end)) }; }
  const end = close(0); const rest = s.slice(end + 1).trim(); const op = rest.split(' ')[0];
  assert.ok(op === 'AND' || op === 'OR', 'operator in ' + s);
  return { op, a: parse(s.slice(1, end)), b: parse(rest.slice(op.length).trim().slice(1, -1)) };
}
const ev = (e, v) => e.leaf ? ({ '>': v[e.v] > e.n, '<': v[e.v] < e.n, '≥': v[e.v] >= e.n, '≤': v[e.v] <= e.n, '=': v[e.v] === e.n, '≠': v[e.v] !== e.n })[e.op]
  : e.op === 'AND' ? ev(e.a, v) && ev(e.b, v) : e.op === 'OR' ? ev(e.a, v) || ev(e.b, v) : !ev(e.a, v);
function expectedBooleanFamily(text) {
  const e = parse(text), sol = []; for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) if (ev(e, { x, y })) sol.push({ x, y });
  const bothMatter = ['x', 'y'].every(i => Array.from({ length: 13 }, (_, v) => sol.filter(p => p[i] === v).length).every(c => c < 13));
  return bothMatter && sol.length / 169 <= 0.25 ? 'both-inputs:' + e.op.toLowerCase() : null;
}

const browser = await chromium.launch({executablePath:process.env.CHROME_BIN});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(id => localStorage.setItem('wrg.profile.active.v1', JSON.stringify({ id, token: 'c'.repeat(64), expires: Date.now() + 1e9, classId: 'class-1', courseId: 'csp' })), PID);
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && !/favicon|404|\/api\//.test(m.text() + m.location().url) && errors.push(m.text()));
const outbox = () => page.evaluate(id => Object.entries(localStorage).filter(([k]) => k.startsWith('wrg.profile.' + id + '.outbox.')).map(([, v]) => JSON.parse(v)), PID);

// ---------------- Boolean Gatekeeper, "make it TRUE" ----------------
await page.goto(BASE + '/csp-games/boolean-gatekeeper/?mode=make'); await page.waitForSelector('#stage pre');
check(await page.locator('#mode').inputValue() === 'make', 'the page opens in the requested mode');
const N = 70, expected = [];
for (let i = 0; i < N; i++) {
  const shown = (await page.locator('#stage pre').first().innerText()).trim();
  expected.push(expectedBooleanFamily(shown));
  await page.click('#check'); await page.waitForTimeout(40);
  if (i % 7 === 0) { await page.click('#check'); await page.waitForTimeout(30); }   // a retry on some questions
  await page.click('#new'); await page.waitForSelector('#stage pre');
}
const events = (await outbox()).filter(e => e.activity === 'boolean-gatekeeper').sort((a, b) => a.occurred - b.occurred || (a.id < b.id ? -1 : 1));
const firsts = events.filter(e => e.attempt === 1);
check(firsts.length === N, `one first-attempt event per question (${firsts.length} of ${N})`);
check(firsts.every(e => e.assessedMode === 'make' && e.topic === 'make'), 'every event reports the assessed mode make');
check(new Set(firsts.map(e => e.questionId)).size === N && new Set(firsts.map(e => e.id)).size === N, 'question ids are stable and unique');
let tagged = 0, mismatches = [];
firsts.forEach((e, i) => { const want = expected[i], got = e.familyId ?? null; if (want !== got) mismatches.push({ i, want, got }); if (got) tagged++; });
check(mismatches.length === 0, 'the family the game reported equals the family computed from the question on screen: ' + JSON.stringify(mismatches.slice(0, 3)));
check(tagged >= N*0.95, `at least 95% of focused Make questions earn a Level 3 family (${tagged} of ${N}), so the filter is doing work`);
check(events.filter(e => e.attempt > 1).every(e => firsts.some(f => f.questionId === e.questionId)), 'a retry is a second attempt of the same question, never a new first attempt');
for (const e of firsts.filter(e => e.familyId)) {
  const row = cleanGameAttempt(e, () => true), r = normalizeEvent(row, { graph, scope: { profileId: PID, classId: 'class-1' } });
  check(row.data.dimensions.map(d => d.id).join() === 'node:csp:boolean-gatekeeper:CSP-BOOLEAN' && r.ok, 'the Worker credits a tagged event to Interpret Boolean expressions');
  break;
}
// ---------------- Algorithm Architect ----------------
await page.goto(BASE + '/csp-games/algorithm-architect/?mode=iteration'); await page.waitForSelector('button.choice, #stage button');
const before = (await outbox()).length;
for (let i = 0; i < 14; i++) { await page.locator('#stage button.choice, #stage fieldset button').first().click(); await page.click('#check'); await page.waitForTimeout(50); await page.click('#next'); await page.waitForTimeout(40); }
const arch = (await outbox()).filter(e => e.activity === 'algorithm-architect' && e.attempt === 1);
check(arch.length === 14, `fourteen first-attempt Architect events (${arch.length})`);
check(arch.every(e => e.assessedMode === 'iteration' && e.topic === 'iteration'), 'the assessed mode is the mode played');
check(arch.every(e => /^iteration:[0-4]:(update|update-count|loop-boundary|condition|initialization|return)$/.test(e.familyId)), 'every family names its model and a known component: ' + [...new Set(arch.map(e => e.familyId))].join(' '));
for (const e of arch) { const row = cleanGameAttempt(e, () => true); check(row.data.dimensions.map(d => d.id).join() === 'node:csp:algorithm-architect:CSP-ITERATION', 'the Worker credits the Iteration skill'); }
check(errors.length === 0, 'no page errors: ' + errors.slice(0, 2).join(' | '));
await browser.close();
console.log(`CSP PROFICIENCY BROWSER CHECKS: ${passed} passed (Boolean: ${tagged} of ${N} questions tagged as Level 3 evidence)`);
