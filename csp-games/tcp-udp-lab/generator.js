import { TOPICS, COVERAGE, PROTOCOLS, CONDITIONS, CED, FAMILIES } from './content.js?v=tcpudp-v2';
export { TOPICS, COVERAGE, PROTOCOLS, CONDITIONS, CED, FAMILIES };

export const ANSWERS = ['TCP', 'UDP'];
export const SKILLS = ['internet-protocols', 'transport-protocols', 'tcp', 'udp', 'reliability-timeliness-tradeoffs'];
export const PROMPT = 'Which transport protocol is the better fit?';
export const PRACTICE_MODE = 'tcp-udp-decision';

// Requirement facts. A TCP fact means the application relies on the transport
// for that service; a UDP fact describes a need that TCP's behavior works against
// or cannot meet. Support facts are never decisive on their own.
export const TCP_FACTS = ['transportReliability', 'transportOrdering', 'byteStream', 'transportFlowControl', 'transportCongestionControl', 'connectionState', 'largeMessages', 'udpBlocked'];
export const UDP_FACTS = ['freshness', 'multicast', 'ownRecovery', 'messageUnits', 'minimalOverhead', 'noHOLBlocking', 'noBackpressure', 'roaming', 'stateless', 'appRateControl'];
export const SUPPORT_FACTS = ['toleratesLoss', 'appControlsTiming'];
// UDP facts that only decide the answer when the application can live without
// transport recovery (it tolerates loss or recovers by itself).
const NEEDS_LOSS_HANDLING = ['freshness', 'messageUnits', 'minimalOverhead', 'noHOLBlocking', 'noBackpressure', 'stateless', 'appRateControl'];

export function classify(facts) {
  if (!facts || typeof facts !== 'object') throw Error('Reject: no requirements.');
  for (const key of Object.keys(facts)) {
    if (key === 'protocol') continue;
    if (![...TCP_FACTS, ...UDP_FACTS, ...SUPPORT_FACTS].includes(key)) throw Error(`Reject: unknown requirement ${key}.`);
    if (facts[key] !== true) throw Error(`Reject: requirement ${key} must be true when present.`);
  }
  const tcp = TCP_FACTS.filter(k => facts[k]), udp = UDP_FACTS.filter(k => facts[k]);
  const handlesLoss = !!(facts.toleratesLoss || facts.ownRecovery);
  if (tcp.length && (udp.length || facts.toleratesLoss || facts.appControlsTiming))
    throw Error(`Reject contradictory requirements: ${[...tcp, ...udp, ...SUPPORT_FACTS.filter(k => facts[k])].join(', ')}.`);
  for (const k of NEEDS_LOSS_HANDLING) if (facts[k] && !handlesLoss) throw Error(`Reject incomplete requirements: ${k} without loss tolerance or application recovery.`);
  if (facts.roaming && !facts.ownRecovery) throw Error('Reject incomplete requirements: roaming without application session handling.');
  if (facts.appControlsTiming && !udp.length) throw Error('Reject ambiguous requirements: application timing control alone does not decide.');
  const derived = tcp.length ? 'TCP' : udp.length ? 'UDP' : null;
  if (facts.protocol !== undefined) {
    const p = PROTOCOLS[facts.protocol];
    if (!p) throw Error(`Reject: unknown application protocol ${facts.protocol}.`);
    if (derived && derived !== p.transport) throw Error(`Reject: ${facts.protocol} runs over ${p.transport}, but the requirements point to ${derived}.`);
    return { answer: p.transport, basis: 'protocol', reasons: [facts.protocol, ...(tcp.length ? tcp : udp)] };
  }
  if (!derived) throw Error('Reject ambiguous scenario: no decisive requirement.');
  return { answer: derived, basis: 'requirements', reasons: derived === 'TCP' ? tcp : udp };
}

