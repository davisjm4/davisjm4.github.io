// Instructional validation. Run: node csp-games/tcp-udp-lab/tests/validation.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../generator.js';
import * as A from '../tools/audit.mjs';

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const throws = (fn, m) => { assert.throws(fn, m); checks++; };
const Q = E.QUESTIONS, F = E.FAMILIES;

// ── Independent oracle: written separately from generator.js, sharing no lists. ──
// Transport of each named application protocol, retyped from the RFCs.
const ORACLE_PROTOCOL = {
  'HTTP/1.1': 'TCP', 'HTTP/2': 'TCP', SSH: 'TCP', TLS: 'TCP', FTP: 'TCP', 'DNS (large answer retry)': 'TCP', 'DNS (zone transfer)': 'TCP',
  QUIC: 'UDP', 'HTTP/3': 'UDP', 'DNS (ordinary query)': 'UDP', TFTP: 'UDP', NTP: 'UDP', DTLS: 'UDP', DHCP: 'UDP',
};
const RELIES_ON_TRANSPORT = new Set(['transportReliability', 'transportOrdering', 'byteStream', 'transportFlowControl', 'transportCongestionControl', 'connectionState', 'largeMessages', 'udpBlocked']);
const WORKS_AGAINST_TRANSPORT = new Set(['freshness', 'multicast', 'ownRecovery', 'messageUnits', 'minimalOverhead', 'noHOLBlocking', 'noBackpressure', 'roaming', 'stateless', 'appRateControl']);
function oracle(facts) {
  const keys = Object.keys(facts).filter(k => k !== 'protocol');
  const tcpVotes = keys.filter(k => RELIES_ON_TRANSPORT.has(k)).length;
  const udpVotes = keys.filter(k => WORKS_AGAINST_TRANSPORT.has(k)).length;
  const lossOk = !!facts.toleratesLoss || !!facts.ownRecovery;
  if (tcpVotes > 0 && (udpVotes > 0 || facts.toleratesLoss || facts.appControlsTiming)) return null;      // contradictory
  if (udpVotes > 0 && !facts.multicast && !lossOk) return null;                                              // UDP need without loss handling
  if (facts.roaming && !facts.ownRecovery) return null;
  const needs = tcpVotes ? 'TCP' : udpVotes ? 'UDP' : null;
  if (facts.protocol) { const t = ORACLE_PROTOCOL[facts.protocol]; return !t || (needs && needs !== t) ? null : t; }
  return needs;
}

// ── Counts, uniqueness, balance ──
ok(F.length >= 60, 'at least 60 reasoning families');
ok(Q.length >= 300, 'at least 300 validated instances');
eq(new Set(F.map(f => f.id)).size, F.length, 'unique family IDs');
eq(new Set(Q.map(q => q.id)).size, Q.length, 'unique question IDs');
eq(new Set(Q.map(q => q.scene)).size, Q.length, 'unique scenario text');
eq(F.filter(f => f.answer === 'TCP').length, F.filter(f => f.answer === 'UDP').length, 'families balanced TCP/UDP');
eq(Q.filter(q => q.answer === 'TCP').length, Q.filter(q => q.answer === 'UDP').length, 'instances balanced TCP/UDP');
for (const t of Object.keys(E.TOPICS)) {
  const fam = F.filter(f => f.topic === t);
  ok(fam.length >= 10, `${t}: at least 10 families`);
  eq(fam.filter(f => f.answer === 'TCP').length, fam.filter(f => f.answer === 'UDP').length, `${t}: balanced families`);
}
for (const tag of Object.keys(E.COVERAGE)) ok(F.some(f => f.tags.includes(tag)), `coverage: ${tag}`);
eq(Object.keys(E.COVERAGE).length, 30, 'all 30 required coverage areas defined');

