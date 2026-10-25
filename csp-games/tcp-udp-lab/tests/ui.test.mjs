// DOM interaction test (linkedom). Run: node csp-games/tcp-udp-lab/tests/ui.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as E from '../generator.js';

const require = createRequire(new URL('../../package.json', import.meta.url)), { parseHTML } = require('linkedom');
const { document, window } = parseHTML(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
const OriginalDate = Date; let now = new OriginalDate(2026, 9, 26, 10, 0, 0).getTime();
globalThis.Date = class extends OriginalDate { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
const store = new Map(), storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
Object.assign(globalThis, { document, window, localStorage: storage, location: { href: 'https://davisjm4.github.io/csp-games/tcp-udp-lab/?seed=17' } });
window.localStorage = storage; globalThis.setInterval = () => 1; globalThis.clearInterval = () => {};
// linkedom lacks a writable <select>.value; emulate the native behavior.
const proto = Object.getPrototypeOf(document.querySelector('select'));
Object.defineProperty(proto, 'value', { configurable: true, get() { return this._value ?? this.querySelector('option')?.value ?? ''; }, set(v) { this._value = String(v); } });

const app = await import('../app.js'), $ = id => document.getElementById(id);
let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; }, eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const click = el => el.dispatchEvent(new window.Event('click', { bubbles: true }));
const key = (k, target = document.body) => { const e = new window.Event('keydown', { bubbles: true, cancelable: true }); Object.defineProperty(e, 'key', { value: k }); target.dispatchEvent(e); };
const st = () => app.state(), game = () => st().tracker.snapshot().games['tcp-udp-lab'];
const right = () => $(st().current.answer.toLowerCase()), wrong = () => $(st().current.answer === 'TCP' ? 'udp' : 'tcp');
const setTopic = t => { $('topic').value = t; $('topic').dispatchEvent(new window.Event('change')); };

// Initial state: one scenario, two plain choices, nothing revealed.
eq([...document.querySelectorAll('.choices button')].map(b => b.textContent), ['TCP', 'UDP']);
eq(document.querySelectorAll('select#topic option').length, 6); eq($('topic').value, 'mixed');
ok($('feedback').hidden && $('feedback').textContent === '', 'no feedback before answering');
eq($('feedback').getAttribute('role'), 'status'); eq($('feedback').getAttribute('tabindex'), '-1');
eq($('prompt').textContent, 'Which transport protocol is the better fit?');
ok($('scene').textContent.length > 80 && !$('scene').textContent.includes(st().current.why), 'scenario shown without explanation');
ok(!/\b(TCP|UDP)\b/.test($('scene').textContent));
ok($('stats').textContent.includes('— (0/0)'));
ok(document.querySelector('header [data-session-link]'), 'Session Summary link');
eq(game(), undefined, 'showing a scenario creates no Session Summary record');

// Opening Learn is not an attempt.
click($('learn-link'));ok($('learn').open,'reference link opens the collapsed panel'); eq(game(), undefined, 'Learn panel is not an attempt');
ok(/<table/.test($('learn').innerHTML) && $('learn').textContent.includes('Byte stream') && $('learn').textContent.includes('HTTP/3 runs over QUIC'));

// Wrong first answer: scored once, locked, explained.
let q = st().current; click(wrong());
eq(game().attempted, 1); eq(game().firstTry, 0);
ok($('tcp').disabled && $('udp').disabled, 'both choices locked');
ok(!$('feedback').hidden && $('feedback').textContent.startsWith(`Incorrect — Correct answer: ${q.answer}`));
eq($('feedback').querySelectorAll('.explain').length >= 3, true, 'reason, alternative and network sections');
ok($('feedback').textContent.includes(q.why) && $('feedback').textContent.includes(q.alt));
ok(right().classList.contains('is-answer') && wrong().classList.contains('chosen'));
eq(wrong().getAttribute('aria-pressed'), 'true');
const subs = st().tracker.snapshot().totals.submissions; click(right()); key('t'); key('u');
eq(st().tracker.snapshot().totals.submissions, subs, 'no second scored attempt');
ok($('notice').textContent.includes('recorded'));

// Next question resets the round.
click($('next')); ok(!$('tcp').disabled && !$('udp').disabled && $('feedback').hidden);
ok(st().current.id !== q.id, 'new scenario');
click(right()); ok($('feedback').textContent.startsWith(`Correct — ${st().current.answer}`)); eq(game().firstTry, 1);

// Skipping an unanswered round does not count.
click($('next')); const before = game().attempted; click($('next')); click($('next')); eq(game().attempted, before, 'skips are not attempts');

// Every filter: delivers only that topic, keeps the session, tracks topic and mode.
for (const t of Object.keys(E.TOPICS)) {
  setTopic(t); eq(st().current.topic, t, `${t}: filter respected`); eq($('topic-label').textContent, E.TOPICS[t]);
  const n = game().attempted; click(right()); eq(game().attempted, n + 1, `${t}: session kept across filter change`);
  eq(game().modes[t].attempted, 1); ok(game().topics[t].attempted >= 1);
}
setTopic('mixed');
ok($('topic-stats').textContent.includes('Network Overhead and Connections'));
ok(/Rounds where TCP was correct: \d+% \(\d+\/\d+\)/.test($('protocol-stats').textContent) && /UDP was correct/.test($('protocol-stats').textContent));
const p = st().lab.stats().protocols; eq(p.TCP.attempted + p.UDP.attempted, game().attempted, 'protocol accuracy covers every attempt');

// Single-letter shortcuts are opt-in, so reading/navigation does not submit.
click($('next')); let off=game().attempted,offId=st().current.id;key('t');key('u');key('n');eq(game().attempted,off);eq(st().current.id,offId);$('shortcuts').checked=true;
// Keyboard shortcuts; ignored while the topic select has focus.
click($('next')); let n = game().attempted; key('t', $('topic')); eq(game().attempted, n, 'shortcut ignored in select');
key('t'); eq(game().attempted, n + 1, 'T answers'); ok($('feedback').textContent.includes(st().current.answer));
const id0 = st().current.id; key('n'); ok(st().current.id !== id0, 'N goes to next'); n = game().attempted; key('u'); eq(game().attempted, n + 1, 'U answers');
const ctrl = new window.Event('keydown', { bubbles: true }); Object.defineProperty(ctrl, 'key', { value: 'n' }); Object.defineProperty(ctrl, 'ctrlKey', { value: true });
const id1 = st().current.id; document.body.dispatchEvent(ctrl); eq(st().current.id, id1, 'Ctrl+N not intercepted');

// History is persisted for the daily session (repeat avoidance across reloads).
ok(JSON.parse(store.get('cspGames.tcpUdpLab.v1')).history.includes(st().current.id));

// Daily reset: next local day, the pending round is replaced and results start over.
click($('next')); now = new OriginalDate(2026, 9, 27, 9, 0, 0).getTime();
const stale = st().current.id; click($('tcp'));
ok($('notice').textContent.includes('new daily session'), 'reset announced');
ok(st().current.id !== stale && $('feedback').hidden, 'fresh scenario, nothing scored');
eq(game(), undefined, 'new day starts with no results');
eq(st().lab.stats().protocols, { TCP: { attempted: 0, firstTry: 0 }, UDP: { attempted: 0, firstTry: 0 } });
click(right()); eq(game().attempted, 1); eq(game().firstTry, 1);

console.log(`TCP/UDP DOM: ${checks} assertions passed (two choices, single scored attempt, feedback, skips, all filters, topic/protocol accuracy, Learn, keyboard, persistence, daily reset).`);