// Each true fact must be visibly stated in the situation text (context + need).
export const FACT_EVIDENCE = {
  transportReliability: /\b(every|everything|complete|completely|intact|missing|lost|recover|recovery|resend|none (?:may|can)|cannot be lost|whole|entire)\b/i,
  transportOrdering: /order|sequence/i,
  byteStream: /stream|continuous/i,
  transportFlowControl: /slow|overwhelm|keep up|pause|fall(?:s)? behind|buffer/i,
  transportCongestionControl: /congest|crowd|share|back off|fair/i,
  connectionState: /connection|session|set ?up|exchange|connected/i,
  largeMessages: /too large|larger than|large|megabyte/i,
  udpBlocked: /firewall|blocks?\b|drops/i,
  freshness: /newest|latest|current|\bnow\b|replace|outdated|obsolete|stale|\bold\b|late|on time|moment|as it happens/i,
  toleratesLoss: /skip|\bmiss|\blost\b|gap|drop|ignor|discard|thrown away|not resent|never resent|does not matter|acceptable|\bfine\b/i,
  ownRecovery: /\bown\b|itself|acknowledg|resend|sent again|retr(?:y|ies)|repair|rebuild/i,
  appControlsTiming: /decide|choose|control|when to|how long/i,
  messageUnits: /separate|self-contained|single|one (?:small )?packet|one-packet|each (?:report|sample|reading|message|check)/i,
  minimalOverhead: /overhead|setup|set up|battery|tiny|small|few bytes|round trip/i,
  noHOLBlocking: /hold up|stall|block/i,
  noBackpressure: /never (?:slow|wait|pause|delay)|must never/i,
  roaming: /address changes|switch|moves between|hops between/i,
  stateless: /memory|state|independently/i,
  appRateControl: /lower|reduc|quality|rate/i,
  multicast: /every device|group address|broadcast/i,
};

// Words that would give the answer away or teach a protocol by label.
export const SCENARIO_BANNED = /\b(TCP|UDP|datagrams?|byte stream|connectionless|connection-oriented)\b/i;
// Inaccurate generalizations that must never appear in any student-facing text.
export const INACCURATE = [
  /\bUDP is (?:always )?faster\b/i, /\balways faster\b/i, /\bTCP is always\b/i, /\bUDP is always\b/i,
  /\bTCP[^.]{0,60}\bguarantee/i, /\bTCP (?:encrypts|is encrypted|is secure)\b/i, /\bUDP is (?:insecure|unsafe|unreliable)\b/i,
  /\bunreliable\b/i, /(?<!not )\ball (?:web|streaming|video|internet) traffic\b/i, /\bTCP[^.]{0,40}preserv\w* (?:message|record) boundar/i,
  /\bDNS (?:only|always) uses\b/i, /\bnever (?:be )?used for real-time\b/i, /\bUDP cannot\b/i,
];

const ALL_CONDITIONS = Object.keys(CONDITIONS);
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function validateFamily(f) {
  if (!f || !f.id || !TOPICS[f.topic] || !ANSWERS.includes(f.answer)) throw Error(`Invalid family header: ${f?.id}.`);
  for (const k of ['title', 'objective', 'fit', 'alt']) if (typeof f[k] !== 'string' || f[k].length < 15) throw Error(`${f.id}: missing ${k}.`);
  if (!Array.isArray(f.tags) || !f.tags.length || f.tags.some(t => !COVERAGE[t])) throw Error(`${f.id}: unknown coverage tag.`);
  const result = classify(f.facts);
  if (result.answer !== f.answer) throw Error(`${f.id}: requirements derive ${result.answer}, authored ${f.answer}.`);
  if (!f.fit.includes(f.answer)) throw Error(`${f.id}: fit must explain ${f.answer}.`);
  const other = f.answer === 'TCP' ? 'UDP' : 'TCP';
  if (!f.alt.includes(other)) throw Error(`${f.id}: alternative must discuss ${other}.`);
  const conditions = f.conditions || ALL_CONDITIONS;
  if (conditions.length < 2 || conditions.some(c => !CONDITIONS[c])) throw Error(`${f.id}: needs two valid conditions.`);
  if (!Array.isArray(f.situations) || f.situations.length < 3) throw Error(`${f.id}: needs at least three situations.`);
  if (f.situations.some(s => s.local && conditions.filter(c => c !== 'delay').length < 2)) throw Error(`${f.id}: local situation needs two non-delay conditions.`);
  for (const s of f.situations) {
    const text = `${s.context} ${s.need}`;
    for (const k of ['app', 'context', 'need', 'why']) if (typeof s[k] !== 'string' || s[k].length < (k === 'app' ? 2 : 15)) throw Error(`${f.id}: situation missing ${k}.`);
    if (SCENARIO_BANNED.test(text)) throw Error(`${f.id}: scenario names a protocol or protocol-specific term: ${text}`);
    for (const [fact, value] of Object.entries(f.facts)) {
      if (fact === 'protocol') { if (!PROTOCOLS[value].cue.test(text)) throw Error(`${f.id}: scenario does not name ${value}.`); continue; }
      if (!FACT_EVIDENCE[fact].test(text)) throw Error(`${f.id}: requirement “${fact}” is not stated in: ${text}`);
    }
  }
  for (const t of [f.fit, f.alt, f.note || '', ...f.situations.flatMap(s => [s.context, s.need, s.why])])
    for (const bad of INACCURATE) if (bad.test(t)) throw Error(`${f.id}: inaccurate generalization ${bad} in: ${t}`);
  return f;
}