// ── Every family: classifier, oracle and authored answer agree; one defensible answer ──
for (const f of F) {
  eq(E.validateFamily(f), f);
  const c = E.classify(f.facts);
  eq(c.answer, f.answer, `${f.id}: classifier`);
  eq(oracle(f.facts), f.answer, `${f.id}: independent oracle`);
  // Deliberate corruption: each must be rejected, proving the classifier does not rubber-stamp.
  const sameSide = f.answer === 'TCP' ? [...RELIES_ON_TRANSPORT] : [...WORKS_AGAINST_TRANSPORT];
  const otherSide = f.answer === 'TCP' ? [...WORKS_AGAINST_TRANSPORT] : [...RELIES_ON_TRANSPORT];
  for (const k of otherSide) throws(() => E.classify({ ...f.facts, [k]: true }), `${f.id}: + ${k} must be contradictory`);
  if (f.answer === 'TCP') { throws(() => E.classify({ ...f.facts, toleratesLoss: true })); throws(() => E.classify({ ...f.facts, appControlsTiming: true })); }
  const stripped = Object.fromEntries(Object.entries(f.facts).filter(([k]) => !sameSide.includes(k) && k !== 'protocol'));
  throws(() => E.classify(stripped), `${f.id}: no decisive requirement must be ambiguous`);
  if (f.facts.protocol) {
    const wrong = Object.keys(E.PROTOCOLS).find(p => E.PROTOCOLS[p].transport !== f.answer);
    throws(() => E.classify({ ...f.facts, protocol: wrong }), `${f.id}: binding conflict`);
    eq(E.PROTOCOLS[f.facts.protocol].transport, ORACLE_PROTOCOL[f.facts.protocol], `${f.id}: protocol table`);
  }
  // Text corruption: removing the decisive sentence must fail validation.
  const blank = { ...f, situations: f.situations.map((s, i) => i ? s : { ...s, need: 'The details of this system are not described here.' }) };
  throws(() => E.validateFamily(blank), `${f.id}: missing requirement text must be rejected`);
  const leak = { ...f, situations: f.situations.map((s, i) => i ? s : { ...s, need: s.need + ` It should use ${f.answer}.` }) };
  throws(() => E.validateFamily(leak), `${f.id}: naming the protocol must be rejected`);
}
throws(() => E.classify({}), 'empty');
throws(() => E.classify({ toleratesLoss: true }), 'support fact alone');
throws(() => E.classify({ appControlsTiming: true }), 'timing alone');
throws(() => E.classify({ freshness: true }), 'freshness without loss handling');
throws(() => E.classify({ roaming: true, toleratesLoss: true }), 'roaming without app session handling');
throws(() => E.classify({ protocol: 'Gopher' }), 'unknown protocol');
throws(() => E.classify({ protocol: 'QUIC', transportReliability: true }), 'QUIC cannot rely on TCP reliability');
throws(() => E.classify({ protocol: 'HTTP/2', freshness: true, toleratesLoss: true }), 'HTTP/2 binding conflict');
throws(() => E.classify({ transportReliability: 'yes' }), 'non-boolean fact');
throws(() => E.classify({ madeUp: true }), 'unknown fact');

// ── Scenario text: no answer clues, decisive requirement present ──
const htmlText = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const q of Q) {
  ok(!/\b(TCP|UDP)\b/.test(q.scene), `${q.id}: scenario names a protocol`);
  ok(!E.SCENARIO_BANNED.test(q.scene), `${q.id}: protocol-specific term in scenario`);
  ok(!q.scene.includes(q.why) && !q.scene.includes(q.fit), `${q.id}: explanation leaks into scenario`);
  eq(q.prompt, 'Which transport protocol is the better fit?');
  ok(E.CONDITIONS[q.condition].text.some(t => q.scene.includes(t)), `${q.id}: condition stated`);
  const local = F.find(f => f.id === q.family).situations[Number(q.situationId.split('.s')[1]) - 1].local;
  ok(!(local && q.condition === 'delay'), `${q.id}: local-network situation paired with a long-distance delay`);
  const fam = F.find(f => f.id === q.family), sit = fam.situations[Number(q.situationId.split('.s')[1]) - 1];
  ok(q.scene.includes(sit.context) && q.scene.includes(sit.need), `${q.id}: decisive requirement present`);
  // Explanations match the scenario and both protocols are discussed.
  const right = E.feedback(q, q.answer), wrong = E.feedback(q, q.answer === 'TCP' ? 'UDP' : 'TCP');
  ok(right.correct && !wrong.correct);
  eq(right.verdict, `Correct — ${q.answer}`);
  eq(wrong.verdict, `Incorrect — Correct answer: ${q.answer}`);
  ok(right.sections[0].text.startsWith(sit.why), `${q.id}: scenario-specific reason first`);
  ok(right.sections[0].title.includes(q.answer) && right.sections[1].title.includes(q.answer === 'TCP' ? 'UDP' : 'TCP'));
  eq(right.sections[2].text, E.CONDITIONS[q.condition].note[q.answer], `${q.id}: condition note matches`);
  ok(right.text.includes('TCP') && right.text.includes('UDP'));
  if (q.protocol) ok(q.fit.includes(q.protocol.split(' (')[0]), `${q.id}: fit names ${q.protocol}`);
  throws(() => E.feedback(q, 'IP'));
}