export function buildQuestions(families = FAMILIES) {
  const out = [];
  families.forEach((f, fi) => {
    validateFamily(f);
    const cls = classify(f.facts), ced = CED[f.ced || 'default'];
    f.situations.forEach((s, si) => {
      const conds = (f.conditions || ALL_CONDITIONS).filter(c => !(s.local && c === 'delay'));
      const situationId = `${f.id}.s${si + 1}`;
      for (let k = 0; k < 2; k++) {
        const condition = conds[(fi + 2 * si + k) % conds.length], id = `${situationId}.${condition}`, h = hash(id);
        const condText = CONDITIONS[condition].text[h % 2], middle = (h >>> 3) % 2 === 1;
        const scene = (middle ? [s.context, condText, s.need] : [s.context, s.need, condText]).join(' ');
        out.push({
          id, family: f.id, situationId, topic: f.topic, answer: cls.answer, basis: cls.basis, reasons: cls.reasons,
          protocol: f.facts.protocol || null, app: s.app, condition, tags: f.tags, title: f.title,
          objective: f.objective, ced: ced.objective, essentialKnowledge: ced.essentialKnowledge,
          scene, prompt: PROMPT, why: s.why, fit: f.fit, alt: f.alt, note: f.note || '',
          conditionNote: CONDITIONS[condition].note[cls.answer],
        });
      }
    });
  });
  return out;
}

export const QUESTIONS = buildQuestions();

function random(seed) {
  let s = Number(seed) >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export const HISTORY_LIMIT = 50, FAMILY_COOLDOWN = 3, MAX_STREAK = 4;
// Weight applied to repeating the previous answer, indexed by the current streak.
// Kept soft: strong streak or balance pressure makes “guess the opposite” or
// “guess the less frequent answer” beat chance (measured in tools/simulate.mjs).
const STREAK_WEIGHT = [1, 1, 1, 0.8, 0];

// One history spans every filter. Exact-repeat protection wins over family cooldown;
// cooldown is relaxed first when a pool is too small. Every step filters finite
// arrays, so selection always terminates.
export function createGenerator({ seed = Date.now(), history = [], bank = QUESTIONS } = {}) {
  if (!bank.length) throw Error('Empty question bank.');
  const rng = random(seed), byId = new Map(bank.map(q => [q.id, q]));
  const recent = history.map(h => byId.get(typeof h === 'string' ? h : h?.id)).filter(Boolean).slice(-HISTORY_LIMIT);
  const answers = { TCP: 0, UDP: 0 }, families = {}, topics = {};
  for (const q of recent) { answers[q.answer]++; families[q.family] = (families[q.family] || 0) + 1; }
  let delivered = 0, last = recent.at(-1)?.answer, streak = 0;
  for (let i = recent.length - 1; i >= 0 && recent[i].answer === last; i--) streak++;
  const pickAnswer = choices => {
    if (choices.length === 1) return choices[0];
    const min = Math.min(...choices.map(a => answers[a]));
    let weights = choices.map(a => Math.pow(0.97, answers[a] - min) * (a === last ? STREAK_WEIGHT[Math.min(streak, MAX_STREAK)] : 1));
    if (!weights.some(w => w > 0)) weights = choices.map(() => 1);
    let ticket = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < choices.length; i++) { ticket -= weights[i]; if (ticket < 0) return choices[i]; }
    return choices.at(-1);
  };
  return {
    next(topic = 'mixed') {
      const pool = topic === 'mixed' ? bank : bank.filter(q => q.topic === topic);
      if (!pool.length) throw Error('Unknown or empty filter.');
      let exactRelaxed = false, cooldownRelaxed = false;
      let excluded = new Set(recent.map(q => q.id)), candidates = pool.filter(q => !excluded.has(q.id));
      if (!candidates.length) {
        exactRelaxed = true;
        for (let n = recent.length - 1; n >= 0; n--) {
          excluded = new Set(n ? recent.slice(-n).map(q => q.id) : []);
          candidates = pool.filter(q => !excluded.has(q.id));
          if (candidates.length) break;
        }
      }
      const cooldown = new Set(recent.slice(-FAMILY_COOLDOWN).map(q => q.family)), fresh = candidates.filter(q => !cooldown.has(q.family));
      if (fresh.length) candidates = fresh; else cooldownRelaxed = true;
      const desired = pickAnswer(ANSWERS.filter(a => candidates.some(q => q.answer === a)));
      candidates = candidates.filter(q => q.answer === desired);
      // Prefer situations not seen recently, otherwise the longest-unseen ones. Narrow
      // filters have only 30–42 situations, so a situation (with a different network
      // condition) can recur within 50 rounds; it never recurs as the exact question.
      const seenAt = new Map(); recent.forEach((q, i) => seenAt.set(q.situationId, i));
      const gap = q => seenAt.has(q.situationId) ? recent.length - seenAt.get(q.situationId) : Infinity;
      const best = Math.max(...candidates.map(gap));
      candidates = best === Infinity ? candidates.filter(q => gap(q) === Infinity) : candidates.filter(q => gap(q) === best);
      const lastApp = recent.at(-1)?.app, otherApp = candidates.filter(q => q.app !== lastApp);
      if (otherApp.length) candidates = otherApp;
      const minFamily = Math.min(...candidates.map(q => families[q.family] || 0));
      candidates = candidates.filter(q => (families[q.family] || 0) === minFamily);
      if (topic === 'mixed') { const minTopic = Math.min(...candidates.map(q => topics[q.topic] || 0)); candidates = candidates.filter(q => (topics[q.topic] || 0) === minTopic); }
      const q = candidates[Math.floor(rng() * candidates.length)];
      answers[q.answer]++; families[q.family] = (families[q.family] || 0) + 1; topics[q.topic] = (topics[q.topic] || 0) + 1; delivered++;
      streak = q.answer === last ? streak + 1 : 1; last = q.answer;
      recent.push(q); if (recent.length > HISTORY_LIMIT) recent.shift();
      return { ...q, exactRelaxed, cooldownRelaxed };
    },
    history: () => recent.map(q => q.id),
    metrics: () => ({ delivered, answers: { ...answers }, families: { ...families }, topics: { ...topics } }),
  };
}

export function feedback(q, selected) {
  if (!ANSWERS.includes(selected)) throw Error('Choose TCP or UDP.');
  const correct = selected === q.answer, other = q.answer === 'TCP' ? 'UDP' : 'TCP';
  const verdict = correct ? `Correct — ${q.answer}` : `Incorrect — Correct answer: ${q.answer}`;
  const sections = [
    { title: `Why ${q.answer} fits`, text: `${q.why} ${q.fit}` },
    { title: `Why ${other} is less suitable`, text: q.alt },
    { title: 'On this network', text: q.conditionNote },
  ];
  if (q.note) sections.push({ title: 'Keep in mind', text: q.note });
  return { correct, selected, verdict, sections, text: [verdict, ...sections.map(s => `${s.title}: ${s.text}`)].join('\n') };
}