// ── Accuracy scans over every student-facing string ──
// Independent list (not imported) of claims the brief forbids.
const FORBIDDEN = [
  /UDP is (?:always |much )?faster/i, /TCP (?:always )?guarantees/i, /guaranteed delivery/i, /(?<!not )all web traffic uses TCP/i,
  /(?<!not )all streaming uses UDP/i, /TCP (?:is|provides) encrypt/i, /UDP is (?:insecure|not secure)/i, /UDP cannot (?:support|be used for) reliable/i,
  /TCP (?:preserves|keeps) (?:message|record) boundaries/i, /TCP can never be used for real-time/i, /DNS (?:only|always) uses UDP/i,
  /\bunreliable\b/i, /TCP is (?:always )?(?:better|superior)/i, /UDP is (?:always )?(?:better|superior)/i,
];
const plain = htmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const texts = [plain, ...Q.flatMap(q => [q.scene, E.feedback(q, 'TCP').text]), ...F.flatMap(f => [f.title, f.objective])];
for (const t of texts) for (const bad of [...FORBIDDEN, ...E.INACCURATE]) ok(!bad.test(t), `inaccurate claim ${bad}: ${t.slice(0, 120)}`);

// ── Modern networking and DNS are represented accurately ──
const byId = id => F.find(f => f.id === id);
eq(byId('pr-quic').answer, 'UDP'); ok(/QUIC is designed to run over UDP/.test(byId('pr-quic').fit)); ok(/reliability/.test(byId('pr-quic').fit));
eq(byId('pr-http3').answer, 'UDP'); ok(/HTTP\/3 runs over QUIC, and QUIC runs over UDP/.test(byId('pr-http3').fit));
eq(byId('pr-http11').answer, 'TCP'); eq(byId('pr-http2').answer, 'TCP');
const dns = F.filter(f => f.tags.includes('dns'));
eq(new Set(dns.map(f => f.answer)).size, 2, 'DNS appears with both protocols');
ok(/commonly/.test(byId('pr-dns-ordinary').fit) && /TCP/.test(byId('pr-dns-ordinary').alt), 'ordinary DNS is not oversimplified');
ok(/QUIC/.test(plain) && /HTTP\/3 runs over QUIC/.test(plain) && /DNS/.test(plain), 'Learn panel covers QUIC, HTTP/3, DNS');
for (const tag of ['video', 'voice', 'multiplayer', 'file-transfer', 'remote-terminal', 'sensor', 'misconceptions']) {
  const answers = new Set(F.filter(f => f.tags.includes(tag)).map(f => f.answer));
  eq(answers.size, 2, `${tag}: appears with both answers, so the category alone never decides`);
}

// ── Shortcut audits from student-visible text ──
const len = A.lengthShortcut(Q), cues = A.wordCues(Q), apps = A.appBalance(Q);
ok(len.acc <= 0.6, `length shortcut ${len.acc}`);
ok(cues[0].stumpAcc <= 0.67, `best single-word shortcut ${cues[0].word} ${cues[0].stumpAcc}`);
for (const a of apps.filter(a => a.n >= 10)) ok(a.majorShare <= 0.7, `${a.app}: category predicts the answer (${a.TCP}/${a.UDP})`);
for (const a of ['game', 'video', 'voice', 'web', 'iot', 'school', 'sensor']) { const r = apps.find(x => x.app === a); ok(r && r.TCP > 0 && r.UDP > 0, `${a}: both answers`); }

// ── Interface gives no clues before submission ──
const buttons = [...htmlText.matchAll(/<button[^>]*data-answer="(TCP|UDP)"[^>]*>([^<]*)<\/button>/g)];
eq(buttons.map(b => b[2]), ['TCP', 'UDP'], 'exactly two plain choices');
ok(!/data-answer="(?:TCP|UDP)"[^>]*(?:title|aria-describedby|aria-label)=/.test(htmlText), 'no descriptions on answer buttons');
ok(/<div id="feedback"[^>]*hidden/.test(htmlText), 'feedback hidden before answering');
ok(!/difficulty/i.test(htmlText) && !/draggable|ondrag/i.test(htmlText), 'no difficulty levels or drag-and-drop');

console.log(`TCP/UDP validation: ${checks} assertions passed. ${F.length} families, ${Q.length} instances; best length shortcut ${(len.acc * 100).toFixed(1)}%, best word shortcut “${cues[0].word}” ${(cues[0].stumpAcc * 100).toFixed(1)}%.`);
